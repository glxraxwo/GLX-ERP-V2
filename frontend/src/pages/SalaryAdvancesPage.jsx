import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    DollarSign, 
    Plus, 
    Search, 
    Filter, 
    CheckCircle2, 
    XCircle, 
    Trash2, 
    FileText, 
    RefreshCw, 
    ArrowUpRight,
    Calendar,
    Users,
    Clock,
    Check,
    X,
    Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSalaryAdvances, useAdvanceActions } from '../features/hr/useHr';
import RecordAdvanceModal from '../components/RecordAdvanceModal';

export default function SalaryAdvancesPage() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
    const [selectedEmployeeForModal, setSelectedEmployeeForModal] = useState(null);

    const { data: advancesData, isLoading, refetch } = useSalaryAdvances();
    const advanceActions = useAdvanceActions();

    const advances = advancesData?.data || [];

    // Filter logic
    const filteredAdvances = useMemo(() => {
        return advances.filter(adv => {
            const empName = adv.employeeId 
                ? `${adv.employeeId.firstName || ''} ${adv.employeeId.lastName || ''}`.toLowerCase()
                : '';
            const empCode = (adv.employeeId?.employeeCode || '').toLowerCase();
            const reason = (adv.reason || '').toLowerCase();
            const term = searchTerm.toLowerCase();

            const matchesSearch = !term || empName.includes(term) || empCode.includes(term) || reason.includes(term);

            const matchesStatus = statusFilter === 'all' 
                ? true 
                : (statusFilter === 'pending' ? adv.status === 'pending' : (adv.status === statusFilter || (statusFilter === 'approved' && adv.status === 'paid')));

            return matchesSearch && matchesStatus;
        });
    }, [advances, searchTerm, statusFilter]);

    // KPI Metrics calculation
    const metrics = useMemo(() => {
        let totalIssued = 0;
        let totalApproved = 0;
        let pendingCount = 0;
        let approvedCount = 0;
        let rejectedCount = 0;
        const employeeIds = new Set();

        advances.forEach(adv => {
            const amt = Number(adv.amount) || 0;
            totalIssued += amt;
            if (adv.status === 'approved' || adv.status === 'paid') {
                totalApproved += amt;
                approvedCount += 1;
            } else if (adv.status === 'pending') {
                pendingCount += 1;
            } else if (adv.status === 'rejected') {
                rejectedCount += 1;
            }
            if (adv.employeeId?._id) {
                employeeIds.add(adv.employeeId._id);
            }
        });

        return {
            totalIssued,
            totalApproved,
            pendingCount,
            approvedCount,
            rejectedCount,
            uniqueEmployees: employeeIds.size
        };
    }, [advances]);

    const handleApprove = async (advId) => {
        try {
            await advanceActions.approve.mutateAsync({ id: advId });
            refetch();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDecline = async (advId) => {
        const reason = window.prompt('Please enter the reason for rejection:');
        if (reason === null) return;
        try {
            await advanceActions.decline.mutateAsync({ id: advId, rejectedReason: reason });
            refetch();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (advId) => {
        if (!window.confirm('Are you sure you want to delete this salary advance record?')) return;
        try {
            await advanceActions.delete.mutateAsync(advId);
            refetch();
        } catch (err) {
            console.error(err);
        }
    };

    const formatDateDisplay = (dateVal) => {
        if (!dateVal) return '-';
        const d = new Date(dateVal);
        return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
    };

    return (
        <div className="space-y-5 pb-12">
            
            {/* Top Header Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-extrabold tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase">
                            HR & Payroll Management
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-medium text-slate-500">
                            Automatic Paysheet Integration
                        </span>
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Salary Advances Registry
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Record employee salary advances, track approvals, and auto-sync deductions into the Manual Payment Sheet
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={() => refetch()}
                        className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 flex items-center gap-1.5 transition"
                        title="Refresh advance data"
                    >
                        <RefreshCw size={14} className="text-slate-500" />
                        Refresh
                    </button>

                    <button
                        onClick={() => {
                            setSelectedEmployeeForModal(null);
                            setIsRecordModalOpen(true);
                        }}
                        className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm flex items-center gap-2 transition"
                    >
                        <Plus size={15} />
                        Issue Salary Advance
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards (Zero Emojis) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Total Issued */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Advances</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <DollarSign size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 font-mono mt-2">
                        Rs. {metrics.totalIssued.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 font-medium">
                        {advances.length} total advances recorded
                    </div>
                </div>

                {/* Approved / Recoverable */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved & Syncing</span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-indigo-950 font-mono mt-2">
                        Rs. {metrics.totalApproved.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </div>
                    <div className="text-[11px] text-indigo-600 mt-1 font-medium">
                        {metrics.approvedCount} advances deducting in paysheets
                    </div>
                </div>

                {/* Pending Approvals */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Approval</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <Clock size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-amber-900 font-mono mt-2">
                        {metrics.pendingCount}
                    </div>
                    <div className="text-[11px] text-amber-700 mt-1 font-medium">
                        Awaiting administrative sign-off
                    </div>
                </div>

                {/* Employees Count */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Employees</span>
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                            <Users size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 font-mono mt-2">
                        {metrics.uniqueEmployees}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 font-medium">
                        Employees with advance records
                    </div>
                </div>

            </div>

            {/* Filter & Search Control Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
                
                {/* Status Tabs */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                        { id: 'all', label: 'All Advances', count: advances.length },
                        { id: 'approved', label: 'Approved & Paid', count: metrics.approvedCount },
                        { id: 'pending', label: 'Pending Approval', count: metrics.pendingCount },
                        { id: 'rejected', label: 'Rejected', count: metrics.rejectedCount }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                                statusFilter === tab.id
                                    ? 'bg-[#131943] text-white shadow-xs'
                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Search Input */}
                <div className="relative min-w-[240px] flex-1 max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search employee, ID, or purpose..."
                        className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                </div>

            </div>

            {/* Main Advances Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50/90 text-slate-700 uppercase tracking-wider font-bold border-b border-slate-200">
                            <tr>
                                <th className="py-3 px-4">Date</th>
                                <th className="py-3 px-4">Employee</th>
                                <th className="py-3 px-4 text-right">Advance Amount</th>
                                <th className="py-3 px-4">Purpose / Remarks</th>
                                <th className="py-3 px-4 text-center">Status</th>
                                <th className="py-3 px-4">Approved By</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7" className="py-8 text-center text-slate-400 text-xs">
                                        Loading salary advances...
                                    </td>
                                </tr>
                            ) : filteredAdvances.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-12 text-center">
                                        <div className="max-w-xs mx-auto text-center space-y-2">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                                                <DollarSign size={20} />
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-sm">No advances found</h3>
                                            <p className="text-slate-400 text-xs">
                                                {searchTerm ? 'No results matching your search.' : 'No salary advances recorded for the selected filter.'}
                                            </p>
                                            <button
                                                onClick={() => setIsRecordModalOpen(true)}
                                                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 transition"
                                            >
                                                <Plus size={13} />
                                                Issue First Advance
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredAdvances.map((adv) => {
                                    const emp = adv.employeeId;
                                    const empName = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : 'Unknown Employee';
                                    const isApproved = adv.status === 'approved' || adv.status === 'paid';
                                    const isPending = adv.status === 'pending';

                                    return (
                                        <tr key={adv._id} className="hover:bg-slate-50/80 transition-colors">
                                            
                                            {/* Date */}
                                            <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                                                {formatDateDisplay(adv.date)}
                                            </td>

                                            {/* Employee */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                                                        {(empName[0] || 'E')}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 hover:text-indigo-600 transition">
                                                            {empName}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 font-mono">
                                                            {emp?.employeeCode || 'EMP-NA'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Advance Amount */}
                                            <td className="py-3 px-4 text-right">
                                                <span className="font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                                                    Rs. {Number(adv.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>

                                            {/* Purpose */}
                                            <td className="py-3 px-4 text-slate-600 max-w-[220px] truncate" title={adv.reason}>
                                                {adv.reason || 'General Salary Advance'}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-3 px-4 text-center">
                                                {isApproved ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                                        <CheckCircle2 size={12} />
                                                        Approved / Paid
                                                    </span>
                                                ) : isPending ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                                        <Clock size={12} />
                                                        Pending
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                                        <XCircle size={12} />
                                                        Rejected
                                                    </span>
                                                )}
                                            </td>

                                            {/* Approved By */}
                                            <td className="py-3 px-4 text-slate-500 text-[11px]">
                                                {adv.approvedBy ? (
                                                    <span>{adv.approvedBy.firstName} {adv.approvedBy.lastName}</span>
                                                ) : (
                                                    <span className="text-slate-400 italic">-</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    
                                                    {/* Quick View Sheet */}
                                                    {emp?._id && (
                                                        <button
                                                            onClick={() => navigate(`/manual-paysheet?employeeId=${emp._id}`)}
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition"
                                                            title="Open Employee Payment Record Sheet"
                                                        >
                                                            <ArrowUpRight size={14} />
                                                        </button>
                                                    )}

                                                    {/* Pending Approvals */}
                                                    {isPending && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(adv._id)}
                                                                className="px-2 py-1 rounded-md text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
                                                                title="Approve advance"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleDecline(adv._id)}
                                                                className="px-2 py-1 rounded-md text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                                                                title="Decline advance"
                                                            >
                                                                Decline
                                                            </button>
                                                        </>
                                                    )}

                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => handleDelete(adv._id)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                                        title="Delete advance record"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>

                                                </div>
                                            </td>

                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Record Advance Modal */}
            <RecordAdvanceModal
                isOpen={isRecordModalOpen}
                onClose={() => {
                    setIsRecordModalOpen(false);
                    setSelectedEmployeeForModal(null);
                }}
                defaultEmployeeId={selectedEmployeeForModal?.id || ''}
                defaultEmployeeName={selectedEmployeeForModal?.name || ''}
                onSuccess={() => refetch()}
            />

        </div>
    );
}
