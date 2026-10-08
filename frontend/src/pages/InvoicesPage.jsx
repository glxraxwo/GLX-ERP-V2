import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Eye, FileText, AlertTriangle, CheckCircle, RefreshCw, Briefcase, FileCheck, Layers, RotateCcw, Calendar, X, Receipt, ClipboardList, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDocumentEditHistory, formatEditItem } from '../utils/editHistoryUtils';
import DocumentEditLogModal from '../components/common/DocumentEditLogModal';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { useInvoices, useAgingSummary } from '../features/invoices/useInvoices';
import { useAuthStore } from '../store/authStore';
import QuotationsPage from './QuotationsPage';
import api from '../api/axios';

const paymentStatusVariant = {
    unpaid: 'warning',
    partially_paid: 'info',
    paid: 'success',
    overdue: 'danger',
    cancelled: 'default',
    written_off: 'default',
};

import { usePermission } from '../hooks/usePermission';

export default function InvoicesPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const { hasPermission, isAdmin } = usePermission();
    const canCreate = isAdmin || hasPermission('invoices.create') || ['admin', 'manager', 'accountant', 'sales_manager'].includes(user?.role);

    const [searchParams, setSearchParams] = useSearchParams();
    const tabFromUrl = searchParams.get('tab') || 'invoices';
    const [masterTab, setMasterTab] = useState(tabFromUrl);

    useEffect(() => {
        const t = searchParams.get('tab');
        if (t && ['invoices', 'quotations', 'estimates'].includes(t)) {
            setMasterTab(t);
        }
    }, [searchParams]);

    const handleTabChange = (tab) => {
        setMasterTab(tab);
        setSearchParams({ tab });
    };

    // Quick Payment State
    const [selectedPayInvoice, setSelectedPayInvoice] = useState(null);
    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState('cash');
    const [payBankAccountId, setPayBankAccountId] = useState('');
    const [payReference, setPayReference] = useState('');
    const [isSubmittingPay, setIsSubmittingPay] = useState(false);

    // Revert Modal State
    const [revertInvoiceModal, setRevertInvoiceModal] = useState(null);
    const [revertAdminPassword, setRevertAdminPassword] = useState('');
    const [isReverting, setIsReverting] = useState(false);

    // Conversion Modal State
    const [selectedConvertInvoice, setSelectedConvertInvoice] = useState(null);
    const [convertStep, setConvertStep] = useState('choose');
    const [convertYard, setConvertYard] = useState('');
    const [convertDetails, setConvertDetails] = useState('');
    const [convertAdvance, setConvertAdvance] = useState('');
    const [isSubmittingConvert, setIsSubmittingConvert] = useState(false);
    const [selectedLogDoc, setSelectedLogDoc] = useState(null);

    const [filters, setFilters] = useState({
        search: '', paymentStatus: '', agingBucket: '', invoiceType: 'commercial',
        startDate: '', endDate: '',
        page: 1, limit: 15,
    });

    const { data, isLoading } = useInvoices(filters);
    const { data: agingData } = useAgingSummary();

    const { data: bankAccountsData } = useQuery({
        queryKey: ['bankAccounts'],
        queryFn: async () => {
            const { data } = await api.get('/finance/bank-accounts');
            return data.data || [];
        },
        enabled: !!selectedPayInvoice
    });
    const bankAccounts = bankAccountsData || [];

    const invoices = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;
    const aging = agingData?.data || { buckets: {}, counts: {}, totalOutstanding: 0 };

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-LK') : '—';

    const handleQuickPaySubmit = async (e) => {
        e.preventDefault();
        if (!selectedPayInvoice) return;
        const pVal = Number(payAmount) > 0 ? Number(payAmount) : selectedPayInvoice.balanceDue;
        if (pVal <= 0) {
            toast.error('Enter a valid payment amount');
            return;
        }
        setIsSubmittingPay(true);
        try {
            const payload = {
                direction: 'received',
                customerId: selectedPayInvoice.customerId?._id || selectedPayInvoice.customerId,
                amount: pVal,
                method: payMethod,
                bankAccountId: payMethod !== 'cash' ? (payBankAccountId || undefined) : undefined,
                paymentDate: new Date().toISOString().split('T')[0],
                allocations: [{
                    documentType: 'invoice',
                    documentId: selectedPayInvoice._id,
                    amount: pVal
                }],
                notes: `Payment for Invoice ${selectedPayInvoice.invoiceNumber}`,
                transactionReference: payReference || undefined
            };

            await api.post('/payments', payload);
            toast.success(pVal >= selectedPayInvoice.balanceDue ? `Invoice ${selectedPayInvoice.invoiceNumber} marked as Paid!` : `Partial Payment of LKR ${pVal.toLocaleString()} recorded!`);
            setSelectedPayInvoice(null);
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['invoice'] });
            queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record payment');
        } finally {
            setIsSubmittingPay(false);
        }
    };

    const handleRevertSubmit = async (e) => {
        e.preventDefault();
        if (!revertAdminPassword) {
            toast.error('Please enter Admin Password');
            return;
        }
        setIsReverting(true);
        try {
            await api.post(`/invoices/${revertInvoiceModal._id}/revert-conversion`, {
                adminPassword: revertAdminPassword
            });
            toast.success(`Invoice ${revertInvoiceModal.invoiceNumber} reverted back to Quotation Draft!`);
            setRevertInvoiceModal(null);
            setRevertAdminPassword('');
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            navigate('/crm/quotations');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to revert invoice');
        } finally {
            setIsReverting(false);
        }
    };

    const handleConvertToProforma = async () => {
        if (!selectedConvertInvoice) return;
        setIsSubmittingConvert(true);
        try {
            await api.post(`/invoices/${selectedConvertInvoice._id}/convert-to-proforma`);
            toast.success(`Invoice ${selectedConvertInvoice.invoiceNumber} converted to Proforma Invoice!`);
            setSelectedConvertInvoice(null);
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to convert invoice');
        } finally {
            setIsSubmittingConvert(false);
        }
    };

    const handleConvertToCommercial = async () => {
        if (!selectedConvertInvoice) return;
        setIsSubmittingConvert(true);
        try {
            await api.post(`/invoices/${selectedConvertInvoice._id}/convert-to-commercial`);
            toast.success(`Invoice ${selectedConvertInvoice.invoiceNumber} converted to Commercial Invoice!`);
            setSelectedConvertInvoice(null);
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to convert invoice');
        } finally {
            setIsSubmittingConvert(false);
        }
    };

    const handleConvertToProjectSubmit = async (e) => {
        e.preventDefault();
        if (!selectedConvertInvoice) return;
        setIsSubmittingConvert(true);
        try {
            const payload = {
                yard: convertYard,
                details: convertDetails,
                assignedEmployees: [],
                advancePaymentAmount: convertAdvance ? Number(convertAdvance) : 0
            };
            const { data: res } = await api.post(`/invoices/${selectedConvertInvoice._id}/convert-to-project`, payload);
            toast.success(`Converted to Project successfully!`);
            setSelectedConvertInvoice(null);
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            if (res.data?._id) {
                navigate(`/crm/projects/${res.data._id}`);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to convert invoice to project');
        } finally {
            setIsSubmittingConvert(false);
        }
    };

    const columns = [
        {
            key: 'invoiceNumber', label: 'Invoice #', width: '130px',
            render: (r) => {
                const history = getDocumentEditHistory(r);
                return (
                    <div>
                        <span className="font-mono text-xs font-bold text-gray-900">{r.invoiceNumber}</span>
                        {history.length > 0 && (
                            <div className="flex flex-col gap-0.5 mt-0.5">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedLogDoc(r);
                                    }}
                                    className="text-[10px] font-black text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-1 py-0.2 rounded font-mono w-max cursor-pointer transition text-left"
                                    title="Click to view full revision history & audit log"
                                >
                                    {formatEditItem(history[history.length - 1], history.length)}
                                </button>
                            </div>
                        )}
                    </div>
                );
            },
        },
        { key: 'invoiceDate', label: 'Date', render: (r) => fmtDate(r.invoiceDate) },
        {
            key: 'customer', label: 'Customer',
            render: (r) => (
                <div>
                    <p className="font-medium">{r.customerSnapshot?.name}</p>
                    <p className="text-xs text-gray-500">{r.customerSnapshot?.code}</p>
                </div>
            ),
        },
        {
            key: 'dueDate', label: 'Due',
            render: (r) => {
                if (!r.dueDate) return <span className="text-gray-400">—</span>;
                const overdue = r.paymentStatus === 'overdue';
                return (
                    <div className={overdue ? 'text-red-600' : ''}>
                        <p className="text-sm">{fmtDate(r.dueDate)}</p>
                        {r.daysPastDue > 0 && (
                            <p className="text-xs font-medium">{r.daysPastDue}d late</p>
                        )}
                    </div>
                );
            },
        },
        { key: 'grandTotal', label: 'Total', render: (r) => <span className="font-medium">{fmt(r.grandTotal)}</span> },
        {
            key: 'balanceDue', label: 'Outstanding',
            render: (r) => r.balanceDue > 0
                ? <span className="font-medium text-red-600">{fmt(r.balanceDue)}</span>
                : <span className="text-green-600 font-medium">Paid</span>,
        },
        {
            key: 'paymentStatus', label: 'Status',
            render: (r) => <Badge variant={paymentStatusVariant[r.paymentStatus]}>{r.paymentStatus.replace('_', ' ')}</Badge>,
        },
        {
            key: 'actions', label: 'Actions', width: '180px',
            render: (r) => (
                <div className="flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {r.paymentStatus !== 'paid' && r.balanceDue > 0 && (
                        <button
                            onClick={() => {
                                setSelectedPayInvoice(r);
                                setPayAmount(r.balanceDue || '');
                                setPayMethod('cash');
                                setPayBankAccountId('');
                                setPayReference('');
                            }}
                            className="px-2 py-1 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-1 shadow-xs"
                            title="Record Payment / Mark Paid"
                        >
                            <CheckCircle size={12} /> Pay
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setSelectedConvertInvoice(r);
                            setConvertStep('choose');
                            setConvertYard('');
                            setConvertDetails('');
                            setConvertAdvance('');
                        }}
                        className="px-2 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition flex items-center gap-1 border border-indigo-200"
                        title="Convert Invoice"
                    >
                        <RefreshCw size={12} /> Convert
                    </button>
                    <button
                        onClick={() => {
                            setRevertInvoiceModal(r);
                            setRevertAdminPassword('');
                        }}
                        className="px-2 py-1 text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition flex items-center gap-1 border border-amber-200"
                        title="Revert to Quotation Draft (Admin Password required)"
                    >
                        <RotateCcw size={12} /> Revert
                    </button>
                    {user?.role === 'admin' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/invoices/new?edit=${r._id}`);
                            }}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="Edit Invoice (Admin Only)"
                        >
                            <Edit size={16} />
                        </button>
                    )}
                    <button onClick={() => navigate(`/invoices/${r._id}`)}
                        className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded">
                        <Eye size={16} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="Invoices, Quotes & Estimates"
                actions={canCreate && (
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate('/invoices/from-sales-order')}>
                            From Sales Order
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigate('/invoices/new?type=estimate')}>
                            <Plus size={15} className="mr-1" /> New Estimate
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigate('/invoices/new?type=quotation')}>
                            <Plus size={15} className="mr-1" /> New Quotation
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => navigate('/invoices/new?type=invoice')}>
                            <Plus size={15} className="mr-1" /> Add Invoice
                        </Button>
                    </div>
                )}
            />

            {/* Master Navigation Tabs: Invoices | Quotations | Estimates */}
            <div className="flex items-center gap-2 p-1.5 bg-gray-100 dark:bg-slate-800/80 rounded-2xl border border-gray-200 dark:border-slate-700 mb-6 max-w-xl">
                <button
                    type="button"
                    onClick={() => handleTabChange('invoices')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs md:text-sm font-bold transition flex items-center justify-center gap-2 ${
                        masterTab === 'invoices'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-slate-700/50'
                    }`}
                >
                    <Receipt size={16} />
                    <span>Invoices</span>
                    {total > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${masterTab === 'invoices' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>
                            {total}
                        </span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => handleTabChange('quotations')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs md:text-sm font-bold transition flex items-center justify-center gap-2 ${
                        masterTab === 'quotations'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-slate-700/50'
                    }`}
                >
                    <FileText size={16} />
                    <span>Quotations</span>
                </button>
                <button
                    type="button"
                    onClick={() => handleTabChange('estimates')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs md:text-sm font-bold transition flex items-center justify-center gap-2 ${
                        masterTab === 'estimates'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-slate-700/50'
                    }`}
                >
                    <ClipboardList size={16} />
                    <span>Estimates</span>
                </button>
            </div>

            {masterTab === 'quotations' ? (
                <QuotationsPage embedded={true} initialTab="quotation" />
            ) : masterTab === 'estimates' ? (
                <QuotationsPage embedded={true} initialTab="estimate" />
            ) : (
                <>
                    {/* Aging summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                        {[
                            { key: 'current', label: 'Current', color: 'bg-green-50 text-green-700 border-green-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60' },
                            { key: '1_30', label: '1-30 days', color: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60' },
                            { key: '31_60', label: '31-60 days', color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60' },
                            { key: '61_90', label: '61-90 days', color: 'bg-red-50 text-red-700 border-red-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60' },
                            { key: '90_plus', label: '90+ days', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60' },
                        ].map((b) => (
                            <button key={b.key}
                                onClick={() => setFilters((f) => ({ ...f, agingBucket: f.agingBucket === b.key ? '' : b.key, page: 1 }))}
                                className={`border rounded-lg py-2 px-3 text-left transition ${b.color} ${filters.agingBucket === b.key ? 'ring-2 ring-offset-1 ring-primary-500' : ''}`}>
                                <p className="text-[11px] opacity-75 leading-tight">{b.label}</p>
                                <p className="text-base font-bold my-0.5 font-mono leading-tight">{fmt(aging.buckets?.[b.key] || 0)}</p>
                                <p className="text-[11px] opacity-60 leading-tight">{aging.counts?.[b.key] || 0} invoices</p>
                            </button>
                        ))}
                    </div>

                    <Card>
                        {/* Invoice Type & Status Filter Pills */}
                        <div className="flex overflow-x-auto flex-nowrap border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111F33] rounded-t-xl">
                            <button
                                onClick={() => setFilters((f) => ({ ...f, invoiceType: 'commercial', paymentStatus: '', page: 1 }))}
                                className={`flex-1 py-3 px-4 text-xs md:text-sm font-semibold border-b-2 text-center transition-all ${
                                    filters.invoiceType === 'commercial' && !filters.paymentStatus
                                        ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-800/60'
                                        : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                }`}
                            >
                                Standard / Commercial
                            </button>
                            <button
                                onClick={() => setFilters((f) => ({ ...f, invoiceType: 'commercial', paymentStatus: 'paid', page: 1 }))}
                                className={`flex-1 py-3 px-4 text-xs md:text-sm font-semibold border-b-2 text-center transition-all ${
                                    filters.invoiceType === 'commercial' && filters.paymentStatus === 'paid'
                                        ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-800/60'
                                        : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                }`}
                            >
                                Fully Paid Invoices
                            </button>
                            <button
                                onClick={() => setFilters((f) => ({ ...f, invoiceType: 'proforma', paymentStatus: '', page: 1 }))}
                                className={`flex-1 py-3 px-4 text-xs md:text-sm font-semibold border-b-2 text-center transition-all ${
                                    filters.invoiceType === 'proforma'
                                        ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-800/60'
                                        : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                }`}
                            >
                                Proforma Invoices
                            </button>
                        </div>

                        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row flex-wrap gap-2">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                                <input type="text" placeholder="Search by invoice # or customer..."
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-[16px] min-h-[44px] bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                                    value={filters.search}
                                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                            const searchVal = e.target.value.trim();
                                            if (searchVal.toUpperCase().startsWith('INV-')) {
                                                const found = invoices.find(inv => inv.invoiceNumber?.toUpperCase() === searchVal.toUpperCase());
                                                if (found) {
                                                    navigate(`/invoices/${found._id}`);
                                                } else {
                                                    try {
                                                        const res = await api.get(`/invoices?search=${searchVal}`);
                                                        const foundBack = res.data?.data?.find(inv => inv.invoiceNumber?.toUpperCase() === searchVal.toUpperCase());
                                                        if (foundBack) {
                                                            navigate(`/invoices/${foundBack._id}`);
                                                        }
                                                    } catch (err) {
                                                        console.error('Barcode fetch failed', err);
                                                    }
                                                }
                                            }
                                        }
                                    }} />
                            </div>
                            <div className="w-full sm:w-48">
                                <Select placeholder="All Statuses"
                                    options={[
                                        { value: 'unpaid', label: 'Unpaid' },
                                        { value: 'partially_paid', label: 'Partially Paid' },
                                        { value: 'paid', label: 'Paid' },
                                        { value: 'overdue', label: 'Overdue' },
                                        { value: 'cancelled', label: 'Cancelled' },
                                    ]}
                                    value={filters.paymentStatus}
                                    onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value, page: 1 }))} />
                            </div>

                            {/* Date-wise filter inputs */}
                            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800/60 border border-gray-300 dark:border-slate-700 rounded-lg px-2.5 py-1 min-h-[44px]">
                                <Calendar size={15} className="text-gray-400 dark:text-slate-500 shrink-0" />
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-gray-500 dark:text-slate-400 uppercase leading-none">From Date</span>
                                    <input
                                        type="date"
                                        className="bg-transparent text-xs text-gray-800 dark:text-slate-100 focus:outline-none [color-scheme:light] dark:[color-scheme:dark]"
                                        value={filters.startDate || ''}
                                        onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value, page: 1 }))}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800/60 border border-gray-300 dark:border-slate-700 rounded-lg px-2.5 py-1 min-h-[44px]">
                                <Calendar size={15} className="text-gray-400 dark:text-slate-500 shrink-0" />
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-gray-500 dark:text-slate-400 uppercase leading-none">To Date</span>
                                    <input
                                        type="date"
                                        className="bg-transparent text-xs text-gray-800 dark:text-slate-100 focus:outline-none [color-scheme:light] dark:[color-scheme:dark]"
                                        value={filters.endDate || ''}
                                        onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value, page: 1 }))}
                                    />
                                </div>
                            </div>
                            {(filters.startDate || filters.endDate) && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFilters((f) => ({ ...f, startDate: '', endDate: '', page: 1 }))}
                                    className="text-xs text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1 self-center"
                                    title="Clear date range"
                                >
                                    <X size={13} /> Clear Dates
                                </Button>
                            )}

                            {filters.agingBucket && (
                                <Button variant="outline" size="sm" onClick={() => setFilters((f) => ({ ...f, agingBucket: '', page: 1 }))}>
                                    Clear aging filter
                                </Button>
                            )}
                        </div>

                        {isLoading ? (
                            <div className="py-16 text-center text-gray-500">Loading...</div>
                        ) : invoices.length === 0 ? (
                            <EmptyState icon={FileText} title="No invoices" description="Generate invoices from sales orders or create manual ones"
                                action={canCreate && <Button variant="primary" onClick={() => navigate('/invoices/from-sales-order')}>
                                    Generate from Sales Order
                                </Button>} />
                        ) : (
                            <>
                                <Table columns={columns} data={invoices} onRowClick={(r) => navigate(`/invoices/${r._id}`)} />
                                <Pagination page={filters.page} totalPages={totalPages} total={total}
                                    onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
                            </>
                        )}
                    </Card>
                </>
            )}

            {/* CONVERT INVOICE MODAL */}
            {selectedConvertInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-[#111F33] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp border border-gray-100 dark:border-slate-700">
                        <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-3">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Convert Invoice</h3>
                                <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">{selectedConvertInvoice.invoiceNumber} · Total: {fmt(selectedConvertInvoice.grandTotal)}</p>
                            </div>
                            <button onClick={() => setSelectedConvertInvoice(null)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 text-lg">✕</button>
                        </div>

                        {convertStep === 'choose' ? (
                            <div className="space-y-3 pt-2">
                                <p className="text-xs text-gray-600 dark:text-slate-300 font-medium">Select target conversion format:</p>

                                {selectedConvertInvoice.invoiceType === 'proforma' ? (
                                    <button
                                        type="button"
                                        onClick={handleConvertToCommercial}
                                        disabled={isSubmittingConvert}
                                        className="w-full p-4 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/60 dark:hover:bg-blue-950/50 transition text-left flex items-start gap-3 group"
                                    >
                                        <div className="p-2.5 bg-blue-600 text-white rounded-xl group-hover:scale-105 transition">
                                            <FileCheck size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">Convert to Commercial Invoice</h4>
                                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Convert Proforma Invoice into standard tax/commercial invoice & deduct inventory</p>
                                        </div>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleConvertToProforma}
                                        disabled={isSubmittingConvert}
                                        className="w-full p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/30 hover:bg-amber-100/60 dark:hover:bg-amber-950/50 transition text-left flex items-start gap-3 group"
                                    >
                                        <div className="p-2.5 bg-amber-500 text-white rounded-xl group-hover:scale-105 transition">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">Convert to Proforma Invoice (PI)</h4>
                                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Change invoice format into a Proforma Estimate for client review</p>
                                        </div>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setConvertStep('project')}
                                    className="w-full p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/50 transition text-left flex items-start gap-3 group"
                                >
                                    <div className="p-2.5 bg-emerald-600 text-white rounded-xl group-hover:scale-105 transition">
                                        <Briefcase size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">Convert to Project (Yard Job)</h4>
                                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Create a Project to track materials, labor cost, and progress at the yard</p>
                                    </div>
                                </button>

                                <div className="pt-2 flex justify-end">
                                    <Button variant="outline" size="sm" onClick={() => setSelectedConvertInvoice(null)}>Cancel</Button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleConvertToProjectSubmit} className="space-y-4">
                                <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-200">
                                    <p className="text-xs font-bold uppercase">Target Project Summary</p>
                                    <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5 font-medium">Customer: {selectedConvertInvoice.customerSnapshot?.name || selectedConvertInvoice.vehicleOwner || 'Customer'}</p>
                                    <p className="text-xs text-indigo-700 dark:text-indigo-300 font-mono font-bold">Quoted Value: {fmt(selectedConvertInvoice.grandTotal)}</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase">Select Yard Location</label>
                                    <select
                                        value={convertYard}
                                        onChange={(e) => setConvertYard(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-slate-900 dark:focus:border-slate-500 [&>option]:dark:bg-slate-900"
                                    >
                                        <option value="">-- Select Yard Location --</option>
                                        <option value="Ja-Ela Yard 1">Ja-Ela Yard 1</option>
                                        <option value="Ja-Ela Yard 2">Ja-Ela Yard 2</option>
                                        <option value="Ekala Yard">Ekala Yard</option>
                                        <option value="Main Yard">Main Yard</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase">Project Notes / Work Details</label>
                                    <textarea
                                        rows={2}
                                        value={convertDetails}
                                        onChange={(e) => setConvertDetails(e.target.value)}
                                        placeholder="Add work scope, vehicle details or instructions..."
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-slate-900 dark:focus:border-slate-500"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase">Advance Payment Amount (Optional)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="e.g. 50000"
                                        value={convertAdvance}
                                        onChange={(e) => setConvertAdvance(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-xs font-bold font-mono bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-slate-900 dark:focus:border-slate-500"
                                    />
                                </div>

                                <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-slate-700">
                                    <Button type="button" variant="outline" size="sm" onClick={() => setConvertStep('choose')}>← Back</Button>
                                    <Button type="submit" variant="primary" size="sm" loading={isSubmittingConvert} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                                        Create Project
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
            {/* QUICK PAY MODAL */}
            {selectedPayInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-[#111F33] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp border border-gray-100 dark:border-slate-700">
                        <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-3">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Record Payment</h3>
                                <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">{selectedPayInvoice.invoiceNumber}</p>
                            </div>
                            <button onClick={() => setSelectedPayInvoice(null)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 text-lg">✕</button>
                        </div>
                        <form onSubmit={handleQuickPaySubmit} className="space-y-4">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Balance Due</span>
                                    <p className="text-xl font-bold text-emerald-950 dark:text-emerald-200">{fmt(selectedPayInvoice.balanceDue)}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Total Invoice</span>
                                    <p className="text-xs font-mono text-emerald-900 dark:text-emerald-300">{fmt(selectedPayInvoice.grandTotal)}</p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">Payment Amount (LKR) *</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={selectedPayInvoice.balanceDue}
                                    step="0.01"
                                    required
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                    placeholder={`Max ${selectedPayInvoice.balanceDue}`}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm font-bold font-mono bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                                />
                                <p className="text-[11px] text-gray-500 dark:text-slate-400">Enter full payment amount or partial payment amount.</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">Payment Method</label>
                                <select
                                    value={payMethod}
                                    onChange={(e) => setPayMethod(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white [&>option]:dark:bg-slate-900"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="card">Card</option>
                                    <option value="cheque">Cheque</option>
                                </select>
                            </div>

                            {(payMethod === 'cheque' || payMethod === 'bank_transfer') && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">Company Bank Account</label>
                                    <select
                                        required
                                        value={payBankAccountId}
                                        onChange={(e) => setPayBankAccountId(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white [&>option]:dark:bg-slate-900"
                                    >
                                        <option value="">-- Select Account --</option>
                                        {bankAccounts.map(acc => (
                                            <option key={acc._id} value={acc._id}>
                                                {acc.bankName} - {acc.accountNumber} (LKR {acc.balance?.toLocaleString()})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">Reference / Notes</label>
                                <input
                                    type="text"
                                    value={payReference}
                                    onChange={(e) => setPayReference(e.target.value)}
                                    placeholder="Txn ID, Cheque No, or Notes"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                                <Button variant="outline" type="button" onClick={() => setSelectedPayInvoice(null)}>Cancel</Button>
                                <Button variant="primary" type="submit" loading={isSubmittingPay} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                                    Confirm Payment
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* REVERT INVOICE MODAL */}
            {revertInvoiceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-[#111F33] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp border border-gray-100 dark:border-slate-700">
                        <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-3">
                            <h3 className="font-bold text-amber-900 dark:text-amber-300 text-lg flex items-center gap-2">
                                <RotateCcw size={18} /> Revert Invoice to Quotation
                            </h3>
                            <button onClick={() => setRevertInvoiceModal(null)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 text-lg">✕</button>
                        </div>
                        <form onSubmit={handleRevertSubmit} className="space-y-4">
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                                <p className="font-bold uppercase">⚠️ Admin Authorization Required</p>
                                <p>Reverting <strong>{revertInvoiceModal.invoiceNumber}</strong> will cancel this invoice and restore/create a Quotation document in <strong>Draft</strong> status.</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">Admin Password *</label>
                                <input
                                    type="password"
                                    required
                                    value={revertAdminPassword}
                                    onChange={(e) => setRevertAdminPassword(e.target.value)}
                                    placeholder="Enter Admin Password to verify"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-mono"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                                <Button variant="outline" type="button" onClick={() => setRevertInvoiceModal(null)}>Cancel</Button>
                                <Button variant="primary" type="submit" loading={isReverting} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                                    Confirm Revert
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <DocumentEditLogModal
                isOpen={!!selectedLogDoc}
                onClose={() => setSelectedLogDoc(null)}
                document={selectedLogDoc}
            />
        </div>
    );
}