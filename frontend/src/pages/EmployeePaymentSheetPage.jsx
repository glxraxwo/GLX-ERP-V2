import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, RefreshCw, Upload, CheckSquare, Square, FileSignature, MessageSquare, Download } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useSettings, useUpdateSettings } from '../features/settings/useSettings';
import ProtectedView from '../components/security/ProtectedView';
import SendPaymentSheetSmsModal from '../components/SendPaymentSheetSmsModal';
import { useEmployee } from '../features/hr/useHr';
import { getDocTranslation } from '../utils/documentTranslations';

// Helper: Format Date to M/D/YYYY matching physical payment sheet (e.g. 8/8/2026)
const formatPrintDate = (val) => {
    if (!val) return '';
    if (typeof val === 'string' && val.includes('-')) {
        const parts = val.split('-');
        if (parts.length === 3) {
            const y = parts[0];
            const m = parseInt(parts[1], 10);
            const d = parseInt(parts[2], 10);
            if (!isNaN(m) && !isNaN(d)) {
                return `${m}/${d}/${y}`;
            }
        }
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};

// Helper: Format Time to HH:mm:00 (e.g. 08:40:00)
const formatPrintTime = (val) => {
    if (!val) return '00:00:00';
    const s = String(val).trim();
    if (!s) return '00:00:00';
    const parts = s.split(':');
    const h = (parts[0] || '0').padStart(2, '0');
    const m = (parts[1] || '0').padStart(2, '0');
    const sec = parts[2] ? parts[2].padStart(2, '0') : '00';
    return `${h}:${m}:${sec}`;
};

// Helper: Format duration between IN and OUT as HH:mm:00 (e.g. 09:20:00)
const formatPrintDuration = (row) => {
    if (!row) return '00:00:00';
    const inT = row.inTime || row.in;
    const outT = row.outTime || row.out;
    if (inT && outT) {
        const parseMinutes = (t) => {
            const parts = String(t).trim().split(':');
            const h = parseInt(parts[0], 10);
            const m = parseInt(parts[1] || '0', 10);
            return isNaN(h) ? null : h * 60 + (isNaN(m) ? 0 : m);
        };
        const inMin = parseMinutes(inT);
        let outMin = parseMinutes(outT);
        if (inMin !== null && outMin !== null) {
            let diff = outMin - inMin;
            if (diff < 0) diff += 24 * 60;
            const h = Math.floor(diff / 60);
            const m = diff % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
        }
    }
    if (row.hours && !isNaN(row.hours) && Number(row.hours) > 0) {
        const totalMins = Math.round(Number(row.hours) * 60);
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    }
    return '00:00:00';
};

export default function EmployeePaymentSheetPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: settingsData } = useSettings();
    const updateSettings = useUpdateSettings();
    const { data: employeeData } = useEmployee(id);

    const systemSettings = settingsData?.data || {};
    const employee = employeeData?.data;

    // Language state
    const [lang, setLang] = useState('en');
    const t = getDocTranslation(lang);

    // Default to last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Toggle: Hide Logo & Boss Signature on Download/Print (With/Without Header)
    const [hideHeaderAndSignature, setHideHeaderAndSignature] = useState(false);
    // Signature management modal/input state
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [customBossTitle, setCustomBossTitle] = useState('');
    // SMS modal state
    const [smsModalOpen, setSmsModalOpen] = useState(false);

    const bossSignatureUrl = systemSettings.bossSignature || '';
    const bossTitle = systemSettings.bossTitle || 'Authorized Signature / Managing Director';

    const loadSheet = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/hr/employees/${id}/payment-sheet`, {
                params: { startDate, endDate }
            });
            if (res.data && res.data.success) {
                setData(res.data.data);
            } else {
                toast.error('Failed to load payment sheet details.');
            }
        } catch (err) {
            toast.error('Error fetching payment sheet: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSheet();
    }, [id]);

    useEffect(() => {
        if (systemSettings.bossTitle) {
            setCustomBossTitle(systemSettings.bossTitle);
        }
    }, [systemSettings.bossTitle]);

    const handleSignatureUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error('Signature image file size must be less than 2MB');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    await updateSettings.mutateAsync({
                        ...systemSettings,
                        bossSignature: reader.result,
                        bossTitle: customBossTitle || bossTitle,
                    });
                    toast.success('Boss signature updated & auto-filled on payment sheet!');
                    setShowSignatureModal(false);
                } catch (err) {
                    toast.error('Failed to save signature: ' + err.message);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveTitle = async () => {
        try {
            await updateSettings.mutateAsync({
                ...systemSettings,
                bossTitle: customBossTitle,
            });
            toast.success('Signatory title updated!');
            setShowSignatureModal(false);
        } catch (err) {
            toast.error('Failed to save title: ' + err.message);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    const handleDownloadOfficialPdf = async () => {
        if (!data) return;
        try {
            toast.loading('Generating official PDF...', { id: 'pdf-toast' });
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const empName = data.employee?.name || employee?.firstName || 'Employee';
            let currentY = 10;

            if (!hideHeaderAndSignature) {
                try {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    await new Promise((res) => {
                        img.onload = res;
                        img.onerror = res;
                        img.src = '/logo-mono-white.png';
                    });
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const dataUrl = canvas.toDataURL('image/png');
                    // Centered GLX Monochrome Logo (210mm A4 width -> (210 - 22) / 2 = 94mm)
                    doc.addImage(dataUrl, 'PNG', 94, currentY, 22, 21.7);
                    currentY += 21.7 + 6.5; // Clear separation so text never collides with logo
                } catch (e) {
                    currentY += 10;
                }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.text(t.paySheetTitle || 'EMPLOYEE PAYMENT SHEET', 105, currentY, { align: 'center' });
                currentY += 3.5;

                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.25);
                doc.line(15, currentY, 195, currentY);
                currentY += 5.5;
            } else {
                currentY += 25;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.text(t.paySheetTitle || 'EMPLOYEE PAYMENT SHEET', 105, currentY, { align: 'center' });
                currentY += 3.5;
                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.25);
                doc.line(15, currentY, 195, currentY);
                currentY += 5.5;
            }

            // Header Metadata Rows
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(t.employeeName || 'Name', 15, currentY);
            doc.text(':', 48, currentY);
            doc.text(empName, 52, currentY);
            currentY += 5;

            doc.setFont('helvetica', 'bold');
            doc.text(t.hourlyRate || 'Salary Per Hour', 15, currentY);
            doc.text(':', 48, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(formatCurrency(data.employee?.hourlyRate), 52, currentY);
            currentY += 5;

            doc.setFont('helvetica', 'bold');
            doc.text(t.dateFrom || 'Date From', 15, currentY);
            doc.text(':', 48, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(formatPrintDate(data.startDate), 52, currentY);

            doc.setFont('helvetica', 'bold');
            doc.text(t.dateTo || 'Date To', 105, currentY);
            doc.text(':', 125, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(formatPrintDate(data.endDate), 129, currentY);
            currentY += 5.5;

            const printableRows = (data.rows || []).filter(r => Number(r.hours) > 0 || Number(r.advance) > 0 || Number(r.daySalary) > 0);
            const tableBody = (printableRows.length > 0 ? printableRows : data.rows || []).map(r => [
                formatPrintDate(r.date),
                formatPrintTime(r.inTime),
                formatPrintTime(r.outTime),
                formatPrintDuration(r),
                formatCurrency(r.daySalary),
                formatCurrency(r.advance)
            ]);

            autoTable(doc, {
                startY: currentY,
                margin: { left: 15, right: 15 },
                theme: 'plain',
                head: [[t.colDate || 'Date', t.colIn || 'IN', t.colOut || 'OUT', t.colHours || 'HOURS', t.colDaySalary || 'DAY SALARY', t.colAdvance || 'ADVANCE']],
                body: tableBody,
                styles: {
                    font: 'helvetica',
                    fontSize: 8.5,
                    cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
                    textColor: [0, 0, 0],
                    lineWidth: 0
                },
                headStyles: {
                    fillColor: [255, 255, 255],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    lineWidth: { top: 0.25, bottom: 0.25 },
                    lineColor: [0, 0, 0]
                },
                columnStyles: {
                    0: { cellWidth: 30, halign: 'left' },
                    1: { cellWidth: 26, halign: 'center' },
                    2: { cellWidth: 26, halign: 'center' },
                    3: { cellWidth: 26, halign: 'center' },
                    4: { cellWidth: 36, halign: 'right' },
                    5: { cellWidth: 36, halign: 'right' }
                }
            });

            const finalTableY = doc.lastAutoTable.finalY;
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.25);
            doc.line(15, finalTableY, 195, finalTableY);

            let sumY = finalTableY + 4.5;
            const labelX = 135;
            const valX = 195;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(t.totalSalary || 'Total Salary', labelX, sumY);
            doc.setFont('helvetica', 'normal');
            doc.text(formatCurrency(data.totalSalary), valX, sumY, { align: 'right' });

            sumY += 5;
            doc.setFont('helvetica', 'bold');
            doc.text(t.totalAdvances || 'Total Advances', labelX, sumY);
            doc.setFont('helvetica', 'normal');
            doc.text(formatCurrency(data.totalAdvances), valX, sumY, { align: 'right' });

            doc.setLineWidth(0.25);
            doc.line(labelX, sumY + 1.2, valX, sumY + 1.2);

            sumY += 5.5;
            doc.setFont('helvetica', 'bold');
            doc.text(t.netSalary || 'Net Salary', labelX, sumY);
            doc.text(formatCurrency(data.netSalary), valX, sumY, { align: 'right' });

            doc.setLineWidth(0.25);
            doc.line(labelX, sumY + 1.2, valX, sumY + 1.2);
            doc.line(labelX, sumY + 1.8, valX, sumY + 1.8);

            doc.save(`Payment_Sheet_${empName.replace(/\s+/g, '_')}_${startDate}.pdf`);
            toast.dismiss('pdf-toast');
            toast.success('Payment Sheet PDF downloaded!');
        } catch (err) {
            console.error('PDF error', err);
            toast.dismiss('pdf-toast');
            toast.error('Failed to export PDF: ' + err.message);
        }
    };

    return (
        <div className="p-4 max-w-4xl mx-auto font-calibri">
            {/* Header controls (hidden on print) */}
            <div className="no-print bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col gap-3">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/employees/${id}`)}>
                            <ArrowLeft size={16} className="mr-1" /> Back to Profile
                        </Button>
                        <h2 className="text-sm font-bold text-gray-700 uppercase">Employee Payment Sheet Control</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1 text-xs">
                            <label className="font-bold text-gray-600">From:</label>
                            <input type="date" className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1 bg-gray-50 dark:bg-[#132238] text-gray-900 dark:text-white text-xs" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                            <label className="font-bold text-gray-600">To:</label>
                            <input type="date" className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1 bg-gray-50 dark:bg-[#132238] text-gray-900 dark:text-white text-xs" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                        <Button variant="primary" size="sm" onClick={loadSheet} loading={loading}>
                            <RefreshCw size={14} className="mr-1" /> Load
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadOfficialPdf}>
                            <Download size={14} className="mr-1" /> Download PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { toast.dismiss(); window.print(); }}>
                            <Printer size={14} className="mr-1" /> Print Report
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setSmsModalOpen(true)}>
                            <MessageSquare size={14} className="mr-1" /> Send SMS
                        </Button>
                    </div>
                </div>

                {/* Signature & Print Mode Options Bar */}
                <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    {/* Header and Language Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* With Header / Without Header Mode Selector */}
                        <div className="flex items-center rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-[#132238] p-0.5 font-semibold shadow-xs">
                            <button
                                type="button"
                                onClick={() => setHideHeaderAndSignature(false)}
                                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${!hideHeaderAndSignature ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                                title="Print / Download with company letterhead header"
                            >
                                With Header
                            </button>
                            <button
                                type="button"
                                onClick={() => setHideHeaderAndSignature(true)}
                                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${hideHeaderAndSignature ? 'bg-amber-600 text-white font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                                title="Print / Download without header (For pre-printed letterhead paper)"
                            >
                                Without Header
                            </button>
                        </div>

                        {/* Language switcher */}
                        <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-500">Language:</span>
                            <div className="inline-flex border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-[#132238] overflow-hidden text-xs font-semibold">
                                {['en', 'si', 'ta'].map(l => (
                                    <button
                                        key={l}
                                        type="button"
                                        onClick={() => setLang(l)}
                                        className={`px-2.5 py-1 ${lang === l ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                                    >
                                        {l === 'en' ? 'English' : l === 'si' ? 'සිංහල' : 'தமிழ்'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Boss Signature Quick Config Button */}
                    <button
                        type="button"
                        onClick={() => setShowSignatureModal(!showSignatureModal)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition"
                    >
                        <FileSignature size={14} />
                        {bossSignatureUrl ? 'Change Boss Signature' : 'Upload Boss Signature'}
                    </button>
                </div>

                {/* Inline Boss Signature Modal / Popover */}
                {showSignatureModal && (
                    <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3 mt-1">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
                                <FileSignature size={15} /> Admin / Boss Signature Configuration
                            </h4>
                            <button onClick={() => setShowSignatureModal(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕ Close</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                            <div>
                                <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">Signatory Title / Name</label>
                                <input
                                    type="text"
                                    value={customBossTitle}
                                    onChange={(e) => setCustomBossTitle(e.target.value)}
                                    placeholder="Authorized Signature / Managing Director"
                                    className="w-full border rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleSaveTitle}
                                    className="mt-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1 rounded-md"
                                >
                                    Save Title
                                </button>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">Upload Signature Image (PNG/JPG)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleSignatureUpload}
                                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                                />
                                {bossSignatureUrl && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[11px] text-gray-500">Current:</span>
                                        <img src={bossSignatureUrl} alt="Signature Preview" className="h-8 max-w-[120px] object-contain border bg-white p-0.5 rounded" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {loading && (
                <div className="py-16 text-center text-gray-500 flex justify-center items-center gap-2">
                    <RefreshCw size={18} className="animate-spin text-blue-600" />
                    <span>Calculating work hours and generating sheet...</span>
                </div>
            )}

            {/* Printable Payment Sheet */}
            {data && !loading && (
                <ProtectedView title="Employee Payment Sheet">
                    <Card className="employee-payment-sheet-print bg-white p-8 sm:p-12 border border-gray-300 rounded shadow-none text-gray-900 text-sm leading-relaxed max-w-[800px] mx-auto print:border-0 print:p-0 font-sans">
                        
                        {/* Brand Header */}
                        {!hideHeaderAndSignature ? (
                            <div className="text-center mb-3">
                                <div className="flex justify-center mb-2">
                                    <img src="/logo-mono-white.png" alt="GLX Logo" className="h-12 w-auto object-contain mx-auto" />
                                </div>
                                <h2 className="text-xs font-bold uppercase tracking-wider text-black mt-1.5">
                                    {t.paySheetTitle || 'EMPLOYEE PAYMENT SHEET'}
                                </h2>
                                <div className="border-b border-black w-full mt-2.5 mb-3"></div>
                            </div>
                        ) : (
                            <div className="text-center mb-3 pt-6">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-black">
                                    {t.paySheetTitle || 'EMPLOYEE PAYMENT SHEET'}
                                </h2>
                                <div className="border-b border-black w-full mt-2.5 mb-3"></div>
                            </div>
                        )}

                        {/* Metadata Section */}
                        <table className="w-full text-xs font-sans text-black mb-3 border-collapse">
                            <tbody>
                                <tr>
                                    <td className="w-36 font-bold py-0.5">{t.employeeName || 'Name'}</td>
                                    <td className="w-5 font-bold text-center py-0.5">:</td>
                                    <td className="font-bold py-0.5">{data.employee.name}</td>
                                    <td colSpan={3}></td>
                                </tr>
                                <tr>
                                    <td className="font-bold py-0.5">{t.hourlyRate || 'Salary Per Hour'}</td>
                                    <td className="font-bold text-center py-0.5">:</td>
                                    <td className="font-normal py-0.5 font-mono">{formatCurrency(data.employee.hourlyRate)}</td>
                                    <td colSpan={3}></td>
                                </tr>
                                <tr>
                                    <td className="font-bold py-0.5">{t.dateFrom || 'Date From'}</td>
                                    <td className="font-bold text-center py-0.5">:</td>
                                    <td className="font-normal py-0.5 w-40">{formatPrintDate(data.startDate)}</td>
                                    <td className="w-20 font-bold text-right py-0.5">{t.dateTo || 'Date To'}</td>
                                    <td className="w-5 font-bold text-center py-0.5">:</td>
                                    <td className="font-normal py-0.5">{formatPrintDate(data.endDate)}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Sheet Table */}
                        <table className="w-full text-xs text-left border-collapse font-sans mb-0">
                            <thead>
                                <tr className="border-b border-t border-black uppercase text-[11px] text-black font-bold">
                                    <th className="py-2 px-2 w-[17%]">{t.colDate || 'Date'}</th>
                                    <th className="py-2 px-2 text-center w-[15%]">{t.colIn || 'IN'}</th>
                                    <th className="py-2 px-2 text-center w-[15%]">{t.colOut || 'OUT'}</th>
                                    <th className="py-2 px-2 text-center w-[15%]">{t.colHours || 'HOURS'}</th>
                                    <th className="py-2 px-2 text-right w-[19%]">{t.colDaySalary || 'DAY SALARY'}</th>
                                    <th className="py-2 px-2 text-right w-[19%]">{t.colAdvance || 'ADVANCE'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data.rows.filter(r => Number(r.hours) > 0 || Number(r.advance) > 0 || Number(r.daySalary) > 0).length > 0 
                                    ? data.rows.filter(r => Number(r.hours) > 0 || Number(r.advance) > 0 || Number(r.daySalary) > 0)
                                    : data.rows
                                ).map((row, idx) => (
                                    <tr key={idx} className="text-black">
                                        <td className="py-1 px-2">{formatPrintDate(row.date)}</td>
                                        <td className="py-1 px-2 text-center font-mono">{formatPrintTime(row.inTime)}</td>
                                        <td className="py-1 px-2 text-center font-mono">{formatPrintTime(row.outTime)}</td>
                                        <td className="py-1 px-2 text-center font-mono">{formatPrintDuration(row)}</td>
                                        <td className="py-1 px-2 text-right font-mono">
                                            {row.daySalary > 0 ? formatCurrency(row.daySalary) : '0.00'}
                                        </td>
                                        <td className="py-1 px-2 text-right font-mono">
                                            {row.advance > 0 ? formatCurrency(row.advance) : '0.00'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="border-b border-black w-full mb-3"></div>

                        {/* Totals Summary */}
                        <table className="w-64 ml-auto text-xs font-sans text-black border-collapse">
                            <tbody>
                                <tr>
                                    <td className="font-bold py-0.5">{t.totalSalary || 'Total Salary'}</td>
                                    <td className="text-right py-0.5 font-mono">{formatCurrency(data.totalSalary)}</td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td className="font-bold py-0.5 pb-1">{t.totalAdvances || 'Total Advances'}</td>
                                    <td className="text-right py-0.5 pb-1 font-mono">{formatCurrency(data.totalAdvances)}</td>
                                </tr>
                                <tr className="border-b-4 border-double border-black">
                                    <td className="font-bold py-1 pt-1.5">{t.netSalary || 'Net Salary'}</td>
                                    <td className="font-bold text-right py-1 pt-1.5 font-mono">{formatCurrency(data.netSalary)}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Signatures & Approval Footer Section */}
                        <div className="mt-12 pt-6 border-t border-dashed border-gray-300 flex justify-between items-end text-xs font-calibri">
                            <div>
                                <p className="font-semibold text-gray-600 mb-8">{t.employeeSignature || 'Employee Signature'}:</p>
                                <div className="border-t border-gray-400 w-44"></div>
                                <p className="text-[11px] font-medium text-gray-700 mt-1">{data.employee.name}</p>
                            </div>

                            {!hideHeaderAndSignature && (
                                <div className="text-right flex flex-col items-end">
                                    <p className="font-semibold text-gray-600 mb-1">{t.approvedBy || 'Approved & Authorized By'}:</p>
                                    <div className="relative mb-2 min-h-[56px] flex items-center justify-end">
                                        {systemSettings.companySeal ? (
                                            <img src={systemSettings.companySeal} alt="Official Company Seal" className="h-14 w-auto object-contain" />
                                        ) : (
                                            <div className="w-14 h-14 rounded-full border-2 border-red-700/85 flex flex-col items-center justify-center p-1 text-red-700 rotate-[-6deg] select-none shadow-xs">
                                                <span className="text-[6px] font-black uppercase tracking-tight text-center leading-none">GLX</span>
                                                <span className="text-[7px] font-extrabold my-0.5">★ SEAL ★</span>
                                                <span className="text-[5px] font-bold uppercase tracking-tighter">OFFICIAL</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="border-t border-gray-400 w-48 mt-1"></div>
                                    <p className="text-[11px] font-bold text-gray-900 mt-0.5">Authorized Person</p>
                                    <p className="text-[10px] text-gray-500">{systemSettings.companyName || 'GLX Industries (Pvt) Ltd'}</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </ProtectedView>
            )}

            {/* SMS Modal */}
            <SendPaymentSheetSmsModal
                isOpen={smsModalOpen}
                onClose={() => setSmsModalOpen(false)}
                employeeId={id}
                phoneNumbers={{
                    phone: employee?.phone || '',
                    secondaryPhone: employee?.secondaryPhone || '',
                    tertiaryPhone: employee?.tertiaryPhone || ''
                }}
                startDate={startDate}
                endDate={endDate}
            />
        </div>
    );
}
