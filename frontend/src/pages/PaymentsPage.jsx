import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowLeft, ArrowRight, Filter, Download, ExternalLink, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getApiUrl } from '../api/config';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import DateRangeFilter from '../components/ui/DateRangeFilter';
import { usePayments } from '../features/payments/usePayments';
import { useAuthStore } from '../store/authStore';
import { usePermission } from '../hooks/usePermission';
import { useSettings } from '../features/settings/useSettings';
import PaymentReceiptPrintView from '../components/print/PaymentReceiptPrintView';
import { printElementAsPDF } from '../utils/dataExport';

const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-LK');

const directionVariant = {
    received: 'success',
    paid: 'info',
};

const methodLabels = {
    cash: 'Cash',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    card: 'Card',
    mobile_payment: 'Mobile Payment',
};

function PaymentsPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { hasPermission, isAdmin } = usePermission();
    const canCreate = isAdmin || hasPermission('payments.manage') || ['admin', 'manager', 'accountant'].includes(user?.role);
    const { data: settingsData } = useSettings();
    const companyInfo = settingsData?.data;

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [search, setSearch] = useState('');
    const [direction, setDirection] = useState('');
    const [method, setMethod] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [previewPayment, setPreviewPayment] = useState(null);
    const printModalRef = useRef(null);

    const { data, isLoading, error } = usePayments({
        page,
        limit,
        search,
        direction,
        method,
        startDate,
        endDate,
    });

    const payments = data?.data || [];
    const totalPages = data?.pagination?.totalPages || 1;
    const total = data?.pagination?.total || 0;

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const handlePrintReceipt = async (e, row) => {
        e.stopPropagation();
        setPreviewPayment(row);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${getApiUrl()}/payments/${row._id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.data?.data) {
                setPreviewPayment(res.data.data);
            }
        } catch (err) {
            // Fallback to row
        }
    };

    const handleDownloadReceipt = (e, row) => {
        e.stopPropagation();
        const token = localStorage.getItem('token');
        const isVoucher = row.direction === 'paid' || !!row.voucherType;
        const prefix = isVoucher ? 'Voucher' : 'Receipt';
        const docNum = row.paymentNumber || row._id;
        
        toast.loading('Generating PDF...', { id: 'receipt-dl' });
        axios.get(`${getApiUrl()}/payments/${row._id}/receipt`, {
            responseType: 'blob',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }).then((res) => {
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = `${prefix}_${docNum}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Downloaded successfully', { id: 'receipt-dl' });
        }).catch((err) => {
            console.error('Download error:', err);
            toast.error('Failed to download PDF', { id: 'receipt-dl' });
        });
    };

    const columns = [
        {
            key: 'paymentNumber',
            label: 'Payment #',
            render: (row) => (
                <span className="font-medium text-gray-900">{row.paymentNumber || 'N/A'}</span>
            ),
        },
        {
            key: 'paymentDate',
            label: 'Date',
            render: (row) => fmtDate(row.paymentDate),
        },
        {
            key: 'partyName',
            label: 'Party',
            render: (row) => (
                <div>
                    <p className="font-medium text-gray-900">{row.partyName || 'N/A'}</p>
                    <p className="text-xs text-gray-500">{row.customerId?.customerCode || row.supplierId?.supplierCode || ''}</p>
                </div>
            ),
        },
        {
            key: 'direction',
            label: 'Direction',
            render: (row) => (
                <Badge variant={directionVariant[row.direction] || 'default'}>
                    {row.direction === 'received' ? 'Money In' : 'Money Out'}
                </Badge>
            ),
        },
        {
            key: 'method',
            label: 'Method',
            render: (row) => methodLabels[row.method] || row.method || 'N/A',
        },
        {
            key: 'amount',
            label: 'Amount',
            render: (row) => (
                <span className="font-semibold text-gray-900">{fmt(row.amount)}</span>
            ),
        },
        {
            key: 'reference',
            label: 'Reference',
            render: (row) => row.transactionReference || row.chequeNumber || '-',
        },
        {
            key: 'actions',
            label: 'Receipt / Voucher',
            render: (row) => (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={(e) => handlePrintReceipt(e, row)}
                        title="Print Official Receipt / Voucher"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-300 transition cursor-pointer"
                    >
                        <Printer size={12} />
                        <span>Print</span>
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleDownloadReceipt(e, row)}
                        title="Download Official PDF Receipt"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition cursor-pointer"
                    >
                        <Download size={12} />
                        <span>PDF</span>
                    </button>
                    {row.publicToken && (
                        <a
                            href={`/public/documents/${row.publicToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View Online Receipt"
                            className="p-1 text-gray-500 hover:text-blue-600 rounded-md hover:bg-gray-100 transition"
                        >
                            <ExternalLink size={14} />
                        </a>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="Payments"
                description={`Total ${total} payments`}
                actions={
                    canCreate && (
                        <Button onClick={() => navigate('/payments/new')}>
                            <Plus size={16} className="mr-1.5" /> New Payment
                        </Button>
                    )
                }
            />

            <Card>
                <div className="p-4 border-b border-gray-200 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search by payment number, party name..."
                                value={search}
                                onChange={handleSearch}
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-[#132238] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Select
                                value={direction}
                                onChange={(e) => { setDirection(e.target.value); setPage(1); }}
                                options={[
                                    { value: '', label: 'All Directions' },
                                    { value: 'received', label: 'Money In' },
                                    { value: 'paid', label: 'Money Out' },
                                ]}
                                className="w-40"
                            />

                            <Select
                                value={method}
                                onChange={(e) => { setMethod(e.target.value); setPage(1); }}
                                options={[
                                    { value: '', label: 'All Methods' },
                                    ...Object.entries(methodLabels).map(([k, v]) => ({ value: k, label: v })),
                                ]}
                                className="w-40"
                            />

                            <DateRangeFilter
                                startDate={startDate}
                                endDate={endDate}
                                onStartDateChange={(d) => { setStartDate(d); setPage(1); }}
                                onEndDateChange={(d) => { setEndDate(d); setPage(1); }}
                            />
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading payments...</div>
                ) : error ? (
                    <div className="p-8 text-center text-red-500">Failed to load payments</div>
                ) : payments.length === 0 ? (
                    <EmptyState
                        icon={ArrowLeft}
                        title="No payments found"
                        description={search ? 'Try adjusting your search or filters' : 'Get started by creating your first payment'}
                        action={
                            canCreate && (
                                <Button onClick={() => navigate('/payments/new')}>
                                    <Plus size={16} className="mr-1.5" /> New Payment
                                </Button>
                            )
                        }
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <Table
                                columns={columns}
                                data={payments}
                                onRowClick={(row) => navigate(`/payments/${row._id}`)}
                            />
                        </div>
                        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} payments
                            </p>
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                onPageChange={setPage}
                            />
                        </div>
                    </>
                )}
            </Card>

            {/* ── Official Print Receipt Modal ── */}
            <Modal
                isOpen={!!previewPayment}
                onClose={() => setPreviewPayment(null)}
                title={`Print ${previewPayment?.direction === 'paid' ? 'Payment Voucher' : 'Payment Receipt'} — ${previewPayment?.paymentNumber || ''}`}
                size="xl"
            >
                {previewPayment && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200 no-print">
                            <div className="text-xs text-gray-600 font-medium">
                                Review official receipt layout below with your company letterhead options.
                            </div>
                            <Button 
                                onClick={() => {
                                    if (printModalRef.current) {
                                        printElementAsPDF(printModalRef.current);
                                    } else {
                                        window.print();
                                    }
                                }} 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            >
                                <Printer size={15} className="mr-1.5" /> Print Now
                            </Button>
                        </div>
                        <div className="overflow-x-auto bg-gray-100 p-2 sm:p-4 rounded-xl flex justify-center">
                            <PaymentReceiptPrintView
                                ref={printModalRef}
                                payment={previewPayment}
                                companyInfo={companyInfo}
                                hideToolbar={false}
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default PaymentsPage;
