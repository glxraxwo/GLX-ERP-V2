import React, { forwardRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getDocTranslation, translateCondition, defaultConditions } from '../../utils/documentTranslations';
import { useAuthStore } from '../../store/authStore';

/* ─── format helpers ─────────────────────────────────────────────────── */
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
        // If date was saved as UTC midnight (00:00:00), it's a date-only field with no time
        if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
            return '';
        }
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

/* ─── component ───────────────────────────────────────────────────── */
const DocumentPrintView = forwardRef(({ document: doc, companyInfo, useSinhalaLanguage = false, hideToolbar = false, hideLetterheadHeader = false }, ref) => {
    if (!doc) return null;

    const { user: currentUser } = useAuthStore();
    const [signatureScale, setSignatureScale] = useState('standard'); // 'standard' (72px) or 'large' (88px)
    const [signerChoice, setSignerChoice] = useState('auto'); // 'auto', 'my', 'company'

    const [lang, setLang]                   = useState(useSinhalaLanguage ? 'si' : 'en');
    const [showLetterheadHeader, setShowLH] = useState(!hideLetterheadHeader);
    const [showPhotosInPrint, setShowPhotos] = useState(true);
    const [isQuickEdit, setIsQuickEdit]     = useState(false);
    const [editedValues, setEditedValues]   = useState({});

    useEffect(() => {
        setShowLH(!hideLetterheadHeader);
    }, [hideLetterheadHeader]);

    useEffect(() => {
        if (useSinhalaLanguage) {
            setLang('si');
        }
    }, [useSinhalaLanguage]);

    const t = getDocTranslation(lang);

    /* ── active signature & signer resolution ── */
    let activeSignature = null;
    let signerName = '';
    let signerTitle = '';

    if (signerChoice === 'company') {
        activeSignature = companyInfo?.bossSignature || '';
        signerName = '';
        signerTitle = companyInfo?.bossTitle || 'Authorized Person';
    } else if (signerChoice === 'my' && currentUser?.signature) {
        activeSignature = currentUser.signature;
        signerName = currentUser.fullName || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
        signerTitle = currentUser.jobTitle || (currentUser.role === 'admin' ? 'Managing Director' : 'Manager');
    } else {
        // Auto: prioritize logged in manager's signature, then creator's signature, then document signature, then company default
        if (currentUser?.signature) {
            activeSignature = currentUser.signature;
            signerName = currentUser.fullName || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
            signerTitle = currentUser.jobTitle || (currentUser.role === 'admin' ? 'Managing Director' : 'Manager');
        } else if (doc.createdBy?.signature) {
            activeSignature = doc.createdBy.signature;
            signerName = `${doc.createdBy.firstName || ''} ${doc.createdBy.lastName || ''}`.trim();
            signerTitle = doc.createdBy.jobTitle || 'Manager';
        } else if (doc.signature) {
            activeSignature = doc.signature;
            signerName = doc.signerName || '';
            signerTitle = doc.signerTitle || '';
        } else {
            activeSignature = companyInfo?.bossSignature || '';
            signerName = '';
            signerTitle = companyInfo?.bossTitle || 'Authorized Person';
        }
    }

    /* ── doc-type flags ── */
    const isProforma  = doc.invoiceType === 'proforma' || doc.documentType === 'proforma' || (doc.invoiceNumber && (doc.invoiceNumber.startsWith('PI') || doc.invoiceNumber.includes('/PI/')));
    const isEstimate  = !isProforma && (doc.documentType === 'estimate' || (doc.quoteNumber && (doc.quoteNumber.startsWith('EST') || doc.quoteNumber.includes('/EST/'))));
    const isInvoice   = !isProforma && !isEstimate && (!!doc.invoiceNumber || doc.documentType === 'invoice');
    const isQuotation = !isProforma && !isEstimate && !isInvoice;

    const docNumberLabel = (isInvoice || isProforma)
        ? (lang === 'si' ? 'ඉන්වොයිස් අංකය' : lang === 'ta' ? 'விலைப்பட்டியல் எண்' : 'Invoice No.')
        : isEstimate
        ? (lang === 'si' ? 'ඇස්තමේන්තු අංකය' : lang === 'ta' ? 'மதிப்பீடு எண்' : 'Estimate No.')
        : (lang === 'si' ? 'මිල ගණන් අංකය' : lang === 'ta' ? 'விலைப்புள்ளி எண்' : 'Quotation No.');

    let docLabel = t.quotation || 'Quotation';
    if (isEstimate)  docLabel = t.estimate || 'Estimate';
    if (isInvoice)   docLabel = t.invoice || 'Invoice';
    if (isProforma)  docLabel = t.proforma || 'Proforma';

    /* ── meta ── */
    const docNumber       = doc.proformaNumber || doc.invoiceNumber || doc.quoteNumber || doc.quotationCode || 'N/A';
    const customerName    = doc.customerName  || doc.vehicleOwner || doc.customerSnapshot?.name || 'Customer';
    const customerAddress = doc.customerAddress || doc.billingAddress?.line1 || '';
    const customerPhone   = doc.customerPhone || doc.customerSnapshot?.contactName || '';
    const vehicleNo       = doc.vehicleNo || '';
    const salesRep        = doc.salesRep  || 'Asanka';
    const branch          = doc.branch    || 'JA-ELA';
    const docDate         = doc.date || doc.invoiceDate || doc.createdAt || new Date();
    const printTimestamp  = fmtPrintTs(new Date());

    /* ── effective quick-edited meta ── */
    const customerNameVal    = editedValues.customerName !== undefined ? editedValues.customerName : customerName;
    const customerAddressVal = editedValues.customerAddress !== undefined ? editedValues.customerAddress : customerAddress;
    const customerPhoneVal   = editedValues.customerPhone !== undefined ? editedValues.customerPhone : customerPhone;
    const vehicleNoVal       = editedValues.vehicleNo !== undefined ? editedValues.vehicleNo : vehicleNo;
    const salesRepVal        = editedValues.salesRep !== undefined ? editedValues.salesRep : salesRep;
    const branchVal          = editedValues.branch !== undefined ? editedValues.branch : branch;

    /* ── items & totals ── */
    const items = doc.items || [];
    let subtotal = 0, totalLineDiscount = 0;

    items.forEach(item => {
        const qty      = Number(item.quantity) || 1;
        const rate     = Number(item.unitPrice || item.rate || 0);
        const discRate = Number(item.discount  || 0);
        const discAmt  = discRate > 0
            ? discRate * qty
            : Number(item.discountAmount || item.lineDiscount ||
                (item.discountPercent ? (qty * rate * item.discountPercent / 100) : 0));
        subtotal           += qty * rate;
        totalLineDiscount  += discAmt;
    });

    const extraDiscount = Number(doc.discount || doc.totalDiscount || 0);
    const totalDiscount = Math.max(totalLineDiscount, extraDiscount);
    const laborCost     = Number(doc.laborCost || 0);
    const tax           = Number(doc.tax || doc.totalTax || 0);
    const grandTotal    = doc.grandTotal !== undefined
        ? Number(doc.grandTotal)
        : (subtotal + laborCost + tax - totalDiscount);
    const advancePaid   = Number(doc.advanceAmount || doc.amountPaid || 0);
    const balanceDue    = doc.balanceAmount !== undefined
        ? Number(doc.balanceAmount)
        : (doc.balanceDue !== undefined ? Number(doc.balanceDue) : Math.max(0, grandTotal - advancePaid));

    /* ── dynamic trilingual terms & conditions ── */
    const rawPayCond = doc.conditionOfPayments || defaultConditions.conditionOfPayments.en;
    const rawCompWork = doc.completionOfWork || defaultConditions.completionOfWork.en;
    const rawValQuote = doc.validityQuotation || (doc.terms?.paymentTerms || defaultConditions.validityQuotation.en);
    const rawWarCond = doc.warrantyCondition || doc.warrantyInfo || defaultConditions.warrantyCondition.en;

    const dynamicPayCond  = translateCondition('conditionOfPayments', rawPayCond, lang);
    const dynamicCompWork = translateCondition('completionOfWork', rawCompWork, lang);
    const dynamicValQuote = translateCondition('validityQuotation', rawValQuote, lang);
    const dynamicWarCond  = translateCondition('warrantyCondition', rawWarCond, lang);

    const conditionOfPayments = editedValues.conditionOfPayments !== undefined ? editedValues.conditionOfPayments : dynamicPayCond;
    const completionOfWork    = editedValues.completionOfWork    !== undefined ? editedValues.completionOfWork    : dynamicCompWork;
    const validityQuotation   = editedValues.validityQuotation   !== undefined ? editedValues.validityQuotation   : dynamicValQuote;
    const warrantyCondition   = editedValues.warrantyCondition   !== undefined ? editedValues.warrantyCondition   : dynamicWarCond;
    const remarksText         = editedValues.remarks             !== undefined ? editedValues.remarks             : (doc.remarks || doc.notes || '');

    /* ── photo attachments collection ── */
    const allPhotos = [];
    if (doc.numberPlateImage) {
        allPhotos.push({ title: 'Vehicle Number Plate Photo', src: doc.numberPlateImage });
    }
    if (doc.lorryBodyImage) {
        allPhotos.push({ title: 'Vehicle / Lorry Body Condition', src: doc.lorryBodyImage });
    }
    if (Array.isArray(doc.photos)) {
        doc.photos.forEach((src) => {
            if (src && !allPhotos.some(p => p.src === src)) {
                allPhotos.push({ title: `Inspection Photo ${allPhotos.length + 1}`, src });
            }
        });
    }
    if (Array.isArray(doc.inspectionPhotos)) {
        doc.inspectionPhotos.forEach((src) => {
            if (src && !allPhotos.some(p => p.src === src)) {
                allPhotos.push({ title: `Inspection Photo ${allPhotos.length + 1}`, src });
            }
        });
    }

    /* ── QR string ── */
    const qrString = JSON.stringify({
        type: docLabel, number: docNumber, date: fmtDate(docDate),
        customer: customerNameVal, vehicleNo: vehicleNoVal || 'N/A',
        grandTotal, branch: branchVal, sales: salesRepVal,
    });

    const hasEdits = Object.keys(editedValues).length > 0;

    /* ── inline print styles ── */
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
                page-break-after: always !important;
                break-after: page !important;
            }
            .print-page:last-child {
                page-break-after: avoid !important;
                break-after: avoid !important;
            }
            .print-container table,
            .print-page table,
            table.print-table {
                background-color: transparent !important;
                background: transparent !important;
            }
            .print-container table tbody tr,
            .print-page table tbody tr,
            table.print-table tbody tr,
            .print-container table tbody tr td,
            .print-page table tbody tr td {
                background-color: transparent !important;
                background: transparent !important;
            }
            input, textarea { border: none !important; background: transparent !important; box-shadow: none !important; resize: none !important; }
        }
        /* Ensure on-screen preview also has pure transparent/white rows without blue stripes */
        .print-container table tbody tr,
        .print-page table tbody tr,
        table.print-table tbody tr {
            background-color: transparent !important;
            background: transparent !important;
        }
    `;

    return (
        <div style={{ fontFamily: "'Calibri', 'Segoe UI', Arial, Helvetica, sans-serif", color: '#111', background: '#fff', width: '100%', maxWidth: 'calc(210mm - 0.5in)', margin: '0 auto', fontSize: 12.5 }}>
            <style>{printStyles}</style>

            {/* ── Toolbar (no-print) ── */}
            {!hideToolbar && (
                <div className="no-print" style={{ marginBottom: 12, padding: '10px 14px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, fontSize: 12 }}>
                    {/* Left: Language switcher */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: '#475569' }}>Language / භාෂාව:</span>
                        <div style={{ display: 'inline-flex', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
                            {['en','si','ta'].map(l => (
                                <button key={l} type="button" onClick={() => setLang(l)} style={{
                                    padding: '4px 11px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 11.5,
                                    background: lang === l ? '#0284c7' : 'transparent',
                                    color: lang === l ? '#fff' : '#374151',
                                    borderRadius: 0,
                                    transition: 'all 0.15s'
                                }}>
                                    {l === 'en' ? 'English' : l === 'si' ? 'සිංහල' : 'தமிழ்'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: Quick Edit, Letterhead toggle, Photo toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {/* Quick Edit toggle */}
                        <button 
                            type="button" 
                            onClick={() => setIsQuickEdit(e => !e)}
                            style={{
                                padding: '4px 10px',
                                borderRadius: 7,
                                fontWeight: 600,
                                fontSize: 11.5,
                                cursor: 'pointer',
                                background: isQuickEdit ? '#2563eb' : '#fff',
                                color: isQuickEdit ? '#fff' : '#1d4ed8',
                                border: '1px solid #93c5fd',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: isQuickEdit ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                            }}
                            title="Quick-edit text, conditions, remarks before printing or downloading"
                        >
                            {isQuickEdit ? '✓ Done Editing' : '✏️ Quick Edit Mode'}
                        </button>

                        {hasEdits && (
                            <button
                                type="button"
                                onClick={() => setEditedValues({})}
                                style={{
                                    padding: '4px 9px',
                                    borderRadius: 7,
                                    fontWeight: 600,
                                    fontSize: 11,
                                    cursor: 'pointer',
                                    background: '#fee2e2',
                                    color: '#991b1b',
                                    border: '1px solid #fca5a5'
                                }}
                                title="Reset all in-place edits to original"
                            >
                                ↺ Reset
                            </button>
                        )}

                        {allPhotos.length > 0 && (
                            <button type="button" onClick={() => setShowPhotos(p => !p)} style={{
                                padding: '4px 10px', borderRadius: 7, fontWeight: 600, fontSize: 11, cursor: 'pointer',
                                background: showPhotosInPrint ? '#e0e7ff' : '#f3f4f6',
                                color: showPhotosInPrint ? '#3730a3' : '#6b7280',
                                border: '1px solid #cbd5e1'
                            }}>
                                📷 {showPhotosInPrint ? `Hide Photos (${allPhotos.length})` : `Show Photos (${allPhotos.length})`}
                            </button>
                        )}

                        {/* Letterhead Header Toggle */}
                        <button type="button" onClick={() => setShowLH(p => !p)} style={{
                            padding: '4px 12px', borderRadius: 7, fontWeight: 600, fontSize: 11, cursor: 'pointer', border: '1px solid #cbd5e1',
                            background: !showLetterheadHeader ? '#b45309' : '#fff',
                            color: !showLetterheadHeader ? '#fff' : '#374151',
                        }}>
                            {!showLetterheadHeader ? '✓ Without Header (Pre-printed)' : 'With Header (Letterhead)'}
                        </button>

                        {/* Signature Scale Button */}
                        <button 
                            type="button" 
                            onClick={() => setSignatureScale(s => s === 'large' ? 'standard' : 'large')} 
                            style={{
                                padding: '4px 10px', 
                                borderRadius: 7, 
                                fontWeight: 600, 
                                fontSize: 11, 
                                cursor: 'pointer', 
                                border: '1px solid #cbd5e1',
                                background: signatureScale === 'large' ? '#e0f2fe' : '#fff',
                                color: signatureScale === 'large' ? '#0369a1' : '#374151',
                            }}
                            title="Toggle signature size (Standard 72px / Large 88px)"
                        >
                            ✍️ Sig: {signatureScale === 'large' ? 'Large' : 'Standard'}
                        </button>

                        {/* Signer Switcher */}
                        {currentUser?.signature && (
                            <button
                                type="button"
                                onClick={() => setSignerChoice(c => c === 'company' ? 'auto' : 'company')}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: 7,
                                    fontWeight: 600,
                                    fontSize: 11,
                                    cursor: 'pointer',
                                    border: '1px solid #cbd5e1',
                                    background: signerChoice !== 'company' ? '#dcfce7' : '#fff',
                                    color: signerChoice !== 'company' ? '#15803d' : '#4b5563',
                                }}
                            >
                                👤 {signerChoice !== 'company' ? `Signed: ${currentUser.firstName || 'My Sig'}` : 'Signed: Company'}
                            </button>
                        )}
                    </div>

                    {isQuickEdit && (
                        <div style={{ width: '100%', padding: '6px 10px', background: '#eff6ff', border: '1px dashed #93c5fd', borderRadius: 6, fontSize: 11, color: '#1e40af' }}>
                            ✏️ <strong>Quick Edit Active:</strong> You can edit Customer info, Vehicle No, Remarks, and Terms &amp; Conditions inline below.
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════
                PRINTABLE ROOT AREA (Multi-Page Supported)
            ══════════════════════════════════════════════════ */}
            <div ref={ref} className="print-root-container">

                {/* ──────────────────────────────────────────────
                    PAGE 1: 100% Matches GLX Physical Print Format
                ────────────────────────────────────────────── */}
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
                        {/* ── COMPANY HEADER (Shown only if digital header is toggled on) ── */}
                        {showLetterheadHeader && (
                            <div style={{ borderBottom: '1.5px solid #444', paddingBottom: 8, marginBottom: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <div style={{ flexShrink: 0, width: 72, marginTop: 2 }}>
                                        <img src="/logo.jpg" alt="GLX Logo" crossOrigin="anonymous" style={{ width: '100%', height: 'auto', objectFit: 'contain', filter: 'grayscale(100%)' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: 0.5, lineHeight: 1.1 }}>
                                            GLX TRUCK BODY ENGINEERS
                                        </div>
                                        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, color: '#444', marginBottom: 5 }}>
                                            ALUMINIUM , STEEL &amp; FREEZER BOX MANUFACTURE
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, fontSize: 11, lineHeight: 1.55 }}>
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
                                                <div><span style={{ display: 'inline-block', width: 48, fontWeight: 600 }}>Mobile</span> : 071 6666 888</div>
                                                <div><span style={{ display: 'inline-block', width: 48, fontWeight: 600 }}>Tel</span> : 011 740 4446</div>
                                                <div><span style={{ display: 'inline-block', width: 48, fontWeight: 600 }}>Email</span> : glx.engi@gmail.com</div>
                                                <div><span style={{ display: 'inline-block', width: 48, fontWeight: 600 }}>Web</span> : www.glx.lk</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── CUSTOMER + DOCUMENT META (Exact format of media_1790881963777.png) ── */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, fontSize: 12.5 }}>
                            {/* Left: Customer Block */}
                            <div style={{ maxWidth: '54%', lineHeight: 1.55 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, color: '#000' }}>{t.billTo || 'Customer'}</div>
                                {isQuickEdit ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
                                        <input
                                            type="text"
                                            value={customerNameVal}
                                            onChange={(e) => setEditedValues(prev => ({ ...prev, customerName: e.target.value }))}
                                            placeholder="Customer Name"
                                            className="w-full text-xs p-1 border border-blue-300 rounded bg-blue-50/40 font-semibold"
                                        />
                                        <input
                                            type="text"
                                            value={customerAddressVal}
                                            onChange={(e) => setEditedValues(prev => ({ ...prev, customerAddress: e.target.value }))}
                                            placeholder="Customer Address"
                                            className="w-full text-xs p-1 border border-blue-300 rounded bg-blue-50/40"
                                        />
                                        <input
                                            type="text"
                                            value={customerPhoneVal}
                                            onChange={(e) => setEditedValues(prev => ({ ...prev, customerPhone: e.target.value }))}
                                            placeholder="Phone Number"
                                            className="w-full text-xs p-1 border border-blue-300 rounded bg-blue-50/40"
                                        />
                                        <input
                                            type="text"
                                            value={vehicleNoVal}
                                            onChange={(e) => setEditedValues(prev => ({ ...prev, vehicleNo: e.target.value }))}
                                            placeholder="Vehicle Number (e.g. WP LC - 1757)"
                                            className="w-full text-xs p-1 border border-blue-300 rounded bg-blue-50/40 font-mono font-bold"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ fontWeight: 500, fontSize: 13, color: '#000' }}>{customerNameVal}</div>
                                        {customerAddressVal && <div style={{ fontSize: 12.5, color: '#222' }}>{customerAddressVal}</div>}
                                        {customerPhoneVal   && <div style={{ fontSize: 12.5, color: '#222' }}>{customerPhoneVal}</div>}
                                        {vehicleNoVal && (
                                            <div style={{ fontWeight: 700, fontFamily: "'Consolas', 'Segoe UI Mono', monospace", fontSize: 13.5, marginTop: 8, color: '#000' }}>
                                                {vehicleNoVal}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Right: Meta Details */}
                            <div style={{ textAlign: 'left', minWidth: 230 }}>
                                {[
                                    [docNumberLabel, docNumber],
                                    [t.sales || 'Sales', isQuickEdit ? (
                                        <input
                                            type="text"
                                            value={salesRepVal}
                                            onChange={(e) => setEditedValues(prev => ({ ...prev, salesRep: e.target.value }))}
                                            className="text-xs p-0.5 border border-blue-300 rounded bg-blue-50/40 w-28"
                                        />
                                    ) : salesRepVal],
                                    [t.branch || 'Branch', isQuickEdit ? (
                                        <input
                                            type="text"
                                            value={branchVal}
                                            onChange={(e) => setEditedValues(prev => ({ ...prev, branch: e.target.value }))}
                                            className="text-xs p-0.5 border border-blue-300 rounded bg-blue-50/40 w-28"
                                        />
                                    ) : branchVal],
                                    [t.date || 'Date', <>
                                        <span style={{ fontFamily: "'Consolas', 'Segoe UI Mono', monospace" }}>{fmtDate(docDate)}</span>
                                        {fmtTime(doc.createdAt) && <><br/><span style={{ fontFamily: "'Consolas', 'Segoe UI Mono', monospace", fontSize: 11.5 }}>{fmtTime(doc.createdAt)}</span></>}
                                    </>],
                                ].map(([label, value]) => (
                                    <div key={label} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', columnGap: 4, lineHeight: 1.6, fontSize: 12.5 }}>
                                        <span style={{ fontWeight: 700, color: '#000' }}>{label}</span>
                                        <span style={{ color: '#000' }}>&nbsp;&nbsp;{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── ITEMS TABLE ── */}
                        <table className="no-zebra print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, marginBottom: 4, background: 'transparent' }}>
                            <thead>
                                <tr style={{ background: 'transparent' }}>
                                    <th style={{ padding: '6px 4px 6px 0', textAlign: 'left',   fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#000', background: 'transparent' }}>
                                        {t.description || 'DESCRIPTION'}
                                    </th>
                                    <th style={{ padding: '6px 8px', textAlign: 'right',  fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, width: 95, color: '#000', background: 'transparent' }}>
                                        {t.rate || 'RATE'}
                                    </th>
                                    <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, width: 55, color: '#000', background: 'transparent' }}>
                                        {t.qty || 'QTY'}
                                    </th>
                                    <th style={{ padding: '6px 0 6px 8px', textAlign: 'right',  fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, width: 105, color: '#000', background: 'transparent' }}>
                                        {t.amount || 'AMOUNT'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody style={{ background: 'transparent' }}>
                                {items.map((item, idx) => {
                                    const qty        = Number(item.quantity) || 1;
                                    const rate       = Number(item.unitPrice || item.rate || 0);
                                    const grossAmt   = qty * rate;
                                    const discRate   = Number(item.discount  || 0);
                                    const discAmt    = discRate > 0
                                        ? discRate * qty
                                        : Number(item.discountAmount || item.lineDiscount ||
                                            (item.discountPercent ? (grossAmt * item.discountPercent / 100) : 0));
                                    const effDiscRate = discRate > 0 ? discRate : (qty > 0 ? +(discAmt / qty).toFixed(2) : 0);

                                    const mainName = item.productName || item.description || 'Line Item';
                                    const sinhalaName = item.productTranslation || item.sinhalaName || '';
                                    const title = lang === 'si'
                                        ? (sinhalaName || mainName)
                                        : mainName;
                                    const subtitle = lang === 'si'
                                        ? (sinhalaName && mainName !== sinhalaName ? mainName : '')
                                        : (sinhalaName && sinhalaName !== mainName ? sinhalaName : '');
                                    const descExtra = item.description && item.description !== mainName && item.description !== sinhalaName ? item.description : '';

                                    return (
                                        <React.Fragment key={idx}>
                                            <tr style={{ verticalAlign: 'top', background: 'transparent' }}>
                                                <td style={{ padding: '6px 4px 2px 0', lineHeight: 1.45, background: 'transparent' }}>
                                                    <div style={{ fontWeight: 500, color: '#000' }}>
                                                        <span>{title}</span>
                                                        {subtitle && (
                                                            <span style={{ 
                                                                color: lang === 'si' ? '#475569' : '#047857', 
                                                                fontWeight: 600, 
                                                                fontSize: 12,
                                                                marginLeft: 6
                                                            }}>
                                                                ({subtitle})
                                                            </span>
                                                        )}
                                                    </div>
                                                    {descExtra && (
                                                        <div style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#333', marginTop: 1 }}>
                                                            {descExtra}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '6px 8px 2px', textAlign: 'right',  fontFamily: "'Consolas', 'Segoe UI Mono', monospace", fontSize: 12.5, color: '#000', background: 'transparent' }}>{fmt(rate)}</td>
                                                <td style={{ padding: '6px 8px 2px', textAlign: 'center', fontFamily: "'Consolas', 'Segoe UI Mono', monospace", fontSize: 12.5, color: '#000', background: 'transparent' }}>{qty}</td>
                                                <td style={{ padding: '6px 0   2px 8px', textAlign: 'right',  fontFamily: "'Consolas', 'Segoe UI Mono', monospace", fontSize: 12.5, color: '#000', background: 'transparent' }}>{fmt(grossAmt)}</td>
                                            </tr>
                                            {(discAmt > 0 || effDiscRate > 0) && (
                                                <tr style={{ color: '#dc2626', background: 'transparent' }}>
                                                    <td style={{ paddingBottom: 6, paddingRight: 4, color: '#dc2626', fontSize: 12, fontWeight: 500, background: 'transparent' }}>Discount</td>
                                                    <td style={{ textAlign: 'right',  fontFamily: "'Consolas', 'Segoe UI Mono', monospace", padding: '0 8px 6px', color: '#dc2626', fontSize: 12, background: 'transparent' }}>-{fmt(effDiscRate)}</td>
                                                    <td style={{ textAlign: 'center', fontFamily: "'Consolas', 'Segoe UI Mono', monospace", padding: '0 8px 6px', color: '#dc2626', fontSize: 12, background: 'transparent' }}>{qty}</td>
                                                    <td style={{ textAlign: 'right',  fontFamily: "'Consolas', 'Segoe UI Mono', monospace", padding: '0 0 6px 8px', color: '#dc2626', fontSize: 12, background: 'transparent' }}>-{fmt(discAmt)}</td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}

                                {laborCost > 0 && (
                                    <tr style={{ verticalAlign: 'top', background: 'transparent' }}>
                                        <td style={{ padding: '6px 4px 2px 0', fontWeight: 500, color: '#000', background: 'transparent' }}>Labor Charge / Workmanship</td>
                                        <td style={{ padding: '6px 8px 2px', textAlign: 'right',  fontFamily: "'Consolas', 'Segoe UI Mono', monospace", color: '#000', background: 'transparent' }}>{fmt(laborCost)}</td>
                                        <td style={{ padding: '6px 8px 2px', textAlign: 'center', fontFamily: "'Consolas', 'Segoe UI Mono', monospace", color: '#000', background: 'transparent' }}>1</td>
                                        <td style={{ padding: '6px 0   2px 8px', textAlign: 'right',  fontFamily: "'Consolas', 'Segoe UI Mono', monospace", color: '#000', background: 'transparent' }}>{fmt(laborCost)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* ── SUBTOTALS + REMARKS (Clean layout matching media_1790881963777.png) ── */}
                        <div style={{ marginTop: 10, paddingTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, fontSize: 12.5 }}>
                            {/* Left: Remarks */}
                            <div style={{ maxWidth: '45%', lineHeight: 1.6 }}>
                                <span style={{ fontWeight: 700, color: '#000' }}>{t.remarks || 'Remarks'} &nbsp;&nbsp;&nbsp;&nbsp;:</span>
                                {isQuickEdit ? (
                                    <input
                                        type="text"
                                        value={remarksText}
                                        onChange={(e) => setEditedValues(prev => ({ ...prev, remarks: e.target.value }))}
                                        placeholder="Add remarks..."
                                        className="w-full text-xs p-1 mt-1 border border-blue-300 rounded bg-blue-50/40"
                                    />
                                ) : (
                                    remarksText ? <span style={{ marginLeft: 6, color: '#000' }}>{remarksText}</span> : null
                                )}
                            </div>

                            {/* Right: Totals block */}
                            <div style={{ minWidth: 260 }}>
                                {/* SUB TOTAL */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 4, color: '#000' }}>
                                    <span>SUB TOTAL</span>
                                    <span style={{ fontFamily: "'Consolas', 'Segoe UI Mono', monospace" }}>{fmt(subtotal + laborCost)}</span>
                                </div>
                                {/* DISCOUNT (in RED) */}
                                {totalDiscount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 4, color: '#dc2626' }}>
                                        <span>DISCOUNT</span>
                                        <span style={{ fontFamily: "'Consolas', 'Segoe UI Mono', monospace" }}>-{fmt(totalDiscount)}</span>
                                    </div>
                                )}
                                {/* GRAND TOTAL */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13.5, color: '#000', marginTop: 4 }}>
                                    <span>GRAND TOTAL</span>
                                    <span style={{ fontFamily: "'Consolas', 'Segoe UI Mono', monospace" }}>{fmt(grandTotal)}</span>
                                </div>

                                {/* Optional Advance Paid & Balance Due */}
                                {(advancePaid > 0 && (doc.showAdvanceOnInvoice || isInvoice)) && (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: 4, color: '#166534' }}>
                                            <span>ADVANCE PAID</span>
                                            <span style={{ fontFamily: "'Consolas', 'Segoe UI Mono', monospace" }}>-{fmt(advancePaid)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: 2, color: '#92400e' }}>
                                            <span>BALANCE DUE</span>
                                            <span style={{ fontFamily: "'Consolas', 'Segoe UI Mono', monospace" }}>{fmt(balanceDue)}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* ── TERMS & CONDITIONS (Colon-aligned matching media_1790881963777.png) ── */}
                        <div style={{ paddingTop: 4, fontSize: lang === 'en' ? 11.5 : 11, lineHeight: 1.65, marginBottom: 14 }}>
                            {!isInvoice && (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '175px 15px 1fr', gap: '2px 4px', alignItems: 'start' }}>
                                        <span style={{ fontWeight: 700, color: '#000' }}>{t.conditionOfPayments || 'Condition of Payments'}</span>
                                        <span style={{ fontWeight: 700, color: '#000' }}>:</span>
                                        <div>
                                            {isQuickEdit ? (
                                                <textarea
                                                    rows={2}
                                                    value={conditionOfPayments}
                                                    onChange={(e) => setEditedValues(prev => ({ ...prev, conditionOfPayments: e.target.value }))}
                                                    className="w-full text-xs p-1 border border-blue-300 rounded bg-blue-50/40"
                                                />
                                            ) : (
                                                <div style={{ whiteSpace: 'pre-line', fontWeight: 500, color: '#000' }}>{conditionOfPayments}</div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '175px 15px 1fr', gap: '2px 4px', alignItems: 'start', marginTop: 4 }}>
                                        <span style={{ fontWeight: 700, color: '#000' }}>{t.completionOfWork || 'Completion of Work'}</span>
                                        <span style={{ fontWeight: 700, color: '#000' }}>:</span>
                                        <div>
                                            {isQuickEdit ? (
                                                <input
                                                    type="text"
                                                    value={completionOfWork}
                                                    onChange={(e) => setEditedValues(prev => ({ ...prev, completionOfWork: e.target.value }))}
                                                    className="w-full text-xs p-1 border border-blue-300 rounded bg-blue-50/40"
                                                />
                                            ) : (
                                                <div style={{ fontWeight: 500, color: '#000' }}>{completionOfWork}</div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '175px 15px 1fr', gap: '2px 4px', alignItems: 'start', marginTop: 4 }}>
                                        <span style={{ fontWeight: 700, color: '#000' }}>{t.validity || 'Validity'} &nbsp;({isInvoice || isProforma ? 'Invoice' : isEstimate ? 'Estimate' : 'Quotation'})</span>
                                        <span style={{ fontWeight: 700, color: '#000' }}>:</span>
                                        <div>
                                            {isQuickEdit ? (
                                                <input
                                                    type="text"
                                                    value={validityQuotation}
                                                    onChange={(e) => setEditedValues(prev => ({ ...prev, validityQuotation: e.target.value }))}
                                                    className="w-full text-xs p-1 border border-blue-300 rounded bg-blue-50/40 font-semibold"
                                                />
                                            ) : (
                                                <div style={{ fontWeight: 700, color: '#000' }}>{validityQuotation}</div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '175px 15px 1fr', gap: '2px 4px', alignItems: 'start', marginTop: 4 }}>
                                <span style={{ fontWeight: 700, color: '#000' }}>{t.warranty || 'Warranty'}</span>
                                <span style={{ fontWeight: 700, color: '#000' }}>:</span>
                                <div>
                                    {isQuickEdit ? (
                                        <textarea
                                            rows={2}
                                            value={warrantyCondition}
                                            onChange={(e) => setEditedValues(prev => ({ ...prev, warrantyCondition: e.target.value }))}
                                            className="w-full text-xs p-1 border border-blue-300 rounded bg-blue-50/40"
                                        />
                                    ) : (
                                        <div style={{ whiteSpace: 'pre-line', fontWeight: 500, color: '#000' }}>{warrantyCondition}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── FOOTER: Signature (left) + QR Code (right) (100% matches media_1790881963777.png) ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 8, marginTop: 'auto', pageBreakInside: 'avoid' }}>
                        {/* Signature block */}
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2, color: '#000' }}>
                                {lang === 'si' ? 'ඔබේ විශ්වාසවන්ත,' : lang === 'ta' ? 'உங்கள் உண்மையுள்ள,' : 'Yours Faithfully,'}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#000', marginBottom: 16, lineHeight: 1.2 }}>
                                {companyInfo?.companyName || 'GLX INDUSTRIES'} - {branchVal}
                            </div>

                            {/* Seal + Signature image area - safely below company name */}
                            <div style={{ position: 'relative', minHeight: 56, marginTop: 8 }}>
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
                                {activeSignature ? (
                                    <img
                                        src={activeSignature}
                                        alt="Authorized Signature"
                                        crossOrigin="anonymous"
                                        style={{ 
                                            height: signatureScale === 'large' ? 62 : 48, 
                                            maxWidth: 210, 
                                            objectFit: 'contain', 
                                            marginBottom: 2, 
                                            position: 'relative', 
                                            zIndex: 2, 
                                            display: 'block' 
                                        }}
                                    />
                                ) : (
                                    <div style={{ height: 40 }} />
                                )}
                                {/* Dotted signature line matching physical print */}
                                <div style={{ fontSize: 14, letterSpacing: 1, color: '#444', lineHeight: 0.8 }}>
                                    ............................................................
                                </div>
                            </div>
                            <div style={{ fontSize: 11.5, color: '#000', marginTop: 4, fontWeight: 700 }}>
                                {signerName ? (
                                    <span>
                                        <strong>{signerName}</strong> &nbsp;—&nbsp; {signerTitle || (lang === 'si' ? 'බලයලත් නිලධාරී' : 'Authorized Person')}
                                    </span>
                                ) : (
                                    <span>
                                        {t.authorizedSignature || (lang === 'si' ? 'බලයලත් නිලධාරී' : 'Authorized Person')}
                                        {signerTitle ? ` (${signerTitle})` : ''}
                                    </span>
                                )}
                            </div>

                            {/* Print timestamp in RED font */}
                            <div style={{ fontSize: 10.5, color: '#dc2626', fontFamily: "'Consolas', monospace", marginTop: 14, fontWeight: 600 }}>
                                Printed at &nbsp;&nbsp;&nbsp;&nbsp; {printTimestamp}
                            </div>
                        </div>

                        {/* QR Code */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <QRCodeSVG value={qrString} size={110} level="M" />
                        </div>
                    </div>
                </div>{/* /print-page (Page 1) */}

                {/* ──────────────────────────────────────────────
                    PAGE 2: Vehicle & Inspection Photo Attachments
                    (Rendered only if photos exist and not hidden)
                ────────────────────────────────────────────── */}
                {showPhotosInPrint && allPhotos.length > 0 && (
                    <div 
                        className="print-page print-container photo-page" 
                        style={{ 
                            background: '#fff', 
                            padding: '16px 20px', 
                            width: '100%',
                            maxWidth: 'calc(210mm - 0.5in)',
                            minHeight: 'calc(297mm - 0.5in)',
                            boxSizing: 'border-box',
                            margin: '20px auto 0 auto',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}
                    >
                        <div>
                            {/* Page 2 Header */}
                            <div style={{ borderBottom: '1.5px solid #1e293b', paddingBottom: 8, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 0.5, color: '#0f172a' }}>
                                        {companyInfo?.companyName || 'GLX TRUCK BODY ENGINEERS'}
                                    </div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                                        VEHICLE VERIFICATION &amp; INSPECTION PHOTO ATTACHMENTS
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                                    <div><strong>{docNumberLabel}:</strong> {docNumber}</div>
                                    <div><strong>Date:</strong> {fmtDate(docDate)}</div>
                                </div>
                            </div>

                            {/* Customer & Vehicle Info Strip - Clean Formal Document Style */}
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                paddingBottom: 8, 
                                marginBottom: 14, 
                                borderBottom: '1px solid #e2e8f0', 
                                fontSize: 11.5 
                            }}>
                                <div>
                                    <span style={{ color: '#64748b', fontWeight: 600 }}>Customer: </span>
                                    <strong style={{ color: '#1e293b' }}>{customerNameVal}</strong>
                                </div>
                                {vehicleNoVal && (
                                    <div>
                                        <span style={{ color: '#64748b', fontWeight: 600 }}>Vehicle No: </span>
                                        <strong style={{ fontFamily: 'monospace', color: '#1e293b', fontSize: 12.5 }}>{vehicleNoVal}</strong>
                                    </div>
                                )}
                            </div>

                            {/* Photos Grid */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: allPhotos.length === 1 ? '1fr' : 'repeat(2, 1fr)', 
                                gap: 16 
                            }}>
                                {allPhotos.map((photo, pIdx) => (
                                    <div key={pIdx} style={{ 
                                        background: '#fff', 
                                        border: '1px solid #cbd5e1', 
                                        borderRadius: 6, 
                                        padding: 8, 
                                        textAlign: 'center',
                                        pageBreakInside: 'avoid',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}>
                                        <div style={{ 
                                            fontSize: 11, 
                                            fontWeight: 700, 
                                            color: '#1e293b', 
                                            textTransform: 'uppercase', 
                                            paddingBottom: 6, 
                                            marginBottom: 6,
                                            borderBottom: '1px solid #f1f5f9',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}>
                                            <span>{photo.title}</span>
                                            <span style={{ fontSize: 9.5, color: '#64748b', fontWeight: 600 }}>#{pIdx + 1}</span>
                                        </div>
                                        <div style={{ 
                                            height: allPhotos.length <= 2 ? 320 : 210, 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            background: '#f8fafc', 
                                            borderRadius: 6, 
                                            overflow: 'hidden',
                                            border: '1px solid #f1f5f9'
                                        }}>
                                            <img 
                                                src={photo.src} 
                                                alt={photo.title} 
                                                crossOrigin="anonymous"
                                                style={{ 
                                                    maxHeight: '100%', 
                                                    maxWidth: '100%', 
                                                    objectFit: 'contain' 
                                                }} 
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Page 2 Footer */}
                        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, color: '#64748b' }}>
                            <div>
                                Printed at &nbsp;<span style={{ color: '#dc2626', fontWeight: 600 }}>{printTimestamp}</span> &nbsp;|&nbsp; GLX TRUCK BODY ENGINEERS ({branchVal})
                            </div>
                            <div style={{ fontWeight: 600 }}>
                                Page 2 of 2 (Attachments)
                            </div>
                        </div>
                    </div>
                )}

            </div>{/* /print-root-container */}
        </div>
    );
});

DocumentPrintView.displayName = 'DocumentPrintView';
export default DocumentPrintView;