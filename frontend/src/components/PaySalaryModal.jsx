import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle, Wallet, Calendar, AlertCircle, Building, DollarSign, FileText, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { manualAttendanceApi } from '../features/hr/hrApi';

export default function PaySalaryModal({
    isOpen,
    onClose,
    employee,
    startDate,
    endDate,
    dynamicTotals,
    includeEpfEtf = false,
    onPaymentSuccess
}) {
    const queryClient = useQueryClient();

    const todayStr = () => {
        const d = new Date();
        const yr = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        return `${yr}-${mo}-${da}`;
    };

    const [paymentDate, setPaymentDate] = useState(todayStr());
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [bankAccountId, setBankAccountId] = useState('');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');

    // Fetch bank accounts
    const { data: bankAccountsData } = useQuery({
        queryKey: ['bankAccounts'],
        queryFn: async () => {
            const { data } = await api.get('/finance/bank-accounts');
            return data.data || [];
        },
        enabled: Boolean(isOpen)
    });
    const bankAccounts = bankAccountsData || [];

    useEffect(() => {
        if (isOpen) {
            setPaymentDate(todayStr());
            setPaymentMethod('cash');
            setBankAccountId('');
            setReference('');
            setNotes('');
        }
    }, [isOpen]);

    const payMutation = useMutation({
        mutationFn: manualAttendanceApi.paySalary,
        onSuccess: (res) => {
            toast.success(res.message || 'Salary marked as paid successfully!');
            queryClient.invalidateQueries({ queryKey: ['employee-sheet'] });
            queryClient.invalidateQueries({ queryKey: ['normal-payslip'] });
            queryClient.invalidateQueries({ queryKey: ['salary-payments'] });
            queryClient.invalidateQueries({ queryKey: ['manual-attendance-daily'] });
            queryClient.invalidateQueries({ queryKey: ['advances'] });
            onClose();
            if (onPaymentSuccess && res.salaryPayment) {
                onPaymentSuccess(res.salaryPayment);
            }
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to record salary payment');
        }
    });

    if (!isOpen) return null;

    const totals = dynamicTotals || {};
    const empName = employee?.fullName || `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || employee?.name || 'Employee';
    const empCode = employee?.employeeCode || employee?.payrollNumber || 'EMP';
    const netPayable = totals.netSalary !== undefined ? totals.netSalary : 0;

    const handleConfirmPayment = () => {
        if (!employee?._id && !employee?.id) {
            toast.error('No employee selected');
            return;
        }
        if (!startDate || !endDate) {
            toast.error('Pay period dates are required');
            return;
        }
        if (paymentMethod === 'bank_transfer' && !bankAccountId && bankAccounts.length > 0) {
            // Optional warning but allow continuing if desired
        }

        const payload = {
            employeeId: employee._id || employee.id,
            periodStartDate: startDate,
            periodEndDate: endDate,
            paymentDate,
            paymentMethod,
            bankAccountId: bankAccountId || undefined,
            reference: reference.trim(),
            notes: notes.trim(),
            includeEpfEtf,
            overrideNetSalary: netPayable,
            customTotalAdvance: totals.totalAdvance
        };

        payMutation.mutate(payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs select-none sm:select-auto">
            <div className="bg-white dark:bg-[#111F33] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                            <Wallet size={20} />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold leading-tight">Pay Salary & Settle Cycle</h2>
                            <p className="text-xs text-slate-400">වේතනය ගෙවා අවසන් කර ඊළඟ දින සිට 0න් ආරම්භ කරන්න</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 space-y-4 overflow-y-auto text-slate-800 dark:text-slate-100 text-xs">
                    {/* Employee Profile Banner */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900 dark:text-white">{empName}</span>
                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] font-bold">
                                    {empCode}
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                                {employee?.designation || employee?.designationId?.title || 'Staff'} • {employee?.department || employee?.departmentId?.name || 'Operations'}
                            </p>
                        </div>

                        <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Pay Period</span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                                {startDate} to {endDate}
                            </span>
                        </div>
                    </div>

                    {/* Calculated Summary Table */}
                    <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 dark:from-slate-900 dark:to-indigo-950/20 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-950/50 space-y-2">
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 pb-1.5 border-b border-indigo-100/80 dark:border-slate-800 text-xs">
                            <span>Days & Hours Worked:</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {totals.totalDays || 0} Days ({Number(totals.totalHours || 0).toFixed(2)}h)
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 pb-1.5 border-b border-indigo-100/80 dark:border-slate-800 text-xs">
                            <span>Gross Earnings (මූලික/වැටුප + OT):</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                                Rs. {Math.round(totals.totalSalary || 0).toLocaleString()}
                            </span>
                        </div>

                        {totals.totalAdvance > 0 && (
                            <div className="flex justify-between items-center text-amber-700 dark:text-amber-400 pb-1.5 border-b border-indigo-100/80 dark:border-slate-800 text-xs">
                                <span>Less: Advance Deducted (අත්පිට මුදල්):</span>
                                <span className="font-mono font-bold">
                                    -Rs. {Math.round(totals.totalAdvance || 0).toLocaleString()}
                                </span>
                            </div>
                        )}

                        {totals.totalDeduction !== 0 && (
                            <div className="flex justify-between items-center text-rose-700 dark:text-rose-400 pb-1.5 border-b border-indigo-100/80 dark:border-slate-800 text-xs">
                                <span>Less: Policy / Late Deductions:</span>
                                <span className="font-mono font-bold">
                                    -Rs. {Math.abs(Math.round(totals.totalDeduction || 0)).toLocaleString()}
                                </span>
                            </div>
                        )}

                        {includeEpfEtf && totals.epfEmployeeDeduction > 0 && (
                            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 pb-1.5 border-b border-indigo-100/80 dark:border-slate-800 text-xs">
                                <span>Less: EPF Employee (8%):</span>
                                <span className="font-mono font-bold">
                                    -Rs. {Math.round(totals.epfEmployeeDeduction).toLocaleString()}
                                </span>
                            </div>
                        )}

                        {/* Net Payable Highlight */}
                        <div className="pt-2 flex justify-between items-center">
                            <div>
                                <span className="text-xs uppercase font-extrabold text-emerald-800 dark:text-emerald-400 tracking-wider block">
                                    Net Amount to Pay (ශුද්ධ වැටුප):
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                    Settles attendance & advances up to {endDate}
                                </span>
                            </div>
                            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                                Rs. {Math.round(netPayable).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* Payment Execution Inputs */}
                    <div className="space-y-3 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Payment Date (ගෙවූ දිනය)*
                                </label>
                                <input
                                    type="date"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Payment Method (ගෙවූ ක්‍රමය)*
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                                >
                                    <option value="cash">Cash (මුදල්)</option>
                                    <option value="bank_transfer">Bank Transfer (බැංකු තැන්පතු)</option>
                                    <option value="cheque">Cheque (චෙක්පත්)</option>
                                </select>
                            </div>
                        </div>

                        {paymentMethod === 'bank_transfer' && (
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Paid From Company Bank Account
                                </label>
                                <select
                                    value={bankAccountId}
                                    onChange={(e) => setBankAccountId(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                                >
                                    <option value="">Select Company Bank Account...</option>
                                    {bankAccounts.map((acc) => (
                                        <option key={acc._id} value={acc._id}>
                                            {acc.bankName} - {acc.accountNumber} ({acc.accountName || acc.accountType})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Reference / Cheque No / Slip No
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. TXN-9843 or CHQ-0012"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Notes / Memo
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Paid in full for the period"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notice Info Box */}
                    <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 flex items-start gap-2 text-emerald-900 dark:text-emerald-300 text-[11px]">
                        <CheckCircle size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                            <strong>ඊළඟ දින සිට 0න් ආරම්භ වේ (Cycle resets cleanly):</strong> මෙම ගෙවීම තහවුරු කළ පසු {endDate} දක්වා දින සහ ලබාගත් Advance මුදල් ගෙවා අවසන් (Settled) ලෙස සටහන් වන අතර, ඊළඟ දින සිට වැටුප් හා පැමිණීම් නැවත 0 සිට ගණනය වේ.
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={payMutation.isPending}
                        className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-xs"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleConfirmPayment}
                        disabled={payMutation.isPending}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer text-xs"
                    >
                        {payMutation.isPending ? (
                            <>Processing Payment...</>
                        ) : (
                            <>
                                <CheckCircle size={14} />
                                Confirm &amp; Mark as Paid (ගෙවීම තහවුරු කරන්න)
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
