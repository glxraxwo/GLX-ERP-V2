import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Users, UserCheck, UserX, Search, Filter, CheckCircle2, XCircle,
    AlertCircle, FileSpreadsheet, Edit, Phone, Mail, ArrowRight,
    RefreshCw, CheckSquare, Square, Shield, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { employeesApi, departmentsApi } from '../features/hr/hrApi';

const statusVariants = {
    active: { label: 'Active', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60', dot: 'bg-emerald-500' },
    inactive: { label: 'Inactive', bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60', dot: 'bg-rose-500' },
    on_leave: { label: 'On Leave', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60', dot: 'bg-amber-500' },
    probation: { label: 'Probation', bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60', dot: 'bg-blue-500' },
    suspended: { label: 'Suspended', bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60', dot: 'bg-purple-500' },
    terminated: { label: 'Terminated', bg: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700', dot: 'bg-slate-400' },
};

export default function EmployeeStatusPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'inactive' | 'other' | 'all'
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [selectedEmpIds, setSelectedEmpIds] = useState([]);

    // Fetch all employees (limit 1000 so status switches don't lose context)
    const { data: empData, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['all-employees-status-list'],
        queryFn: () => employeesApi.list({ limit: 1000 }),
    });

    const { data: deptsData } = useQuery({
        queryKey: ['departments-list'],
        queryFn: () => departmentsApi.list({ limit: 200 }),
    });

    const employees = useMemo(() => empData?.data || [], [empData]);
    const departments = useMemo(() => deptsData?.data || [], [deptsData]);

    // Mutation for updating employee status
    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, newStatus }) => {
            return employeesApi.update(id, { status: newStatus });
        },
        onSuccess: (res, variables) => {
            queryClient.invalidateQueries(['all-employees-status-list']);
            queryClient.invalidateQueries(['employees']);
            queryClient.invalidateQueries(['manual-attendance-daily']);
            queryClient.invalidateQueries(['all-employees-list']);
            
            const empName = res?.data?.firstName ? `${res.data.firstName} ${res.data.lastName || ''}`.trim() : 'Employee';
            const isNowActive = variables.newStatus === 'active';
            toast.success(
                `${empName} status updated to ${isNowActive ? 'ACTIVE' : 'INACTIVE'}!`,
                { icon: isNowActive ? '✅' : '⏸️' }
            );
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to update employee status');
        }
    });

    // Batch Status Update Mutation
    const batchUpdateMutation = useMutation({
        mutationFn: async ({ ids, newStatus }) => {
            const promises = ids.map(id => employeesApi.update(id, { status: newStatus }));
            return Promise.all(promises);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries(['all-employees-status-list']);
            queryClient.invalidateQueries(['employees']);
            queryClient.invalidateQueries(['manual-attendance-daily']);
            setSelectedEmpIds([]);
            toast.success(`Successfully set ${variables.ids.length} employees to ${variables.newStatus.toUpperCase()}!`);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to update batch status');
        }
    });

    // Quick 1-click toggle handler
    const handleToggleStatus = (emp) => {
        const currentStatus = emp.status || 'active';
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        updateStatusMutation.mutate({ id: emp._id, newStatus });
    };

    // Specific status select handler
    const handleSelectStatus = (emp, newStatus) => {
        if (!newStatus || newStatus === emp.status) return;
        updateStatusMutation.mutate({ id: emp._id, newStatus });
    };

    // Headcount statistics
    const stats = useMemo(() => {
        let active = 0;
        let inactive = 0;
        let other = 0;

        employees.forEach(e => {
            const st = e.status || 'active';
            if (st === 'active') active++;
            else if (st === 'inactive') inactive++;
            else other++;
        });

        return {
            total: employees.length,
            active,
            inactive,
            other
        };
    }, [employees]);

    // Filtered list
    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const st = emp.status || 'active';
            
            // Status Tab Filter
            if (statusFilter === 'active' && st !== 'active') return false;
            if (statusFilter === 'inactive' && st !== 'inactive') return false;
            if (statusFilter === 'other' && (st === 'active' || st === 'inactive')) return false;

            // Department Filter
            if (departmentFilter !== 'all') {
                const empDeptId = emp.departmentId?._id || emp.departmentId;
                if (String(empDeptId) !== String(departmentFilter)) return false;
            }

            // Search Term
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
                const code = (emp.employeeCode || emp.payrollNumber || '').toLowerCase();
                const phone = (emp.phone || emp.mobile || '').toLowerCase();
                const email = (emp.email || '').toLowerCase();
                const deptName = (emp.departmentId?.name || '').toLowerCase();
                const desigName = (emp.designationId?.name || '').toLowerCase();

                const matches = fullName.includes(term) || code.includes(term) ||
                    phone.includes(term) || email.includes(term) ||
                    deptName.includes(term) || desigName.includes(term);

                if (!matches) return false;
            }

            return true;
        });
    }, [employees, statusFilter, departmentFilter, searchTerm]);

    // Selection handlers
    const isAllSelected = filteredEmployees.length > 0 && selectedEmpIds.length === filteredEmployees.length;
    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedEmpIds([]);
        } else {
            setSelectedEmpIds(filteredEmployees.map(e => e._id));
        }
    };

    const toggleSelectRow = (id) => {
        setSelectedEmpIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    return (
        <div className="space-y-4">
            {/* Page Header */}
            <PageHeader
                title="Staff Status & Activation Manager"
                description="View all active and inactive employees, switch their attendance eligibility, and manage workforce availability with one click."
                actions={
                    <div className="flex items-center gap-2">
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
                            onClick={() => navigate('/employees/new')}
                            className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700"
                        >
                            + Add New Employee
                        </Button>
                    </div>
                }
            />

            {/* Top KPI Summary Headcount Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Total Staff */}
                <Card className="p-3.5 border-l-4 border-l-indigo-500 shadow-xs">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Staff</p>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Users size={18} />
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Full registered employee base</p>
                </Card>

                {/* 2. Active Staff */}
                <Card
                    onClick={() => setStatusFilter('active')}
                    className={`p-3.5 border-l-4 border-l-emerald-500 shadow-xs cursor-pointer transition hover:bg-emerald-50/30 ${
                        statusFilter === 'active' ? 'ring-2 ring-emerald-500/40 bg-emerald-50/20' : ''
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Active Staff
                            </p>
                            <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{stats.active}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <UserCheck size={18} />
                        </div>
                    </div>
                    <p className="text-[10px] text-emerald-600/80 font-medium mt-1">Eligible for Daily Attendance & Roster</p>
                </Card>

                {/* 3. Inactive Staff */}
                <Card
                    onClick={() => setStatusFilter('inactive')}
                    className={`p-3.5 border-l-4 border-l-rose-500 shadow-xs cursor-pointer transition hover:bg-rose-50/30 ${
                        statusFilter === 'inactive' ? 'ring-2 ring-rose-500/40 bg-rose-50/20' : ''
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10.5px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                                Inactive Staff
                            </p>
                            <h3 className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-0.5">{stats.inactive}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                            <UserX size={18} />
                        </div>
                    </div>
                    <p className="text-[10px] text-rose-600/80 font-medium mt-1">Unticked by default in daily attendance</p>
                </Card>

                {/* 4. On Leave / Other */}
                <Card
                    onClick={() => setStatusFilter('other')}
                    className={`p-3.5 border-l-4 border-l-amber-500 shadow-xs cursor-pointer transition hover:bg-amber-50/30 ${
                        statusFilter === 'other' ? 'ring-2 ring-amber-500/40 bg-amber-50/20' : ''
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10.5px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                Leave / Other
                            </p>
                            <h3 className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-0.5">{stats.other}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <AlertCircle size={18} />
                        </div>
                    </div>
                    <p className="text-[10px] text-amber-600/80 font-medium mt-1">Probation, Suspended, or On Leave</p>
                </Card>
            </div>

            {/* Main Interactive Table Card */}
            <Card className="shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                {/* Search & Filter Bar */}
                <div className="p-3 sm:p-4 bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    
                    {/* Status Filter Segmented Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                statusFilter === 'all'
                                    ? 'bg-slate-900 text-white shadow-2xs dark:bg-white dark:text-slate-900'
                                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            }`}
                        >
                            <span>All Staff</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200/60 dark:bg-slate-700 font-mono">
                                {stats.total}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('active')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                statusFilter === 'active'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200 dark:bg-slate-800 dark:text-emerald-400 dark:border-emerald-900/60'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>Active</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950/80 font-mono">
                                {stats.active}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('inactive')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                statusFilter === 'inactive'
                                    ? 'bg-rose-600 text-white shadow-2xs'
                                    : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200 dark:bg-slate-800 dark:text-rose-400 dark:border-rose-900/60'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                            <span>Inactive</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-100 dark:bg-rose-950/80 font-mono">
                                {stats.inactive}
                            </span>
                        </button>

                        {stats.other > 0 && (
                            <button
                                type="button"
                                onClick={() => setStatusFilter('other')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                    statusFilter === 'other'
                                        ? 'bg-amber-600 text-white shadow-2xs'
                                        : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200 dark:bg-slate-800 dark:text-amber-400'
                                }`}
                            >
                                <span>Other ({stats.other})</span>
                            </button>
                        )}
                    </div>

                    {/* Search & Department Selector */}
                    <div className="flex items-center gap-2 flex-1 md:max-w-md ml-auto">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, payroll code, phone..."
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

                {/* Batch Actions Bar (when rows are selected) */}
                {selectedEmpIds.length > 0 && (
                    <div className="px-4 py-2 bg-indigo-50/90 dark:bg-indigo-950/60 border-b border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between flex-wrap gap-2 animate-fadeIn">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                                {selectedEmpIds.length} employee{selectedEmpIds.length > 1 ? 's' : ''} selected
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelectedEmpIds([])}
                                className="text-[11px] text-indigo-600 hover:underline font-semibold"
                            >
                                Clear
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="primary"
                                onClick={() => batchUpdateMutation.mutate({ ids: selectedEmpIds, newStatus: 'active' })}
                                disabled={batchUpdateMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                            >
                                <CheckCircle2 size={13} className="mr-1" />
                                Activate All Selected ({selectedEmpIds.length})
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => batchUpdateMutation.mutate({ ids: selectedEmpIds, newStatus: 'inactive' })}
                                disabled={batchUpdateMutation.isPending}
                                className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold"
                            >
                                <XCircle size={13} className="mr-1" />
                                Deactivate All Selected
                            </Button>
                        </div>
                    </div>
                )}

                {/* Table Content */}
                {isLoading ? (
                    <div className="py-20 text-center text-slate-400 font-semibold text-xs flex flex-col items-center gap-2">
                        <RefreshCw size={24} className="animate-spin text-indigo-500" />
                        <span>Loading employee status directory...</span>
                    </div>
                ) : filteredEmployees.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No matching employees found"
                        description={searchTerm ? `No results for "${searchTerm}" under selected filters` : 'Try changing status or department filters.'}
                        action={
                            <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setDepartmentFilter('all'); }}>
                                Reset Filters
                            </Button>
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                                    <th className="py-2.5 px-3 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            onChange={toggleSelectAll}
                                            className="w-3.5 h-3.5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                                            title="Select All"
                                        />
                                    </th>
                                    <th className="py-2.5 px-3">Employee Name</th>
                                    <th className="py-2.5 px-3">Code / Payroll</th>
                                    <th className="py-2.5 px-3">Department & Role</th>
                                    <th className="py-2.5 px-3">Rate / Salary</th>
                                    <th className="py-2.5 px-3 min-w-[220px]">Status & Quick Toggle</th>
                                    <th className="py-2.5 px-3 text-right">Quick Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                                {filteredEmployees.map((emp) => {
                                    const isEmpActive = (emp.status || 'active') === 'active';
                                    const currentStatus = emp.status || 'active';
                                    const variant = statusVariants[currentStatus] || statusVariants.active;
                                    const isSelected = selectedEmpIds.includes(emp._id);

                                    return (
                                        <tr
                                            key={emp._id}
                                            className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                                                !isEmpActive ? 'bg-slate-50/30 dark:bg-slate-900/20 opacity-80' : ''
                                            } ${isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/30' : ''}`}
                                        >
                                            {/* 1. Checkbox */}
                                            <td className="py-3 px-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectRow(emp._id)}
                                                    className="w-3.5 h-3.5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                                                />
                                            </td>

                                            {/* 2. Employee Name with Avatar */}
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
                                                        <p className="font-bold text-slate-900 dark:text-white truncate">
                                                            {emp.firstName} {emp.lastName}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                                            {emp.phone && (
                                                                <span className="flex items-center gap-0.5">
                                                                    <Phone size={10} /> {emp.phone}
                                                                </span>
                                                            )}
                                                            {emp.email && (
                                                                <span className="truncate max-w-[140px] flex items-center gap-0.5">
                                                                    <Mail size={10} /> {emp.email}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 3. Employee Code / Payroll No */}
                                            <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                                {emp.employeeCode || emp.payrollNumber || '—'}
                                            </td>

                                            {/* 4. Department & Designation */}
                                            <td className="py-3 px-3">
                                                <p className="font-medium text-slate-800 dark:text-slate-200">
                                                    {emp.departmentId?.name || emp.department || 'Operations'}
                                                </p>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                                    {emp.designationId?.name || emp.designation || 'Staff'}
                                                </p>
                                            </td>

                                            {/* 5. Rate / Salary */}
                                            <td className="py-3 px-3 font-mono">
                                                {emp.hourlyRate || emp.labourRate ? (
                                                    <span className="font-bold text-slate-900 dark:text-white">
                                                        Rs. {Number(emp.hourlyRate || emp.labourRate).toFixed(0)}/hr
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600 dark:text-slate-400">
                                                        Rs. {Number(emp.monthlySalary || emp.basicSalary || 0).toLocaleString()}
                                                    </span>
                                                )}
                                                {emp.minimumSalary > 0 && (
                                                    <p className="text-[9.5px] text-indigo-600 dark:text-indigo-400 font-sans">
                                                        Min: Rs. {Number(emp.minimumSalary).toLocaleString()}
                                                    </p>
                                                )}
                                            </td>

                                            {/* 6. STATUS & QUICK TOGGLE SWITCH (Interactive!) */}
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-3">
                                                    {/* iOS-Style Toggle Switch for 1-Click Active / Inactive */}
                                                    <button
                                                        type="button"
                                                        role="switch"
                                                        aria-checked={isEmpActive}
                                                        onClick={() => handleToggleStatus(emp)}
                                                        disabled={updateStatusMutation.isPending}
                                                        title={`Click to mark as ${isEmpActive ? 'INACTIVE' : 'ACTIVE'}`}
                                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                                                            isEmpActive ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                                                        }`}
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                                                isEmpActive ? 'translate-x-5' : 'translate-x-0'
                                                            }`}
                                                        />
                                                    </button>

                                                    {/* Quick Status Dropdown Selector */}
                                                    <div className="flex items-center gap-1.5">
                                                        <select
                                                            value={currentStatus}
                                                            onChange={(e) => handleSelectStatus(emp, e.target.value)}
                                                            disabled={updateStatusMutation.isPending}
                                                            className={`px-2 py-1 rounded-md text-[11px] font-bold border uppercase tracking-wider outline-none cursor-pointer transition ${variant.bg}`}
                                                        >
                                                            <option value="active">Active</option>
                                                            <option value="inactive">Inactive</option>
                                                            <option value="on_leave">On Leave</option>
                                                            <option value="probation">Probation</option>
                                                            <option value="suspended">Suspended</option>
                                                            <option value="terminated">Terminated</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 7. Quick Actions */}
                                            <td className="py-3 px-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/manual-paysheet?employeeId=${emp._id}`)}
                                                        className="px-2 py-1 text-[11px] font-bold bg-[#BAC8E8]/40 text-[#131943] hover:bg-[#BAC8E8] rounded-md transition flex items-center gap-1 border border-[#BAC8E8]"
                                                        title="Open Manual Paysheet"
                                                    >
                                                        <FileSpreadsheet size={12} /> Paysheet
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/employees/${emp._id}/edit`)}
                                                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded transition"
                                                        title="Edit Employee Profile"
                                                    >
                                                        <Edit size={14} />
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
        </div>
    );
}
