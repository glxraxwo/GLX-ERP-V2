import { useState, useEffect, useRef } from 'react';
import { ShieldCheck, FileCheck, DollarSign, Clock, UserCheck, AlertCircle, Download, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getApiUrl } from '../../api/config';
import { paymentsApi } from '../../features/payments/paymentsApi';
import Modal from '../ui/Modal';
import PaymentReceiptPrintView from '../print/PaymentReceiptPrintView';
import { exportElementToPDF, printElementAsPDF } from '../../utils/dataExport';
import { useSettings } from '../../features/settings/useSettings';

export default function DocumentPaymentAudit({ documentId, title = 'Payment History' }) {
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [previewPayment, setPreviewPayment] = useState(null);
    const printModalRef = useRef(null);
    const directExportRef = useRef(null);
    const [directExportPayment, setDirectExportPayment] = useState(null);
    const { data: settingsData } = useSettings();
    const companyInfo = settingsData?.data;

    useEffect(() => {
        if (!documentId) return;
        setIsLoading(true);
        setError(null);

        paymentsApi.getDocumentSummary(documentId)
            .then((res) => {
                setSummary(res);
                setIsLoading(false);
            })
            .catch((err) => {
                console.error('Failed to load document payment history summary:', err);
                setError('Unable to fetch payment history.');
                setIsLoading(false);
            });
    }, [documentId]);

    const handleDownloadReceipt = async (paymentId, paymentNumber, isVoucher) => {
        const prefix = isVoucher ? 'Voucher' : 'Receipt';
        const docNum = paymentNumber || paymentId;
        const filename = `${prefix}_${String(docNum).replace(/[\\/:*?"<>|]/g, '_')}.pdf`;

        toast.loading('Downloading PDF...', { id: 'audit-receipt' });
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${getApiUrl()}/payments/${paymentId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const fullPayment = res.data?.data || { _id: paymentId, paymentNumber, direction: isVoucher ? 'paid' : 'received' };

            setDirectExportPayment(fullPayment);
            setTimeout(async () => {
                try {
                    if (directExportRef.current) {
                        await exportElementToPDF(directExportRef.current, filename);
                        toast.success('Downloaded successfully', { id: 'audit-receipt' });
                    } else {
                        throw new Error('Export ref missing');
                    }
                } catch (err) {
                    console.warn('In-browser PDF export failed, fallback to server:', err);
                    const fallbackRes = await axios.get(`${getApiUrl()}/payments/${paymentId}/receipt`, {
                        responseType: 'blob',
                        headers: token ? { Authorization: `Bearer ${token}` } : {}
                    });
                    const blob = new Blob([fallbackRes.data], { type: 'application/pdf' });
                    const link = document.createElement('a');
                    link.href = window.URL.createObjectURL(blob);
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast.success('Downloaded successfully', { id: 'audit-receipt' });
                } finally {
                    setDirectExportPayment(null);
                }
            }, 500);
        } catch (err) {
            console.error('Download error:', err);
            toast.error('Failed to download PDF', { id: 'audit-receipt' });
            setDirectExportPayment(null);
        }
    };

    const handlePrintReceipt = async (paymentId, paymentObj) => {
        const token = localStorage.getItem('token');
        toast.loading('Loading receipt...', { id: 'audit-receipt' });
        try {
            const res = await axios.get(`${getApiUrl()}/payments/${paymentId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.data?.data) {
                setPreviewPayment(res.data.data);
            } else {
                setPreviewPayment(paymentObj);
            }
            toast.dismiss('audit-receipt');
        } catch (err) {
            setPreviewPayment(paymentObj);
            toast.dismiss('audit-receipt');
        }
    };

    if (!documentId) return null;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm my-6">
            {/* Header Banner */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-base">{title}</h3>
                        <p className="text-xs text-slate-400">Verified payment and receipt transaction history</p>
                    </div>
                </div>
                {summary && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
                        <FileCheck className="w-4 h-4" />
                        {summary.count} Record(s)
                    </div>
                )}
            </div>

            <div className="p-6 space-y-4">
                {isLoading ? (
                    <div className="animate-pulse flex items-center gap-3 text-slate-500 text-sm py-4">
                        <Clock className="w-4 h-4 animate-spin" />
                        Verifying payment history...
                    </div>
                ) : error ? (
                    <div className="text-xs text-rose-500 flex items-center gap-2 py-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                ) : summary ? (
                    <>
                        {/* Payment Audit Records Table */}
                        {summary.payments && summary.payments.length > 0 ? (
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 uppercase font-bold">
                                        <tr>
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Ref #</th>
                                            <th className="p-3">Type</th>
                                            <th className="p-3">Method</th>
                                            <th className="p-3 text-right">Amount (LKR)</th>
                                            <th className="p-3">Handled By</th>
                                            <th className="p-3">Signature / Remarks</th>
                                            <th className="p-3 text-center">Receipt</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                                        {summary.payments.map((p) => {
                                            const isVoucher = p.direction === 'paid' || !!p.voucherType;
                                            return (
                                                <tr key={p.paymentId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                    <td className="p-3 whitespace-nowrap font-medium">
                                                        {new Date(p.paymentDate).toLocaleDateString('en-GB')}
                                                    </td>
                                                    <td className="p-3 whitespace-nowrap font-mono font-bold">
                                                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                                                            isVoucher
                                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                        }`}>
                                                            {p.paymentNumber}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 capitalize font-semibold">
                                                        {p.voucherType ? (
                                                            <span className="text-amber-600 dark:text-amber-400">
                                                                {p.voucherType.replace(/_/g, ' ')}
                                                            </span>
                                                        ) : (
                                                            <span className="text-emerald-600 dark:text-emerald-400">
                                                                Cash IN Receipt
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 capitalize">
                                                        {p.method} {p.chequeNumber ? `(#${p.chequeNumber})` : ''}
                                                    </td>
                                                    <td className="p-3 text-right font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                                        LKR {(p.amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="p-3 font-medium flex items-center gap-1.5">
                                                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                                                        {p.handledBy}
                                                    </td>
                                                    <td className="p-3 italic text-slate-600 dark:text-slate-400">
                                                        {p.signatureNote || p.notes || '-'}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => handlePrintReceipt(p.paymentId, p)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 transition cursor-pointer"
                                                                title="Print Official Receipt"
                                                            >
                                                                <Printer className="w-3.5 h-3.5" />
                                                                Print
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDownloadReceipt(p.paymentId, p.paymentNumber, isVoucher)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 transition cursor-pointer"
                                                                title="Download Official PDF Receipt"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                                PDF
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500 italic py-2">
                                No vouchers or receipts recorded for this document yet.
                            </p>
                        )}
                    </>
                ) : null}
            </div>

            {/* Print Official Receipt Modal */}
            <Modal
                isOpen={!!previewPayment}
                onClose={() => setPreviewPayment(null)}
                title={`Print ${previewPayment?.direction === 'paid' ? 'Payment Voucher' : 'Payment Receipt'} - ${previewPayment?.paymentNumber || ''}`}
                size="xl"
            >
                {previewPayment && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800/80 p-3 rounded-lg border border-gray-200 dark:border-slate-700 no-print">
                            <div className="text-xs text-gray-600 dark:text-slate-300 font-medium">
                                Review official receipt layout below with your company letterhead options.
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (printModalRef.current) {
                                            printElementAsPDF(printModalRef.current);
                                        } else {
                                            window.print();
                                        }
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition cursor-pointer"
                                >
                                    <Printer size={15} /> Print Now
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!previewPayment || !printModalRef.current) return;
                                        const isV = previewPayment.direction === 'paid' || !!previewPayment.voucherType;
                                        const pfx = isV ? 'Voucher' : 'Receipt';
                                        const dNum = previewPayment.paymentNumber || previewPayment._id;
                                        await exportElementToPDF(printModalRef.current, `${pfx}_${String(dNum).replace(/[\\/:*?"<>|]/g, '_')}.pdf`);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition cursor-pointer"
                                >
                                    <Download size={15} /> Download PDF
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto bg-gray-100 dark:bg-slate-900/60 p-2 sm:p-4 rounded-xl flex justify-center">
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

            {/* Offscreen print renderer for direct row/card PDF downloads */}
            {directExportPayment && (
                <div style={{ position: 'fixed', left: '-9999px', top: 0, width: '210mm', opacity: 0, pointerEvents: 'none', zIndex: -100 }}>
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
