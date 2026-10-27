import React, { forwardRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '../../store/authStore';
import { useSettings } from '../../features/settings/useSettings';

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

    const { user: currentUser } = useAuthStore();
    const [showLetterheadHeader, setShowLH] = useState(!hideLetterheadHeader);

    useEffect(() => {
        setShowLH(!hideLetterheadHeader);
    }, [hideLetterheadHeader]);

    const isVoucher = payment.direction === 'paid' || !!payment.voucherType;
    const docTitle = isVoucher ? 'PAYMENT VOUCHER' : 'PAYMENT RECEIPT';
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

    const vehicleNo = payment.vehicleNo || payment.vehicleNumber || '';

    const paymentDate = payment.paymentDate || payment.createdAt || new Date();
    const allocations = Array.isArray(payment.allocations) ? payment.allocations : [];
    const totalAmount = Number(payment.amount || 0);
    const totalAllocated = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
    const unallocated = Number(payment.unallocatedAmount !== undefined ? payment.unallocatedAmount : Math.max(0, totalAmount - totalAllocated));

    // Calculate invoice total & remaining balance left to be paid
    let totalDocAmount = Number(payment.totalDocAmount || 0);
    let totalBalanceDue = payment.totalBalanceDue !== undefined 
        ? Number(payment.totalBalanceDue) 
        : (allocations.length > 0 && allocations[0].balanceDue !== undefined ? Number(allocations[0].balanceDue) : -1);

    if (totalBalanceDue < 0 && allocations.length > 0) {
        let sumDoc = 0;
        let sumBal = 0;
        let hasBal = false;
        allocations.forEach(a => {
            if (a.docTotal !== undefined) sumDoc += Number(a.docTotal || 0);
            if (a.balanceDue !== undefined) {
                sumBal += Number(a.balanceDue || 0);
                hasBal = true;
            }
        });
        if (sumDoc > 0) totalDocAmount = sumDoc;
        if (hasBal) totalBalanceDue = sumBal;
    }

    let methodLabel = (payment.method || 'cash').toUpperCase().replace('_', ' ');
    let methodDetails = '';
    if (payment.method === 'cheque') {
        const chqDate = payment.chequeDate ? ` dated ${fmtDate(payment.chequeDate)}` : '';
        methodDetails = `Cheque #${payment.chequeNumber || 'N/A'}${chqDate}${payment.bankName ? ` (${payment.bankName})` : ''}`;
    } else if (payment.method === 'bank_transfer') {
        methodDetails = `Txn Ref: ${payment.transactionReference || 'N/A'}${payment.bankName ? ` (${payment.bankName})` : ''}`;
    }

    // Fallback: Fetch company settings internally if not passed or empty
    const { data: internalSettingsData } = useSettings();
    const resolvedCompany = (companyInfo && (companyInfo.companyName || companyInfo.bossSignature || companyInfo.companySeal))
        ? companyInfo
        : (internalSettingsData?.data || companyInfo || {});

    // Resolve Active Signature and Seal
    const activeSignature = payment.receivedBy?.signature || 
        payment.createdBy?.signature || 
        currentUser?.signature || 
        resolvedCompany?.bossSignature || 
        '';

    const activeSeal = resolvedCompany?.companySeal || '';

    const handledBy = (payment.receivedBy?.firstName ? `${payment.receivedBy.firstName} ${payment.receivedBy.lastName || ''}`.trim() : null) || 
        (payment.createdBy?.firstName ? `${payment.createdBy.firstName} ${payment.createdBy.lastName || ''}`.trim() : null) || 
        currentUser?.fullName || 
        payment.receivedBy?.name || 
        payment.createdBy?.name || 
        resolvedCompany?.bossName ||
        'Cashier Desk';

    const signerName = (payment.receivedBy?.firstName ? `${payment.receivedBy.firstName} ${payment.receivedBy.lastName || ''}`.trim() : null) || 
        (payment.createdBy?.firstName ? `${payment.createdBy.firstName} ${payment.createdBy.lastName || ''}`.trim() : null) || 
        currentUser?.fullName || 
        payment.receivedBy?.name || 
        payment.createdBy?.name || 
        resolvedCompany?.bossName || 
        'Managing Director';

    const branchVal = payment.branch || 'JA-ELA';
    const printTimestamp = fmtPrintTs();

    const qrString = typeof window !== 'undefined' 
        ? (payment.publicToken ? `${window.location.origin}/public/documents/${payment.publicToken}` : window.location.href) 
        : `https://glxgroup.lk/public/documents/${payment.publicToken || docCode}`;

    const printStyles = `
        @page {
            size: A4 portrait;
            margin: 6mm 8mm;
        }
        @media screen {
            .receipt-print-page {
                background: #fff;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04);
                border: 1px solid #e2e8f0;
                margin-bottom: 24px;
                box-sizing: border-box;
                min-width: 740px !important;
            }
        }
        @media print {
            html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
                height: auto !important;
                overflow: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .no-print { display: none !important; }
            .receipt-print-wrapper {
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            .receipt-print-page {
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                min-height: auto !important;
                max-height: 275mm !important;
                padding: 4mm 6mm !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                box-shadow: none !important;
                border: none !important;
                overflow: hidden !important;
                page-break-after: avoid !important;
                page-break-before: avoid !important;
                page-break-inside: avoid !important;
                break-after: avoid !important;
                break-before: avoid !important;
                break-inside: avoid !important;
            }
            .receipt-print-page * {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
            }
            .print-container table,
            .receipt-print-page table,
            table.print-table {
                background-color: transparent !important;
                background: transparent !important;
                table-layout: fixed !important;
                width: 100% !important;
            }
            .print-container table td,
            .receipt-print-page table td,
            table.print-table td {
                word-break: break-word !important;
                overflow-wrap: anywhere !important;
            }
        }
        .print-container table tbody tr,
        .receipt-print-page table tbody tr,
        table.print-table tbody tr {
            background-color: transparent !important;
            background: transparent !important;
        }
    `;

    return (
        <div style={{ fontFamily: DOCUMENT_FONT_FAMILY, color: '#111', background: '#fff', width: '100%', maxWidth: 'calc(210mm - 0.4in)', margin: '0 auto', fontSize: 12 }}>
            <style>{printStyles}</style>

            {/* ── Toolbar (no-print) ── */}
            {!hideToolbar && (
                <div className="no-print" style={{ marginBottom: 12, padding: '8px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: 11.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 600, color: '#475569' }}>Document Type:</span>
                        <span style={{ fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>{docTitle}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <button 
                            type="button" 
                            onClick={() => setShowLH(p => !p)} 
                            style={{
                                padding: '4px 10px', borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', border: '1px solid #cbd5e1',
                                background: !showLetterheadHeader ? '#b45309' : '#fff',
                                color: !showLetterheadHeader ? '#fff' : '#374151',
                            }}
                        >
                            {!showLetterheadHeader ? '✓ Without Header (Pre-printed)' : 'With Header (Letterhead)'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Printable Page Root (Compact Single Page Layout) ── */}
            <div ref={ref} className="receipt-print-wrapper" style={{ width: '100%', maxWidth: '200mm', margin: '0 auto' }}>
                <div 
                    className="receipt-print-page print-container single-page-doc" 
                    style={{ 
                        background: '#fff', 
                        padding: showLetterheadHeader ? '8px 12px 8px 12px' : '18mm 12px 8px 12px', 
                        width: '100%',
                        boxSizing: 'border-box',
                        margin: '0 auto',
                    }}
                >
                    {/* ── 1. COMPANY HEADER ── */}
                    {showLetterheadHeader && (
                        <div style={{ borderBottom: '1.5px solid #444', paddingBottom: 6, marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                <div style={{ flexShrink: 0, width: 62, marginTop: 1 }}>
                                    <img 
                                        src="/logo.jpg" 
                                        alt="GLX Logo" 
                                        crossOrigin="anonymous" 
                                        style={{ width: '100%', height: 'auto', objectFit: 'contain' }} 
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 15.5, letterSpacing: 0.3, lineHeight: 1.15, color: '#0f172a' }}>
                                        GLX TRUCK BODY ENGINEERS
                                    </div>
                                    <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 0.5, color: '#475569', marginBottom: 4 }}>
                                        ALUMINIUM , STEEL &amp; FREEZER BOX MANUFACTURE
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, fontSize: 10.5, lineHeight: 1.45, color: '#334155' }}>
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
                                        <div style={{ fontSize: 10.5, lineHeight: 1.5 }}>
                                            <div><span style={{ display: 'inline-block', width: 44, fontWeight: 500, color: '#475569' }}>Mobile</span> : 071 6666 888</div>
                                            <div><span style={{ display: 'inline-block', width: 44, fontWeight: 500, color: '#475569' }}>Tel</span> : 011 740 4446</div>
                                            <div><span style={{ display: 'inline-block', width: 44, fontWeight: 500, color: '#475569' }}>Email</span> : glx.engi@gmail.com</div>
                                            <div><span style={{ display: 'inline-block', width: 44, fontWeight: 500, color: '#475569' }}>Web</span> : www.glx.lk</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── 2. CUSTOMER + DOCUMENT META ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, fontSize: 12 }}>
                        {/* Left: Customer / Party Block */}
                        <div style={{ maxWidth: '54%', lineHeight: 1.45 }}>
                            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2, color: '#0f172a' }}>
                                {isVoucher ? 'PAID TO / BENEFICIARY' : 'BILL TO / CUSTOMER'}
                            </div>
                            <div style={{ fontWeight: 600, fontSize: 12.5, color: '#0f172a' }}>{partyName}</div>
                            {partyAddress && partyAddress !== '—' && (
                                <div style={{ fontSize: 11.5, color: '#334155' }}>{partyAddress}</div>
                            )}
                            {partyPhone && partyPhone !== '—' && (
                                <div style={{ fontSize: 11.5, color: '#334155' }}>{partyPhone}</div>
                            )}
                            {vehicleNo && (
                                <div style={{ fontWeight: 600, fontFamily: DOCUMENT_FONT_FAMILY, fontSize: 12.5, marginTop: 4, color: '#0f172a', letterSpacing: 0.3 }}>
                                    Vehicle No: {vehicleNo}
                                </div>
                            )}
                        </div>

                        {/* Right: Meta Details (Invoice/Receipt No, Sales, Branch, Date) */}
                        <div style={{ textAlign: 'left', minWidth: 220 }}>
                            {[
                                [isVoucher ? 'Voucher No.' : 'Receipt No.', docCode],
                                ['Sales', handledBy],
                                ['Branch', branchVal],
                                ['Date', <>
                                    <span style={{ fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums' }}>{fmtDate(paymentDate)}</span>
                                    {fmtTime(paymentDate) && <><br/><span style={{ fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{fmtTime(paymentDate)}</span></>}
                                </>],
                            ].map(([label, value]) => (
                                <div key={label} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', columnGap: 4, lineHeight: 1.5, fontSize: 11.5 }}>
                                    <span style={{ fontWeight: 600, color: '#475569' }}>{label}</span>
                                    <span style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>&nbsp;&nbsp;{value}</span>
                                </div>
                            ))}

                            <div style={{ marginTop: 4, paddingTop: 3, borderTop: '1px dashed #cbd5e1' }}>
                                <div style={{ color: '#059669', fontWeight: 600, fontSize: 10.5, fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums' }}>
                                    • Method: {methodLabel} (CONFIRMED)
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── 3. ITEMS TABLE ── */}
                    <table className="no-zebra print-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 12, marginBottom: 4, background: 'transparent' }}>
                        <colgroup>
                            <col style={{ width: 'auto' }} />
                            <col style={{ width: 95 }} />
                            <col style={{ width: 50 }} />
                            <col style={{ width: 105 }} />
                        </colgroup>
                        <thead>
                            <tr style={{ background: 'transparent', borderBottom: '1.5px solid #cbd5e1' }}>
                                <th style={{ padding: '5px 4px 5px 0', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: '#0f172a', background: 'transparent' }}>
                                    DESCRIPTION
                                </th>
                                <th style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, width: 95, color: '#0f172a', background: 'transparent', whiteSpace: 'nowrap' }}>
                                    RATE
                                </th>
                                <th style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, width: 50, color: '#0f172a', background: 'transparent', whiteSpace: 'nowrap' }}>
                                    QTY
                                </th>
                                <th style={{ padding: '5px 0 5px 6px', textAlign: 'right', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, width: 105, color: '#0f172a', background: 'transparent', whiteSpace: 'nowrap' }}>
                                    AMOUNT
                                </th>
                            </tr>
                        </thead>
                        <tbody style={{ background: 'transparent' }}>
                            {allocations.length > 0 ? (
                                allocations.map((alloc, idx) => {
                                    const docTypeStr = (alloc.documentType || 'Invoice').toUpperCase();
                                    const docNum = alloc.documentNumber || `ID: ${String(alloc.documentId).slice(-6)}`;
                                    const amt = Number(alloc.amount || 0);

                                    return (
                                        <tr key={idx} style={{ verticalAlign: 'top', background: 'transparent' }}>
                                            <td style={{ padding: '5px 4px 2px 0', lineHeight: 1.4, background: 'transparent', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                                <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                                    Payment Received — Settlement for {docTypeStr} {docNum}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>
                                                    Payment Method: {methodLabel}{methodDetails ? ` (${methodDetails})` : ''}
                                                </div>
                                            </td>
                                            <td style={{ padding: '5px 6px 2px', textAlign: 'right', fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', fontSize: 11.5, color: '#0f172a', background: 'transparent', width: 95, whiteSpace: 'nowrap' }}>
                                                {fmt(amt)}
                                            </td>
                                            <td style={{ padding: '5px 6px 2px', textAlign: 'center', fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', fontSize: 11.5, color: '#0f172a', background: 'transparent', width: 50, whiteSpace: 'nowrap' }}>
                                                1
                                            </td>
                                            <td style={{ padding: '5px 0 2px 6px', textAlign: 'right', fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', fontSize: 11.5, color: '#0f172a', background: 'transparent', width: 105, whiteSpace: 'nowrap' }}>
                                                {fmt(amt)}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr style={{ verticalAlign: 'top', background: 'transparent' }}>
                                    <td style={{ padding: '5px 4px 2px 0', lineHeight: 1.4, background: 'transparent', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                            {isVoucher ? 'Expense / Voucher Payment' : 'Customer Advance Payment Deposit / Credit on Account'}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>
                                            Payment Method: {methodLabel}{methodDetails ? ` (${methodDetails})` : ''}{payment.notes ? ` · ${payment.notes}` : ''}
                                        </div>
                                    </td>
                                    <td style={{ padding: '5px 6px 2px', textAlign: 'right', fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', fontSize: 11.5, color: '#0f172a', background: 'transparent', width: 95, whiteSpace: 'nowrap' }}>
                                        {fmt(totalAmount)}
                                    </td>
                                    <td style={{ padding: '5px 6px 2px', textAlign: 'center', fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', fontSize: 11.5, color: '#0f172a', background: 'transparent', width: 50, whiteSpace: 'nowrap' }}>
                                        1
                                    </td>
                                    <td style={{ padding: '5px 0 2px 6px', textAlign: 'right', fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', fontSize: 11.5, color: '#0f172a', background: 'transparent', width: 105, whiteSpace: 'nowrap' }}>
                                        {fmt(totalAmount)}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* ── 4. SUBTOTALS + REMARKS + BALANCE DUE ── */}
                    <div style={{ marginTop: 8, paddingTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, fontSize: 12 }}>
                        {/* Left: Remarks & Words */}
                        <div style={{ maxWidth: '48%', lineHeight: 1.5 }}>
                            <div style={{ marginBottom: 3 }}>
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>Remarks &nbsp;&nbsp;&nbsp;&nbsp;:</span>
                                <span style={{ marginLeft: 6, color: '#334155' }}>
                                    {payment.notes || (allocations.length > 0 ? `Settlement for ${allocations.map(a => a.documentNumber).filter(Boolean).join(', ')}` : 'Payment received with thanks')}
                                </span>
                            </div>

                            <div style={{ marginTop: 3 }}>
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>Amount in Words:</span>
                                <div style={{ fontStyle: 'italic', color: '#334155', marginTop: 1, fontSize: 11.5 }}>
                                    {convertNumberToWords(totalAmount)}
                                </div>
                            </div>

                            {payment.bankAccountId && (
                                <div style={{ marginTop: 3, color: '#475569', fontSize: 11 }}>
                                    <span style={{ fontWeight: 600 }}>Deposited To:</span> {payment.bankAccountId.bankName || 'GLX Account'} ({payment.bankAccountId.accountNumber || ''})
                                </div>
                            )}
                        </div>

                        {/* Right: Totals block with Invoice Total & Balance Due */}
                        <div style={{ minWidth: 260 }}>
                            {totalDocAmount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: 11.5, marginBottom: 3 }}>
                                    <span>INVOICE TOTAL (මුළු එකතුව)</span>
                                    <span style={{ fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(totalDocAmount)}</span>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: 3, color: '#0f172a', fontSize: 12 }}>
                                <span>SUB TOTAL</span>
                                <span style={{ fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums' }}>{fmt(totalAmount)}</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 12.5, color: '#0f172a', marginTop: 3, borderTop: '1px solid #0f172a', paddingTop: 3 }}>
                                <span>{isVoucher ? 'TOTAL PAID' : 'AMOUNT RECEIVED (ගෙවූ මුදල)'}</span>
                                <span style={{ fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums' }}>{fmt(totalAmount)}</span>
                            </div>

                            {/* Remaining Balance Due on the invoice */}
                            {totalBalanceDue >= 0 ? (
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    fontWeight: 700, 
                                    marginTop: 4, 
                                    paddingTop: 3, 
                                    borderTop: '1px dashed #cbd5e1', 
                                    color: totalBalanceDue > 0 ? '#b91c1c' : '#15803d', 
                                    fontSize: 12 
                                }}>
                                    <span>{totalBalanceDue > 0 ? 'BALANCE DUE (තව ගෙවීමට ඇති ශේෂය)' : 'BALANCE DUE (සම්පූර්ණයි)'}</span>
                                    <span style={{ fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums' }}>{fmt(totalBalanceDue)}</span>
                                </div>
                            ) : (
                                allocations.length > 0 && totalAllocated > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: 3, color: '#166534', fontSize: 11.5 }}>
                                        <span>ADVANCE APPLIED</span>
                                        <span style={{ fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums' }}>-{fmt(totalAllocated)}</span>
                                    </div>
                                )
                            )}

                            {unallocated > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: 3, color: '#92400e', fontSize: 11.5 }}>
                                    <span>UNALLOCATED CREDIT</span>
                                    <span style={{ fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums' }}>{fmt(unallocated)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── 5. FOOTER: Signatures (left) + QR Code (right) (Immediately after Totals, NOT at page bottom) ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 6, marginTop: 8, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 2, color: '#0f172a' }}>
                                Yours Faithfully,
                            </div>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a', marginBottom: 12, lineHeight: 1.2 }}>
                                {resolvedCompany?.companyName || 'GLX INDUSTRIES'} - {branchVal}
                            </div>

                            {/* Seal + Signature image area */}
                            <div style={{ position: 'relative', minHeight: 48, height: 50, marginTop: 4 }}>
                                {activeSeal && (
                                    <img
                                        src={activeSeal}
                                        alt="Official Company Seal"
                                        style={{ 
                                            position: 'absolute', 
                                            bottom: 2, 
                                            left: 125, 
                                            width: 58, 
                                            height: 58, 
                                            objectFit: 'contain', 
                                            opacity: 0.85, 
                                            pointerEvents: 'none', 
                                            zIndex: 1 
                                        }}
                                    />
                                )}
                                {activeSignature ? (
                                    <img
                                        src={activeSignature}
                                        alt="Authorized Signature"
                                        style={{ 
                                            height: 38, 
                                            maxWidth: 165, 
                                            objectFit: 'contain', 
                                            marginBottom: 2, 
                                            position: 'relative', 
                                            zIndex: 2, 
                                            display: 'block' 
                                        }}
                                    />
                                ) : (
                                    <div style={{ height: 34 }} />
                                )}
                                <div style={{ fontSize: 13, letterSpacing: 0.8, color: '#444', lineHeight: 0.8 }}>
                                    ............................................................
                                </div>
                            </div>
                            <div style={{ fontSize: 10.5, color: '#0f172a', marginTop: 4, fontWeight: 600 }}>
                                Authorized Signature ({signerName})
                            </div>

                            {/* Print timestamp in RED font */}
                            <div style={{ fontSize: 9.5, color: '#dc2626', fontFamily: DOCUMENT_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', marginTop: 4, fontWeight: 600 }}>
                                Printed at &nbsp;&nbsp;&nbsp;&nbsp; {printTimestamp}
                            </div>
                        </div>

                        {/* QR Code */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <QRCodeSVG value={qrString} size={80} level="M" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

PaymentReceiptPrintView.displayName = 'PaymentReceiptPrintView';
export default PaymentReceiptPrintView;
