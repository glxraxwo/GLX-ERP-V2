import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getApiUrl } from '../api/config';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useQuery } from '@tanstack/react-query';
import { paymentsApi } from '../features/payments/paymentsApi';

export default function PaymentDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data, isLoading } = useQuery({
        queryKey: ['payment', id], queryFn: () => paymentsApi.getById(id),
    });
    const p = data?.data;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => new Date(d).toLocaleDateString('en-LK');

    const handleDownloadReceipt = () => {
        if (!p) return;
        const token = localStorage.getItem('token');
        const isVoucher = p.direction === 'paid' || !!p.voucherType;
        const prefix = isVoucher ? 'Voucher' : 'Receipt';
        const docNum = p.paymentNumber || p._id;

        toast.loading('Generating PDF...', { id: 'pdetail-receipt' });
        axios.get(`${getApiUrl()}/payments/${p._id}/receipt`, {
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
            toast.success('Downloaded successfully', { id: 'pdetail-receipt' });
        }).catch((err) => {
            console.error('Download error:', err);
            toast.error('Failed to download PDF', { id: 'pdetail-receipt' });
        });
    };

    if (isLoading || !p) return <div className="py-16 text-center text-gray-500">Loading...</div>;

    const isVoucher = p.direction === 'paid' || !!p.voucherType;

    return (
        <div>
            <PageHeader
                title={<span className="flex items-center gap-3">
                    Payment {p.paymentNumber}
                    <Badge variant={p.direction === 'received' ? 'success' : 'info'}>
                        {p.direction === 'received' ? 'MONEY IN' : 'MONEY OUT'}
                    </Badge>
                </span>}
                description={`${fmtDate(p.paymentDate)}${p.method ? ' · ' + p.method.replace(/_/g, ' ') : ''}`}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => navigate('/payments')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        <Button onClick={handleDownloadReceipt} className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Download size={16} className="mr-1.5" /> Download {isVoucher ? 'Voucher PDF' : 'Receipt PDF'}
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
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
    );
}