import React, { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const fmt = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0.00';
    return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${String(d.getDate()).padStart(2,'0')}/${months[d.getMonth()]}/${d.getFullYear()}`;
    } catch { return String(dateStr); }
};

const convertNumberToWords = (amount) => {
    const num = Math.floor(Math.abs(amount || 0));
    if (num === 0) return 'Zero Rupees';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n) => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
        if (n < 1000) return inWords(Math.floor(n / 100)) + ' Hundred' + (n % 100 !== 0 ? ' and ' + inWords(n % 100) : '');
        if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
        if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
        return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
    };

    const cents = Math.round(((amount || 0) - num) * 100);
    let words = `Sri Lankan Rupees ${inWords(num)}`;
    if (cents > 0) {
        words += ` and ${inWords(cents)} Cents`;
    }
    return words + ' Only';
};

const PaymentReceiptPrintView = forwardRef(({ payment, companyInfo }, ref) => {
    if (!payment) return null;

    const isVoucher = payment.direction === 'paid' || !!payment.voucherType;
    const docTitle = isVoucher ? 'PAYMENT VOUCHER' : 'OFFICIAL PAYMENT RECEIPT';
    const docCode = payment.paymentNumber || (isVoucher ? 'VOU-001' : 'REC-001');

    const partyName = payment.partyName || 
        payment.customerId?.displayName || payment.customerId?.companyName || 
        payment.supplierId?.displayName || payment.supplierId?.companyName || 
        payment.employeeId?.callingName || 'Valued Customer';

    const partyPhone = payment.customerPhone || 
        payment.customerId?.primaryContact?.phone || payment.customerId?.primaryContact?.mobile || 
        payment.supplierId?.primaryContact?.phone || '—';

    const partyAddress = payment.customerId?.billingAddress?.line1 || 
        payment.customerId?.billingAddress?.city || 
        payment.supplierId?.address?.line1 || '—';

    const paymentDate = payment.paymentDate || payment.createdAt || new Date();
    const allocations = payment.allocations || [];
    const totalAmount = Number(payment.amount || 0);
    const totalAllocated = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
    const unallocated = Number(payment.unallocatedAmount !== undefined ? payment.unallocatedAmount : Math.max(0, totalAmount - totalAllocated));

    const methodLabel = (payment.method || 'cash').toUpperCase().replace('_', ' ');

    return (
        <div ref={ref} className="bg-white text-slate-800 p-8 font-sans max-w-[800px] mx-auto border border-slate-200 rounded-xl shadow-sm print:border-0 print:shadow-none print:p-0">
            {/* ── Top Header Banner ── */}
            <div className="flex items-start justify-between pb-4 border-b-2 border-slate-900 mb-6">
                <div className="flex items-center gap-3">
                    <img 
                        src="/logo.jpg" 
                        alt="GLX" 
                        className="w-14 h-14 object-contain rounded-lg border border-slate-200 p-0.5" 
                    />
                    <div>
                        <h1 className="text-xl font-black text-slate-950 tracking-tight leading-none">GLX TRUCK BODY ENGINEERS</h1>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Aluminium, Steel &amp; Freezer Box Manufacture</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">Ja-Ela, Sri Lanka | Tel: 071 6666 888 / 011 740 4446 | info@glxgroup.lk</p>
                    </div>
                </div>

                <div className="text-right flex flex-col items-end">
                    <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {docTitle}
                    </span>
                    <h2 className="text-lg font-black font-mono text-slate-900 mt-1">{docCode}</h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Date: {fmtDate(paymentDate)}</p>
                </div>
            </div>

            {/* ── Meta Boxes Grid ── */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Box A: Party Details */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                        {isVoucher ? 'PAID TO (BENEFICIARY)' : 'RECEIVED FROM (CUSTOMER)'}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{partyName}</h3>
                    <div className="text-xs text-slate-600 space-y-0.5 mt-1.5">
                        <p><span className="font-medium text-slate-500">Phone:</span> {partyPhone}</p>
                        <p><span className="font-medium text-slate-500">Address:</span> {partyAddress}</p>
                        {payment.customerId?.customerCode && (
                            <p><span className="font-medium text-slate-500">Customer Code:</span> {payment.customerId.customerCode}</p>
                        )}
                    </div>
                </div>

                {/* Box B: Payment Particulars & Method */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                        PAYMENT METHOD &amp; DETAILS
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                            {methodLabel}
                        </span>
                        <span className="text-[11px] font-semibold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {payment.status || 'Confirmed'}
                        </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-0.5 mt-2">
                        {payment.method === 'cheque' && (
                            <>
                                <p><span className="font-medium text-slate-500">Cheque #:</span> {payment.chequeNumber || '—'}</p>
                                <p><span className="font-medium text-slate-500">Cheque Date:</span> {fmtDate(payment.chequeDate)}</p>
                                <p><span className="font-medium text-slate-500">Bank:</span> {payment.bankName || '—'} (Status: {payment.chequeStatus || 'Pending'})</p>
                            </>
                        )}
                        {payment.method === 'bank_transfer' && (
                            <>
                                <p><span className="font-medium text-slate-500">Transaction Ref:</span> {payment.transactionReference || '—'}</p>
                                {payment.bankName && <p><span className="font-medium text-slate-500">Bank Name:</span> {payment.bankName}</p>}
                            </>
                        )}
                        {payment.bankAccountId && (
                            <p>
                                <span className="font-medium text-slate-500">Deposited To:</span> {payment.bankAccountId.bankName || 'Company Bank Account'} ({payment.bankAccountId.accountNumber || ''})
                            </p>
                        )}
                        <p><span className="font-medium text-slate-500">Handled By:</span> {payment.receivedBy?.name || payment.createdBy?.name || 'Cashier Desk'}</p>
                    </div>
                </div>
            </div>

            {/* ── Table of Applied Invoices / Documents ── */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                        <tr>
                            <th className="p-3 w-10 text-center">#</th>
                            <th className="p-3">Document Type</th>
                            <th className="p-3">Reference Number</th>
                            <th className="p-3">Particulars / Notes</th>
                            <th className="p-3 text-right">Applied Amount (LKR)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                        {allocations.length > 0 ? (
                            allocations.map((alloc, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                                    <td className="p-3 font-semibold uppercase text-slate-700">{alloc.documentType || 'Invoice'}</td>
                                    <td className="p-3 font-mono font-bold text-blue-600">{alloc.documentNumber || `ID: ${String(alloc.documentId).slice(-6)}`}</td>
                                    <td className="p-3 text-slate-500">Settlement of {alloc.documentType || 'Invoice'}</td>
                                    <td className="p-3 text-right font-mono font-bold">{fmt(alloc.amount)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td className="p-3 text-center text-slate-400 font-mono">1</td>
                                <td className="p-3 font-semibold uppercase text-slate-700">{isVoucher ? 'Voucher' : 'Advance'}</td>
                                <td className="p-3 font-mono font-bold text-slate-900">ON ACCOUNT</td>
                                <td className="p-3 text-slate-500">{payment.notes || 'Unallocated Advance Deposit / Available Account Credit'}</td>
                                <td className="p-3 text-right font-mono font-bold">{fmt(totalAmount)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Summary & Words Grid ── */}
            <div className="grid grid-cols-12 gap-4 mb-8 items-start">
                {/* Words & Notes on Left */}
                <div className="col-span-7 space-y-3">
                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Amount in Words:</span>
                        <p className="text-xs font-bold text-slate-800 italic mt-0.5">{convertNumberToWords(totalAmount)}</p>
                    </div>

                    {payment.notes && (
                        <div className="text-xs text-slate-600 bg-slate-50/50 border border-slate-200 rounded-xl p-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Notes / Remarks:</span>
                            <p className="mt-0.5 whitespace-pre-wrap">{payment.notes}</p>
                        </div>
                    )}

                    {payment.publicToken && (
                        <div className="flex items-center gap-3 pt-2">
                            <QRCodeSVG 
                                value={typeof window !== 'undefined' ? window.location.href : `https://glxgroup.lk/public/documents/${payment.publicToken}`} 
                                size={52} 
                                level="M" 
                            />
                            <div className="text-[10px] text-slate-400">
                                <span className="font-bold text-slate-600 block">Digital Verification QR</span>
                                Scan to verify official receipt on GLX Secure Portal
                            </div>
                        </div>
                    )}
                </div>

                {/* Totals Box on Right */}
                <div className="col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="bg-blue-600 text-white rounded-lg p-2.5 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wide">Total Paid:</span>
                        <span className="text-sm font-black font-mono">LKR {fmt(totalAmount)}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                        <span>Total Applied:</span>
                        <span className="font-mono font-semibold">LKR {fmt(totalAllocated)}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                        <span className="text-emerald-700 font-semibold">Balance Credit:</span>
                        <span className="font-mono font-bold text-emerald-700">LKR {fmt(unallocated)}</span>
                    </div>
                </div>
            </div>

            {/* ── Signatures ── */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
                <div>
                    <div className="h-10 border-b border-dashed border-slate-300 mb-1.5"></div>
                    <p className="font-medium">Customer / Payer Signature</p>
                </div>
                <div>
                    <div className="h-10 border-b border-dashed border-slate-300 mb-1.5"></div>
                    <p className="font-medium">Authorized Cashier / GLX Signature</p>
                </div>
            </div>

            {/* ── Footer Notice ── */}
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span>GLX TRUCK BODY ENGINEERS - Computer Generated Official Receipt</span>
                <span>Valid without physical stamp if digitally verified</span>
            </div>
        </div>
    );
});

export default PaymentReceiptPrintView;
