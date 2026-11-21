import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, ExternalLink, Printer, Ban, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getApiUrl } from '../api/config';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useQuery } from '@tanstack/react-query';
import { paymentsApi } from '../features/payments/paymentsApi';
import { useSettings } from '../features/settings/useSettings';
import PaymentReceiptPrintView from '../components/print/PaymentReceiptPrintView';
import { exportElementToPDF, printElementAsPDF, buildPaymentFileName } from '../utils/dataExport';
import EditReceiptModal from '../features/payments/EditReceiptModal';
import { usePermission } from '../hooks/usePermission';

export default function PaymentDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const printRef = useRef(null);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const { hasPermission } = usePermission();

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['payment', id], queryFn: () => paymentsApi.getById(id),
    });
    const { data: settingsData } = useSettings();
    const companyInfo = settingsData?.data;

    const p = data?.data;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => new Date(d).toLocaleDateString('en-LK');

    const handlePrintReceipt = () => {
        toast.dismiss();
        if (printRef.current) {
            printElementAsPDF(printRef.current);
        } else {
            window.print();
        }
    };

    const handleDownloadReceipt = async () => {
        if (!p) return;
        const filename = buildPaymentFileName(p);

        toast.loading('Generating PDF...', { id: 'pdetail-receipt' });
        try {
            if (printRef.current) {
                await exportElementToPDF(printRef.current, filename);
                toast.success('Downloaded successfully', { id: 'pdetail-receipt' });
                return;
            }
        } catch (err) {
            console.warn('In-browser PDF export failed, fallback to server:', err);
        }

        // Fallback to server download
        const token = localStorage.getItem('token');
        axios.get(`${getApiUrl()}/payments/${p._id}/receipt`, {
            responseType: 'blob',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }).then((res) => {
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Downloaded successfully', { id: 'pdetail-receipt' });
        }).catch((err) => {
            console.error('Download error:', err);
            toast.error('Failed to download PDF', { id: 'pdetail-receipt' });
        });
    };

    const handleConfirmCancel = async () => {
        setIsCancelling(true);
        try {
            await paymentsApi.cancel(id, { reason: cancelReason || 'Payment cancelled by user' });
            toast.success('Payment has been cancelled and balances recalculated');
            setIsCancelModalOpen(false);
            setCancelReason('');
            refetch();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to cancel payment');
        } finally {
            setIsCancelling(false);
        }
    };

    if (isLoading || !p) return <div className="py-16 text-center text-gray-500">Loading...</div>;

    const isVoucher = p.direction === 'paid' || !!p.voucherType;
    const isCancelled = p.status === 'cancelled';

    return (
        <div>
            {/* Dashboard UI: Hidden during print so print dialog prints ONLY the 1-page receipt */}
            <div className="no-print">
                <PageHeader
                    title={<span className="flex items-center gap-3">
                        Payment {p.paymentNumber}
                        <Badge variant={isCancelled ? 'danger' : (p.direction === 'received' ? 'success' : 'info')}>
                            {isCancelled ? 'CANCELLED' : (p.direction === 'received' ? 'MONEY IN' : 'MONEY OUT')}
                        </Badge>
                    </span>}
                    description={`${fmtDate(p.paymentDate)}${p.method ? ' · ' + p.method.replace(/_/g, ' ') : ''}`}
                    actions={
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button variant="outline" onClick={() => navigate('/payments')}>
                                <ArrowLeft size={16} className="mr-1.5" /> Back
                            </Button>
                            <Button onClick={handlePrintReceipt} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs">
                                <Printer size={16} className="mr-1.5" /> Print {isVoucher ? 'Voucher' : 'Receipt'}
                            </Button>
                            <Button onClick={handleDownloadReceipt} className="bg-blue-600 hover:bg-blue-700 text-white">
                                <Download size={16} className="mr-1.5" /> Download PDF
                            </Button>
                            {p.publicToken && (
                                <a
                                    href={`/public/documents/${p.publicToken}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition"
                                >
                                    <ExternalLink size={15} />
                                    <span>Public View</span>
                                </a>
                            )}
                            {!isCancelled && hasPermission('payments.manage') && (
                                <Button variant="outline" onClick={() => setIsEditOpen(true)}>
                                    <Pencil size={16} className="mr-1.5" /> Edit {isVoucher ? 'Voucher' : 'Receipt'}
                                </Button>
                            )}
                            {!isCancelled && (
                                <Button
                                    onClick={() => {
                                        setIsCancelModalOpen(true);
                                        setCancelReason('');
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs"
                                >
                                    <Ban size={16} className="mr-1.5" /> Cancel Payment
                                </Button>
                            )}
                        </div>
                    }
                />

                {isCancelled && (
                    <div className="p-4 mb-5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-200 flex items-center justify-between">
                        <div>
                            <p className="font-bold text-sm">⚠️ This payment has been CANCELLED</p>
                            <p className="mt-1">
                                Reason: <span className="font-semibold">{p.cancellationReason || 'No reason specified'}</span>
                                {p.cancelledAt && ` · Cancelled on ${new Date(p.cancelledAt).toLocaleString('en-GB')}`}
                            </p>
                        </div>
                        <Badge variant="danger">VOID</Badge>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                    <div className="lg:col-span-2 space-y-5">
                        <Card className="p-5">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">Details</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{p.direction === 'received' ? 'From' : 'To'}</p>
                                    <p className="font-semibold text-gray-800">{p.partyName}</p>
                                    <p className="text-gray-500">{p.customerId?.customerCode || p.supplierId?.supplierCode}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Method</p>
                                    <p className="capitalize font-medium text-gray-700">{p.method?.replace(/_/g, ' ') || '—'}</p>
                                    {p.chequeNumber && <p className="text-gray-500 mt-1">Cheque: {p.chequeNumber} ({fmtDate(p.chequeDate)})</p>}
                                    {p.bankName && <p className="text-gray-500">Bank: {p.bankName}</p>}
                                    {p.transactionReference && <p className="text-gray-500">Ref: {p.transactionReference}</p>}
                                </div>
                            </div>
                            {p.notes && <div className="mt-4 pt-4 border-t border-gray-100"><p className="text-sm whitespace-pre-wrap text-gray-700">{p.notes}</p></div>}
                        </Card>

                        {p.allocations?.length > 0 && (
                            <Card>
                                <div className="px-5 py-4 border-b border-gray-100">
                                    <h3 className="text-sm font-semibold text-gray-700">Applied To</h3>
                                </div>
                                {/* Desktop table */}
                                <div className="hidden sm:block overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-100">
                                            <tr>
                                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Document</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {p.allocations.map((a) => (
                                                <tr key={a._id} className="hover:bg-gray-50">
                                                    <td className="px-5 py-3 font-mono text-sm">
                                                        <button onClick={() => navigate(`/${a.documentType}s/${a.documentId}`)}
                                                            className="text-primary-600 hover:underline">{a.documentNumber}</button>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm capitalize text-gray-600">{a.documentType}</td>
                                                    <td className="px-4 py-3 text-right text-sm font-semibold">{fmt(a.amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Mobile cards */}
                                <div className="sm:hidden divide-y divide-gray-100">
                                    {p.allocations.map((a) => (
                                        <div key={a._id} className="px-4 py-3 flex items-center justify-between gap-3">
                                            <div>
                                                <button onClick={() => navigate(`/${a.documentType}s/${a.documentId}`)}
                                                    className="text-primary-600 hover:underline font-mono text-sm font-medium">
                                                    {a.documentNumber}
                                                </button>
                                                <p className="text-xs text-gray-500 capitalize mt-0.5">{a.documentType}</p>
                                            </div>
                                            <span className="text-sm font-bold text-gray-800 flex-shrink-0">{fmt(a.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>

                    <div className="space-y-5">
                        <Card className="p-5">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">Summary</h3>
                            <div className="space-y-2.5 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Amount</span>
                                    <span className="font-bold text-xl text-primary-600">{fmt(p.amount)}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-gray-100">
                                    <span className="text-gray-500">Allocated</span>
                                    <span className="font-medium">{fmt(p.amount - p.unallocatedAmount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Unallocated</span>
                                    <span className="font-medium">{fmt(p.unallocatedAmount)}</span>
                                </div>
                                {p.unallocatedAmount > 0 && (
                                    <p className="text-xs text-gray-400 pt-1">Available as credit for future applications.</p>
                                )}
                            </div>
                        </Card>

                        <Card className="p-5">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Recorded By</h3>
                            <p className="text-sm font-medium text-gray-800">{p.receivedBy?.firstName} {p.receivedBy?.lastName}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date(p.createdAt).toLocaleString('en-LK')}</p>
                        </Card>
                    </div>
                </div>
            </div>

            {/* ── Official Letterhead Print & Preview Section (Prints clean 1-Page on Paper/PDF) ── */}
            <Card className="p-3 sm:p-6 overflow-x-auto shadow-sm">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 dark:border-slate-800 no-print">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Official {isVoucher ? 'Payment Voucher' : 'Payment Receipt'} Print Preview</h3>
                        <p className="text-xs text-gray-500">Review official layout or print directly with company letterhead</p>
                    </div>
                    <Button onClick={handlePrintReceipt} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                        <Printer size={16} className="mr-1.5" /> Print Now
                    </Button>
                </div>

                <div className="bg-gray-100 dark:bg-slate-900/60 p-2 sm:p-4 rounded-xl flex justify-center">
                    <PaymentReceiptPrintView
                        ref={printRef}
                        payment={p}
                        companyInfo={companyInfo}
                        hideToolbar={false}
                    />
                </div>
            </Card>

            {/* Cancel Payment Confirmation Modal */}
            <EditReceiptModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                payment={p}
                onSaved={() => refetch()}
            />

            <Modal
                isOpen={isCancelModalOpen}
                onClose={() => !isCancelling && setIsCancelModalOpen(false)}
                title={`Cancel Payment - ${p?.paymentNumber || ''}`}
                size="md"
            >
                <div className="space-y-4">
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-300">
                        <p className="font-bold mb-1">⚠️ Are you sure you want to cancel this payment?</p>
                        <p>
                            Cancelling this payment will reverse settlements on all allocated invoices, quotations, estimates, and bills, restore the balance due, and reverse bank/cash balance adjustments.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                            Cancellation Reason (Required)
                        </label>
                        <textarea
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Enter the reason for cancelling this payment..."
                            rows={3}
                            className="w-full text-xs p-2.5 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500"
                        />
                    </div>

                    <div className="flex justify-end items-center gap-2 pt-2 border-t border-gray-200 dark:border-slate-700">
                        <button
                            type="button"
                            disabled={isCancelling}
                            onClick={() => setIsCancelModalOpen(false)}
                            className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition"
                        >
                            Back / Keep Payment
                        </button>
                        <button
                            type="button"
                            disabled={isCancelling}
                            onClick={handleConfirmCancel}
                            className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                        >
                            <Ban size={14} />
                            {isCancelling ? 'Cancelling...' : 'Yes, Cancel Payment'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
