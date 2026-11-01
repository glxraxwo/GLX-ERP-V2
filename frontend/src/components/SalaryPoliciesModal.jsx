import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ShieldAlert, Check, Sparkles, Percent, Clock, AlertCircle, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SalaryPoliciesModal({
    isOpen,
    onClose,
    policies = [],
    epfRates = { employeeRate: 8, employerRate: 12, etfRate: 3 },
    onSavePolicies,
    onApplyToSheet
}) {
    const [localPolicies, setLocalPolicies] = useState([]);
    const [employeeRate, setEmployeeRate] = useState(8);
    const [employerRate, setEmployerRate] = useState(12);
    const [etfRate, setEtfRate] = useState(3);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (policies && policies.length > 0) {
            setLocalPolicies(JSON.parse(JSON.stringify(policies)));
        } else {
            // Default starter set
            setLocalPolicies([
                {
                    id: 'pol-1',
                    type: 'LATE_DEDUCTION',
                    name: 'Late 5+ mins (-100 Rs unless hours covered)',
                    thresholdMinutes: 5,
                    deductionAmount: 100,
                    bonusAmount: 0,
                    waiveIfHoursCovered: true,
                    standardShiftHours: 9,
                    isActive: true
                },
                {
                    id: 'pol-2',
                    type: 'LATE_DEDUCTION',
                    name: 'Late 15+ mins (-200 Rs unless hours covered)',
                    thresholdMinutes: 15,
                    deductionAmount: 200,
                    bonusAmount: 0,
                    waiveIfHoursCovered: true,
                    standardShiftHours: 9,
                    isActive: true
                },
                {
                    id: 'pol-3',
                    type: 'LATE_DEDUCTION',
                    name: 'Late 30+ mins (-300 Rs unless hours covered)',
                    thresholdMinutes: 30,
                    deductionAmount: 300,
                    bonusAmount: 0,
                    waiveIfHoursCovered: true,
                    standardShiftHours: 9,
                    isActive: true
                },
                {
                    id: 'pol-4',
                    type: 'ABSENT_DEDUCTION',
                    name: 'Absent / Unticked Day (-1000 Rs)',
                    thresholdMinutes: 0,
                    deductionAmount: 1000,
                    bonusAmount: 0,
                    waiveIfHoursCovered: false,
                    standardShiftHours: 9,
                    isActive: true
                }
            ]);
        }
    }, [policies, isOpen]);

    useEffect(() => {
        if (epfRates) {
            setEmployeeRate(epfRates.employeeRate !== undefined ? epfRates.employeeRate : 8);
            setEmployerRate(epfRates.employerRate !== undefined ? epfRates.employerRate : 12);
            setEtfRate(epfRates.etfRate !== undefined ? epfRates.etfRate : 3);
        }
    }, [epfRates, isOpen]);

    if (!isOpen) return null;

    // Add new custom policy
    const handleAddPolicy = () => {
        const newPolicy = {
            id: `pol-${Date.now()}`,
            type: 'LATE_DEDUCTION',
            name: 'New Custom Rule',
            thresholdMinutes: 10,
            deductionAmount: 150,
            bonusAmount: 0,
            waiveIfHoursCovered: true,
            standardShiftHours: 9,
            isActive: true
        };
        setLocalPolicies([...localPolicies, newPolicy]);
    };

    // Update field
    const handlePolicyChange = (index, field, value) => {
        setLocalPolicies(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };

    // Remove policy
    const handleRemovePolicy = (index) => {
        setLocalPolicies(prev => prev.filter((_, i) => i !== index));
    };

    // Save
    const handleSave = async (andApply = false) => {
        setIsSaving(true);
        try {
            if (onSavePolicies) {
                await onSavePolicies({
                    salaryPolicies: localPolicies,
                    epfEmployeeRate: Number(employeeRate),
                    epfEmployerRate: Number(employerRate),
                    etfEmployerRate: Number(etfRate)
                });
            }
            if (andApply && onApplyToSheet) {
                onApplyToSheet(localPolicies, { employeeRate, employerRate, etfRate });
            }
            toast.success('Policies and EPF/ETF rates saved successfully!');
            onClose();
        } catch (err) {
            toast.error(err.message || 'Failed to save policies');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-gray-200 overflow-hidden my-6">
                
                {/* Modal Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                            <ShieldAlert size={20} className="text-indigo-300" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold tracking-wide">Salary & Attendance Policies (ගෙවීම් නීති)</h2>
                            <p className="text-xs text-indigo-200">
                                Late arrival deductions, hour coverage exemptions, absent cuts & statutory EPF/ETF rates
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                    
                    {/* SECTION 1: STATUTORY EPF / ETF RATES (All Employees) */}
                    <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Percent size={16} className="text-blue-700" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                                    Global Statutory EPF / ETF Rates (සැමටම එක සමාන EPF/ETF අනුපාත)
                                </h3>
                            </div>
                            <span className="text-[11px] font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                                Standard Sri Lankan Labour Rates
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Employee EPF */}
                            <div className="bg-white border border-blue-200 rounded p-3">
                                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                                    Employee EPF Contribution (සේවක)
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={employeeRate}
                                        onChange={(e) => setEmployeeRate(e.target.value)}
                                        className="w-20 px-2.5 py-1 text-sm font-bold text-gray-900 border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                    />
                                    <span className="text-xs font-bold text-gray-600">% (Deducted from Net)</span>
                                </div>
                            </div>

                            {/* Employer EPF */}
                            <div className="bg-white border border-blue-200 rounded p-3">
                                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                                    Employer EPF Contribution (සේවායෝජක)
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={employerRate}
                                        onChange={(e) => setEmployerRate(e.target.value)}
                                        className="w-20 px-2.5 py-1 text-sm font-bold text-gray-900 border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                    />
                                    <span className="text-xs font-bold text-gray-600">% (Paid by Company)</span>
                                </div>
                            </div>

                            {/* Employer ETF */}
                            <div className="bg-white border border-blue-200 rounded p-3">
                                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                                    Employer ETF Contribution (සේවායෝජක)
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={etfRate}
                                        onChange={(e) => setEtfRate(e.target.value)}
                                        className="w-20 px-2.5 py-1 text-sm font-bold text-gray-900 border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                    />
                                    <span className="text-xs font-bold text-gray-600">% (Paid by Company)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: ATTENDANCE & SALARY CALCULATION POLICIES */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-2">
                                    <Clock size={16} className="text-indigo-600" />
                                    Attendance & Salary Calculation Policies (අසීමිත නීති එකතු කරන්න)
                                </h3>
                                <p className="text-[11px] text-gray-500">
                                    Define rules for late arrivals, early leaves, and coverage exemptions.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddPolicy}
                                className="px-3 py-1.5 text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg flex items-center gap-1.5 transition"
                            >
                                <Plus size={14} />
                                + Add Policy Rule
                            </button>
                        </div>

                        {/* Policies List */}
                        <div className="space-y-3">
                            {localPolicies.map((pol, idx) => (
                                <div
                                    key={pol.id || idx}
                                    className={`border rounded-lg p-3 transition ${
                                        pol.isActive ? 'bg-white border-gray-300 shadow-xs' : 'bg-gray-50 border-gray-200 opacity-60'
                                    }`}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(pol.isActive)}
                                                onChange={(e) => handlePolicyChange(idx, 'isActive', e.target.checked)}
                                                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                                                id={`pol-active-${idx}`}
                                            />
                                            <label htmlFor={`pol-active-${idx}`} className="text-xs font-bold text-gray-900 cursor-pointer">
                                                Rule #{idx + 1}:
                                            </label>
                                            <select
                                                value={pol.type}
                                                onChange={(e) => handlePolicyChange(idx, 'type', e.target.value)}
                                                className="text-xs font-semibold bg-gray-100 border border-gray-300 rounded px-2 py-0.5"
                                            >
                                                <option value="LATE_DEDUCTION">Late Arrival Penalty (ප්‍රමාද දඩ)</option>
                                                <option value="EARLY_DEPARTURE">Early Leave Penalty (කලින් යාම)</option>
                                                <option value="ABSENT_DEDUCTION">Absent / No Work (නොපැමිණීම)</option>
                                                <option value="OVERTIME_BONUS">Overtime Bonus (අතිකාල)</option>
                                                <option value="MIN_HOURS_FULL_PAY">Min Hours Full Pay (අවම පැය ගණන)</option>
                                            </select>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleRemovePolicy(idx)}
                                            className="text-gray-400 hover:text-rose-600 p-1 rounded transition"
                                            title="Delete rule"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>

                                    {/* Policy Content Editor */}
                                    <div className="text-xs space-y-2">
                                        {pol.type === 'LATE_DEDUCTION' && (
                                            <>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-gray-700">If late after shift start by more than</span>
                                                    <input
                                                        type="number"
                                                        value={pol.thresholdMinutes}
                                                        onChange={(e) => handlePolicyChange(idx, 'thresholdMinutes', Number(e.target.value))}
                                                        className="w-16 px-2 py-0.5 text-center font-bold border border-gray-300 rounded focus:border-indigo-500"
                                                    />
                                                    <span className="text-gray-700">minutes: Cut salary by</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-bold text-gray-500">Rs.</span>
                                                        <input
                                                            type="number"
                                                            value={pol.deductionAmount}
                                                            onChange={(e) => handlePolicyChange(idx, 'deductionAmount', Number(e.target.value))}
                                                            className="w-20 px-2 py-0.5 text-center font-bold text-rose-700 border border-rose-300 rounded focus:border-rose-500"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Grace cover condition */}
                                                <div className="bg-emerald-50/80 border border-emerald-200 rounded p-2 flex items-center gap-2 mt-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(pol.waiveIfHoursCovered)}
                                                        onChange={(e) => handlePolicyChange(idx, 'waiveIfHoursCovered', e.target.checked)}
                                                        id={`waive-${idx}`}
                                                        className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                                                    />
                                                    <label htmlFor={`waive-${idx}`} className="text-[11px] font-semibold text-emerald-900 cursor-pointer">
                                                        If employee covers total working hours (e.g. completes 9 hours shift), <strong>waive the cut and pay full payment!</strong> (පැය ගණන සම්පූර්ණ කළහොත් සම්පූර්ණ මුදල ගෙවන්න)
                                                    </label>
                                                </div>
                                            </>
                                        )}

                                        {pol.type === 'EARLY_DEPARTURE' && (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-gray-700">If leaves before shift end by more than</span>
                                                <input
                                                    type="number"
                                                    value={pol.thresholdMinutes}
                                                    onChange={(e) => handlePolicyChange(idx, 'thresholdMinutes', Number(e.target.value))}
                                                    className="w-16 px-2 py-0.5 text-center font-bold border border-gray-300 rounded"
                                                />
                                                <span className="text-gray-700">minutes: Cut salary by</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="font-bold text-gray-500">Rs.</span>
                                                    <input
                                                        type="number"
                                                        value={pol.deductionAmount}
                                                        onChange={(e) => handlePolicyChange(idx, 'deductionAmount', Number(e.target.value))}
                                                        className="w-20 px-2 py-0.5 text-center font-bold text-rose-700 border border-rose-300 rounded"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {pol.type === 'ABSENT_DEDUCTION' && (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-gray-700">If absent / unticked on a working day: Cut salary by</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="font-bold text-gray-500">Rs.</span>
                                                    <input
                                                        type="number"
                                                        value={pol.deductionAmount}
                                                        onChange={(e) => handlePolicyChange(idx, 'deductionAmount', Number(e.target.value))}
                                                        className="w-24 px-2 py-0.5 text-center font-bold text-rose-700 border border-rose-300 rounded"
                                                    />
                                                </div>
                                                <span className="text-gray-500">(Reason set to 'No Work')</span>
                                            </div>
                                        )}

                                        {pol.type === 'OVERTIME_BONUS' && (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-gray-700">If hours worked exceed</span>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    value={pol.thresholdMinutes ? pol.thresholdMinutes / 60 : 9}
                                                    onChange={(e) => handlePolicyChange(idx, 'thresholdMinutes', Number(e.target.value) * 60)}
                                                    className="w-16 px-2 py-0.5 text-center font-bold border border-gray-300 rounded"
                                                />
                                                <span className="text-gray-700">hours: Pay extra</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="font-bold text-gray-500">Rs.</span>
                                                    <input
                                                        type="number"
                                                        value={pol.bonusAmount || 150}
                                                        onChange={(e) => handlePolicyChange(idx, 'bonusAmount', Number(e.target.value))}
                                                        className="w-20 px-2 py-0.5 text-center font-bold text-emerald-700 border border-emerald-300 rounded"
                                                    />
                                                    <span className="text-gray-500">per extra hour</span>
                                                </div>
                                            </div>
                                        )}

                                        {pol.type === 'MIN_HOURS_FULL_PAY' && (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-gray-700">If hours worked are at least</span>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    value={pol.thresholdMinutes ? pol.thresholdMinutes / 60 : 8.5}
                                                    onChange={(e) => handlePolicyChange(idx, 'thresholdMinutes', Number(e.target.value) * 60)}
                                                    className="w-16 px-2 py-0.5 text-center font-bold border border-gray-300 rounded"
                                                />
                                                <span className="text-gray-700">hours: Pay full shift day salary.</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition"
                    >
                        Cancel
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleSave(true)}
                            disabled={isSaving}
                            className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-300 hover:bg-indigo-100 rounded-lg flex items-center gap-1.5 transition"
                            title="Apply policies and recalculate all days immediately"
                        >
                            <Sparkles size={14} className="text-indigo-600" />
                            Save & Apply to Sheet Now
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSave(false)}
                            disabled={isSaving}
                            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 shadow-sm transition"
                        >
                            <Save size={14} />
                            {isSaving ? 'Saving...' : 'Save Policies'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
