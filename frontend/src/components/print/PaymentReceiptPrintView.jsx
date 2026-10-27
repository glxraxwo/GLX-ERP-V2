import React, { forwardRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export const DOCUMENT_FONT_FAMILY = "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif";

const fmt = (num, min = 2, max = 2) => {
    if (num === null || num === undefined || isNaN(num)) return '0.00';
    return Number(num).toLocaleString('en-US', { minimumFractionDigits: min, maximumFractionDigits: max });
};

const fmtDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${String(d.getDate()).padStart(2,'0')}/${months[d.getMonth()]}/${d.getFullYear()}`;
    } catch { return String(dateStr); }
};

const fmtTime = (dateStr) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) return '';
        return d.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'Asia/Colombo'
        });
    } catch { return ''; }
};

const fmtPrintTs = (d = new Date()) => {
    try {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const day   = String(d.getDate()).padStart(2,'0');
        const mon   = months[d.getMonth()];
        const yr    = d.getFullYear();
        let h       = d.getHours();
        const mi    = String(d.getMinutes()).padStart(2,'0');
        const se    = String(d.getSeconds()).padStart(2,'0');
        const ampm  = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${day}/${mon}/${yr}    ${h}:${mi}:${se}${ampm}`;
    } catch { return new Date().toLocaleString(); }
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

const PaymentReceiptPrintView = forwardRef(({ payment, companyInfo, hideToolbar = false, hideLetterheadHeader = false }, ref) => {
    if (!payment) return null;

    const [showLetterheadHeader, setShowLH] = useState(!hideLetterheadHeader);

    useEffect(() => {
        setShowLH(!hideLetterheadHeader);
    }, [hideLetterheadHeader]);

    const isVoucher = payment.direction === 'paid' || !!payment.voucherType;
    const docTitle = isVoucher ? 'PAYMENT VOUCHER' : 'OFFICIAL PAYMENT RECEIPT';
    const docCode = payment.paymentNumber || (isVoucher ? 'VOU-001' : 'REC-001');

    const partyName = payment.partyName || 
        payment.customerId?.displayName || payment.customerId?.companyName || 
        payment.supplierId?.displayName || payment.supplierId?.companyName || 
        payment.employeeId?.callingName || `${payment.employeeId?.firstName || ''} ${payment.employeeId?.lastName || ''}`.trim() || 
        'Valued Customer';

    const partyPhone = payment.customerPhone || 
        payment.customerId?.primaryContact?.phone || payment.customerId?.primaryContact?.mobile || 
        payment.supplierId?.primaryContact?.phone || payment.supplierId?.primaryContact?.mobile || '—';

    const partyAddress = payment.customerId?.billingAddress?.line1 || payment.customerId?.billingAddress?.city || 
        payment.supplierId?.address?.line1 || '—';

    const paymentDate = payment.paymentDate || payment.createdAt || new Date();
    const allocations = payment.allocations || [];
    const totalAmount = Number(payment.amount || 0);
    const totalAllocated = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
    const unallocated = Number(payment.unallocatedAmount !== undefined ? payment.unallocatedAmount : Math.max(0, totalAmount - totalAllocated));

    let methodLabel = (payment.method || 'cash').toUpperCase().replace('_', ' ');
    let methodDetails = '';
    if (payment.method === 'cheque') {
        const chqDate = payment.chequeDate ? ` dated ${fmtDate(payment.chequeDate)}` : '';
        methodDetails = `Cheque #${payment.chequeNumber || 'N/A'}${chqDate}${payment.bankName ? ` (${payment.bankName})` : ''}`;
    } else if (payment.method === 'bank_transfer') {
        methodDetails = `Ref: ${payment.transactionReference || 'N/A'}${payment.bankName ? ` (${payment.bankName})` : ''}`;
    }

    const handledBy = payment.receivedBy?.name || 
        `${payment.receivedBy?.firstName || ''} ${payment.receivedBy?.lastName || ''}`.trim() || 
        payment.createdBy?.name || 
        `${payment.createdBy?.firstName || ''} ${payment.createdBy?.lastName || ''}`.trim() || 
        'Cashier Desk';

    const branchVal = payment.branch || 'JA-ELA';
    const printTimestamp = fmtPrintTs();

    const qrString = typeof window !== 'undefined' 
        ? (payment.publicToken ? `${window.location.origin}/public/documents/${payment.publicToken}` : window.location.href) 
        : `https://glxgroup.lk/public/documents/${payment.publicToken || docCode}`;

    const printStyles = `
        @page {
            size: A4 portrait;
            margin: 0.25in;
        }
        @media screen {
            .print-page {
                background: #fff;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04);
                border: 1px solid #e2e8f0;
                margin-bottom: 24px;
                box-sizing: border-box;
                min-width: 760px !important;
            }
        }
        @media print {
            html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .no-print { display: none !important; }
            .print-page {
                width: 100% !important;
                max-width: 100% !important;
                min-height: calc(297mm - 0.5in) !important;
                padding: 10px 14px !important;
                margin: 0 auto !important;
                box-sizing: border-box !important;
                box-shadow: none !important;
                border: none !important;
                page-break-after: avoid !important;
                break-after: avoid !important;
            }
            .print-container table,
            .print-page table,
            table.print-table {
                background-color: transparent !important;
                background: transparent !important;
                table-layout: fixed !important;
                width: 100% !important;
            }
            .print-container table td,
            .print-page table td,
            table.print-table td {
                word-break: break-word !important;
                overflow-wrap: anywhere !important;
            }
        }
        .print-container table tbody tr,
        .print-page table tbody tr,
        table.print-table tbody tr {
            background-color: transparent !important;
            background: transparent !important;
        }
    `;

    return (
        <div style={{ fontFamily: DOCUMENT_FONT_FAMILY, color: '#1e293b', background: '#fff', width: '100%', maxWidth: 'calc(210mm - 0.5in)', margin: '0 auto', fontSize: 12.5 }}>
            <style>{printStyles}</style>

            {/* ── Toolbar (no-print) ── */}
            {!hideToolbar && (
                <div className="no-print" style={{ marginBottom: 12, padding: '10px 14px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: '#475569' }}>Document Type:</span>
                        <span style={{ fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>{docTitle}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {/* Letterhead Header Toggle */}
                        <button 
                            type="button" 
                            onClick={() => setShowLH(p => !p)} 
                            style={{
                                padding: '4px 12px', borderRadius: 7, fontWeight: 600, fontSize: 11, cursor: 'pointer', border: '1px solid #cbd5e1',
                                background: !showLetterheadHeader ? '#b45309' : '#fff',
                                color: !showLetterheadHeader ? '#fff' : '#374151',
                            }}
                        >
                            {!showLetterheadHeader ? '✓ Without Header (Pre-printed)' : 'With Header (Letterhead)'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Printable Page Root ── */}
            <div ref={ref} className="print-root-container">
                <div 
                    className="print-page print-container" 
                    style={{ 
                        background: '#fff', 
                        padding: showLetterheadHeader ? '14px 18px 12px 18px' : '28mm 18px 12px 18px', 
                        width: '100%',
                        maxWidth: 'calc(210mm - 0.5in)',
                        minHeight: 'calc(297mm - 0.5in)',
                        boxSizing: 'border-box',
                        margin: '0 auto',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}
                >
                    <div>
                        {/* ── 1. COMPANY HEADER (Exact same styling as DocumentPrintView) ── */}
                        {showLetterheadHeader && (
                            <div style={{ borderBottom: '1.5px solid #444', paddingBottom: 8, marginBottom: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <div style={{ flexShrink: 0, width: 72, marginTop: 2 }}>
                                        <img src="/logo.jpg" alt="GLX Logo" crossOrigin="anonymous" style={{ width: '100%', height: 'auto', objectFit: 'contain', filter: 'grayscale(100%)' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: 16.5, letterSpacing: 0.4, lineHeight: 1.15, color: '#0f172a' }}>
                                            GLX TRUCK BODY ENGINEERS
                                        </div>
                                        <div style={{ fontSize: 9.5, fontWeight: 500, letterSpacing: 0.6, color: '#475569', marginBottom: 5 }}>
                                            ALUMINIUM , STEEL &amp; FREEZER BOX MANUFACTURE
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, fontSize: 11, lineHeight: 1.55, color: '#334155' }}>
                                            <div>
                                                No.14,Negambo Road,<br />
                                                Thudella,Ja-Ela,<br />
                                                Sri Lanka.<br />
                                                (11350)
                                            </div>
                                            <div>
                                                No.2020/3L,2,Seeduwa Road,<br />
                                                Kotugoda,Ja-Ela.<br />
                                                Sri Lanka.<br />
                                                (11390)
                                            </div>
                                            <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                                                <div><span style={{ display: 'inline-block', width: 48, fontWeight: 500, color: '#475569' }}>Mobile</span> : 071 6666 888</div>
                                                <div><span style={{ display: 'inline-block', width: 48, fontWeight: 500, color: '#475569' }}>Tel</span> : 011 740 4446</div>
                                                <div><span style={{ display: 'inline-block', width: 48, fontWeight: 500, color: '#475569' }}>Email</span> : glx.engi@gmail.com</div>
                                                <div><span style={{ display: 'inline-block', width: 48, fontWeight: 500, color: '#475569' }}>Web</span> : www.glx.lk</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── 2. CUSTOMER + DOCUMENT META (Exact 2-column grid matching DocumentPrintView) ── */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, fontSize: 12.5 }}>
                            {/* Left: Customer / Party Block */}
                            <div style={{ maxWidth: '54%', lineHeight: 1.55 }}>
                                <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4, color: '#334155' }}>
                                    {isVoucher ? 'PAID TO (BENEFICIARY)' : 'RECEIVED FROM (CUSTOMER)'}
                                </div>
                                <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{partyName}</div>
                                {partyAddress && partyAddress !== '—' && (
                                    <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.45 }}>{partyAddress}</div>
                                )}
                                {partyPhone && partyPhone !== '—' && (
                                    <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.45 }}>Phone: {partyPhone}</div>
                                )}
                                {payment.customerId?.customerCode && (
                                    <div style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>
                                        Customer Code: <span style={{ fontWeight: 600, color: '#0f172a' }}>{payment.customerId.customerCode}</span>
                                    </div>
                                )}
                            </div>

                            {/* Right: Meta Details */}
                            <div style={{ textAlign: 'left', minWidth: 230 }}>
                                {[
                                    [isVoucher ? 'Voucher No' : 'Receipt No', docCode],
                                    ['Payment Date', <>
                                        <span style={{ fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums' }}>{fmtDate(paymentDate)}</span>
                                        {fmtTime(paymentDate) && <><br/><span style={{ fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', fontSize: 11.5 }}>{fmtTime(paymentDate)}</span></>}
                                    </>],
                                    ['Method', methodLabel],
                                    ['Status', (payment.status || 'Confirmed').toUpperCase()],
                                    ['Handled By', handledBy],
                                    ['Branch', branchVal],
                                ].map(([label, value]) => (
                                    <div key={label} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', columnGap: 4, lineHeight: 1.6, fontSize: 12.5 }}>
                                        <span style={{ fontWeight: 600, color: '#334155' }}>{label}</span>
                                        <span style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>&nbsp;&nbsp;{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── 3. ALLOCATIONS / PARTICULARS TABLE ── */}
                        <table className="no-zebra print-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 12.5, marginBottom: 4, background: 'transparent' }}>
                            <colgroup>
                                <col style={{ width: 'auto' }} />
                                <col style={{ width: 140 }} />
                                <col style={{ width: 130 }} />
                                <col style={{ width: 115 }} />
                            </colgroup>
                            <thead>
                                <tr style={{ background: 'transparent', borderBottom: '1.5px solid #cbd5e1' }}>
                                    <th style={{ padding: '6px 4px 6px 0', textAlign: 'left', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.4, color: '#334155', background: 'transparent' }}>
                                        DESCRIPTION / PARTICULARS
                                    </th>
                                    <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.4, width: 140, color: '#334155', background: 'transparent', whiteSpace: 'nowrap' }}>
                                        DOCUMENT REF #
                                    </th>
                                    <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.4, width: 130, color: '#334155', background: 'transparent', whiteSpace: 'nowrap' }}>
                                        ALLOCATION DETAILS
                                    </th>
                                    <th style={{ padding: '6px 0 6px 8px', textAlign: 'right', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.4, width: 115, color: '#334155', background: 'transparent', whiteSpace: 'nowrap' }}>
                                        APPLIED (LKR)
                                    </th>
                                </tr>
                            </thead>
                            <tbody style={{ background: 'transparent' }}>
                                {allocations.length > 0 ? (
                                    allocations.map((alloc, idx) => {
                                        const docTypeStr = (alloc.documentType || 'Invoice').toUpperCase();
                                        const docRef = alloc.documentNumber || `ID: ${String(alloc.documentId).slice(-6)}`;
                                        const amt = Number(alloc.amount || 0);

                                        return (
                                            <tr key={idx} style={{ verticalAlign: 'top', background: 'transparent' }}>
                                                <td style={{ padding: '6px 4px 2px 0', lineHeight: 1.45, background: 'transparent', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                                    <div style={{ fontWeight: 500, color: '#0f172a' }}>
                                                        Settlement for {docTypeStr}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '6px 8px 2px', textAlign: 'left', fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', fontSize: 12, color: '#1e293b', background: 'transparent', width: 140, whiteSpace: 'nowrap' }}>
                                                    {docRef}
                                                </td>
                                                <td style={{ padding: '6px 8px 2px', textAlign: 'left', fontFamily: DOCUMENT_FONT_FAMILY, fontSize: 11.5, color: '#475569', background: 'transparent', width: 130, whiteSpace: 'nowrap' }}>
                                                    Direct Settlement
                                                </td>
                                                <td style={{ padding: '6px 0 2px 8px', textAlign: 'right', fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', fontSize: 12, color: '#1e293b', background: 'transparent', width: 115, whiteSpace: 'nowrap' }}>
                                                    {fmt(amt)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr style={{ verticalAlign: 'top', background: 'transparent' }}>
                                        <td style={{ padding: '6px 4px 2px 0', lineHeight: 1.45, background: 'transparent', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                            <div style={{ fontWeight: 500, color: '#0f172a' }}>
                                                {isVoucher ? 'Expense / Voucher Payment' : 'Customer Advance Payment Deposit'}
                                            </div>
                                            <div style={{ fontSize: 11.5, color: '#475569', marginTop: 1 }}>
                                                {payment.notes || 'Unallocated Advance Deposit / Available Account Credit'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '6px 8px 2px', textAlign: 'left', fontFamily: DOCUMENT_FONT_FAMILY, fontSize: 12, color: '#475569', background: 'transparent', width: 140, whiteSpace: 'nowrap' }}>
                                            ON ACCOUNT
                                        </td>
                                        <td style={{ padding: '6px 8px 2px', textAlign: 'left', fontFamily: DOCUMENT_FONT_FAMILY, fontSize: 11.5, color: '#475569', background: 'transparent', width: 130, whiteSpace: 'nowrap' }}>
                                            {methodLabel}
                                        </td>
                                        <td style={{ padding: '6px 0 2px 8px', textAlign: 'right', fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', fontSize: 12, color: '#1e293b', background: 'transparent', width: 115, whiteSpace: 'nowrap' }}>
                                            {fmt(totalAmount)}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* ── 4. SUBTOTALS + WORDS BLOCK (Exact same layout as DocumentPrintView) ── */}
                        <div style={{ marginTop: 10, paddingTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, fontSize: 12.5 }}>
                            {/* Left: Amount in Words & Notes */}
                            <div style={{ maxWidth: '52%', lineHeight: 1.6 }}>
                                <div style={{ marginBottom: 4 }}>
                                    <span style={{ fontWeight: 600, color: '#334155' }}>Amount in Words:</span>
                                    <div style={{ fontSize: 11.5, color: '#0f172a', fontStyle: 'italic', marginTop: 1 }}>
                                        {convertNumberToWords(totalAmount)}
                                    </div>
                                </div>

                                {methodDetails && (
                                    <div style={{ fontSize: 11.5, color: '#475569', marginTop: 4 }}>
                                        <span style={{ fontWeight: 600, color: '#334155' }}>Particulars: </span>
                                        {methodDetails}
                                    </div>
                                )}

                                {payment.bankAccountId && (
                                    <div style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>
                                        <span style={{ fontWeight: 600, color: '#334155' }}>Deposited To: </span>
                                        {payment.bankAccountId.bankName || 'GLX Bank Account'} ({payment.bankAccountId.accountNumber || ''})
                                    </div>
                                )}

                                {payment.notes && (
                                    <div style={{ marginTop: 4, fontSize: 11.5, color: '#475569' }}>
                                        <span style={{ fontWeight: 600, color: '#334155' }}>Remarks: </span>
                                        {payment.notes}
                                    </div>
                                )}
                            </div>

                            {/* Right: Totals block */}
                            <div style={{ minWidth: 260 }}>
                                {/* TOTAL RECEIVED */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 13, color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: 4 }}>
                                    <span>{isVoucher ? 'TOTAL PAID' : 'TOTAL RECEIVED'}</span>
                                    <span style={{ fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 13.5 }}>{fmt(totalAmount)}</span>
                                </div>

                                {/* TOTAL APPLIED */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500, marginTop: 4, color: '#475569', fontSize: 12 }}>
                                    <span>TOTAL APPLIED</span>
                                    <span style={{ fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{fmt(totalAllocated)}</span>
                                </div>

                                {/* BALANCE CREDIT */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: 2, color: '#166534', fontSize: 12 }}>
                                    <span>BALANCE CREDIT</span>
                                    <span style={{ fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(unallocated)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── 5. FOOTER: Signatures & Verification QR (Exact match to DocumentPrintView) ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 8, marginTop: 20, pageBreakInside: 'avoid' }}>
                        {/* Cashier Signature block */}
                        <div>
                            <div style={{ fontSize: 11.5, fontWeight: 400, marginBottom: 2, color: '#475569' }}>
                                Yours Faithfully,
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 16, lineHeight: 1.2 }}>
                                {companyInfo?.companyName || 'GLX INDUSTRIES'} - ACCOUNTS DESK
                            </div>

                            <div style={{ position: 'relative', minHeight: 48, marginTop: 8 }}>
                                {companyInfo?.companySeal && (
                                    <img
                                        src={companyInfo.companySeal}
                                        alt="Official Company Seal"
                                        crossOrigin="anonymous"
                                        style={{ 
                                            position: 'absolute', 
                                            bottom: 2, 
                                            left: 130, 
                                            width: 68, 
                                            height: 68, 
                                            objectFit: 'contain', 
                                            opacity: 0.82, 
                                            pointerEvents: 'none', 
                                            zIndex: 1 
                                        }}
                                    />
                                )}
                                <div style={{ height: 36 }} />
                                <div style={{ fontSize: 14, letterSpacing: 1, color: '#94a3b8', lineHeight: 0.8 }}>
                                    ............................................................
                                </div>
                            </div>
                            <div style={{ fontSize: 11.5, color: '#334155', marginTop: 4, fontWeight: 500 }}>
                                Authorized Cashier / GLX Signature
                            </div>

                            {/* Print timestamp in RED font */}
                            <div style={{ fontSize: 10, color: '#dc2626', fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', marginTop: 14, fontWeight: 500 }}>
                                Printed at &nbsp;&nbsp;&nbsp;&nbsp; {printTimestamp}
                            </div>
                        </div>

                        {/* Customer / Payer Signature Block in Center */}
                        <div style={{ textAlign: 'center', marginBottom: 18 }}>
                            <div style={{ fontSize: 14, letterSpacing: 1, color: '#94a3b8', lineHeight: 0.8, marginBottom: 4 }}>
                                ............................................................
                            </div>
                            <div style={{ fontSize: 11.5, color: '#334155', fontWeight: 500 }}>
                                Customer / Payer Signature
                            </div>
                        </div>

                        {/* QR Code */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <QRCodeSVG value={qrString} size={100} level="M" />
                            <span style={{ fontSize: 9.5, color: '#64748b', marginTop: 4, fontWeight: 500 }}>Secure Verification</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

PaymentReceiptPrintView.displayName = 'PaymentReceiptPrintView';
export default PaymentReceiptPrintView;
