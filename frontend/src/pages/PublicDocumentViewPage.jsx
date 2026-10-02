import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import DocumentPrintView from '../components/print/DocumentPrintView';
import { exportElementToPDF } from '../utils/dataExport';
import { getApiUrl } from '../api/config';
import { 
    Download, Printer, FileText, CheckCircle2, Phone, MapPin, 
    Calendar, User, Truck, ShieldCheck, Clock, ExternalLink, 
    Image as ImageIcon, X, Smartphone, FileSpreadsheet, Eye
} from 'lucide-react';

const fmt = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0.00';
    return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch { return String(dateStr); }
};

export default function PublicDocumentViewPage() {
    const { token } = useParams();
    const [doc, setDoc] = useState(null);
    const [companyInfo, setCompanyInfo] = useState(null);
    const [docType, setDocType] = useState('quotation');
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState('');
    const [activePhoto, setActivePhoto] = useState(null);
    const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768) ? 'mobile' : 'a4');
    const printRef = useRef(null);

    useEffect(() => {
        const fetchDoc = async () => {
            try {
                const apiUrl = `${getApiUrl()}/public/documents/${token}`;
                const response = await axios.get(apiUrl);
                if (response.data && response.data.success) {
                    setDoc(response.data.data);
                    setDocType(response.data.documentType);
                    setCompanyInfo(response.data.companyInfo);
                } else {
                    setError('Unable to load document details.');
                }
            } catch (err) {
                setError('Document not found or link has expired.');
            } finally {
                setLoading(false);
            }
        };
        fetchDoc();
    }, [token]);

    const handleDownloadPDF = async () => {
        if (!printRef.current) return;
        setDownloading(true);
        try {
            const docNum = doc.invoiceNumber || doc.quoteNumber || doc.quotationCode || 'document';
            const fileName = `${docType}_${String(docNum).replace(/[\/\\:]/g, '_')}.pdf`;
            await exportElementToPDF(printRef.current, fileName);
        } catch (err) {
            console.error('PDF export failed:', err);
            // Fallback: direct server download
            const directUrl = `${getApiUrl()}/public/documents/${token}/download`;
            window.open(directUrl, '_blank');
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-sans p-4">
                <div className="text-center space-y-3">
                    <div className="w-11 h-11 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-sm font-bold uppercase tracking-wider text-slate-700">Loading Document...</p>
                    <p className="text-xs text-slate-400">GLX Industries Customer Portal</p>
                </div>
            </div>
        );
    }

    if (error || !doc) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-sans p-4">
                <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full">
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <X size={24} />
                    </div>
                    <h1 className="text-base font-bold text-slate-900 mb-1">Access Error</h1>
                    <p className="text-sm text-slate-600 mb-4">{error || 'This link is invalid or expired.'}</p>
                    <div className="text-xs text-slate-400">If you believe this is a mistake, please contact GLX Truck Body Engineers.</div>
                </div>
            </div>
        );
    }

    const printDoc = {
        ...doc,
        documentType: docType
    };

    const docNumber = doc.invoiceNumber || doc.quoteNumber || doc.quotationCode || 'Document';
    const docDisplayTitle = docType === 'estimate' ? 'Estimate' : (docType === 'invoice' ? 'Invoice' : 'Quotation');
    const customerName = doc.customerName || doc.vehicleOwner || doc.customerSnapshot?.name || 'Customer';
    const customerPhone = doc.customerPhone || doc.customerSnapshot?.contactName || '';
    const customerAddress = doc.customerAddress || doc.billingAddress?.line1 || '';
    const vehicleNo = doc.vehicleNo || '';
    const vehicleModel = doc.vehicleModel || '';
    const insuranceCompany = doc.insuranceCompany || '';
    const jobCaption = doc.jobCaption || '';
    const salesRep = doc.salesRep || 'Asanka';
    const branch = doc.branch || 'JA-ELA';
    const docDate = doc.date || doc.invoiceDate || doc.createdAt || new Date();

    const items = doc.items || [];
    let subtotal = 0;
    let totalDiscount = 0;
    items.forEach(item => {
        const qty = Number(item.quantity) || 1;
        const rate = Number(item.unitPrice || item.rate || 0);
        const gross = qty * rate;
        const discRate = Number(item.discount || 0);
        const discAmt = discRate > 0 ? discRate * qty : Number(item.discountAmount || (item.discountPercent ? gross * item.discountPercent / 100 : 0));
        subtotal += gross;
        totalDiscount += discAmt;
    });

    const laborCost = Number(doc.laborCost || 0);
    const grandTotal = doc.grandTotal !== undefined ? Number(doc.grandTotal) : (subtotal + laborCost - totalDiscount);
    const advancePaid = Number(doc.advanceAmount || doc.amountPaid || 0);
    const balanceDue = doc.balanceAmount !== undefined ? Number(doc.balanceAmount) : Math.max(0, grandTotal - advancePaid);

    // Photos
    const allPhotos = [];
    if (doc.numberPlateImage) allPhotos.push({ title: 'Vehicle Plate', src: doc.numberPlateImage });
    if (doc.lorryBodyImage) allPhotos.push({ title: 'Body Condition', src: doc.lorryBodyImage });
    if (Array.isArray(doc.photos)) {
        doc.photos.forEach((src, idx) => {
            if (src && !allPhotos.some(p => p.src === src)) {
                allPhotos.push({ title: `Inspection Photo ${idx + 1}`, src });
            }
        });
    }

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-12 print:bg-white print:p-0">
            {/* ── Top Navigation Bar (Mobile-Optimized with Safe Area) ── */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-3 shadow-xs print:hidden">
                <div className="max-w-[850px] mx-auto flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide truncate">
                                    GLX Document
                                </span>
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200 shrink-0">
                                    <CheckCircle2 size={9} /> Verified
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono truncate">
                                {docDisplayTitle}: {docNumber}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <button 
                            type="button"
                            onClick={() => window.print()} 
                            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs px-2.5 py-1.5 rounded-lg transition"
                            title="Print Document"
                        >
                            <Printer size={13} />
                            <span className="hidden sm:inline">Print</span>
                        </button>
                        <button 
                            type="button"
                            disabled={downloading}
                            onClick={handleDownloadPDF} 
                            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition shadow-xs disabled:opacity-70"
                        >
                            <Download size={13} />
                            <span>{downloading ? 'Preparing...' : 'Download PDF'}</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[850px] mx-auto px-2 sm:px-4 pt-3 sm:pt-6">
                {/* ── View Switcher on Small Screens ── */}
                <div className="no-print md:hidden flex items-center p-1 bg-slate-200/80 rounded-xl mb-3 text-xs font-bold">
                    <button 
                        type="button" 
                        onClick={() => setViewMode('mobile')}
                        className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${viewMode === 'mobile' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'}`}
                    >
                        <Smartphone size={13} /> Mobile View
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setViewMode('a4')}
                        className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${viewMode === 'a4' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'}`}
                    >
                        <FileSpreadsheet size={13} /> Official A4 Sheet
                    </button>
                </div>

                {/* ══════════════════════════════════════════════════════
                    1. MOBILE-FRIENDLY VIEW (Shown by default on phones)
                ══════════════════════════════════════════════════════ */}
                {viewMode === 'mobile' && (
                    <div className="space-y-3 no-print md:hidden">
                        {/* Company Card */}
                        <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200">
                            <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                                <img 
                                    src="/logo.jpg" 
                                    alt="GLX" 
                                    className="w-12 h-12 object-contain rounded-lg border border-slate-100 p-0.5 shrink-0" 
                                />
                                <div className="min-w-0">
                                    <h1 className="text-sm font-black text-slate-900 leading-tight">GLX TRUCK BODY ENGINEERS</h1>
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Aluminium, Steel &amp; Freezer Box Manufacture</p>
                                </div>
                            </div>
                            
                            <div className="pt-2.5 text-[11px] text-slate-600 grid grid-cols-2 gap-2">
                                <a href="tel:0716666888" className="flex items-center gap-1.5 text-blue-600 font-medium">
                                    <Phone size={12} className="shrink-0 text-slate-400" /> 071 6666 888
                                </a>
                                <a href="tel:0117404446" className="flex items-center gap-1.5 text-blue-600 font-medium">
                                    <Phone size={12} className="shrink-0 text-slate-400" /> 011 740 4446
                                </a>
                                <div className="flex items-center gap-1.5 text-slate-500 col-span-2">
                                    <MapPin size={12} className="shrink-0 text-slate-400" /> Ja-Ela (Thudella &amp; Kotugoda), Sri Lanka
                                </div>
                            </div>
                        </div>

                        {/* Document & Customer Meta */}
                        <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <div>
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md">
                                        {docDisplayTitle}
                                    </span>
                                    <h2 className="text-sm font-black text-slate-900 font-mono mt-1">{docNumber}</h2>
                                </div>
                                <div className="text-right text-[11px] text-slate-500">
                                    <div className="flex items-center gap-1 justify-end font-medium">
                                        <Calendar size={11} className="text-slate-400" /> {fmtDate(docDate)}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">Branch: {branch}</div>
                                </div>
                            </div>

                            {/* Customer & Vehicle Info */}
                            <div className="grid grid-cols-1 gap-2 text-xs">
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Customer</span>
                                    <p className="font-bold text-slate-900">{customerName}</p>
                                    {customerPhone && (
                                        <a href={`tel:${customerPhone}`} className="text-blue-600 font-mono font-medium text-[11px] flex items-center gap-1 mt-0.5">
                                            <Phone size={10} /> {customerPhone}
                                        </a>
                                    )}
                                    {customerAddress && <p className="text-slate-500 text-[11px] mt-0.5">{customerAddress}</p>}
                                </div>

                                {vehicleNo && (
                                    <div className="bg-slate-900 text-white p-2.5 rounded-xl flex items-center justify-between shadow-xs">
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Vehicle Plate No</span>
                                            <span className="font-mono font-black text-sm text-yellow-400 tracking-wider">{vehicleNo}</span>
                                        </div>
                                        {vehicleModel && (
                                            <div className="text-right text-[10px] text-slate-300">
                                                <span>Model</span>
                                                <p className="font-bold text-white">{vehicleModel}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items Breakdown */}
                        <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2.5 pb-1.5 border-b border-slate-100">
                                Items &amp; Work Description
                            </h3>
                            <div className="space-y-2.5">
                                {items.map((item, idx) => {
                                    const qty = Number(item.quantity) || 1;
                                    const rate = Number(item.unitPrice || item.rate || 0);
                                    const gross = qty * rate;
                                    const discRate = Number(item.discount || 0);
                                    const discAmt = discRate > 0 ? discRate * qty : Number(item.discountAmount || (item.discountPercent ? gross * item.discountPercent / 100 : 0));
                                    const name = item.productName || item.product?.name || item.description || `Item #${idx + 1}`;

                                    return (
                                        <div key={idx} className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-100 text-xs">
                                            <div className="flex justify-between items-start gap-2">
                                                <span className="font-bold text-slate-800 leading-snug">{name}</span>
                                                <span className="font-mono font-bold text-slate-900 shrink-0">Rs. {fmt(gross)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                                                <span>Qty: <strong className="text-slate-700">{qty}</strong> &times; Rs. {fmt(rate)}</span>
                                                {discAmt > 0 && (
                                                    <span className="text-red-600 font-semibold text-[10px] bg-red-50 px-1.5 py-0.5 rounded">
                                                        -Rs. {fmt(discAmt)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Totals Summary */}
                            <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                                <div className="flex justify-between text-slate-600">
                                    <span>Sub Total</span>
                                    <span className="font-mono font-semibold">Rs. {fmt(subtotal)}</span>
                                </div>
                                {laborCost > 0 && (
                                    <div className="flex justify-between text-slate-600">
                                        <span>Labor Cost</span>
                                        <span className="font-mono font-semibold">Rs. {fmt(laborCost)}</span>
                                    </div>
                                )}
                                {totalDiscount > 0 && (
                                    <div className="flex justify-between text-red-600 font-medium">
                                        <span>Discount</span>
                                        <span className="font-mono font-bold">-Rs. {fmt(totalDiscount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                                    <span>GRAND TOTAL</span>
                                    <span className="font-mono text-blue-700">Rs. {fmt(grandTotal)}</span>
                                </div>
                                {advancePaid > 0 && (
                                    <>
                                        <div className="flex justify-between text-emerald-700 text-xs font-semibold pt-1">
                                            <span>Advance Paid</span>
                                            <span className="font-mono">-Rs. {fmt(advancePaid)}</span>
                                        </div>
                                        <div className="flex justify-between text-amber-800 text-xs font-bold">
                                            <span>Balance Due</span>
                                            <span className="font-mono">Rs. {fmt(balanceDue)}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Terms & Conditions */}
                        <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200 space-y-2 text-xs">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1 pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <ShieldCheck size={14} className="text-blue-600" /> Terms &amp; Conditions
                            </h3>
                            {doc.conditionOfPayments && (
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Condition:</span>
                                    <p className="text-slate-700 whitespace-pre-line mt-0.5">{doc.conditionOfPayments}</p>
                                </div>
                            )}
                            {doc.completionOfWork && (
                                <div className="pt-1.5 border-t border-slate-50">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completion of Work:</span>
                                    <p className="text-slate-700 mt-0.5">{doc.completionOfWork}</p>
                                </div>
                            )}
                            {doc.warrantyCondition && (
                                <div className="pt-1.5 border-t border-slate-50">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Warranty:</span>
                                    <p className="text-slate-700 mt-0.5">{doc.warrantyCondition}</p>
                                </div>
                            )}
                        </div>

                        {/* Photo Attachments (if any) */}
                        {allPhotos.length > 0 && (
                            <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2 pb-1.5 border-b border-slate-100 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <ImageIcon size={14} className="text-blue-600" /> Attached Photos
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">{allPhotos.length} Photos</span>
                                </h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {allPhotos.map((photo, i) => (
                                        <div 
                                            key={i} 
                                            onClick={() => setActivePhoto(photo.src)}
                                            className="aspect-square rounded-xl border border-slate-200 overflow-hidden bg-slate-50 cursor-pointer relative group"
                                        >
                                            <img src={photo.src} alt={photo.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                                            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] font-bold text-center py-0.5 truncate px-1">
                                                {photo.title}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Mobile Action Footer */}
                        <div className="pt-2">
                            <button
                                type="button"
                                disabled={downloading}
                                onClick={handleDownloadPDF}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-70"
                            >
                                <Download size={16} />
                                {downloading ? 'Preparing Official PDF...' : 'Download Official PDF Document'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════
                    2. OFFICIAL A4 PRINT VIEW (Desktop default or toggled)
                ══════════════════════════════════════════════════════ */}
                <div className={`${viewMode === 'mobile' ? 'hidden md:block' : 'block'} print:block`}>
                    {/* Horizontal scroll notice for mobile if in A4 mode */}
                    <div className="no-print md:hidden bg-blue-50 border border-blue-200 text-blue-700 text-[11px] p-2 rounded-xl mb-3 flex items-center justify-between">
                        <span>💡 Pan horizontally to view full official sheet</span>
                        <button 
                            type="button" 
                            onClick={() => setViewMode('mobile')}
                            className="font-bold underline text-blue-800"
                        >
                            Back to Mobile View
                        </button>
                    </div>

                    <div className="bg-white shadow-sm border border-slate-200 rounded-2xl print:shadow-none print:border-0 print:p-0 overflow-x-auto">
                        <div className="min-w-[760px] p-2 sm:p-6 md:p-8 mx-auto">
                            <DocumentPrintView ref={printRef} document={printDoc} companyInfo={companyInfo} hideToolbar={true} />
                        </div>
                    </div>
                </div>
            </main>

            {/* Photo Lightbox Modal */}
            {activePhoto && (
                <div 
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
                    onClick={() => setActivePhoto(null)}
                >
                    <div className="relative max-w-xl w-full bg-black rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <button 
                            type="button" 
                            onClick={() => setActivePhoto(null)}
                            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition"
                        >
                            <X size={18} />
                        </button>
                        <img src={activePhoto} alt="Full Preview" className="w-full max-h-[80vh] object-contain mx-auto" />
                    </div>
                </div>
            )}
        </div>
    );
}
