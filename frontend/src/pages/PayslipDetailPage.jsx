import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Share2, Copy, Eye, EyeOff, ShieldCheck, Download, Lock, MessageSquare, MapPin, Flame } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { usePayslip, usePublicPayslip } from '../features/hr/useHr';
import { useAuthStore } from '../store/authStore';
import { useSettings } from '../features/settings/useSettings';
import { COMPANY_LOGO_BASE64 } from '../assets/companyLogoBase64';
import ProtectedView from '../components/security/ProtectedView';
import SendPayslipSmsModal from '../components/SendPayslipSmsModal';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

export default function PayslipDetailPage({ isPublicView = false }) {
    const { payrollId, employeeId, token } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // Mode state: 'executive' (Modern Red Ribbon Theme matching image), 'full' (Classic Company Details) or 'short' (Without Company Name for Mobile/External Privacy)
    const [payslipMode, setPayslipMode] = useState('executive'); // 'executive' | 'full' | 'short'
    const [watermarkEnabled, setWatermarkEnabled] = useState(false);
    const [hideHeaderAndSignature, setHideHeaderAndSignature] = useState(false);
    const [smsModalOpen, setSmsModalOpen] = useState(false);

    // Queries
    const { data: settingsData } = useSettings();
    const systemSettings = settingsData?.data || {};
    const companyName = systemSettings.companyName || 'GLX INDUSTRIES';
    const companyAddress = (systemSettings.companyAddress && systemSettings.companyAddress.trim()) || 'No.14, Negambo Road, Thudella, Ja-Ela, Sri Lanka';
    const companyLogo = systemSettings.companyLogo || COMPANY_LOGO_BASE64;
    const companySeal = systemSettings.companySeal || '';
    const bossName = systemSettings.bossName || 'Olivia Wilson';
    const bossTitle = systemSettings.bossTitle || `CEO ${companyName}`;
    const bossSignatureUrl = systemSettings.bossSignature || '';

    const internalQuery = usePayslip(payrollId, employeeId);
    const publicQuery = usePublicPayslip(token);

    const data = isPublicView ? publicQuery.data : internalQuery.data;
    const isLoading = isPublicView ? publicQuery.isLoading : internalQuery.isLoading;

    useEffect(() => {
        if (user?.role === 'employee' || isPublicView) {
            const handleKeyDown = (e) => {
                if (e.key === 'PrintScreen') {
                    toast.error('Screenshot attempt detected. Watermark active.', { icon: '🛡️' });
                    setWatermarkEnabled(true);
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [user, isPublicView]);

    const d = data?.data;
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    if (isLoading) return <div className="py-16 text-center text-gray-500">Loading Payslip Details...</div>;
    if (!d) return <div className="py-16 text-center text-red-500 font-semibold">Payslip not found or invalid link.</div>;

    const { payslip: ps, payroll, employee } = d;
    const shareUrl = `${window.location.origin}/payslip/share/${ps?.payslipShareToken || token || ''}`;

    const copyShareLink = () => {
        navigator.clipboard.writeText(shareUrl);
        toast.success('Direct Payslip link copied to clipboard!');
    };

    const currencySymbol = systemSettings.currencySymbol || '$';
    const payPeriodLabel = payroll ? `${monthNames[(payroll?.periodMonth || 1) - 1]} ${payroll?.periodYear}` : 'March 2026';
    const payDateLabel = payroll?.periodEndDate ? new Date(payroll.periodEndDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'March 30, 2026';
    const empName = employee ? `${employee.firstName} ${employee.lastName || ''}`.trim() : (ps?.employeeName || 'Cahaya Dewi');
    const empCode = employee?.employeeCode || ps?.employeeCode || 'EMP-2026';
    const empDept = employee?.department || 'Marketing';
    const empAccount = employee?.bankDetails?.accountNumber || '12345678900';

    // Exactly two deduction amounts: Advance and Deduction
    const advanceAmount = Number(ps?.advanceDeducted || 0);
    const deductionAmount = Number(
        ps?.totalDeductions !== undefined
            ? Math.max(0, Number((ps.totalDeductions - advanceAmount).toFixed(2)))
            : Number(((ps?.epfEmployeeContribution || 0) + (ps?.unauthorizedLeaveDeducted || 0) + ((ps?.deductions || []).reduce((acc, curr) => acc + (curr.amount || 0), 0))).toFixed(2))
    );

    return (
        <div className="space-y-6">
            {!isPublicView && (
                <div className="no-print">
                    <PageHeader title="Salary PaySlip Management"
                        description="View, export PDF, generate direct link, or switch view privacy mode"
                        actions={
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" onClick={() => {
                                    if (user?.role === 'employee') navigate('/dashboard');
                                    else navigate(`/payroll/${payrollId}`);
                                }}>
                                    <ArrowLeft size={16} className="mr-1.5" /> Back
                                </Button>
                                <Button variant="outline" onClick={copyShareLink}>
                                    <Share2 size={16} className="mr-1.5" /> Share Link
                                </Button>
                                <Button variant="outline" onClick={() => setSmsModalOpen(true)}>
                                    <MessageSquare size={16} className="mr-1.5" /> Send SMS
                                </Button>
                                <Button variant="primary" onClick={() => { toast.dismiss(); window.print(); }}>
                                    <Printer size={16} className="mr-1.5" /> PDF / Print
                                </Button>
                            </div>
                        } />
                </div>
            )}

            {/* PaySlip Mode Controls */}
            <div className="no-print bg-white dark:bg-[#111F33] p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">PaySlip Theme:</span>
                    <div className="inline-flex rounded-lg border border-gray-200 dark:border-slate-700 p-1 bg-gray-50 dark:bg-[#132238]">
                        <button onClick={() => setPayslipMode('executive')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${payslipMode === 'executive' ? 'bg-[#8B0000] text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}>
                            Modern Red Executive Slip (නව මෝස්තරය)
                        </button>
                        <button onClick={() => setPayslipMode('full')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${payslipMode === 'full' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}>
                            Standard Corporate (ආයතනික)
                        </button>
                        <button onClick={() => setPayslipMode('short')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${payslipMode === 'short' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}>
                            Discreet / Mobile (රහස්‍ය)
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-gray-700 dark:text-gray-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition">
                        <input
                            type="checkbox"
                            checked={hideHeaderAndSignature}
                            onChange={(e) => setHideHeaderAndSignature(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>Print/Export WITHOUT Logo &amp; Boss Signature</span>
                    </label>

                    <button onClick={() => setWatermarkEnabled(!watermarkEnabled)}
                        className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 font-medium cursor-pointer">
                        <ShieldCheck size={14} className={watermarkEnabled ? "text-green-600" : "text-gray-400"} />
                        {watermarkEnabled ? 'Security Watermark ON' : 'Toggle Watermark'}
                    </button>
                    {ps?.payslipShareToken && (
                        <button onClick={copyShareLink} className="flex items-center gap-1 text-primary-600 hover:underline font-semibold cursor-pointer">
                            <Copy size={13} /> Copy Direct Link
                        </button>
                    )}
                </div>
            </div>

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    .no-print, header, nav, aside { display: none !important; }
                    html, body, #root, main, .space-y-6 {
                        background: #ffffff !important;
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                    .card-print {
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 auto !important;
                        background: #ffffff !important;
                        background-color: #ffffff !important;
                        width: 100% !important;
                    }
                    .card-print * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .protected-shield-overlay, .security-watermark-overlay {
                        display: none !important;
                    }
                }
            `}} />

            {/* Main Payslip Container */}
            <ProtectedView title="Salary PaySlip" enableWatermark={false}>
                {payslipMode === 'executive' ? (
                    /* ------------------------------------------------------------- */
                    /* MODERN RED EXECUTIVE SALARY SLIP (Exact Match to User Image)  */
                    /* ------------------------------------------------------------- */
                    <Card className="p-8 sm:p-12 max-w-2xl mx-auto relative overflow-hidden card-print bg-white text-gray-900 border border-gray-300 shadow-xl font-sans">
                        {watermarkEnabled && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center rotate-[-30deg] opacity-10 select-none text-red-600 font-extrabold text-5xl tracking-widest uppercase">
                                CONFIDENTIAL · SALARY SLIP
                            </div>
                        )}

                        {/* Top-Left Geometric Triangles (Tightly kept at top-left edge) */}
                        <div className="absolute top-0 left-0 w-14 h-14 sm:w-16 sm:h-16 pointer-events-none z-0">
                            <svg viewBox="0 0 100 100" className="w-full h-full">
                                <polygon points="0,0 55,0 0,55" fill="#8B0000" />
                                <polygon points="0,55 55,0 55,55" fill="#B91C1C" />
                                <polygon points="0,55 0,85 55,55" fill="#7F1D1D" />
                                <polygon points="55,0 85,0 55,55" fill="#991B1B" />
                                <polygon points="55,55 85,55 55,85" fill="#8B0000" />
                            </svg>
                        </div>

                        {/* Header: Title (Left) and Company Logo & Name (Right) - Placed cleanly below corner motif */}
                        <div className="flex justify-between items-start pt-10 sm:pt-12 mb-8 relative z-10">
                            <div>
                                <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight font-sans">
                                    Salary Slip.
                                </h1>
                                {!hideHeaderAndSignature && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-2 font-medium">
                                        <MapPin size={13} className="text-red-700 shrink-0 fill-red-100" />
                                        <span>{companyAddress}</span>
                                    </div>
                                )}
                            </div>

                            {!hideHeaderAndSignature && (
                                <div className="text-right">
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                                        {companyName}
                                    </h2>
                                </div>
                            )}
                        </div>

                        {/* Metadata Grid (Two-Column Layout) */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs sm:text-sm mb-8 text-gray-800">
                            <div className="space-y-2">
                                <div>
                                    <span className="text-gray-500">Employee Name: </span>
                                    <strong className="text-gray-900 font-bold ml-1">{empName}</strong>
                                </div>
                                <div>
                                    <span className="text-gray-500">Employee ID: </span>
                                    <strong className="text-gray-900 font-bold font-mono ml-1">{empCode}</strong>
                                </div>
                                <div>
                                    <span className="text-gray-500">Department: </span>
                                    <strong className="text-gray-900 font-bold ml-1">{empDept}</strong>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div>
                                    <span className="text-gray-500">Account Number: </span>
                                    <strong className="text-gray-900 font-bold font-mono ml-1">{empAccount}</strong>
                                </div>
                                <div>
                                    <span className="text-gray-500">Pay Period: </span>
                                    <strong className="text-gray-900 font-bold ml-1">{payPeriodLabel}</strong>
                                </div>
                                <div>
                                    <span className="text-gray-500">Pay Date: </span>
                                    <strong className="text-gray-900 font-bold ml-1">{payDateLabel}</strong>
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
                                            Amount ({currencySymbol})
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-300 text-gray-800 bg-white">
                                    <tr>
                                        <td className="py-3.5 px-6 text-center font-medium border-r border-gray-300">
                                            Basic Salary
                                        </td>
                                        <td className="py-3.5 px-6 text-center font-bold font-mono">
                                            {Number(ps?.basicSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    {ps?.earnings?.map((e, idx) => (
                                        <tr key={idx}>
                                            <td className="py-3.5 px-6 text-center font-medium border-r border-gray-300">
                                                {e.name}
                                            </td>
                                            <td className="py-3.5 px-6 text-center font-bold font-mono">
                                                {Number(e.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
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

                        {/* Bottom Section: Left (Signature) & Right (Total + Thanks Ribbon) */}
                        <div className="flex justify-between items-end pt-2 pb-6">
                            {/* Left: Company Seal & Authorized Person (No Signature, No Person Name) */}
                            <div>
                                {!hideHeaderAndSignature && (
                                    <>
                                        <div className="mb-2 min-h-[64px] flex items-center">
                                            {companySeal ? (
                                                <img src={companySeal} alt="Official Company Seal" className="h-16 w-auto object-contain" />
                                            ) : (
                                                <div className="w-16 h-16 select-none rotate-[-5deg]">
                                                    <svg viewBox="0 0 100 100" className="w-full h-full text-red-700">
                                                        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" />
                                                        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
                                                        <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="1" />
                                                        <path id="sealTopPage" d="M 18,50 A 32,32 0 0,1 82,50" fill="none" />
                                                        <path id="sealBottomPage" d="M 82,50 A 32,32 0 0,1 18,50" fill="none" />
                                                        <text fontSize="7.5" fontWeight="bold" fill="currentColor" textAnchor="middle">
                                                            <textPath href="#sealTopPage" startOffset="50%">GLX INDUSTRIES</textPath>
                                                        </text>
                                                        <text fontSize="6" fontWeight="bold" fill="currentColor" textAnchor="middle">
                                                            <textPath href="#sealBottomPage" startOffset="50%">★ OFFICIAL SEAL ★</textPath>
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
                                    </>
                                )}
                            </div>

                            {/* Right: Total Earnings & Thanks! Ribbon Card */}
                            <div className="text-right">
                                <div className="mb-4">
                                    <span className="text-xs sm:text-sm font-bold text-[#8B0000] uppercase tracking-wider block">
                                        Total Earnings:
                                    </span>
                                    <span className="text-2xl sm:text-3xl font-black text-gray-900 font-mono tracking-tight">
                                        {currencySymbol}{Number(ps?.netPay || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                    </Card>
                ) : (
                    /* ------------------------------------------------------------- */
                    /* CLASSIC/STANDARD PAYSLIP FORMAT                               */
                    /* ------------------------------------------------------------- */
                    <Card className={`p-8 max-w-3xl mx-auto relative overflow-hidden card-print bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800`}>
                        {watermarkEnabled && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center rotate-[-30deg] opacity-10 select-none text-red-600 font-extrabold text-5xl tracking-widest uppercase">
                                CONFIDENTIAL · GLX ERP SECURITY
                            </div>
                        )}

                        {/* Header Section */}
                        <div className="border-b-2 border-gray-900 pb-4 mb-6 flex justify-between items-start">
                            <div>
                                {(!hideHeaderAndSignature && payslipMode === 'full') ? (
                                    <>
                                        {systemSettings.companyLogo && (
                                            <img src={systemSettings.companyLogo} alt="Logo" className="h-10 mb-1 object-contain" />
                                        )}
                                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">{systemSettings.companyName || 'GLX INDUSTRIES (PVT) LTD'}</h1>
                                        <p className="text-xs font-semibold text-gray-600">No. 124, Heavy Industrial Zone, Sri Lanka · Reg No: PV-98741</p>
                                        <p className="text-xs text-gray-500 font-medium mt-1">Official Corporate Salary Statement</p>
                                    </>
                                ) : (
                                    <>
                                        <h1 className="text-xl font-bold text-gray-800 tracking-tight">SALARY PAY SLIP</h1>
                                        <p className="text-xs font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded inline-block mt-1 border border-amber-200">
                                            Confidential Pay Slip Statement
                                        </p>
                                    </>
                                )}
                            </div>
                            <div className="text-right">
                                <Badge variant="info" className="text-xs font-bold font-mono">{payroll?.payrollNumber || 'PAY-SLIP'}</Badge>
                                <p className="text-sm font-bold text-gray-900 mt-1">{monthNames[(payroll?.periodMonth || 1) - 1]} {payroll?.periodYear}</p>
                                <p className="text-xs text-gray-500 font-mono">
                                    {payroll?.periodStartDate ? new Date(payroll.periodStartDate).toLocaleDateString('en-LK') : ''} — {payroll?.periodEndDate ? new Date(payroll.periodEndDate).toLocaleDateString('en-LK') : ''}
                                </p>
                            </div>
                        </div>

                        {/* Employee Info Section */}
                        <div className="grid grid-cols-2 gap-6 mb-6 p-4 bg-gray-50/70 dark:bg-slate-900/60 rounded-xl border border-gray-200 dark:border-slate-800 text-sm">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Employee Details</p>
                                <p className="font-bold text-base text-gray-900">{employee?.firstName || ps?.employeeName} {employee?.lastName || ''}</p>
                                <p className="font-mono text-xs font-semibold text-gray-700">{employee?.employeeCode || ps?.employeeCode}</p>
                                <p className="text-xs text-gray-600 mt-0.5">{employee?.designation || 'Staff Member'} · {employee?.department || 'Operations'}</p>
                                <p className="text-xs text-gray-500 mt-1">Pay Basis: <span className="font-semibold capitalize">{employee?.paymentType?.replace('_', ' ') || 'Monthly'}</span></p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Statutory &amp; Bank</p>
                                <p className="text-xs">EPF No: <span className="font-mono font-semibold">{employee?.epfNumber || 'EPF-PENDING'}</span></p>
                                <p className="text-xs">Bank: <span className="font-semibold">{employee?.bankDetails?.bankName || 'Direct Cash / Bank'}</span></p>
                                <p className="text-xs">Account: <span className="font-mono">{employee?.bankDetails?.accountNumber || '—'}</span></p>
                            </div>
                        </div>

                        {/* Attendance Summary */}
                        <div className="mb-6 border border-gray-200 dark:border-slate-800 rounded-lg p-3 bg-gray-50/40 dark:bg-slate-900/40">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Attendance Summary</p>
                            <div className="grid grid-cols-6 gap-2 text-center text-xs">
                                <div className="p-1 bg-white dark:bg-[#132238] rounded border border-gray-200 dark:border-slate-700"><p className="text-gray-500">Working</p><p className="font-bold">{ps?.workingDays || 0}</p></div>
                                <div className="p-1 bg-white dark:bg-[#132238] rounded border border-gray-200 dark:border-slate-700"><p className="text-gray-500">Present</p><p className="font-bold text-emerald-700">{ps?.daysPresent || 0}</p></div>
                                <div className="p-1 bg-white dark:bg-[#132238] rounded border border-gray-200 dark:border-slate-700"><p className="text-gray-500">Absent</p><p className="font-bold text-red-600">{ps?.daysAbsent || 0}</p></div>
                                <div className="p-1 bg-white dark:bg-[#132238] rounded border border-gray-200 dark:border-slate-700"><p className="text-gray-500">Leave</p><p className="font-bold text-blue-600">{ps?.leaveDays || 0}</p></div>
                                <div className="p-1 bg-white dark:bg-[#132238] rounded border border-gray-200 dark:border-slate-700"><p className="text-gray-500">Uninformed</p><p className="font-bold text-amber-600">{ps?.uninformedLeaveDays || 0}</p></div>
                                <div className="p-1 bg-white dark:bg-[#132238] rounded border border-gray-200 dark:border-slate-700"><p className="text-gray-500">OT Hrs</p><p className="font-bold">{ps?.overtimeHours || 0}</p></div>
                            </div>
                        </div>

                        {/* Earnings & Deductions Breakdown */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Earnings */}
                            <div className="border rounded-xl p-4 bg-emerald-50/20">
                                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                                    <span>Earnings (ලැබීම්)</span>
                                    <span className="text-xs">LKR</span>
                                </p>
                                <table className="w-full text-sm">
                                    <tbody>
                                        <tr className="border-b border-gray-100">
                                            <td className="py-1 text-gray-700">Basic Wage / Salary</td>
                                            <td className="py-1 text-right font-medium">{fmt(ps?.basicSalary)}</td>
                                        </tr>
                                        {ps?.earnings?.map((e, i) => (
                                            <tr key={i} className="border-b border-gray-100">
                                                <td className="py-1 text-gray-700">{e.name}</td>
                                                <td className="py-1 text-right font-medium">{fmt(e.amount)}</td>
                                            </tr>
                                        ))}
                                        <tr className="font-bold text-emerald-900 border-t border-emerald-300 pt-2">
                                            <td className="py-2">Gross Earnings</td>
                                            <td className="py-2 text-right">{fmt(ps?.grossEarnings)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Deductions */}
                            <div className="border rounded-xl p-4 bg-rose-50/20">
                                <p className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                                    <span>Deductions (අඩු කිරීම්)</span>
                                    <span className="text-xs">LKR</span>
                                </p>
                                <table className="w-full text-sm">
                                    <tbody>
                                        {ps?.epfEmployeeContribution > 0 && (
                                            <tr className="border-b border-gray-100">
                                                <td className="py-1 text-gray-700">EPF Employee (8%)</td>
                                                <td className="py-1 text-right text-rose-600">-{fmt(ps.epfEmployeeContribution)}</td>
                                            </tr>
                                        )}
                                        {ps?.advanceDeducted > 0 && (
                                            <tr className="border-b border-gray-100 bg-amber-50/50">
                                                <td className="py-1 font-semibold text-amber-900">Salary Advance Deducted</td>
                                                <td className="py-1 text-right font-bold text-amber-700">-{fmt(ps.advanceDeducted)}</td>
                                            </tr>
                                        )}
                                        {ps?.unauthorizedLeaveDeducted > 0 && (
                                            <tr className="border-b border-gray-100 bg-red-50/50">
                                                <td className="py-1 font-semibold text-red-900">Unauthorized Leave Deduction</td>
                                                <td className="py-1 text-right font-bold text-red-700">-{fmt(ps.unauthorizedLeaveDeducted)}</td>
                                            </tr>
                                        )}
                                        {ps?.deductions?.map((d, i) => (
                                            <tr key={i} className="border-b border-gray-100">
                                                <td className="py-1 text-gray-700">{d.name}</td>
                                                <td className="py-1 text-right text-rose-600">-{fmt(d.amount)}</td>
                                            </tr>
                                        ))}
                                        <tr className="font-bold text-rose-900 border-t border-rose-300 pt-2">
                                            <td className="py-2">Total Deductions</td>
                                            <td className="py-2 text-right text-rose-600">-{fmt(ps?.totalDeductions)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Net Pay Box */}
                        <div className="mt-6 p-4 rounded-xl bg-gray-900 text-white flex flex-wrap justify-between items-center gap-4">
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">NET SALARY PAYABLE</p>
                                <p className="text-3xl font-black text-emerald-400">{fmt(ps?.netPay)}</p>
                            </div>
                            <div className="text-right text-xs text-gray-300 space-y-0.5 border-l border-gray-700 pl-4">
                                <p>EPF Employer Contribution (12%): <span className="font-semibold text-white">{fmt(ps?.epfEmployerContribution)}</span></p>
                                <p>ETF Employer Contribution (3%): <span className="font-semibold text-white">{fmt(ps?.etfContribution)}</span></p>
                            </div>
                        </div>

                        {/* Signatures & Authorization Footer */}
                        <div className="mt-10 pt-6 border-t border-dashed border-gray-300 flex justify-between items-end text-xs">
                            <div>
                                <p className="font-semibold text-gray-600 mb-8">Employee Signature:</p>
                                <div className="border-t border-gray-400 w-44"></div>
                                <p className="text-[11px] font-medium text-gray-700 mt-1">{employee?.firstName || ps?.employeeName} {employee?.lastName || ''}</p>
                            </div>

                            {!hideHeaderAndSignature && (
                                <div className="text-right flex flex-col items-end">
                                    <p className="font-semibold text-gray-600 mb-1">Approved &amp; Authorized By:</p>
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

                        <div className="mt-6 pt-4 border-t text-center text-xs text-gray-500">
                            {(!hideHeaderAndSignature && payslipMode === 'full') ? (
                                <p>This is an official system-generated corporate payslip of GLX Industries.</p>
                            ) : (
                                <p>Discreet / Mobile Pay Slip — Company Details hidden for privacy.</p>
                            )}
                        </div>
                    </Card>
                )}
            </ProtectedView>

            {/* SMS Modal */}
            <SendPayslipSmsModal
                isOpen={smsModalOpen}
                onClose={() => setSmsModalOpen(false)}
                payslipId={ps?._id}
                employeeName={employee ? `${employee.firstName} ${employee.lastName || ''}`.trim() : (ps?.employeeName || 'Employee')}
                phoneNumbers={{
                    phone: employee?.phone || '',
                    secondaryPhone: employee?.secondaryPhone || '',
                    tertiaryPhone: employee?.tertiaryPhone || ''
                }}
            />
        </div>
    );
}
