import React, { useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Printer, Download, MessageSquare, RefreshCw, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { manualAttendanceApi } from '../features/hr/hrApi';
import { useSettings } from '../features/settings/useSettings';

export default function NormalPayslipModal({ isOpen, onClose, employeeId, startDate, endDate, includeEpfEtf = false }) {
    const printRef = useRef(null);
    const { data: settingsData } = useSettings();
    const systemSettings = settingsData?.data || {};

    const { data: payslipData, isLoading, refetch } = useQuery({
        queryKey: ['normal-payslip', employeeId, startDate, endDate, includeEpfEtf],
        queryFn: () => manualAttendanceApi.getNormalPayslip({ employeeId, startDate, endDate, includeEpfEtf }),
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
    const emp = payslip.employee || {};
    const earn = payslip.earnings || {};
    const ded = payslip.deductions || {};
    const empContrib = payslip.employerContributions || {};
    const net = payslip.netSalary || 0;

    // Use admin uploaded signature from backend company object or client systemSettings
    const bossSignatureUrl = comp.bossSignature || systemSettings.bossSignature || '';
    const bossTitle = comp.bossTitle || systemSettings.bossTitle || 'MANAGING DIRECTOR';

    // Handle Direct Print for Salary Slip Only
    const handlePrint = () => {
        document.body.classList.add('payslip-modal-open');
        toast.dismiss();
        setTimeout(() => {
            window.print();
        }, 80);
    };

    // Handle Modern Executive PDF Export matching the User's Template
    const handleDownloadPdf = () => {
        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // 1. Top Midnight Navy Header Banner
            doc.setFillColor(19, 25, 67); // Deep Navy #131943
            doc.rect(0, 0, 210, 50, 'F');

            // "Salary Slip." Title in White Bold
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(36);
            doc.text('Salary Slip.', 20, 34);

            // Company Name Subtitle in Top Banner
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(200, 210, 240);
            doc.text(comp.name || systemSettings.companyName || 'GLX INDUSTRIES (PVT) LTD', 20, 42);

            // 2. Emerald Green Horizontal Accent Strip (Left half)
            doc.setFillColor(26, 107, 61); // Emerald Green #1A6B3D
            doc.rect(0, 50, 105, 5, 'F');

            // 3. Employee & Period Metadata Grid (White Area)
            let metaY = 68;
            doc.setFontSize(9.5);
            doc.setTextColor(20, 20, 20);

            // Left Column
            doc.setFont('helvetica', 'bold');
            doc.text('Employee Name:', 20, metaY);
            doc.setFont('helvetica', 'normal');
            doc.text(emp.name || 'Employee', 55, metaY);

            doc.setFont('helvetica', 'bold');
            doc.text('Employee ID:', 20, metaY + 6);
            doc.setFont('helvetica', 'normal');
            doc.text(emp.payrollNumber || 'EMP-001', 55, metaY + 6);

            doc.setFont('helvetica', 'bold');
            doc.text('Department:', 20, metaY + 12);
            doc.setFont('helvetica', 'normal');
            doc.text(emp.department || emp.designation || 'Manufacturing & Operations', 55, metaY + 12);

            // Right Column
            doc.setFont('helvetica', 'bold');
            doc.text('Pay Period:', 115, metaY);
            doc.setFont('helvetica', 'normal');
            doc.text(`${startDate} – ${endDate}`, 145, metaY);

            doc.setFont('helvetica', 'bold');
            doc.text('Payment Date:', 115, metaY + 6);
            doc.setFont('helvetica', 'normal');
            doc.text(endDate, 145, metaY + 6);

            doc.setFont('helvetica', 'bold');
            doc.text('Employment Status:', 115, metaY + 12);
            doc.setFont('helvetica', 'normal');
            doc.text(emp.designation ? `${emp.designation} (Active)` : 'Full-Time Staff', 152, metaY + 12);

            // 4. Breakdown Table with Deep Navy Header
            const tableY = metaY + 22;

            const tableBody = [
                [
                    'Basic / Day Salary',
                    `${earn.totalHours || 0} Hours`,
                    `Rs. ${Number(emp.hourlyRate || 0).toFixed(0)}`,
                    `Rs. ${Number(earn.basicSalary || 0).toLocaleString()}`
                ]
            ];

            if (earn.overtimePayment > 0) {
                tableBody.push(['Overtime Pay', 'Approved OT', 'Hourly', `Rs. ${Number(earn.overtimePayment).toLocaleString()}`]);
            }
            if (earn.commission > 0) {
                tableBody.push(['Commission / Incentives', '1 Job', 'Fixed', `Rs. ${Number(earn.commission).toLocaleString()}`]);
            }
            if (earn.otherAllowances > 0) {
                tableBody.push(['Allowances', 'Monthly', 'Fixed', `Rs. ${Number(earn.otherAllowances).toLocaleString()}`]);
            }

            // Gross Pay Row
            tableBody.push(['Gross Pay', '', '', `Rs. ${Number(earn.grossEarnings || 0).toLocaleString()}`]);

            autoTable(doc, {
                startY: tableY,
                margin: { left: 20, right: 20 },
                theme: 'plain',
                styles: {
                    fontSize: 9,
                    cellPadding: 3.5,
                    textColor: [30, 30, 30]
                },
                headStyles: {
                    fillColor: [19, 25, 67], // Deep Navy
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 9.5
                },
                columnStyles: {
                    0: { cellWidth: 70 },
                    1: { cellWidth: 35, halign: 'center' },
                    2: { cellWidth: 35, halign: 'center' },
                    3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
                },
                head: [['Description', 'Qty', 'Rate', 'Amount']],
                body: tableBody,
                didParseCell: function (data) {
                    if (data.row.index === tableBody.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.textColor = [19, 25, 67];
                    }
                }
            });

            const finalTableY = doc.lastAutoTable.finalY + 8;

            // Horizontal Line under table
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.line(20, finalTableY, 190, finalTableY);

            // 5. Bottom Section: Left (Thank you + Uploaded Signature) & Right (Deductions + Net Pay)
            const bottomY = finalTableY + 8;

            // Left Side: "Thank you for your hard work!"
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(20, 20, 20);
            doc.text('Thank you for', 20, bottomY);
            doc.text('your hard work!', 20, bottomY + 6);

            // Uploaded Admin Signature Image / Script
            if (bossSignatureUrl && bossSignatureUrl.startsWith('data:image')) {
                try {
                    const format = (bossSignatureUrl.includes('image/jpeg') || bossSignatureUrl.includes('image/jpg')) ? 'JPEG' : 'PNG';
                    doc.addImage(bossSignatureUrl, format, 20, bottomY + 12, 45, 15, undefined, 'FAST');
                } catch (imgErr) {
                    console.warn('Could not render signature in PDF:', imgErr);
                }
            } else if (bossSignatureUrl && !bossSignatureUrl.startsWith('data:image')) {
                doc.setFont('times', 'italic');
                doc.setFontSize(18);
                doc.setTextColor(40, 40, 80);
                doc.text(bossSignatureUrl, 25, bottomY + 24);
            }

            // Signature Line
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.4);
            doc.line(20, bottomY + 29, 75, bottomY + 29);

            // Boss Title (e.g. MANAGING DIRECTOR)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(20, 20, 20);
            doc.text(bossTitle.toUpperCase(), 20, bottomY + 34);

            // Right Side: Deductions Breakdown (EPF only if includeEpfEtf is true!)
            let rightY = bottomY + 1;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(60, 60, 60);

            if (includeEpfEtf && ded.epfEmployee > 0) {
                doc.text('EPF (8%)', 125, rightY);
                doc.text(`-Rs. ${Number(ded.epfEmployee).toLocaleString()}`, 190, rightY, { align: 'right' });
                rightY += 5.5;
            }

            if (ded.advances > 0) {
                doc.text('Salary Advance', 125, rightY);
                doc.text(`-Rs. ${Number(ded.advances).toLocaleString()}`, 190, rightY, { align: 'right' });
                rightY += 5.5;
            }

            if (ded.otherDeductions > 0) {
                doc.text('Other Deductions / Cuts', 125, rightY);
                doc.text(`-Rs. ${Number(ded.otherDeductions).toLocaleString()}`, 190, rightY, { align: 'right' });
                rightY += 5.5;
            }

            // Divider Line above Net Pay
            doc.setDrawColor(180, 180, 180);
            doc.line(125, rightY + 1, 190, rightY + 1);
            rightY += 7;

            // NET PAY (Large Bold)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(19, 25, 67);
            doc.text('Net Pay', 125, rightY);
            doc.text(`Rs. ${Number(net).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 190, rightY, { align: 'right' });

            // 6. Bottom Right Decorative Geometric Accent (Mirror of top header)
            doc.setFillColor(26, 107, 61); // Emerald Green Strip
            doc.rect(95, 273, 115, 4, 'F');

            doc.setFillColor(19, 25, 67); // Deep Navy Block
            doc.rect(95, 277, 115, 20, 'F');

            // Save PDF
            doc.save(`Salary_Slip_${(emp.name || 'Employee').replace(/\s+/g, '_')}_${startDate}.pdf`);
            toast.success('Official Salary Slip downloaded successfully!');
        } catch (err) {
            toast.error('Failed to generate Salary Slip: ' + err.message);
        }
    };

    // Handle WhatsApp Share
    const handleWhatsAppShare = () => {
        const text = `*SALARY SLIP — ${comp.name || systemSettings.companyName || 'GLX INDUSTRIES'}*\n\n` +
            `*Employee:* ${emp.name}\n` +
            `*Employee ID:* ${emp.payrollNumber}\n` +
            `*Department:* ${emp.department || emp.designation || 'Staff'}\n` +
            `*Pay Period:* ${startDate} to ${endDate}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `• Basic / Day Salary: Rs. ${Number(earn.basicSalary || 0).toLocaleString()}\n` +
            (earn.overtimePayment > 0 ? `• Overtime Pay: Rs. ${Number(earn.overtimePayment).toLocaleString()}\n` : '') +
            `• Gross Earnings: Rs. ${Number(earn.grossEarnings || 0).toLocaleString()}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            (includeEpfEtf && ded.epfEmployee > 0 ? `• Employee EPF (8%): -Rs. ${Number(ded.epfEmployee).toLocaleString()}\n` : '') +
            (ded.advances > 0 ? `• Salary Advances: -Rs. ${Number(ded.advances).toLocaleString()}\n` : '') +
            (ded.otherDeductions > 0 ? `• Deductions / Cuts: -Rs. ${Number(ded.otherDeductions).toLocaleString()}\n` : '') +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `*NET TAKE-HOME PAY: Rs. ${Number(net).toLocaleString('en-US', { minimumFractionDigits: 2 })}*\n\n` +
            `_Thank you for your hard work!_`;

        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="payslip-modal-backdrop fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
            {/* PRISTINE SALARY SLIP PRINT CSS */}
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
                        border-radius: 0 !important;
                    }
                    body.payslip-modal-open .payslip-modal-top-bar {
                        display: none !important;
                    }
                    body.payslip-modal-open .salary-slip-printable-canvas {
                        display: block !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body.payslip-modal-open .salary-slip-printable-canvas * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>

            <div className="payslip-modal-wrapper bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-300 my-6">
                
                {/* Modal Top Control Bar */}
                <div className="payslip-modal-top-bar bg-gray-900 px-5 py-3 border-b border-gray-800 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-emerald-400" />
                        <h3 className="font-bold text-sm tracking-wide">Modern Salary Slip (Executive Template)</h3>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownloadPdf}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded flex items-center gap-1.5 transition cursor-pointer"
                        >
                            <Download size={14} />
                            Download PDF
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded flex items-center gap-1.5 transition cursor-pointer"
                        >
                            <Printer size={14} />
                            Print
                        </button>
                        <button
                            onClick={handleWhatsAppShare}
                            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded flex items-center gap-1.5 transition cursor-pointer"
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
                        <RefreshCw size={26} className="animate-spin text-indigo-600 mx-auto mb-2" />
                        <p className="text-xs text-gray-500 font-semibold">Generating modern salary slip...</p>
                    </div>
                ) : (
                    /* VISUAL SALARY SLIP CANVAS (Matches User's Screenshot Exactly) */
                    <div className="salary-slip-printable-canvas p-0 bg-white" ref={printRef}>
                        
                        {/* 1. Deep Midnight Navy Header */}
                        <div className="bg-[#131943] text-white px-8 pt-8 pb-5 relative">
                            <h1 className="text-4xl font-bold tracking-tight">Salary Slip.</h1>
                            <p className="text-xs text-indigo-200 mt-1 uppercase tracking-wider font-semibold">
                                {comp.name || systemSettings.companyName || 'GLX INDUSTRIES (PVT) LTD'}
                            </p>
                        </div>

                        {/* 2. Emerald Green Accent Bar (Left Half) */}
                        <div className="w-1/2 h-1.5 bg-[#1A6B3D]"></div>

                        {/* 3. Metadata Section */}
                        <div className="px-8 py-6 grid grid-cols-2 gap-y-2 text-xs border-b border-gray-100">
                            <div>
                                <span className="font-bold text-gray-900">Employee Name: </span>
                                <span className="text-gray-800">{emp.name}</span>
                            </div>
                            <div>
                                <span className="font-bold text-gray-900">Pay Period: </span>
                                <span className="text-gray-800">{startDate} – {endDate}</span>
                            </div>

                            <div>
                                <span className="font-bold text-gray-900">Employee ID: </span>
                                <span className="text-gray-800 font-mono">{emp.payrollNumber}</span>
                            </div>
                            <div>
                                <span className="font-bold text-gray-900">Payment Date: </span>
                                <span className="text-gray-800">{endDate}</span>
                            </div>

                            <div>
                                <span className="font-bold text-gray-900">Department: </span>
                                <span className="text-gray-800">{emp.department || emp.designation || 'Manufacturing & Operations'}</span>
                            </div>
                            <div>
                                <span className="font-bold text-gray-900">Employment Status: </span>
                                <span className="text-gray-800">{emp.designation ? `${emp.designation} (Active)` : 'Full-Time Staff'}</span>
                            </div>
                        </div>

                        {/* 4. Table Section */}
                        <div className="px-8 py-4">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-[#131943] text-white">
                                        <th className="py-2.5 px-4 text-left font-bold rounded-l-xs">Description</th>
                                        <th className="py-2.5 px-4 text-center font-bold">Qty</th>
                                        <th className="py-2.5 px-4 text-center font-bold">Rate</th>
                                        <th className="py-2.5 px-4 text-right font-bold rounded-r-xs">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-gray-800">
                                    <tr>
                                        <td className="py-3 px-4 font-medium">Basic / Day Salary</td>
                                        <td className="py-3 px-4 text-center font-mono">{earn.totalHours || 0} Hours</td>
                                        <td className="py-3 px-4 text-center font-mono">Rs. {Number(emp.hourlyRate || 0).toFixed(0)}</td>
                                        <td className="py-3 px-4 text-right font-bold font-mono">Rs. {Number(earn.basicSalary || 0).toLocaleString()}</td>
                                    </tr>

                                    {earn.overtimePayment > 0 && (
                                        <tr>
                                            <td className="py-2.5 px-4 font-medium">Overtime Pay</td>
                                            <td className="py-2.5 px-4 text-center font-mono">Approved OT</td>
                                            <td className="py-2.5 px-4 text-center font-mono">Hourly</td>
                                            <td className="py-2.5 px-4 text-right font-bold font-mono">Rs. {Number(earn.overtimePayment).toLocaleString()}</td>
                                        </tr>
                                    )}

                                    {earn.otherAllowances > 0 && (
                                        <tr>
                                            <td className="py-2.5 px-4 font-medium">Allowances</td>
                                            <td className="py-2.5 px-4 text-center font-mono">Monthly</td>
                                            <td className="py-2.5 px-4 text-center font-mono">Fixed</td>
                                            <td className="py-2.5 px-4 text-right font-bold font-mono">Rs. {Number(earn.otherAllowances).toLocaleString()}</td>
                                        </tr>
                                    )}

                                    {/* Gross Pay Subtotal */}
                                    <tr className="border-t-2 border-gray-200">
                                        <td colSpan={3} className="py-3 px-4 font-bold text-gray-900">Gross Pay</td>
                                        <td className="py-3 px-4 text-right font-bold font-mono text-gray-950 text-sm">
                                            Rs. {Number(earn.grossEarnings || 0).toLocaleString()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Divider */}
                        <div className="mx-8 border-t border-gray-200 my-2"></div>

                        {/* 5. Bottom Section: Left (Signature) & Right (Deductions & Net Pay) */}
                        <div className="px-8 pt-4 pb-12 flex justify-between items-start">
                            {/* Left: Thank you + Admin's Uploaded Signature */}
                            <div>
                                <h3 className="text-base font-bold text-gray-950 leading-tight">
                                    Thank you for<br />your hard work!
                                </h3>

                                <div className="mt-5">
                                    {bossSignatureUrl ? (
                                        bossSignatureUrl.startsWith('data:image') || bossSignatureUrl.startsWith('http') || bossSignatureUrl.startsWith('/') ? (
                                            <img
                                                src={bossSignatureUrl}
                                                alt="Authorized Signature"
                                                className="h-14 max-w-[200px] object-contain mb-1"
                                            />
                                        ) : (
                                            <div className="font-serif italic text-2xl text-indigo-950 tracking-wider mb-1">
                                                {bossSignatureUrl}
                                            </div>
                                        )
                                    ) : (
                                        <div className="h-10 flex items-end text-xs text-gray-400 italic">
                                            (Authorized Signatory)
                                        </div>
                                    )}
                                    <div className="w-48 border-b-2 border-gray-900 pb-1"></div>
                                    <div className="text-[11px] font-bold text-gray-900 mt-1 uppercase tracking-wider font-mono">
                                        {bossTitle.toUpperCase()}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Deductions + Net Pay (EPF ONLY IF includeEpfEtf IS TICKED!) */}
                            <div className="w-64 space-y-2 text-xs">
                                {includeEpfEtf && ded.epfEmployee > 0 && (
                                    <div className="flex justify-between text-gray-700">
                                        <span>EPF (8%)</span>
                                        <span className="font-mono font-semibold text-rose-700">-Rs. {Number(ded.epfEmployee).toLocaleString()}</span>
                                    </div>
                                )}

                                {ded.advances > 0 && (
                                    <div className="flex justify-between text-gray-700">
                                        <span>Salary Advance</span>
                                        <span className="font-mono font-semibold text-rose-700">-Rs. {Number(ded.advances).toLocaleString()}</span>
                                    </div>
                                )}

                                {ded.otherDeductions > 0 && (
                                    <div className="flex justify-between text-gray-700">
                                        <span>Other Deductions / Cuts</span>
                                        <span className="font-mono font-semibold text-rose-700">-Rs. {Number(ded.otherDeductions).toLocaleString()}</span>
                                    </div>
                                )}

                                <div className="border-t border-gray-300 pt-2 flex justify-between items-baseline">
                                    <span className="text-base font-bold text-[#131943]">Net Pay</span>
                                    <span className="text-lg font-bold font-mono text-[#131943]">
                                        Rs. {Number(net).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 6. Bottom Right Decorative Geometric Accent (Mirror of Top Header) */}
                        <div className="flex justify-end">
                            <div className="w-1/2">
                                <div className="h-1 bg-[#1A6B3D]"></div>
                                <div className="h-6 bg-[#131943]"></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
