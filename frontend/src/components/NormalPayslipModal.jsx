import React, { useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Printer, Download, MessageSquare, RefreshCw, Sparkles, MapPin, Flame, Wallet, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { manualAttendanceApi } from '../features/hr/hrApi';
import { useSettings } from '../features/settings/useSettings';
import { COMPANY_LOGO_BASE64 } from '../assets/companyLogoBase64';

export default function NormalPayslipModal({
    isOpen,
    onClose,
    employeeId,
    startDate,
    endDate,
    includeEpfEtf = false,
    dynamicTotals = null,
    employee = null,
    hourlyRate = null,
    paymentId = null,
    onPayClick = null
}) {
    const printRef = useRef(null);
    const { data: settingsData } = useSettings();
    const systemSettings = settingsData?.data || {};

    const { data: payslipData, isLoading } = useQuery({
        queryKey: ['normal-payslip', employeeId, startDate, endDate, includeEpfEtf, paymentId],
        queryFn: () => manualAttendanceApi.getNormalPayslip({ employeeId, startDate, endDate, includeEpfEtf, paymentId }),
        enabled: Boolean(isOpen && employeeId),
    });

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('payslip-modal-open');
        } else {
            document.body.classList.remove('payslip-modal-open');
        }
        return () => {
            document.body.classList.remove('payslip-modal-open');
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const payslip = payslipData || {};
    const comp = payslip.company || {};

    // Resolve employee details
    const empFromProps = employee ? {
        name: employee.fullName || (employee.firstName ? `${employee.firstName} ${employee.lastName || ''}`.trim() : ''),
        payrollNumber: employee.payrollNumber || employee.employeeCode || employee.employeeId || 'EMP-2026',
        department: employee.departmentId?.name || employee.department || 'Operations',
        designation: employee.designationId?.title || employee.designation || 'Staff',
        accountNumber: employee.bankDetails?.accountNumber || employee.bankAccount || employee.accountNumber || '12345678900',
        hourlyRate: hourlyRate || employee.hourlyRate || 0,
        ...employee
    } : null;

    const emp = {
        ...(payslip.employee || {}),
        ...(empFromProps || {}),
        accountNumber: empFromProps?.accountNumber || payslip.employee?.bankDetails?.accountNumber || payslip.employee?.bankAccount || '12345678900'
    };

    const hasDynamic = dynamicTotals !== null && dynamicTotals !== undefined && typeof dynamicTotals.totalSalary === 'number';

    const earn = hasDynamic
        ? {
            basicSalary: dynamicTotals.basicSalary ?? 0,
            totalHours: dynamicTotals.totalHours ?? 0,
            overtimePayment: dynamicTotals.otCommission ?? 0,
            grossEarnings: dynamicTotals.totalSalary ?? 0,
            commission: 0,
            otherAllowances: 0
        }
        : (payslip.earnings || {});

    const ded = hasDynamic
        ? {
            epfEmployee: dynamicTotals.epfEmployeeDeduction ?? 0,
            advances: dynamicTotals.totalAdvance ?? 0,
            otherDeductions: Math.abs(dynamicTotals.totalDeduction < 0 ? dynamicTotals.totalDeduction : 0),
            totalDeductions: (dynamicTotals.epfEmployeeDeduction || 0) + (dynamicTotals.totalAdvance || 0) + Math.abs(dynamicTotals.totalDeduction < 0 ? dynamicTotals.totalDeduction : 0)
        }
        : (payslip.deductions || {});

    const net = hasDynamic
        ? (dynamicTotals.netSalary ?? 0)
        : (payslip.netSalary !== undefined ? payslip.netSalary : (earn.grossEarnings || 0) - (ded.totalDeductions || 0));

    const companyName = comp.name || systemSettings.companyName || 'GLX INDUSTRIES';
    const companyAddress = (comp.address && comp.address.trim()) || (systemSettings.companyAddress && systemSettings.companyAddress.trim()) || 'No.14, Negambo Road, Thudella, Ja-Ela, Sri Lanka';
    const companyLogo = comp.logo || systemSettings.companyLogo || COMPANY_LOGO_BASE64;
    const companySeal = comp.seal || systemSettings.companySeal || '';
    const bossName = systemSettings.bossName || 'Olivia Wilson';
    const bossTitle = systemSettings.bossTitle || `CEO ${companyName}`;
    const bossSignatureUrl = systemSettings.bossSignature || '';

    // Exactly two deduction amounts: Advance and Deduction
    const advanceAmount = Number(ded.advances || 0);
    const deductionAmount = Number(
        ded.totalDeductions !== undefined
            ? Math.max(0, Number((ded.totalDeductions - advanceAmount).toFixed(2)))
            : Number(((ded.epfEmployee || 0) + (ded.otherDeductions || 0)).toFixed(2))
    );

    // Build the Exact Pixel-Perfect Salary Slip jsPDF Document
    const buildSalarySlipPdfDoc = () => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // 1. Top-Left Decorative Geometric Triangles (Crimson / Dark Red #8B0000)
        doc.setFillColor(139, 0, 0); // #8B0000
        doc.triangle(0, 0, 16, 0, 0, 16, 'F');

        doc.setFillColor(185, 28, 28); // #B91C1C
        doc.triangle(0, 16, 16, 0, 16, 16, 'F');

        doc.setFillColor(127, 29, 29); // #7F1D1D
        doc.triangle(0, 16, 0, 24, 16, 16, 'F');

        doc.setFillColor(153, 27, 27); // #991B1B
        doc.triangle(16, 0, 24, 0, 16, 16, 'F');

        doc.setFillColor(139, 0, 0);
        doc.triangle(16, 16, 24, 16, 16, 24, 'F');

        // 2. Title Section (Left) - Kept cleanly below geometric corner
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(28);
        doc.setTextColor(17, 24, 39);
        doc.text('Salary Slip.', 20, 40);

        // Location Pin + Address
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(185, 28, 28);
        doc.text('•', 20, 48);
        doc.setTextColor(75, 85, 99);
        doc.text(companyAddress, 24, 48);

        // 3. Company Brand Header (Right - Logo removed as requested)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(17, 24, 39);
        doc.text(companyName, 190, 40, { align: 'right' });

        // 4. Metadata Two-Column Grid
        let metaY = 56;
        doc.setFontSize(9);

        // Left Column
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(75, 85, 99);
        doc.text('Employee Name:', 20, metaY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 24, 39);
        doc.text(emp.name || 'Cahaya Dewi', 55, metaY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(75, 85, 99);
        doc.text('Employee ID:', 20, metaY + 6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 24, 39);
        doc.text(emp.payrollNumber || 'EMP-2026', 55, metaY + 6);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(75, 85, 99);
        doc.text('Department:', 20, metaY + 12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 24, 39);
        doc.text(emp.department || 'Marketing', 55, metaY + 12);

        // Right Column
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(75, 85, 99);
        doc.text('Account Number:', 115, metaY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 24, 39);
        doc.text(String(emp.accountNumber || '12345678900'), 150, metaY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(75, 85, 99);
        doc.text('Pay Period:', 115, metaY + 6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 24, 39);
        doc.text(`${startDate} – ${endDate}`, 150, metaY + 6);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(75, 85, 99);
        doc.text('Pay Date:', 115, metaY + 12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 24, 39);
        doc.text(endDate, 150, metaY + 12);

        // 5. Table Section (Deep Crimson / Burgundy Header)
        const tableY = metaY + 20;
        const tableBody = [];

        tableBody.push(['Basic Salary', Number(earn.basicSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })]);

        if (earn.overtimePayment > 0) {
            tableBody.push(['Overtime (OT) Payment', Number(earn.overtimePayment).toLocaleString('en-US', { minimumFractionDigits: 2 })]);
        }
        if (earn.otherAllowances > 0) {
            tableBody.push(['Other Allowances', Number(earn.otherAllowances).toLocaleString('en-US', { minimumFractionDigits: 2 })]);
        }
        if (earn.commission > 0) {
            tableBody.push(['Bonus / Commission', Number(earn.commission).toLocaleString('en-US', { minimumFractionDigits: 2 })]);
        }

        // Exactly two deduction rows: Advance & Deduction
        tableBody.push([
            'Advance',
            advanceAmount > 0 ? `-${advanceAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '0.00'
        ]);

        tableBody.push([
            'Deduction',
            deductionAmount > 0 ? `-${deductionAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '0.00'
        ]);

        autoTable(doc, {
            startY: tableY,
            margin: { left: 20, right: 20 },
            theme: 'grid',
            tableLineColor: [209, 213, 219],
            tableLineWidth: 0.25,
            styles: {
                fontSize: 9.5,
                cellPadding: 4,
                textColor: [31, 41, 55],
                lineColor: [209, 213, 219],
                lineWidth: 0.25
            },
            headStyles: {
                fillColor: [139, 0, 0], // Dark Red / Burgundy #8B0000
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 10,
                cellPadding: 4.5
            },
            columnStyles: {
                0: { cellWidth: 110, halign: 'center' },
                1: { cellWidth: 60, halign: 'center', fontStyle: 'bold' }
            },
            head: [['Description', 'Amount ($)']],
            body: tableBody
        });

        const finalTableY = doc.lastAutoTable.finalY + 12;

        // 6. Bottom Section: Left (Company Seal & Authorized Person) & Right (Total Earnings + Thanks Ribbon)
        // Left: Company Seal (No Signature, No Person Name)
        if (companySeal && companySeal.startsWith('data:image')) {
            try {
                doc.addImage(companySeal, 'PNG', 20, finalTableY + 4, 22, 22);
            } catch (e) {
                doc.setDrawColor(185, 28, 28);
                doc.setLineWidth(0.6);
                doc.circle(32, finalTableY + 14, 11, 'S');
                doc.setFontSize(5.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(185, 28, 28);
                doc.text('GLX INDUSTRIES', 32, finalTableY + 12, { align: 'center' });
                doc.setFontSize(5);
                doc.text('★ OFFICIAL ★', 32, finalTableY + 15, { align: 'center' });
                doc.text('APPROVED', 32, finalTableY + 18, { align: 'center' });
            }
        } else {
            doc.setDrawColor(185, 28, 28);
            doc.setLineWidth(0.6);
            doc.circle(32, finalTableY + 14, 11, 'S');
            doc.setLineWidth(0.3);
            doc.circle(32, finalTableY + 14, 9, 'S');
            doc.setFontSize(5.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(185, 28, 28);
            doc.text('GLX INDUSTRIES', 32, finalTableY + 12, { align: 'center' });
            doc.setFontSize(5);
            doc.text('★ OFFICIAL ★', 32, finalTableY + 15, { align: 'center' });
            doc.text('APPROVED', 32, finalTableY + 18, { align: 'center' });
        }

        doc.setDrawColor(156, 163, 175);
        doc.setLineWidth(0.3);
        doc.line(20, finalTableY + 28, 65, finalTableY + 28);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(17, 24, 39);
        doc.text('Authorized Person', 20, finalTableY + 34);

        // Right: Total Earnings & Thanks! Ribbon
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(139, 0, 0); // Burgundy
        doc.text('Total Earnings:', 190, finalTableY + 4, { align: 'right' });

        doc.setFontSize(16);
        doc.setTextColor(17, 24, 39);
        doc.text(`$${Number(net || 4000).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 190, finalTableY + 12, { align: 'right' });

        // Solid Burgundy Thanks! Card
        const ribbonX = 120;
        const ribbonY = finalTableY + 18;
        const ribbonW = 70;
        const ribbonH = 22;

        doc.setFillColor(139, 0, 0);
        doc.rect(ribbonX, ribbonY, ribbonW, ribbonH, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('Thanks!', ribbonX + 6, ribbonY + 9);

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(254, 226, 226);
        doc.text('For your cooperation.', ribbonX + 6, ribbonY + 16);

        // Ribbon Tails (two small downward triangles)
        doc.setFillColor(139, 0, 0);
        doc.triangle(ribbonX + ribbonW - 20, ribbonY + ribbonH, ribbonX + ribbonW - 12, ribbonY + ribbonH, ribbonX + ribbonW - 16, ribbonY + ribbonH + 7, 'F');
        doc.triangle(ribbonX + ribbonW - 10, ribbonY + ribbonH, ribbonX + ribbonW - 2, ribbonY + ribbonH, ribbonX + ribbonW - 6, ribbonY + ribbonH + 7, 'F');

        return doc;
    };

    const handlePrint = () => {
        try {
            const doc = buildSalarySlipPdfDoc();
            doc.autoPrint();
            const blobUrl = doc.output('bloburl');

            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '100vw';
            iframe.style.height = '100vh';
            iframe.style.zIndex = '99999';
            iframe.style.opacity = '0.01';
            iframe.style.pointerEvents = 'none';
            iframe.src = blobUrl;
            document.body.appendChild(iframe);

            iframe.onload = () => {
                try {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                } catch {
                    window.open(blobUrl, '_blank');
                }
            };
        } catch (err) {
            toast.error('Failed to print salary slip: ' + err.message);
        }
    };

    const handleDownloadPdf = () => {
        try {
            const doc = buildSalarySlipPdfDoc();
            doc.save(`Salary_Slip_${(emp.name || 'Employee').replace(/\s+/g, '_')}_${startDate}.pdf`);
            toast.success('Official Salary Slip downloaded successfully!');
        } catch (err) {
            toast.error('Failed to generate Salary Slip: ' + err.message);
        }
    };

    const handleWhatsAppShare = () => {
        const text = `*SALARY SLIP — ${companyName}*\n\n` +
            `*Employee Name:* ${emp.name}\n` +
            `*Employee ID:* ${emp.payrollNumber}\n` +
            `*Department:* ${emp.department || 'Operations'}\n` +
            `*Pay Period:* ${startDate} to ${endDate}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `• Basic Salary: Rs. ${Number(earn.basicSalary || 0).toLocaleString()}\n` +
            (earn.overtimePayment > 0 ? `• Housing / OT Allowance: Rs. ${Number(earn.overtimePayment).toLocaleString()}\n` : '') +
            (earn.otherAllowances > 0 ? `• Transport Allowance: Rs. ${Number(earn.otherAllowances).toLocaleString()}\n` : '') +
            (earn.commission > 0 ? `• Bonus: Rs. ${Number(earn.commission).toLocaleString()}\n` : '') +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `*TOTAL EARNINGS: Rs. ${Number(net || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}*\n\n` +
            `_Thanks! For your cooperation._`;

        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="payslip-modal-backdrop fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
            {/* Print Styles */}
            <style>{`
                @media print {
                    body.payslip-modal-open {
                        background: #ffffff !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    body.payslip-modal-open .sheet-print-container,
                    body.payslip-modal-open .print\\:hidden,
                    body.payslip-modal-open header,
                    body.payslip-modal-open nav,
                    body.payslip-modal-open aside,
                    body.payslip-modal-open .keyboard-shortcuts-bar {
                        display: none !important;
                    }
                    body.payslip-modal-open .payslip-modal-backdrop {
                        position: static !important;
                        background: transparent !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        overflow: visible !important;
                        display: block !important;
                        width: 100% !important;
                    }
                    body.payslip-modal-open .payslip-modal-wrapper {
                        position: static !important;
                        background: transparent !important;
                        border: none !important;
                        box-shadow: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        max-width: 100% !important;
                        width: 100% !important;
                        overflow: visible !important;
                    }
                    body.payslip-modal-open .payslip-modal-top-bar {
                        display: none !important;
                    }
                    body.payslip-modal-open .salary-slip-printable-canvas {
                        display: block !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 20mm !important;
                        background: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>

            <div className="payslip-modal-wrapper bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-300 my-6 font-sans">
                {/* Modal Top Control Bar */}
                <div className="payslip-modal-top-bar bg-gray-950 px-5 py-3 border-b border-gray-800 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-red-400" />
                        <h3 className="font-bold text-sm tracking-wide">Modern Salary Slip</h3>
                    </div>

                    <div className="flex items-center gap-2">
                        {payslip.isPaid || payslip.paymentStatus === 'paid' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold text-xs flex items-center gap-1 font-mono">
                                <CheckCircle size={13} className="text-emerald-400" />
                                PAID {payslip.voucherNumber ? `(${payslip.voucherNumber})` : ''}
                            </span>
                        ) : onPayClick ? (
                            <button
                                onClick={onPayClick}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                                title="Pay and settle this salary"
                            >
                                <Wallet size={14} />
                                Pay / Settle (ගෙවන්න)
                            </button>
                        ) : null}

                        <button
                            onClick={handleDownloadPdf}
                            className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                        >
                            <Download size={14} />
                            Download PDF
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                        >
                            <Printer size={14} />
                            Print
                        </button>
                        <button
                            onClick={handleWhatsAppShare}
                            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                            title="Share on WhatsApp"
                        >
                            <MessageSquare size={14} />
                            WhatsApp
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white p-1 rounded transition ml-2 cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-24 text-center">
                        <RefreshCw size={26} className="animate-spin text-red-600 mx-auto mb-2" />
                        <p className="text-xs text-gray-500 font-semibold">Generating modern salary slip...</p>
                    </div>
                ) : (
                    /* VISUAL SALARY SLIP CANVAS (Matches User's Screenshot Exactly) */
                    <div className="salary-slip-printable-canvas relative p-8 sm:p-12 bg-white text-gray-900" ref={printRef}>
                        
                        {/* Top-Left Corner Geometric Triangles (Tightly kept at top-left edge) */}
                        <div className="absolute top-0 left-0 w-14 h-14 sm:w-16 sm:h-16 pointer-events-none z-0">
                            <svg viewBox="0 0 100 100" className="w-full h-full">
                                <polygon points="0,0 55,0 0,55" fill="#8B0000" />
                                <polygon points="0,55 55,0 55,55" fill="#B91C1C" />
                                <polygon points="0,55 0,85 55,55" fill="#7F1D1D" />
                                <polygon points="55,0 85,0 55,55" fill="#991B1B" />
                                <polygon points="55,55 85,55 55,85" fill="#8B0000" />
                            </svg>
                        </div>

                        {/* Top Header: Title (Left) and Company Logo & Name (Right) - Placed cleanly below corner motif */}
                        <div className="flex justify-between items-start pt-10 sm:pt-12 mb-8 relative z-10">
                            <div>
                                <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight font-sans">
                                    Salary Slip.
                                </h1>
                                <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-2 font-medium">
                                    <MapPin size={13} className="text-red-700 shrink-0 fill-red-100" />
                                    <span>{companyAddress}</span>
                                </div>
                            </div>

                            {/* Right: Company Name ONLY (Logo removed as requested) */}
                            <div className="text-right">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                                    {companyName}
                                </h2>
                            </div>
                        </div>

                        {/* Metadata Grid (Two-Column Layout) */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs sm:text-sm mb-8 text-gray-800">
                            <div className="space-y-2">
                                <div>
                                    <span className="text-gray-500">Employee Name: </span>
                                    <strong className="text-gray-900 font-bold ml-1">{emp.name || 'Cahaya Dewi'}</strong>
                                </div>
                                <div>
                                    <span className="text-gray-500">Employee ID: </span>
                                    <strong className="text-gray-900 font-bold font-mono ml-1">{emp.payrollNumber || 'EMP-2026'}</strong>
                                </div>
                                <div>
                                    <span className="text-gray-500">Department: </span>
                                    <strong className="text-gray-900 font-bold ml-1">{emp.department || 'Marketing'}</strong>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div>
                                    <span className="text-gray-500">Account Number: </span>
                                    <strong className="text-gray-900 font-bold font-mono ml-1">{emp.accountNumber || '12345678900'}</strong>
                                </div>
                                <div>
                                    <span className="text-gray-500">Pay Period: </span>
                                    <strong className="text-gray-900 font-bold ml-1">{startDate} – {endDate}</strong>
                                </div>
                                <div>
                                    <span className="text-gray-500">Pay Date: </span>
                                    <strong className="text-gray-900 font-bold ml-1">{endDate}</strong>
                                </div>
                            </div>
                        </div>

                        {/* Table Section with Burgundy/Dark Red Header */}
                        <div className="mb-10 overflow-hidden border border-gray-300 rounded-sm">
                            <table className="w-full text-xs sm:text-sm border-collapse no-sticky no-zebra print-table salary-slip-table">
                                <thead style={{ backgroundColor: '#8B0000', color: '#ffffff' }} className="bg-[#8B0000] text-white">
                                    <tr style={{ backgroundColor: '#8B0000', color: '#ffffff' }} className="bg-[#8B0000] text-white">
                                        <th
                                            style={{ backgroundColor: '#8B0000', color: '#ffffff' }}
                                            className="py-3 px-6 text-center font-black tracking-wider uppercase text-xs sm:text-sm border-r border-red-950 w-2/3 text-white bg-[#8B0000]"
                                        >
                                            Description
                                        </th>
                                        <th
                                            style={{ backgroundColor: '#8B0000', color: '#ffffff' }}
                                            className="py-3 px-6 text-center font-black tracking-wider uppercase text-xs sm:text-sm w-1/3 text-white bg-[#8B0000]"
                                        >
                                            Amount ({systemSettings.currencySymbol || '$'})
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-300 text-gray-800 bg-white">
                                    {/* Basic Wage / Salary */}
                                    <tr>
                                        <td className="py-3.5 px-6 text-center font-medium border-r border-gray-300">
                                            Basic Salary
                                        </td>
                                        <td className="py-3.5 px-6 text-center font-bold font-mono">
                                            {Number(earn.basicSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>

                                    {/* Overtime payment only if present */}
                                    {earn.overtimePayment > 0 && (
                                        <tr>
                                            <td className="py-3.5 px-6 text-center font-medium border-r border-gray-300">
                                                Overtime (OT) Payment
                                            </td>
                                            <td className="py-3.5 px-6 text-center font-bold font-mono">
                                                {Number(earn.overtimePayment).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    )}

                                    {/* Allowances only if present */}
                                    {earn.otherAllowances > 0 && (
                                        <tr>
                                            <td className="py-3.5 px-6 text-center font-medium border-r border-gray-300">
                                                Other Allowances
                                            </td>
                                            <td className="py-3.5 px-6 text-center font-bold font-mono">
                                                {Number(earn.otherAllowances).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    )}

                                    {/* Bonus only if present */}
                                    {earn.commission > 0 && (
                                        <tr>
                                            <td className="py-3.5 px-6 text-center font-medium border-r border-gray-300">
                                                Bonus / Commission
                                            </td>
                                            <td className="py-3.5 px-6 text-center font-bold font-mono">
                                                {Number(earn.commission).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    )}

                                    {/* Advance Row (Exactly two deduction rows requested) */}
                                    <tr className={advanceAmount > 0 ? "bg-red-50/40" : ""}>
                                        <td className="py-3.5 px-6 text-center font-medium border-r border-gray-300 text-red-900">
                                            Advance
                                        </td>
                                        <td className="py-3.5 px-6 text-center font-bold font-mono text-red-700">
                                            {advanceAmount > 0 ? `-${advanceAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '0.00'}
                                        </td>
                                    </tr>

                                    {/* Deduction Row */}
                                    <tr className={deductionAmount > 0 ? "bg-red-50/40" : ""}>
                                        <td className="py-3.5 px-6 text-center font-medium border-r border-gray-300 text-red-900">
                                            Deduction
                                        </td>
                                        <td className="py-3.5 px-6 text-center font-bold font-mono text-red-700">
                                            {deductionAmount > 0 ? `-${deductionAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '0.00'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Bottom Section: Left (Company Seal & Authorized Person) & Right (Total + Thanks Ribbon) */}
                        <div className="flex justify-between items-end pt-2 pb-6">
                            {/* Left: Company Seal & Authorized Person (No Signature, No Person Name) */}
                            <div>
                                <div className="mb-2 min-h-[64px] flex items-center">
                                    {companySeal ? (
                                        <img src={companySeal} alt="Official Company Seal" className="h-16 w-auto object-contain" />
                                    ) : (
                                        <div className="w-16 h-16 select-none rotate-[-5deg]">
                                            <svg viewBox="0 0 100 100" className="w-full h-full text-red-700">
                                                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" />
                                                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
                                                <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="1" />
                                                <path id="sealTopModal" d="M 18,50 A 32,32 0 0,1 82,50" fill="none" />
                                                <path id="sealBottomModal" d="M 82,50 A 32,32 0 0,1 18,50" fill="none" />
                                                <text fontSize="7.5" fontWeight="bold" fill="currentColor" textAnchor="middle">
                                                    <textPath href="#sealTopModal" startOffset="50%">GLX INDUSTRIES</textPath>
                                                </text>
                                                <text fontSize="6" fontWeight="bold" fill="currentColor" textAnchor="middle">
                                                    <textPath href="#sealBottomModal" startOffset="50%">★ OFFICIAL SEAL ★</textPath>
                                                </text>
                                                <text x="50" y="53" fontSize="7" fontWeight="900" fill="currentColor" textAnchor="middle" letterSpacing="0.5">
                                                    APPROVED
                                                </text>
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className="border-t border-gray-400 w-44 mt-2"></div>
                                <h3 className="text-sm font-extrabold text-gray-900 tracking-tight mt-1.5">
                                    Authorized Person
                                </h3>
                            </div>

                            {/* Right: Total Earnings & Thanks! Ribbon Card */}
                            <div className="text-right">
                                <div className="mb-4">
                                    <span style={{ color: '#8B0000' }} className="text-xs sm:text-sm font-bold text-[#8B0000] uppercase tracking-wider block">
                                        Total Earnings:
                                    </span>
                                    <span className="text-2xl sm:text-3xl font-black text-gray-900 font-mono tracking-tight">
                                        {systemSettings.currencySymbol || '$'}{Number(net || 4000).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>

                                {/* Solid Burgundy Ribbon Box */}
                                <div className="relative inline-block text-left shadow-lg">
                                    <div style={{ backgroundColor: '#8B0000', color: '#ffffff' }} className="bg-[#8B0000] text-white px-7 py-4">
                                        <h4 className="text-2xl font-black tracking-tight leading-none font-sans">
                                            Thanks!
                                        </h4>
                                        <p className="text-xs font-semibold text-red-100 mt-1">
                                            For your cooperation.
                                        </p>
                                    </div>
                                    {/* Ribbon Cutout Tails */}
                                    <div className="flex justify-end gap-1.5 -mt-0.5 pr-4">
                                        <div className="w-0 h-0 border-l-[11px] border-l-transparent border-r-[11px] border-r-transparent border-t-[14px] border-t-[#8B0000]" />
                                        <div className="w-0 h-0 border-l-[11px] border-l-transparent border-r-[11px] border-r-transparent border-t-[14px] border-t-[#8B0000]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
