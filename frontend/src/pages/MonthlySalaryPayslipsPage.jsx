import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Printer, Download, Users, Calendar, Search, Building2,
    DollarSign, ArrowLeft, RefreshCw, Eye, MessageSquare, Plus,
    CheckCircle2, Sparkles, Filter, ChevronLeft, ChevronRight, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { employeesApi, advancesApi } from '../features/hr/hrApi';
import { useSettings } from '../features/settings/useSettings';
import NormalPayslipModal from '../components/NormalPayslipModal';
import RecordAdvanceModal from '../components/RecordAdvanceModal';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MonthlySalaryPayslipsPage() {
    const navigate = useNavigate();
    const today = new Date();
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-12
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState('ALL');
    const [includeEpfEtf, setIncludeEpfEtf] = useState(false);
    const [epfRate, setEpfRate] = useState(8);
    const [customAdvances, setCustomAdvances] = useState({});

    // Modal States
    const [activePayslipEmp, setActivePayslipEmp] = useState(null);
    const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
    const [advanceModalEmp, setAdvanceModalEmp] = useState(null);

    const { data: settingsData } = useSettings();
    const settings = settingsData?.data || {};

    // Period Start and End Dates
    const { startDate, endDate, datePeriodLabel } = useMemo(() => {
        const y = selectedYear;
        const m = selectedMonth;
        const lastDay = new Date(y, m, 0).getDate();
        const startStr = `${y}-${String(m).padStart(2, '0')}-01`;
        const endStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        return {
            startDate: startStr,
            endDate: endStr,
            datePeriodLabel: `${MONTH_NAMES[m - 1]} ${y}`
        };
    }, [selectedYear, selectedMonth]);

    // Fetch Employees
    const { data: employeesData, isLoading: isEmpLoading, refetch: refetchEmployees } = useQuery({
        queryKey: ['monthly-employees-list'],
        queryFn: () => employeesApi.list({ limit: 500, status: 'active' }),
    });

    const allEmployees = useMemo(() => employeesData?.data || [], [employeesData]);

    // Filter to only Monthly Salary employees (or employees with monthlySalary > 0)
    const monthlyEmployees = useMemo(() => {
        return allEmployees.filter(e => {
            const isMonthly = e.paymentType === 'monthly' || Number(e.monthlySalary) > 0 || (e.paymentType !== 'per_hour' && e.paymentType !== 'daily' && Number(e.basicSalary) > 10000);
            return isMonthly;
        });
    }, [allEmployees]);

    // Unique Departments
    const departments = useMemo(() => {
        const depts = new Set();
        monthlyEmployees.forEach(e => {
            const dName = e.departmentId?.name || e.department;
            if (dName) depts.add(dName);
        });
        return Array.from(depts);
    }, [monthlyEmployees]);

    // Fetch advances for the ongoing period
    const { data: advancesData } = useQuery({
        queryKey: ['monthly-period-advances', selectedYear, selectedMonth],
        queryFn: () => advancesApi.list({ limit: 500 }),
    });

    const recordedAdvancesMap = useMemo(() => {
        const map = {};
        const list = advancesData?.data || [];
        list.forEach(adv => {
            if (adv.status === 'rejected') return;
            const empId = adv.employeeId?._id || adv.employeeId;
            if (!empId) return;
            const d = new Date(adv.date || adv.createdAt);
            if (d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth) {
                map[String(empId)] = (map[String(empId)] || 0) + Number(adv.amount || 0);
            }
        });
        return map;
    }, [advancesData, selectedYear, selectedMonth]);

    // Calculate Row Data for each monthly employee
    const calculatedRows = useMemo(() => {
        return monthlyEmployees.map(emp => {
            const empId = String(emp._id);
            const mSalary = Number(emp.monthlySalary || emp.basicSalary || 0);
            const minSal = Number(emp.minimumSalary || 0);

            let basicSalary = 0;
            let otCommission = 0;

            if (minSal > 0) {
                basicSalary = Math.min(minSal, mSalary);
                otCommission = Math.max(0, Number((mSalary - basicSalary).toFixed(2)));
            } else {
                basicSalary = mSalary;
                otCommission = 0;
            }

            const autoAdvance = recordedAdvancesMap[empId] || 0;
            const advance = customAdvances[empId] !== undefined ? Number(customAdvances[empId]) : autoAdvance;
            const epfDeduction = includeEpfEtf ? Number(((mSalary * (epfRate || 8)) / 100).toFixed(2)) : 0;
            const netPayable = Math.max(0, Number((mSalary - advance - epfDeduction).toFixed(2)));

            return {
                emp,
                empId,
                name: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.displayName,
                payrollNumber: emp.payrollNumber || emp.employeeCode || 'EMP',
                department: emp.departmentId?.name || emp.department || 'Operations',
                designation: emp.designationId?.title || emp.designation || 'Staff',
                monthlySalary: mSalary,
                basicSalary,
                otCommission,
                advance,
                epfDeduction,
                netPayable
            };
        });
    }, [monthlyEmployees, recordedAdvancesMap, customAdvances, includeEpfEtf, epfRate]);

    // Filter by search & department
    const filteredRows = useMemo(() => {
        return calculatedRows.filter(r => {
            const matchesSearch = !searchTerm ||
                r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.payrollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.department.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDept = selectedDept === 'ALL' || r.department === selectedDept;
            return matchesSearch && matchesDept;
        });
    }, [calculatedRows, searchTerm, selectedDept]);

    // Summary Totals
    const summaryTotals = useMemo(() => {
        let totalStaff = filteredRows.length;
        let totalMonthly = 0;
        let totalBasic = 0;
        let totalOtComm = 0;
        let totalAdvance = 0;
        let totalEpf = 0;
        let totalNet = 0;

        filteredRows.forEach(r => {
            totalMonthly += r.monthlySalary;
            totalBasic += r.basicSalary;
            totalOtComm += r.otCommission;
            totalAdvance += r.advance;
            totalEpf += r.epfDeduction;
            totalNet += r.netPayable;
        });

        return {
            totalStaff,
            totalMonthly,
            totalBasic,
            totalOtComm,
            totalAdvance,
            totalEpf,
            totalNet
        };
    }, [filteredRows]);

    // Month Navigation Helpers
    const handlePrevMonth = () => {
        if (selectedMonth === 1) {
            setSelectedMonth(12);
            setSelectedYear(prev => prev - 1);
        } else {
            setSelectedMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 12) {
            setSelectedMonth(1);
            setSelectedYear(prev => prev + 1);
        } else {
            setSelectedMonth(prev => prev + 1);
        }
    };

    const handleCurrentMonth = () => {
        setSelectedYear(today.getFullYear());
        setSelectedMonth(today.getMonth() + 1);
    };

    // Open Payslip Modal for Employee
    const handleOpenPayslip = (row) => {
        setActivePayslipEmp(row);
        setIsPayslipModalOpen(true);
    };

    // Generate Single PDF Direct
    const handleDownloadPdf = (row) => {
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
            const primaryColor = [22, 101, 52]; // Dark emerald

            // Header Banner
            doc.setFillColor(15, 23, 42); // slate-900
            doc.rect(0, 0, 148, 28, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text('SALARY SLIP', 12, 14);

            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.text(settings.companyName || 'GLX INDUSTRIES', 12, 20);

            doc.setFontSize(8);
            doc.text(`Period: ${datePeriodLabel}`, 136, 14, { align: 'right' });
            doc.text(`Pay Date: ${endDate}`, 136, 20, { align: 'right' });

            // Employee Information Grid
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(`Employee: ${row.name}`, 12, 36);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(`Emp ID: ${row.payrollNumber}   |   Dept: ${row.department}   |   Designation: ${row.designation}`, 12, 42);

            // Salary Table
            const tableBody = [
                ['Basic Salary', 'Monthly Basic', 'Standard', `Rs. ${row.basicSalary.toLocaleString()}`],
            ];
            if (row.otCommission > 0) {
                tableBody.push(['OT / Commission', 'Excess Balance', 'Performance & OT', `Rs. ${row.otCommission.toLocaleString()}`]);
            }
            tableBody.push(['Gross Pay', '', '', `Rs. ${row.monthlySalary.toLocaleString()}`]);

            if (row.advance > 0) {
                tableBody.push(['Salary Advance Deducted', '', 'Deduction', `-Rs. ${row.advance.toLocaleString()}`]);
            }
            if (row.epfDeduction > 0) {
                tableBody.push([`EPF Employee (${epfRate}%)`, '', 'Statutory', `-Rs. ${row.epfDeduction.toLocaleString()}`]);
            }

            autoTable(doc, {
                startY: 48,
                head: [['Description', 'Type', 'Rate', 'Amount']],
                body: tableBody,
                theme: 'striped',
                headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8, fontStyle: 'bold' },
                bodyStyles: { fontSize: 8 },
                columnStyles: {
                    0: { cellWidth: 50 },
                    1: { cellWidth: 30 },
                    2: { cellWidth: 25 },
                    3: { halign: 'right', fontStyle: 'bold' }
                },
                margin: { left: 12, right: 12 }
            });

            const finalY = doc.lastAutoTable.finalY + 8;
            doc.setFillColor(241, 245, 249);
            doc.roundedRect(12, finalY, 124, 14, 2, 2, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42);
            doc.text('NET TAKE-HOME PAY:', 16, finalY + 9);
            doc.setFontSize(12);
            doc.setTextColor(22, 101, 52);
            doc.text(`Rs. ${row.netPayable.toLocaleString()}.00`, 132, finalY + 9, { align: 'right' });

            // Signature stamp
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text('Authorized Signature & Seal', 12, finalY + 28);
            doc.line(12, finalY + 24, 55, finalY + 24);

            doc.save(`Payslip_${row.payrollNumber}_${datePeriodLabel.replace(' ', '_')}.pdf`);
            toast.success(`Payslip for ${row.name} downloaded successfully!`);
        } catch (err) {
            toast.error('Failed to generate PDF');
        }
    };

    // Share via WhatsApp
    const handleShareWhatsApp = (row) => {
        const text = `*GLX INDUSTRIES - SALARY SLIP*
*Employee:* ${row.name} (${row.payrollNumber})
*Period:* ${datePeriodLabel}
---------------------------------
• *Basic Salary:* Rs. ${row.basicSalary.toLocaleString()}
• *OT / Commission:* Rs. ${row.otCommission.toLocaleString()}
• *Gross Pay:* Rs. ${row.monthlySalary.toLocaleString()}
${row.advance > 0 ? `• *Advance Deducted:* -Rs. ${row.advance.toLocaleString()}\n` : ''}${row.epfDeduction > 0 ? `• *EPF Deducted (${epfRate}%):* -Rs. ${row.epfDeduction.toLocaleString()}\n` : ''}---------------------------------
*NET PAYABLE:* Rs. ${row.netPayable.toLocaleString()}.00
---------------------------------
Thank you for your hard work!`;
        const phone = row.emp?.phone || row.emp?.mobile || '';
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const url = cleanPhone
            ? `https://wa.me/${cleanPhone.startsWith('94') ? cleanPhone : '94' + cleanPhone.replace(/^0/, '')}?text=${encodeURIComponent(text)}`
            : `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    // Dynamic totals payload to pass to NormalPayslipModal
    const modalDynamicTotals = useMemo(() => {
        if (!activePayslipEmp) return null;
        return {
            totalSalary: activePayslipEmp.monthlySalary,
            basicSalary: activePayslipEmp.basicSalary,
            otCommission: activePayslipEmp.otCommission,
            totalAdvance: activePayslipEmp.advance,
            epfEmployeeDeduction: activePayslipEmp.epfDeduction,
            netSalary: activePayslipEmp.netPayable,
            totalDays: 30,
            totalHours: 200,
            totalLeave: 0
        };
    }, [activePayslipEmp]);

    return (
        <div className="p-3 sm:p-5 max-w-[1600px] mx-auto space-y-4">
            {/* 1. Header & Navigation */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <button
                                type="button"
                                onClick={() => navigate('/employees')}
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
                                title="Back to Employees"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                Monthly Staff Payslips
                                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                                    Fixed Salary Hub
                                </span>
                            </h1>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Direct payslip management for permanent & monthly salaried employees without daily hour grids or policy deductions.
                        </p>
                    </div>

                    {/* Month Navigator & Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Period Selector */}
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={handlePrevMonth}
                                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                                title="Previous Month"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <div className="px-3 font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white select-none min-w-[130px] text-center">
                                {datePeriodLabel}
                            </div>
                            <button
                                type="button"
                                onClick={handleNextMonth}
                                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                                title="Next Month"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleCurrentMonth}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                                selectedMonth === today.getMonth() + 1 && selectedYear === today.getFullYear()
                                    ? 'bg-indigo-600 text-white shadow-2xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                        >
                            Current Month
                        </button>

                        {/* EPF/ETF Toggle */}
                        <label className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl cursor-pointer select-none text-xs font-bold text-slate-700 dark:text-slate-300">
                            <input
                                type="checkbox"
                                checked={includeEpfEtf}
                                onChange={(e) => setIncludeEpfEtf(e.target.checked)}
                                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                            />
                            <span>Include EPF (8%)</span>
                        </label>
                    </div>
                </div>

                {/* Explanation Banner */}
                <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-300 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <span>
                            <strong>Monthly Salary Formula:</strong> Basic Salary = <em>Minimum Salary</em> (e.g. Rs. 25,000) &nbsp;|&nbsp;
                            OT / Commission = <em>Monthly Salary - Minimum Salary</em> (e.g. Rs. 25,000) &nbsp;|&nbsp;
                            Total Gross Pay = <em>Monthly Fixed Package</em> (e.g. Rs. 50,000).
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/hr/manual-payment-sheet')}
                        className="underline font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 shrink-0"
                    >
                        Hourly Paysheet →
                    </button>
                </div>
            </div>

            {/* 2. Top KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff Count</span>
                    <span className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
                        {summaryTotals.totalStaff}
                    </span>
                    <span className="text-[9px] text-slate-400 block">Monthly Employees</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Payroll</span>
                    <span className="text-lg sm:text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                        Rs. {Math.round(summaryTotals.totalMonthly).toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-400 block">Gross Packages</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Basic Salary Pool</span>
                    <span className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
                        Rs. {Math.round(summaryTotals.totalBasic).toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-400 block">Minimum Salary Base</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">OT / Commission Pool</span>
                    <span className="text-lg sm:text-xl font-black font-mono text-teal-600 dark:text-teal-400">
                        Rs. {Math.round(summaryTotals.totalOtComm).toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-400 block">Excess Balance</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Advances Deducted</span>
                    <span className="text-lg sm:text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                        Rs. {Math.round(summaryTotals.totalAdvance).toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-400 block">Total Borrowed</span>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-xs text-center">
                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">Net Take-Home</span>
                    <span className="text-lg sm:text-xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                        Rs. {Math.round(summaryTotals.totalNet).toLocaleString()}
                    </span>
                    <span className="text-[9px] text-emerald-600 block">Disbursable</span>
                </div>
            </div>

            {/* 3. Search & Filter Bar */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search monthly staff by name, code, designation..."
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {departments.length > 0 && (
                        <select
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                        >
                            <option value="ALL">All Departments ({departments.length})</option>
                            {departments.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="text-xs text-slate-400 font-bold">
                    Showing {filteredRows.length} of {monthlyEmployees.length} Monthly Staff
                </div>
            </div>

            {/* 4. Monthly Employees Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
                {isEmpLoading ? (
                    <div className="py-20 text-center text-gray-500">
                        <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-2" />
                        <p className="font-semibold text-xs">Loading monthly salaried employees...</p>
                    </div>
                ) : filteredRows.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                        <Users size={36} className="mx-auto mb-2 opacity-40 text-slate-500" />
                        <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No monthly salary employees found</p>
                        <p className="text-xs text-slate-500 mt-1">
                            Ensure employees have Payment Type set to "Monthly Fixed" in their profile.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 select-none">
                                <tr className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                    <th className="py-3 px-4 min-w-[220px]">Employee</th>
                                    <th className="py-3 px-3">Dept & Designation</th>
                                    <th className="py-3 px-3 text-right">Monthly Package</th>
                                    <th className="py-3 px-3 text-right">Basic Salary</th>
                                    <th className="py-3 px-3 text-right">OT / Commission</th>
                                    <th className="py-3 px-3 text-right">Advance Taken</th>
                                    {includeEpfEtf && <th className="py-3 px-3 text-right">EPF ({epfRate}%)</th>}
                                    <th className="py-3 px-3 text-right">Net Payable</th>
                                    <th className="py-3 px-4 text-center min-w-[190px]">Payslip Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredRows.map((row) => (
                                    <tr
                                        key={row.empId}
                                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                                    >
                                        {/* 1. Employee Info */}
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-black text-xs uppercase shrink-0">
                                                    {row.name ? row.name.slice(0, 2) : 'EM'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                                                        {row.name}
                                                    </div>
                                                    <div className="text-[11px] font-mono font-semibold text-slate-400">
                                                        {row.payrollNumber}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* 2. Department & Designation */}
                                        <td className="py-3 px-3">
                                            <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                                {row.designation}
                                            </div>
                                            <div className="text-[11px] text-slate-400">
                                                {row.department}
                                            </div>
                                        </td>

                                        {/* 3. Monthly Salary (Total) */}
                                        <td className="py-3 px-3 text-right font-mono font-bold text-[15px] text-slate-900 dark:text-white">
                                            Rs. {row.monthlySalary.toLocaleString()}
                                        </td>

                                        {/* 4. Basic Salary (Minimum) */}
                                        <td className="py-3 px-3 text-right font-mono font-semibold text-[14px] text-slate-700 dark:text-slate-300">
                                            Rs. {row.basicSalary.toLocaleString()}
                                        </td>

                                        {/* 5. OT / Commission (Excess) */}
                                        <td className="py-3 px-3 text-right font-mono font-semibold text-[14px] text-indigo-600 dark:text-indigo-400">
                                            Rs. {row.otCommission.toLocaleString()}
                                        </td>

                                        {/* 6. Advance Taken (Editable) */}
                                        <td className="py-3 px-3 text-right">
                                            <div className="inline-flex items-center gap-1 justify-end">
                                                <input
                                                    type="number"
                                                    value={row.advance === 0 ? '' : row.advance}
                                                    placeholder="0"
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        setCustomAdvances(prev => ({
                                                            ...prev,
                                                            [row.empId]: val
                                                        }));
                                                    }}
                                                    className="w-20 px-2 py-1 text-right font-mono font-bold text-[14px] text-amber-700 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg outline-none focus:ring-1 focus:ring-amber-500"
                                                />
                                            </div>
                                        </td>

                                        {/* 7. EPF Deduction (Optional) */}
                                        {includeEpfEtf && (
                                            <td className="py-3 px-3 text-right font-mono font-bold text-[14px] text-rose-600">
                                                -Rs. {row.epfDeduction.toLocaleString()}
                                            </td>
                                        )}

                                        {/* 8. Net Take-Home Pay */}
                                        <td className="py-3 px-3 text-right">
                                            <span className="font-mono font-black text-[15px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-xl inline-block">
                                                Rs. {row.netPayable.toLocaleString()}
                                            </span>
                                        </td>

                                        {/* 9. Action Buttons */}
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenPayslip(row)}
                                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                                    title="View Full Executive Payslip"
                                                >
                                                    <Eye size={13} />
                                                    Payslip
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownloadPdf(row)}
                                                    className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                                                    title="Quick PDF Download"
                                                >
                                                    <Download size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleShareWhatsApp(row)}
                                                    className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
                                                    title="Share on WhatsApp"
                                                >
                                                    <MessageSquare size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Normal / Executive Payslip Modal */}
            {activePayslipEmp && (
                <NormalPayslipModal
                    isOpen={isPayslipModalOpen}
                    onClose={() => {
                        setIsPayslipModalOpen(false);
                        setActivePayslipEmp(null);
                    }}
                    employeeId={activePayslipEmp.empId}
                    employee={activePayslipEmp.emp}
                    startDate={startDate}
                    endDate={endDate}
                    includeEpfEtf={includeEpfEtf}
                    dynamicTotals={modalDynamicTotals}
                />
            )}
        </div>
    );
}
