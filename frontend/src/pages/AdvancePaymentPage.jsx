import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    DollarSign, Plus, Search, Filter, Calendar, Users, ArrowRight,
    CheckCircle2, AlertCircle, RefreshCw, Clock, Wallet, FileSpreadsheet,
    FileText, Phone, Mail, ChevronRight, ChevronLeft, Printer, X, History,
    TrendingUp, ArrowDownRight, CreditCard, Banknote
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { advancesApi, departmentsApi } from '../features/hr/hrApi';

const formatLocalDateStr = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function AdvancePaymentPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const now = new Date();
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [tabFilter, setTabFilter] = useState('all'); // 'all' | 'eligible' | 'with_advances'
    const [empStatusFilter, setEmpStatusFilter] = useState('active'); // 'active' | 'inactive' | 'all'

    // Modal state for Disbursing Advance
    const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
    const [selectedEmployeeForAdvance, setSelectedEmployeeForAdvance] = useState(null);
    const [advanceFormData, setAdvanceFormData] = useState({
        amount: '',
        date: formatLocalDateStr(),
        paymentMethod: 'Cash',
        reason: 'Monthly operational advance',
        numberOfInstallments: 1
    });

    // Modal state for Ledger History
    const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
    const [selectedEmployeeForLedger, setSelectedEmployeeForLedger] = useState(null);

    // Fetch Overview data for current selected month & year
    const { data: overviewRes, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['advance-management-overview', selectedYear, selectedMonth, departmentFilter],
        queryFn: () => advancesApi.getEarnedWageOverview({
            year: selectedYear,
            month: selectedMonth,
            departmentId: departmentFilter
        })
    });

    const { data: deptsData } = useQuery({
        queryKey: ['departments-list'],
        queryFn: () => departmentsApi.list({ limit: 200 })
    });

    const overviewData = overviewRes?.data || [];
    const summary = overviewRes?.summary || {};
    const period = overviewRes?.period || {};
    const departments = deptsData?.data || [];

    // Disburse Advance Mutation
    const disburseMutation = useMutation({
        mutationFn: async (payload) => advancesApi.create(payload),
        onSuccess: (res, variables) => {
            queryClient.invalidateQueries(['advance-management-overview']);
            queryClient.invalidateQueries(['manual-attendance-daily']);
            queryClient.invalidateQueries(['employee-payment-sheet']);
            queryClient.invalidateQueries(['monthly-period-advances']);
            queryClient.invalidateQueries(['normal-payslip']);
            setIsDisburseModalOpen(false);
            toast.success(
                `Rs. ${Number(variables.amount).toLocaleString()} advance issued successfully to ${selectedEmployeeForAdvance?.fullName || 'employee'}!`,
                { icon: '💵' }
            );
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to issue advance');
        }
    });

    // Month Navigation Helpers
    const changeMonth = (delta) => {
        let newMonth = selectedMonth + delta;
        let newYear = selectedYear;
        if (newMonth > 12) {
            newMonth = 1;
            newYear++;
        } else if (newMonth < 1) {
            newMonth = 12;
            newYear--;
        }
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Open Disburse Modal for a specific employee
    const handleOpenDisburseModal = (item) => {
        setSelectedEmployeeForAdvance(item.employee);
        setAdvanceFormData({
            amount: '',
            date: formatLocalDateStr(),
            paymentMethod: 'Cash',
            reason: 'Earned wage salary advance',
            numberOfInstallments: 1
        });
        setIsDisburseModalOpen(true);
    };

    // Open Ledger History Modal
    const handleOpenLedgerModal = (item) => {
        setSelectedEmployeeForLedger(item);
        setIsLedgerModalOpen(true);
    };

    // Submit Advance Disbursement
    const handleSubmitAdvance = (e) => {
        e.preventDefault();
        const amt = Number(advanceFormData.amount);
        if (!amt || amt <= 0) {
            toast.error('Please enter a valid advance amount greater than 0');
            return;
        }

        disburseMutation.mutate({
            employeeId: selectedEmployeeForAdvance._id,
            amount: amt,
            date: advanceFormData.date,
            reason: `${advanceFormData.paymentMethod}: ${advanceFormData.reason}`,
            numberOfInstallments: Number(advanceFormData.numberOfInstallments) || 1,
            isPaid: true,
            status: 'approved'
        });
    };

    // Filtered Employee Rows
    const filteredRows = useMemo(() => {
        return overviewData.filter(item => {
            const emp = item.employee;
            const term = searchTerm.toLowerCase().trim();

            if (term) {
                const name = (emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`).toLowerCase();
                const code = (emp.employeeCode || emp.payrollNumber || '').toLowerCase();
                const phone = (emp.phone || '').toLowerCase();
                const dept = (emp.department || '').toLowerCase();
                if (!name.includes(term) && !code.includes(term) && !phone.includes(term) && !dept.includes(term)) {
                    return false;
                }
            }

            if (tabFilter === 'eligible' && item.advances.availableAdvance <= 0) {
                return false;
            }

            if (tabFilter === 'with_advances' && item.advances.periodAdvancesTotal <= 0) {
                return false;
            }

            const isEmpActive = (emp.status || 'active') === 'active';
            if (empStatusFilter === 'active' && !isEmpActive) return false;
            if (empStatusFilter === 'inactive' && isEmpActive) return false;

            return true;
        });
    }, [overviewData, searchTerm, tabFilter, empStatusFilter]);

    // Live remaining balance calculation inside the modal
    const currentModalEmpRow = useMemo(() => {
        if (!selectedEmployeeForAdvance) return null;
        return overviewData.find(item => item.employee._id === selectedEmployeeForAdvance._id);
    }, [selectedEmployeeForAdvance, overviewData]);

    const modalTypedAmount = Number(advanceFormData.amount) || 0;
    const modalAvailableAdvance = currentModalEmpRow?.advances?.availableAdvance || 0;
    const modalRemainingAfterAdvance = Math.max(0, modalAvailableAdvance - modalTypedAmount);

    return (
        <div className="space-y-4">
            {/* Top Page Header */}
            <PageHeader
                title="Advance Payment & Earned Wage Access"
                description="Real-time earned wage calculations based on worked days/hours, advance eligibility limits, instant disbursement, remaining balance tracking, and ledger history."
                actions={
                    <div className="flex items-center gap-2">
                        {/* Month Selector Buttons */}
                        <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs">
                            <button
                                type="button"
                                onClick={() => changeMonth(-1)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition"
                                title="Previous Month"
                            >
                                <ChevronLeft size={15} />
                            </button>
                            <span className="px-3 py-1 text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                                {monthNames[selectedMonth - 1]} {selectedYear}
                            </span>
                            <button
                                type="button"
                                onClick={() => changeMonth(1)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition"
                                title="Next Month"
                            >
                                <ChevronRight size={15} />
                            </button>
                        </div>

                        <Button
                            variant="outline"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="text-xs font-bold"
                        >
                            <RefreshCw size={13} className={`mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>

                        <Button
                            variant="primary"
                            onClick={() => {
                                if (overviewData.length > 0) {
                                    handleOpenDisburseModal(overviewData[0]);
                                }
                            }}
                            className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 shadow-xs"
                        >
                            <Plus size={14} className="mr-1.5" /> Disburse Advance
                        </Button>
                    </div>
                }
            />

            {/* Top 4 KPI Summary Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Total Accrued Salary So Far */}
                <Card className="p-3.5 border-l-4 border-l-emerald-500 shadow-xs">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Total Earned Wages
                            </p>
                            <h3 className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                                Rs. {Number(summary.overallAccruedEarnings || 0).toLocaleString()}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <TrendingUp size={18} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{summary.overallDaysWorked || 0} days</span>
                        <span>•</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{summary.overallHoursWorked || 0} hrs worked</span>
                    </div>
                </Card>

                {/* 2. Advances Disbursed in Period */}
                <Card className="p-3.5 border-l-4 border-l-amber-500 shadow-xs">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Advances Given (Month)
                            </p>
                            <h3 className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-300 mt-0.5">
                                Rs. {Number(summary.overallAdvancesIssued || 0).toLocaleString()}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <Banknote size={18} />
                        </div>
                    </div>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium mt-1.5">
                        Will be automatically deducted from monthly payslips
                    </p>
                </Card>

                {/* 3. Available Advance Pool */}
                <Card className="p-3.5 border-l-4 border-l-indigo-500 shadow-xs">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Available Advance Pool
                            </p>
                            <h3 className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-0.5">
                                Rs. {Number(summary.overallAvailableAdvance || 0).toLocaleString()}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Wallet size={18} />
                        </div>
                    </div>
                    <p className="text-[10px] text-indigo-600/80 font-medium mt-1.5">
                        Remaining unwithdrawn accrued wages
                    </p>
                </Card>

                {/* 4. Active Staff Headcount */}
                <Card className="p-3.5 border-l-4 border-l-blue-500 shadow-xs">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Active Employees
                            </p>
                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                                {summary.activeEmployees || 0} / {summary.totalEmployees || 0}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Users size={18} />
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                        Period: {period.startDate} to {period.endDate}
                    </p>
                </Card>
            </div>

            {/* Main Interactive Table Card */}
            <Card className="shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                {/* Search & Filter Bar */}
                <div className="p-3 sm:p-4 bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    
                    {/* Employment Status Filter: Active vs Inactive */}
                    <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-bold">
                        <button
                            type="button"
                            onClick={() => setEmpStatusFilter('active')}
                            className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 ${
                                empStatusFilter === 'active'
                                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                                    : 'text-emerald-700 hover:bg-emerald-100/60 dark:text-emerald-400'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Active ({overviewData.filter(i => (i.employee.status || 'active') === 'active').length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setEmpStatusFilter('inactive')}
                            className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 ${
                                empStatusFilter === 'inactive'
                                    ? 'bg-rose-600 text-white shadow-2xs font-bold'
                                    : 'text-rose-700 hover:bg-rose-100/60 dark:text-rose-400'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                            Inactive ({overviewData.filter(i => (i.employee.status || 'active') !== 'active').length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setEmpStatusFilter('all')}
                            className={`px-2.5 py-1 rounded-md transition ${
                                empStatusFilter === 'all'
                                    ? 'bg-slate-900 text-white shadow-2xs dark:bg-white dark:text-slate-900'
                                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                            }`}
                        >
                            All ({overviewData.length})
                        </button>
                    </div>

                    {/* Advance Status Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setTabFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                tabFilter === 'all'
                                    ? 'bg-slate-900 text-white shadow-2xs dark:bg-white dark:text-slate-900'
                                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            }`}
                        >
                            <span>All Staff ({overviewData.length})</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setTabFilter('eligible')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                tabFilter === 'eligible'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200 dark:bg-slate-800 dark:text-emerald-400'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>Eligible for Advance ({overviewData.filter(i => i.advances.availableAdvance > 0).length})</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setTabFilter('with_advances')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                tabFilter === 'with_advances'
                                    ? 'bg-amber-600 text-white shadow-2xs'
                                    : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200 dark:bg-slate-800 dark:text-amber-400'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            <span>With Advances ({overviewData.filter(i => i.advances.periodAdvancesTotal > 0).length})</span>
                        </button>
                    </div>

                    {/* Search & Department Selector */}
                    <div className="flex items-center gap-2 flex-1 md:max-w-md ml-auto">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, employee code, phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-slate-200 font-medium"
                        >
                            <option value="all">All Departments</option>
                            {departments.map(d => (
                                <option key={d._id} value={d._id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table Content */}
                {isLoading ? (
                    <div className="py-20 text-center text-slate-400 font-semibold text-xs flex flex-col items-center gap-2">
                        <RefreshCw size={24} className="animate-spin text-indigo-500" />
                        <span>Loading earned wages & advance ledger data...</span>
                    </div>
                ) : filteredRows.length === 0 ? (
                    <EmptyState
                        icon={DollarSign}
                        title="No matching employees found"
                        description={searchTerm ? `No results for "${searchTerm}"` : 'No employees matching selected criteria.'}
                        action={
                            <Button variant="outline" onClick={() => { setSearchTerm(''); setTabFilter('all'); setDepartmentFilter('all'); }}>
                                Reset Filters
                            </Button>
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                                    <th className="py-2.5 px-3">Employee</th>
                                    <th className="py-2.5 px-3">Payment Type</th>
                                    <th className="py-2.5 px-3">Worked in Month</th>
                                    <th className="py-2.5 px-3 text-right">Earned Wages (Gross)</th>
                                    <th className="py-2.5 px-3 text-right">Advances Taken</th>
                                    <th className="py-2.5 px-3 text-right">Max Advance Allowed</th>
                                    <th className="py-2.5 px-3 text-right">Take-Home Balance</th>
                                    <th className="py-2.5 px-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                                {filteredRows.map((row) => {
                                    const emp = row.employee;
                                    const work = row.work;
                                    const earnings = row.earnings;
                                    const advances = row.advances;
                                    const isEmpActive = emp.status === 'active';

                                    return (
                                        <tr
                                            key={emp._id}
                                            className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                                                !isEmpActive ? 'opacity-70 bg-slate-50/20' : ''
                                            }`}
                                        >
                                            {/* 1. Employee Name & Department */}
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                                                        isEmpActive
                                                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200'
                                                            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                        {emp.firstName ? emp.firstName.slice(0, 1) : 'E'}
                                                        {emp.lastName ? emp.lastName.slice(0, 1) : ''}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="font-bold text-slate-900 dark:text-white truncate">
                                                                {emp.fullName}
                                                            </p>
                                                            {!isEmpActive && (
                                                                <span className="text-[9px] px-1 py-0.2 rounded bg-rose-100 text-rose-700 font-bold uppercase">
                                                                    Inactive
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                                            <span>{emp.employeeCode}</span>
                                                            <span>•</span>
                                                            <span>{emp.department}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 2. Payment Type & Rate */}
                                            <td className="py-3 px-3">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                                    emp.paymentType === 'monthly'
                                                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                                }`}>
                                                    {emp.paymentType === 'monthly' ? 'Monthly' : 'Hourly Rate'}
                                                </span>
                                                <p className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
                                                    {emp.paymentType === 'monthly'
                                                        ? `Rs. ${Number(emp.monthlySalary).toLocaleString()}/mo`
                                                        : `Rs. ${Number(emp.hourlyRate).toFixed(0)}/hr`}
                                                </p>
                                            </td>

                                            {/* 3. Worked in Month */}
                                            <td className="py-3 px-3 font-mono">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                        work.daysWorked > 0
                                                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
                                                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                                                    }`}>
                                                        {work.daysWorked} Days
                                                    </span>
                                                    <span className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                                                        ({work.hoursWorked} hrs)
                                                    </span>
                                                </div>
                                                {work.totalDeductions > 0 && (
                                                    <p className="text-[10px] text-rose-600 font-medium mt-0.5">
                                                        -Rs. {work.totalDeductions} late deductions
                                                    </p>
                                                )}
                                            </td>

                                            {/* 4. Earned Wages So Far (Accrued) */}
                                            <td className="py-3 px-3 text-right font-mono">
                                                <span className="text-xs sm:text-[13px] font-black text-emerald-700 dark:text-emerald-400">
                                                    Rs. {Number(earnings.netAccrued).toLocaleString()}
                                                </span>
                                                <p className="text-[9.5px] text-slate-400 dark:text-slate-500 font-sans mt-0.5">
                                                    Accrued to date
                                                </p>
                                            </td>

                                            {/* 5. Already Taken Advances in Period */}
                                            <td className="py-3 px-3 text-right font-mono">
                                                {advances.periodAdvancesTotal > 0 ? (
                                                    <div>
                                                        <span className="text-xs sm:text-[13px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200/80">
                                                            -Rs. {Number(advances.periodAdvancesTotal).toLocaleString()}
                                                        </span>
                                                        <p className="text-[9.5px] text-amber-600 dark:text-amber-500 font-sans mt-0.5">
                                                            {advances.periodCount} advance{advances.periodCount > 1 ? 's' : ''} taken
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 dark:text-slate-600 font-medium">—</span>
                                                )}
                                            </td>

                                            {/* 6. Max Eligible Advance Allowed */}
                                            <td className="py-3 px-3 text-right font-mono">
                                                <span className={`text-xs sm:text-[13px] font-black px-2 py-0.5 rounded-lg border ${
                                                    advances.availableAdvance > 0
                                                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-2xs'
                                                        : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                                                }`}>
                                                    Rs. {Number(advances.availableAdvance).toLocaleString()}
                                                </span>
                                                <p className="text-[9.5px] text-slate-400 font-sans mt-0.5">
                                                    Max advance limit
                                                </p>
                                            </td>

                                            {/* 7. Take-Home Balance */}
                                            <td className="py-3 px-3 text-right font-mono">
                                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                    Rs. {Number(advances.availableAdvance).toLocaleString()}
                                                </span>
                                                <p className="text-[9.5px] text-slate-400 font-sans mt-0.5">
                                                    Net remaining
                                                </p>
                                            </td>

                                            {/* 8. Actions: Give Advance & Ledger */}
                                            <td className="py-3 px-3 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {/* Disburse Advance Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenDisburseModal(row)}
                                                        className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                                                        title="Issue Salary Advance"
                                                    >
                                                        <Plus size={12} /> Advance
                                                    </button>

                                                    {/* Ledger Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenLedgerModal(row)}
                                                        className="px-2 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
                                                        title="View Complete Advance Ledger"
                                                    >
                                                        <History size={12} /> Ledger
                                                    </button>

                                                    {/* Paysheet Link */}
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/manual-paysheet?employeeId=${emp._id}`)}
                                                        className="p-1 text-slate-400 hover:text-indigo-600 rounded transition"
                                                        title="Open 31-Day Manual Paysheet"
                                                    >
                                                        <FileSpreadsheet size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* ========================================================= */}
            {/* 1. MODAL: ISSUE / DISBURSE ADVANCE                       */}
            {/* ========================================================= */}
            {isDisburseModalOpen && selectedEmployeeForAdvance && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleUp">
                        {/* Modal Header */}
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <DollarSign size={16} className="text-emerald-600" />
                                    Issue Salary Advance
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {selectedEmployeeForAdvance.fullName} ({selectedEmployeeForAdvance.employeeCode})
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsDisburseModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-base font-bold p-1"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmitAdvance} className="p-5 space-y-4">
                            {/* Live Accrued Earnings & Advance Metrics Box */}
                            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl p-3.5 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600 dark:text-slate-300">Worked in Month so far:</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                                        {currentModalEmpRow?.work?.daysWorked || 0} Days ({currentModalEmpRow?.work?.hoursWorked || 0} hrs)
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600 dark:text-slate-300">Net Earned Wages:</span>
                                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                        Rs. {Number(currentModalEmpRow?.earnings?.netAccrued || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600 dark:text-slate-300">Already Taken Advances:</span>
                                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                                        -Rs. {Number(currentModalEmpRow?.advances?.periodAdvancesTotal || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                        Max Allowed Advance:
                                    </span>
                                    <span className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-300">
                                        Rs. {Number(modalAvailableAdvance).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Input: Advance Amount */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                                    Advance Amount to Issue (Rs.) *
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                                        Rs.
                                    </span>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        step="1"
                                        placeholder="Enter amount, e.g. 5000"
                                        value={advanceFormData.amount}
                                        onChange={(e) => setAdvanceFormData(f => ({ ...f, amount: e.target.value }))}
                                        className="w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                {/* Live remaining balance after advance */}
                                {modalTypedAmount > 0 && (
                                    <div className="mt-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-xs">
                                        <span className="text-slate-600 dark:text-slate-400">Remaining Balance after this advance:</span>
                                        <span className={`font-mono font-black ${
                                            modalTypedAmount > modalAvailableAdvance
                                                ? 'text-rose-600'
                                                : 'text-indigo-600 dark:text-indigo-400'
                                        }`}>
                                            Rs. {Number(modalRemainingAfterAdvance).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                {modalTypedAmount > modalAvailableAdvance && (
                                    <p className="text-[11px] text-amber-600 font-medium mt-1 flex items-center gap-1">
                                        <AlertCircle size={13} />
                                        Requested amount exceeds current available accrued wages. (Allowed as special advance).
                                    </p>
                                )}
                            </div>

                            {/* Date & Payment Method */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                                        Disbursement Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={advanceFormData.date}
                                        onChange={(e) => setAdvanceFormData(f => ({ ...f, date: e.target.value }))}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                                        Payment Method
                                    </label>
                                    <select
                                        value={advanceFormData.paymentMethod}
                                        onChange={(e) => setAdvanceFormData(f => ({ ...f, paymentMethod: e.target.value }))}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="Cash">Cash in Hand</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Cheque">Company Cheque</option>
                                        <option value="Petty Cash">Petty Cash</option>
                                    </select>
                                </div>
                            </div>

                            {/* Reason / Note */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                                    Notes / Reason
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Mid-month personal advance"
                                    value={advanceFormData.reason}
                                    onChange={(e) => setAdvanceFormData(f => ({ ...f, reason: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            {/* Modal Actions */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsDisburseModalOpen(false)}
                                    className="text-xs"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={disburseMutation.isPending}
                                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    {disburseMutation.isPending ? 'Processing...' : 'Confirm & Disburse Advance'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* 2. MODAL: EMPLOYEE ADVANCE LEDGER                         */}
            {/* ========================================================= */}
            {isLedgerModalOpen && selectedEmployeeForLedger && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scaleUp">
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <History size={16} className="text-indigo-600" />
                                    Advance Payment Ledger
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {selectedEmployeeForLedger.employee.fullName} • {selectedEmployeeForLedger.employee.employeeCode}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsLedgerModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-base font-bold p-1"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Summary Metrics */}
                        <div className="p-4 grid grid-cols-3 gap-3 bg-slate-50/40 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800">
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Total Advances Taken</p>
                                <p className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5">
                                    Rs. {Number(selectedEmployeeForLedger.advances.allTimeTotal || 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <p className="text-[10px] font-bold uppercase text-amber-600">Month Advances</p>
                                <p className="text-sm font-black font-mono text-amber-700 dark:text-amber-400 mt-0.5">
                                    Rs. {Number(selectedEmployeeForLedger.advances.periodAdvancesTotal || 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <p className="text-[10px] font-bold uppercase text-emerald-600">Available Advance</p>
                                <p className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                                    Rs. {Number(selectedEmployeeForLedger.advances.availableAdvance || 0).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Ledger Transactions Table */}
                        <div className="p-4 max-h-80 overflow-y-auto">
                            {selectedEmployeeForLedger.ledger.length === 0 ? (
                                <p className="text-center py-8 text-xs text-slate-400 font-medium">
                                    No advance transactions recorded for this employee yet.
                                </p>
                            ) : (
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[10.5px] uppercase font-bold text-slate-400">
                                            <th className="py-2">Date</th>
                                            <th className="py-2">Reason / Note</th>
                                            <th className="py-2 text-right">Amount</th>
                                            <th className="py-2 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {selectedEmployeeForLedger.ledger.map((tx) => (
                                            <tr key={tx._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                <td className="py-2.5 font-mono text-slate-800 dark:text-slate-200">
                                                    {new Date(tx.date).toLocaleDateString()}
                                                </td>
                                                <td className="py-2.5 text-slate-600 dark:text-slate-400">
                                                    {tx.reason || 'Salary advance'}
                                                </td>
                                                <td className="py-2.5 text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                                                    Rs. {Number(tx.amount).toLocaleString()}
                                                </td>
                                                <td className="py-2.5 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                        tx.isDeducted
                                                            ? 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                                                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                    }`}>
                                                        {tx.isDeducted ? 'Deducted in Payroll' : 'Active'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsLedgerModalOpen(false);
                                    navigate(`/manual-paysheet?employeeId=${selectedEmployeeForLedger.employee._id}`);
                                }}
                                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                            >
                                <FileSpreadsheet size={13} /> Open 31-Day Paysheet
                            </button>
                            <Button
                                variant="outline"
                                onClick={() => setIsLedgerModalOpen(false)}
                                className="text-xs"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
