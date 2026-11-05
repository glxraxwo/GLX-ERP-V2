import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Plus, Search, Eye, Users, Mail, Phone, Receipt, Edit, Trash2,
    Calendar, DollarSign, Clock, ShieldAlert, Award, Building2,
    Calculator, Plane, BadgeCheck, FileSpreadsheet, FileText, ChevronRight, Sliders, LayoutGrid
} from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useEmployees, useDepartments, useDeleteEmployee } from '../features/hr/useHr';

const statusVariant = {
    active: 'success', on_leave: 'warning', probation: 'info',
    suspended: 'danger', terminated: 'default', resigned: 'default', retired: 'default',
};

// Active HR Modules with compact layout & distinct Rainbow background gradients
const hrHubModules = [
    {
        title: 'Monthly Payslips',
        path: '/hr/monthly-payslips',
        icon: FileText,
        badge: 'Fixed Salary Hub',
        theme: {
            cardBg: 'bg-gradient-to-br from-indigo-50/90 to-purple-100/70 border-indigo-200/90 hover:border-indigo-400 hover:from-indigo-100/90 hover:to-purple-200/70 shadow-xs shadow-indigo-500/5',
            iconBox: 'bg-white text-indigo-600 border-indigo-200 shadow-2xs group-hover:bg-indigo-600 group-hover:text-white',
            badge: 'bg-indigo-600/10 text-indigo-800 border border-indigo-300/70 font-bold',
            title: 'text-indigo-950 group-hover:text-indigo-700',
            arrow: 'text-indigo-400 group-hover:text-indigo-700'
        }
    },
    {
        title: 'Manual Paysheet',
        path: '/manual-paysheet',
        icon: FileSpreadsheet,
        badge: 'Excel Sheet',
        theme: {
            cardBg: 'bg-gradient-to-br from-blue-50/90 to-indigo-100/70 border-blue-200/90 hover:border-blue-400 hover:from-blue-100/90 hover:to-indigo-200/70 shadow-xs shadow-blue-500/5',
            iconBox: 'bg-white text-blue-600 border-blue-200 shadow-2xs group-hover:bg-blue-600 group-hover:text-white',
            badge: 'bg-blue-600/10 text-blue-800 border border-blue-300/70 font-bold',
            title: 'text-blue-950 group-hover:text-blue-700',
            arrow: 'text-blue-400 group-hover:text-blue-700'
        }
    },
    {
        title: 'Active Day In/Out',
        path: '/hr/daily-manual-attendance',
        icon: Calendar,
        badge: 'Daily Roster',
        theme: {
            cardBg: 'bg-gradient-to-br from-emerald-50/90 to-teal-100/70 border-emerald-200/90 hover:border-emerald-400 hover:from-emerald-100/90 hover:to-teal-200/70 shadow-xs shadow-emerald-500/5',
            iconBox: 'bg-white text-emerald-600 border-emerald-200 shadow-2xs group-hover:bg-emerald-600 group-hover:text-white',
            badge: 'bg-emerald-600/10 text-emerald-800 border border-emerald-300/70 font-bold',
            title: 'text-emerald-950 group-hover:text-emerald-700',
            arrow: 'text-emerald-400 group-hover:text-emerald-700'
        }
    },
    {
        title: 'Leave Management',
        path: '/leaves',
        icon: Plane,
        badge: 'Leaves',
        theme: {
            cardBg: 'bg-gradient-to-br from-amber-50/90 to-yellow-100/70 border-amber-200/90 hover:border-amber-400 hover:from-amber-100/90 hover:to-yellow-200/70 shadow-xs shadow-amber-500/5',
            iconBox: 'bg-white text-amber-600 border-amber-200 shadow-2xs group-hover:bg-amber-600 group-hover:text-white',
            badge: 'bg-amber-600/10 text-amber-900 border border-amber-300/70 font-bold',
            title: 'text-amber-950 group-hover:text-amber-800',
            arrow: 'text-amber-400 group-hover:text-amber-800'
        }
    },
    {
        title: 'Salary Advances',
        path: '/hr/salary-advances',
        icon: BadgeCheck,
        badge: 'Advances',
        theme: {
            cardBg: 'bg-gradient-to-br from-rose-50/90 to-pink-100/70 border-rose-200/90 hover:border-rose-400 hover:from-rose-100/90 hover:to-pink-200/70 shadow-xs shadow-rose-500/5',
            iconBox: 'bg-white text-rose-600 border-rose-200 shadow-2xs group-hover:bg-rose-600 group-hover:text-white',
            badge: 'bg-rose-600/10 text-rose-800 border border-rose-300/70 font-bold',
            title: 'text-rose-950 group-hover:text-rose-700',
            arrow: 'text-rose-400 group-hover:text-rose-700'
        }
    },
    {
        title: 'Departments & Roles',
        path: '/departments',
        icon: Building2,
        badge: 'Organization',
        theme: {
            cardBg: 'bg-gradient-to-br from-fuchsia-50/90 to-pink-100/70 border-fuchsia-200/90 hover:border-fuchsia-400 hover:from-fuchsia-100/90 hover:to-pink-200/70 shadow-xs shadow-fuchsia-500/5',
            iconBox: 'bg-white text-fuchsia-600 border-fuchsia-200 shadow-2xs group-hover:bg-fuchsia-600 group-hover:text-white',
            badge: 'bg-fuchsia-600/10 text-fuchsia-800 border border-fuchsia-300/70 font-bold',
            title: 'text-fuchsia-950 group-hover:text-fuchsia-700',
            arrow: 'text-fuchsia-400 group-hover:text-fuchsia-700'
        }
    },
    {
        title: 'Designations',
        path: '/designations',
        icon: Award,
        badge: 'Designations',
        theme: {
            cardBg: 'bg-gradient-to-br from-orange-50/90 to-amber-100/70 border-orange-200/90 hover:border-orange-400 hover:from-orange-100/90 hover:to-amber-200/70 shadow-xs shadow-orange-500/5',
            iconBox: 'bg-white text-orange-600 border-orange-200 shadow-2xs group-hover:bg-orange-600 group-hover:text-white',
            badge: 'bg-orange-600/10 text-orange-800 border border-orange-300/70 font-bold',
            title: 'text-orange-950 group-hover:text-orange-700',
            arrow: 'text-orange-400 group-hover:text-orange-700'
        }
    },
    {
        title: 'Leave Structures',
        path: '/leave-structures',
        icon: Calendar,
        badge: 'Entitlements',
        theme: {
            cardBg: 'bg-gradient-to-br from-lime-50/90 to-emerald-100/70 border-lime-200/90 hover:border-lime-400 hover:from-lime-100/90 hover:to-emerald-200/70 shadow-xs shadow-lime-500/5',
            iconBox: 'bg-white text-lime-700 border-lime-200 shadow-2xs group-hover:bg-lime-600 group-hover:text-white',
            badge: 'bg-lime-600/10 text-lime-800 border border-lime-300/70 font-bold',
            title: 'text-lime-950 group-hover:text-lime-800',
            arrow: 'text-lime-400 group-hover:text-lime-800'
        }
    }
];

export default function EmployeesPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({ search: '', departmentId: '', status: 'active', page: 1, limit: 20 });
    const [deletingEmp, setDeletingEmp] = useState(null);
    const [isHubExpanded, setIsHubExpanded] = useState(true);

    const { data, isLoading } = useEmployees(filters);
    const { data: deptsData } = useDepartments();
    const deleteMutation = useDeleteEmployee();

    const employees = data?.data || [];
    const depts = deptsData?.data || [];
    const deptOptions = depts.map((d) => ({ value: d._id, label: d.name }));

    const handleDelete = async () => {
        if (!deletingEmp) return;
        await deleteMutation.mutateAsync({ id: deletingEmp._id, permanent: true });
        setDeletingEmp(null);
    };

    const columns = [
        { key: 'employeeCode', label: 'ID', width: '100px', render: (r) => <span className="font-mono text-xs font-bold text-slate-800">{r.employeeCode}</span> },
        {
            key: 'name', label: 'Name',
            render: (r) => (
                <div>
                    <p className="font-semibold text-slate-900">{r.firstName} {r.lastName}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
                        {r.email && <span className="inline-flex items-center gap-1"><Mail size={11} className="text-gray-400" />{r.email}</span>}
                        {r.phone && <span className="inline-flex items-center gap-1"><Phone size={11} className="text-gray-400" />{r.phone}</span>}
                    </p>
                </div>
            ),
        },
        { key: 'department', label: 'Department', render: (r) => <span className="text-xs text-slate-700 font-medium">{r.departmentId?.name || '—'}</span> },
        { key: 'designation', label: 'Designation', render: (r) => <span className="text-xs text-slate-700 font-medium">{r.designationId?.name || '—'}</span> },
        { key: 'hourlyRate', label: 'Hourly Rate', render: (r) => <span className="font-mono text-xs font-bold text-slate-800">Rs. {Number(r.hourlyRate || r.labourRate || 260).toFixed(0)}</span> },
        { key: 'employmentType', label: 'Type', render: (r) => <Badge>{r.employmentType?.replace(/_/g, ' ')}</Badge> },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant[r.status]}>{r.status?.replace(/_/g, ' ')}</Badge> },
        {
            key: 'actions', label: 'Actions', width: '250px', render: (r) => (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Direct link to Manual Payment Record Sheet */}
                    <button
                        onClick={() => navigate(`/manual-paysheet?employeeId=${r._id}`)}
                        className="px-2 py-1 text-xs font-bold bg-[#BAC8E8]/40 text-[#131943] hover:bg-[#BAC8E8] rounded-md transition flex items-center gap-1 border border-[#BAC8E8]"
                        title="Open 31-Day Manual Payment Record Sheet for this employee"
                    >
                        <FileSpreadsheet size={13} className="text-indigo-900" /> Manual Sheet
                    </button>

                    <button
                        onClick={() => navigate(`/employees/${r._id}/payment-sheet`)}
                        className="px-2 py-1 text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-md transition flex items-center gap-1 border border-emerald-200"
                        title="View Payment History & Payslips"
                    >
                        <Receipt size={12} className="text-emerald-700" /> History
                    </button>
                    
                    <button
                        onClick={() => navigate(`/employees/${r._id}/edit`)}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                        title="Edit Employee"
                    >
                        <Edit size={14} />
                    </button>
                    <button
                        onClick={() => navigate(`/employees/${r._id}`)}
                        className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                        title="View Profile"
                    >
                        <Eye size={15} />
                    </button>
                    <button
                        onClick={() => setDeletingEmp(r)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete Employee"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )
        },
    ];

    return (
        <div className="space-y-4">
            
            {/* Top Page Header */}
            <PageHeader 
                title="Employee Master & HR Operations Hub" 
                description="Comprehensive directory and centralized command center for all employee operations, paysheets, and attendance."
                actions={
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="secondary" 
                            onClick={() => setIsHubExpanded(!isHubExpanded)}
                            className="text-xs font-semibold"
                        >
                            <LayoutGrid size={14} className="mr-1.5" />
                            {isHubExpanded ? 'Hide HR Hub' : 'Show HR Hub'}
                        </Button>
                        <Button variant="primary" onClick={() => navigate('/employees/new')}>
                            <Plus size={16} className="mr-1.5" /> Add Employee
                        </Button>
                    </div>
                } 
            />

            {/* Centralized HR Operations Hub Cards (Navigates to all employee modules) */}
            {isHubExpanded && (
                <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-3 shadow-2xs mb-3">
                    <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-slate-200/80">
                        <div className="flex items-center gap-1.5">
                            <Sliders size={14} className="text-slate-600" />
                            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                                HR Operations Hub
                            </h2>
                        </div>
                        <span className="text-[10.5px] font-medium text-slate-400">
                            {hrHubModules.length} Direct Modules
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {hrHubModules.map((mod) => {
                            const IconComponent = mod.icon;
                            return (
                                <Link
                                    key={mod.title}
                                    to={mod.path}
                                    className={`p-2 border rounded-xl transition-all group flex flex-col justify-between min-h-[64px] ${mod.theme.cardBg}`}
                                >
                                    <div className="flex items-center justify-between gap-1">
                                        <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${mod.theme.iconBox}`}>
                                            <IconComponent size={12} />
                                        </div>
                                        <span className={`text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${mod.theme.badge}`}>
                                            {mod.badge}
                                        </span>
                                    </div>
                                    <div className="mt-1.5 flex items-center justify-between">
                                        <h3 className={`text-[11px] font-bold ${mod.theme.title} transition truncate`}>
                                            {mod.title}
                                        </h3>
                                        <ChevronRight size={11} className={`transition shrink-0 ml-1 ${mod.theme.arrow}`} />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}



            {/* Main Employee Table Card */}
            <Card>
                <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex flex-wrap gap-2 sm:gap-3">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                        <input 
                            type="text" 
                            placeholder="Search by name, employee code, email, phone..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-[#132238] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} 
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <Select 
                            placeholder="All Departments" 
                            options={deptOptions}
                            value={filters.departmentId}
                            onChange={(e) => setFilters((f) => ({ ...f, departmentId: e.target.value, page: 1 }))} 
                        />
                    </div>
                    <div className="w-full sm:w-40">
                        <Select 
                            placeholder="All Statuses"
                            options={[
                                { value: 'active', label: 'Active' },
                                { value: 'on_leave', label: 'On Leave' },
                                { value: 'probation', label: 'Probation' },
                                { value: 'suspended', label: 'Suspended' },
                                { value: 'terminated', label: 'Terminated' },
                                { value: 'resigned', label: 'Resigned' },
                            ]}
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))} 
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500 font-semibold text-xs">Loading employee directory...</div>
                ) : employees.length === 0 ? (
                    <EmptyState 
                        icon={Users} 
                        title="No employees found" 
                        description="Add your first employee to get started"
                        action={<Button variant="primary" onClick={() => navigate('/employees/new')}>Add Employee</Button>} 
                    />
                ) : (
                    <>
                        <Table columns={columns} data={employees} onRowClick={(r) => navigate(`/employees/${r._id}`)} />
                        <Pagination 
                            page={filters.page} 
                            totalPages={data?.totalPages || 1} 
                            total={data?.total || employees.length}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} 
                        />
                    </>
                )}
            </Card>

            <ConfirmDialog
                isOpen={Boolean(deletingEmp)}
                onClose={() => setDeletingEmp(null)}
                onConfirm={handleDelete}
                title="Delete Employee"
                message={`Are you sure you want to delete ${deletingEmp?.firstName} ${deletingEmp?.lastName} (${deletingEmp?.employeeCode})? This action cannot be undone.`}
                confirmText="Delete Employee"
                variant="danger"
                loading={deleteMutation.isPending}
            />
        </div>
    );
}
