import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowLeft, ArrowRight, Filter, Download, ExternalLink, Printer, Ban, Pencil } from 'lucide-react';
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
import { usePayments, useCancelPayment } from '../features/payments/usePayments';
import { useAuthStore } from '../store/authStore';
import { usePermission } from '../hooks/usePermission';
import { useSettings } from '../features/settings/useSettings';
import PaymentReceiptPrintView from '../components/print/PaymentReceiptPrintView';
import { exportElementToPDF, printElementAsPDF, buildPaymentFileName } from '../utils/dataExport';
import EditReceiptModal from '../features/payments/EditReceiptModal';

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
    const [status, setStatus] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [previewPayment, setPreviewPayment] = useState(null);
    const [cancellingPayment, setCancellingPayment] = useState(null);
    const [editingPayment, setEditingPayment] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const cancelPaymentMutation = useCancelPayment();

    const printModalRef = useRef(null);
    const directExportRef = useRef(null);
    const [directExportPayment, setDirectExportPayment] = useState(null);

    const { data, isLoading, error } = usePayments({
        page,
        limit,
        search,
        direction,
        method,
        status,
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

    const handleDownloadReceipt = async (e, row) => {
        e.stopPropagation();
        let filename = buildPaymentFileName(row);
        
        toast.loading('Generating PDF...', { id: 'receipt-dl' });
        try {
            // Fetch complete populated payment details if possible
            let fullPayment = row;
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${getApiUrl()}/payments/${row._id}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                if (res.data?.data) {
                    fullPayment = res.data.data;
                }
            } catch (fetchErr) {
                // proceed with row
            }
            // Use the full record so the customer name is included in the file name
            filename = buildPaymentFileName(fullPayment);

            setDirectExportPayment(fullPayment);
            setTimeout(async () => {
                try {
                    if (directExportRef.current) {
                        await exportElementToPDF(directExportRef.current, filename);
                        toast.success('Downloaded successfully', { id: 'receipt-dl' });
                    } else {
                        throw new Error('Export reference missing');
                    }
                } catch (err) {
                    console.warn('In-browser PDF export failed, fallback to server:', err);
                    const token = localStorage.getItem('token');
                    const res = await axios.get(`${getApiUrl()}/payments/${row._id}/receipt`, {
                        responseType: 'blob',
                        headers: token ? { Authorization: `Bearer ${token}` } : {}
                    });
                    const blob = new Blob([res.data], { type: 'application/pdf' });
                    const link = document.createElement('a');
                    link.href = window.URL.createObjectURL(blob);
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast.success('Downloaded successfully', { id: 'receipt-dl' });
                } finally {
                    setDirectExportPayment(null);
                }
            }, 500);
        } catch (err) {
            console.error('Download error:', err);
            toast.error('Failed to download PDF', { id: 'receipt-dl' });
            setDirectExportPayment(null);
        }
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
            key: 'status',
            label: 'Status',
            render: (row) => (
                row.status === 'cancelled' ? (
                    <Badge variant="danger">Cancelled</Badge>
                ) : (
                    <Badge variant="success">Active</Badge>
                )
            ),
        },
        {
            key: 'amount',
            label: 'Amount',
            render: (row) => (
                <span className={`font-semibold ${row.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{fmt(row.amount)}</span>
            ),
        },
        {
            key: 'reference',
            label: 'Reference',
            render: (row) => row.transactionReference || row.chequeNumber || '-',
        },
        {
            key: 'actions',
            label: 'Receipt / Actions',
            render: (row) => (
                <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
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
                    {row.status !== 'cancelled' && row.direction !== 'paid' && !row.voucherType && canCreate && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingPayment(row);
                            }}
                            title="Edit this receipt"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md border border-amber-200 transition cursor-pointer"
                        >
                            <Pencil size={12} />
                            <span>Edit</span>
                        </button>
                    )}
                    {row.status !== 'cancelled' && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCancellingPayment(row);
                                setCancelReason('');
                            }}
                            title="Cancel this payment & reverse balance"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition cursor-pointer"
                        >
                            <Ban size={12} />
                            <span>Cancel</span>
                        </button>
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
                <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search by payment number, party name..."
                            value={search}
                            onChange={handleSearch}
                            className="w-full pl-9 pr-4 py-2 min-h-[44px] border border-gray-300 dark:border-slate-700 bg-white dark:bg-[#132238] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div className="w-full sm:w-40">
                        <Select
                            placeholder="All Directions"
                            value={direction}
                            onChange={(e) => { setDirection(e.target.value); setPage(1); }}
                            options={[
                                { value: 'received', label: 'Money In' },
                                { value: 'paid', label: 'Money Out' },
                            ]}
                        />
                    </div>

                    <div className="w-full sm:w-40">
                        <Select
                            placeholder="All Methods"
                            value={method}
                            onChange={(e) => { setMethod(e.target.value); setPage(1); }}
                            options={Object.entries(methodLabels).map(([k, v]) => ({ value: k, label: v }))}
                        />
                    </div>

                    <div className="w-full sm:w-40">
                        <Select
                            placeholder="All Statuses"
                            value={status}
                            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                            options={[
                                { value: 'confirmed', label: 'Confirmed Only' },
                                { value: 'cancelled', label: 'Cancelled Only' },
                            ]}
                        />
                    </div>

                    <DateRangeFilter
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={(d) => { setStartDate(d); setPage(1); }}
                        onEndDateChange={(d) => { setEndDate(d); setPage(1); }}
                        onClear={() => { setStartDate(''); setEndDate(''); setPage(1); }}
                    />
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
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            total={total}
                            onPageChange={setPage}
                        />
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
                            <div className="flex items-center gap-2">
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
                                <Button 
                                    onClick={async () => {
                                        if (!previewPayment || !printModalRef.current) return;
                                        await exportElementToPDF(printModalRef.current, buildPaymentFileName(previewPayment));
                                    }} 
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                >
                                    <Download size={15} className="mr-1.5" /> Download PDF
                                </Button>
                            </div>
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

            {/* Edit Receipt Modal */}
            <EditReceiptModal
                isOpen={!!editingPayment}
                onClose={() => setEditingPayment(null)}
                payment={editingPayment}
            />

            {/* Cancel Payment Confirmation Modal */}
            <Modal
                isOpen={!!cancellingPayment}
                onClose={() => !cancelPaymentMutation.isPending && setCancellingPayment(null)}
                title={`Cancel Payment - ${cancellingPayment?.paymentNumber || ''}`}
                size="md"
            >
                {cancellingPayment && (
                    <div className="space-y-4">
                        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-300">
                            <p className="font-bold mb-1">⚠️ Are you sure you want to cancel this payment?</p>
                            <p>
                                Cancelling payment <span className="font-mono font-bold">{cancellingPayment.paymentNumber}</span> for <span className="font-bold">{fmt(cancellingPayment.amount)}</span> will automatically reverse linked invoice/quotation/estimate/bill settlements, reinstate the balance due, and reverse bank/cash balances.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                                Cancellation Reason (Required)
                            </label>
                            <textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="E.g. Incorrect amount entered, customer returned cheque, duplicate payment..."
                                rows={3}
                                className="w-full text-xs p-2.5 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <div className="flex justify-end items-center gap-2 pt-2 border-t border-gray-200 dark:border-slate-700">
                            <button
                                type="button"
                                disabled={cancelPaymentMutation.isPending}
                                onClick={() => setCancellingPayment(null)}
                                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition"
                            >
                                Back / Keep Payment
                            </button>
                            <button
                                type="button"
                                disabled={cancelPaymentMutation.isPending}
                                onClick={async () => {
                                    if (!cancellingPayment) return;
                                    try {
                                        await cancelPaymentMutation.mutateAsync({
                                            id: cancellingPayment._id,
                                            reason: cancelReason || 'Payment cancelled by user',
                                        });
                                        setCancellingPayment(null);
                                        setCancelReason('');
                                    } catch (err) {
                                        // Error handled in useCancelPayment
                                    }
                                }}
                                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                            >
                                <Ban size={14} />
                                {cancelPaymentMutation.isPending ? 'Cancelling Payment...' : 'Yes, Cancel Payment'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Offscreen print renderer for direct row/card PDF downloads */}
            {directExportPayment && (
                <div style={{ position: 'fixed', left: '-9999px', top: 0, width: '210mm', pointerEvents: 'none', zIndex: -100 }}>
                    <PaymentReceiptPrintView
                        ref={directExportRef}
                        payment={directExportPayment}
                        companyInfo={companyInfo}
                        hideToolbar={true}
                        hideLetterheadHeader={false}
                    />
                </div>
            )}
        </div>
    );
}

export default PaymentsPage;
