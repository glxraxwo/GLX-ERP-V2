import { useState, useEffect } from 'react';
import { 
    X, 
    Calendar, 
    DollarSign, 
    User, 
    FileText, 
    CreditCard, 
    Check, 
    AlertCircle, 
    Search,
    ShieldCheck
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { advancesApi } from '../features/hr/hrApi';
import { useEmployees } from '../features/hr/useHr';

export default function RecordAdvanceModal({
    isOpen,
    onClose,
    defaultEmployeeId = '',
    defaultEmployeeName = '',
    defaultDate = '',
    onSuccess
}) {
    const qc = useQueryClient();
    const { data: employeesData } = useEmployees({ status: 'active', limit: 1000 });
    const employees = employeesData?.data || [];

    const getTodayStr = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [employeeId, setEmployeeId] = useState(defaultEmployeeId);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [date, setDate] = useState(defaultDate || getTodayStr());
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [reason, setReason] = useState('Monthly Salary Advance');
    const [autoApprove, setAutoApprove] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setEmployeeId(defaultEmployeeId || '');
            setDate(defaultDate || getTodayStr());
            setAmount('');
            setReason('Monthly Salary Advance');
            setPaymentMethod('Cash');
            setAutoApprove(true);
            setSearchTerm('');
            setIsDropdownOpen(false);
        }
    }, [isOpen, defaultEmployeeId, defaultDate]);

    if (!isOpen) return null;

    const selectedEmployee = employees.find(e => (e._id === employeeId || e.id === employeeId));

    const filteredEmployees = employees.filter(emp => {
        const name = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
        const code = (emp.employeeCode || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        return name.includes(term) || code.includes(term);
    });

    const handleQuickAmount = (val) => {
        setAmount(String(val));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = Number(amount);
        if (!employeeId) {
            toast.error('Please select an employee');
            return;
        }
        if (!numAmount || numAmount <= 0) {
            toast.error('Please enter a valid advance amount');
            return;
        }
        if (!date) {
            toast.error('Please select an advance date');
            return;
        }

        setIsSubmitting(true);
        try {
            await advancesApi.create({
                employeeId,
                date: new Date(date + 'T12:00:00'),
                amount: numAmount,
                reason: reason ? `${reason} (${paymentMethod})` : `Salary Advance (${paymentMethod})`,
                status: autoApprove ? 'approved' : 'pending',
                isPaid: autoApprove
            });

            // Invalidate all related queries
            qc.invalidateQueries({ queryKey: ['employee-payment-sheet'] });
            qc.invalidateQueries({ queryKey: ['salaryAdvances'] });
            qc.invalidateQueries({ queryKey: ['myAdvanceLedger'] });
            qc.invalidateQueries({ queryKey: ['dailyManualAttendance'] });

            const empName = selectedEmployee 
                ? `${selectedEmployee.firstName || ''} ${selectedEmployee.lastName || ''}`.trim()
                : (defaultEmployeeName || 'Employee');

            toast.success(`Advance of Rs. ${numAmount.toLocaleString()} recorded for ${empName}`);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to record advance:', err);
            toast.error(err.response?.data?.message || 'Failed to record salary advance');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-bold">
                            <DollarSign size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white tracking-tight">Record Salary Advance</h2>
                            <p className="text-xs text-slate-300">
                                Issues an advance and automatically applies it to the manual payment sheet
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
                    
                    {/* Employee Picker */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <User size={13} className="text-indigo-600" />
                            Employee
                        </label>

                        {selectedEmployee ? (
                            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/80">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                                        {(selectedEmployee.firstName?.[0] || 'E')}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900">
                                            {selectedEmployee.firstName} {selectedEmployee.lastName}
                                        </div>
                                        <div className="text-[11px] text-slate-500 font-mono">
                                            {selectedEmployee.employeeCode || 'EMP-NA'} • {selectedEmployee.departmentId?.name || 'Operations'}
                                        </div>
                                    </div>
                                </div>
                                {!defaultEmployeeId && (
                                    <button
                                        type="button"
                                        onClick={() => { setEmployeeId(''); setSearchTerm(''); }}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded-md hover:bg-indigo-50 transition"
                                    >
                                        Change
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="relative">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setIsDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsDropdownOpen(true)}
                                        placeholder="Search employee by name or code..."
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    />
                                </div>

                                {isDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-20">
                                        {filteredEmployees.length === 0 ? (
                                            <div className="p-3 text-center text-slate-400 text-xs">No employees found</div>
                                        ) : (
                                            filteredEmployees.slice(0, 8).map(emp => (
                                                <button
                                                    key={emp._id || emp.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setEmployeeId(emp._id || emp.id);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center justify-between border-b border-slate-100 last:border-none"
                                                >
                                                    <div>
                                                        <span className="font-semibold text-slate-800 block">
                                                            {emp.firstName} {emp.lastName}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            {emp.employeeCode} • {emp.departmentId?.name || 'General'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                        Select
                                                    </span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Date & Amount 2-Column Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Advance Date */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                <Calendar size={13} className="text-indigo-600" />
                                Advance Date
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                <DollarSign size={13} className="text-emerald-600" />
                                Amount (Rs.)
                            </label>
                            <input
                                type="number"
                                min="1"
                                step="100"
                                placeholder="e.g. 5000"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-emerald-800 bg-emerald-50/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Quick Amount Pills */}
                    <div>
                        <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">Quick Select Amount:</span>
                        <div className="flex flex-wrap gap-1.5">
                            {[1000, 2000, 3000, 5000, 10000, 15000].map(val => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => handleQuickAmount(val)}
                                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                                        Number(amount) === val
                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                    }`}
                                >
                                    Rs. {val.toLocaleString()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <CreditCard size={13} className="text-indigo-600" />
                            Disbursement Method
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {['Cash', 'Bank Transfer', 'Cheque'].map(method => (
                                <button
                                    key={method}
                                    type="button"
                                    onClick={() => setPaymentMethod(method)}
                                    className={`py-1.5 px-3 rounded-xl border text-xs font-semibold text-center transition ${
                                        paymentMethod === method
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {method}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reason / Notes */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <FileText size={13} className="text-indigo-600" />
                            Reason / Description
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Monthly Advance, Medical support, Travel"
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Automatic Integration Notice */}
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5">
                        <ShieldCheck size={16} className="text-amber-700 shrink-0 mt-0.5" />
                        <div className="text-[11px] text-amber-900 leading-relaxed">
                            <span className="font-bold block text-amber-950">Automatic Paysheet Integration</span>
                            This advance will automatically appear on the employee&apos;s date row in the 
                            <strong> Employee Payment Record Sheet</strong>, be included in the 
                            <strong> TOTAL ADVENCE</strong> header, and be deducted from their 
                            <strong> NET SALARY</strong>.
                        </div>
                    </div>

                    {/* Immediate Approval Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                            type="checkbox"
                            checked={autoApprove}
                            onChange={(e) => setAutoApprove(e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <span className="text-xs font-semibold text-slate-700">
                            Immediately mark as Approved & Paid (recommended for direct desk cash advance)
                        </span>
                    </label>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold text-xs transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !employeeId || !amount}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-700/20 flex items-center gap-1.5 transition"
                        >
                            <Check size={14} />
                            {isSubmitting ? 'Recording...' : 'Record Advance & Sync'}
                        </button>
                    </div>

                </form>

            </div>
        </div>
    );
}
