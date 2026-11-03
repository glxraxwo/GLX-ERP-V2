import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ShieldAlert, Check, Sparkles, Percent, Clock, AlertCircle, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SalaryPoliciesModal({
    isOpen,
    onClose,
    policies = [],
    employees = [],
    selectedEmployeeId = '',
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
            // Default starter set matching user's tiered structure
            setLocalPolicies([
                {
                    id: 'pol-1',
                    type: 'LATE_DEDUCTION',
                    name: 'Late 10+ mins (Tier 1)',
                    thresholdMinutes: 10,
                    deductionAmount: 100,
                    bonusAmount: 0,
                    waiveIfHoursCovered: true,
                    standardShiftHours: 9,
                    appliesTo: 'ALL',
                    isActive: true
                },
                {
                    id: 'pol-2',
                    type: 'LATE_DEDUCTION',
                    name: 'Late 20+ mins (Tier 2)',
                    thresholdMinutes: 20,
                    deductionAmount: 200,
                    bonusAmount: 0,
                    waiveIfHoursCovered: true,
                    standardShiftHours: 9,
                    appliesTo: 'ALL',
                    isActive: true
                },
                {
                    id: 'pol-3',
                    type: 'LATE_DEDUCTION',
                    name: 'Late 30+ mins (Tier 3)',
                    thresholdMinutes: 30,
                    deductionAmount: 300,
                    bonusAmount: 0,
                    waiveIfHoursCovered: true,
                    standardShiftHours: 9,
                    appliesTo: 'ALL',
                    isActive: true
                },
                {
                    id: 'pol-4',
                    type: 'ABSENT_DEDUCTION',
                    name: 'Absent / Unticked Day',
                    thresholdMinutes: 0,
                    deductionAmount: 0,
                    bonusAmount: 0,
                    waiveIfHoursCovered: false,
                    standardShiftHours: 9,
                    appliesTo: 'ALL',
                    isActive: false
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

    // Check if a policy has duplicate thresholdMinutes compared to another policy of the same type
    const findDuplicateConflict = (policy, index, allPolicies) => {
        if (!policy || policy.thresholdMinutes === undefined || policy.thresholdMinutes === null) return null;
        const currentMins = Number(policy.thresholdMinutes);
        const currentType = policy.type;
        const currentScope = policy.appliesTo || 'ALL';

        // Check types that use thresholdMinutes / hours
        if (!['LATE_DEDUCTION', 'EARLY_DEPARTURE', 'OVERTIME_BONUS', 'MIN_HOURS_FULL_PAY'].includes(currentType)) {
            return null;
        }

        const match = allPolicies.find((other, otherIdx) => {
            if (otherIdx === index) return false;
            if (other.type !== currentType) return false;
            const otherScope = other.appliesTo || 'ALL';
            const scopeOverlaps = (currentScope === 'ALL' || otherScope === 'ALL' || currentScope === otherScope);
            if (!scopeOverlaps) return false;
            return Number(other.thresholdMinutes) === currentMins;
        });

        if (match) {
            return {
                minutes: currentMins,
                type: currentType,
                otherIndex: allPolicies.indexOf(match)
            };
        }
        return null;
    };

    // Overall duplicate status
    const hasAnyDuplicate = localPolicies.some((pol, idx) => Boolean(findDuplicateConflict(pol, idx, localPolicies)));

    // Add new custom policy with next unique available minutes
    const handleAddPolicy = () => {
        const targetScope = selectedEmployeeId || 'ALL';
        const existingMinutes = new Set(
            localPolicies
                .filter(p => p.type === 'LATE_DEDUCTION')
                .map(p => Number(p.thresholdMinutes))
        );

        let nextMinutes = 10;
        while (existingMinutes.has(nextMinutes)) {
            nextMinutes += 10;
        }

        const newPolicy = {
            id: `pol-${Date.now()}`,
            type: 'LATE_DEDUCTION',
            name: `Late ${nextMinutes}+ mins (Rule)`,
            thresholdMinutes: nextMinutes,
            deductionAmount: nextMinutes * 10,
            bonusAmount: 0,
            waiveIfHoursCovered: false,
            standardShiftHours: 9,
            appliesTo: targetScope,
            isActive: true
        };
        setLocalPolicies(prev => [...prev, newPolicy]);
    };

    // Add preset late tier (preventing duplicate minutes)
    const handleAddPresetTier = (thresholdMinutes, deductionAmount, name) => {
        const numMinutes = Number(thresholdMinutes);
        const targetScope = selectedEmployeeId || 'ALL';

        const existing = localPolicies.find(p =>
            p.type === 'LATE_DEDUCTION' &&
            Number(p.thresholdMinutes) === numMinutes &&
            ((p.appliesTo || 'ALL') === targetScope || (p.appliesTo || 'ALL') === 'ALL' || targetScope === 'ALL')
        );

        if (existing) {
            toast.error(`මිනිත්තු ${thresholdMinutes} සඳහා policy එකක් දැනටමත් එකතු කර ඇත! (${thresholdMinutes} mins rule already exists)`);
            return;
        }

        const newPolicy = {
            id: `pol-${Date.now()}`,
            type: 'LATE_DEDUCTION',
            name,
            thresholdMinutes: numMinutes,
            deductionAmount,
            bonusAmount: 0,
            waiveIfHoursCovered: false,
            standardShiftHours: 9,
            appliesTo: targetScope,
            isActive: true
        };
        setLocalPolicies(prev => [...prev, newPolicy]);
        toast.success(`+${thresholdMinutes}-Min Late policy එකතු කරන ලදී.`);
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

    // Save with duplicate validation
    const handleSave = async (andApply = true) => {
        // Check for duplicates
        for (let i = 0; i < localPolicies.length; i++) {
            const conflict = findDuplicateConflict(localPolicies[i], i, localPolicies);
            if (conflict) {
                toast.error(`මිනිත්තු ${conflict.minutes} duplicate වී ඇත (Rule #${i + 1} සහ Rule #${conflict.otherIndex + 1}). කරුණාකර duplicate minutes ඉවත් කරන්න!`);
                return;
            }
        }

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
            if (onApplyToSheet) {
                onApplyToSheet(localPolicies, { employeeRate, employerRate, etfRate });
            }
            toast.success('Policies and EPF/ETF rates saved & applied to sheet successfully!');
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

                        {/* Quick Preset Buttons for Tiered Late Deductions */}
                        <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3 mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Sparkles size={15} className="text-amber-600 shrink-0" />
                                <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                                    Quick Late Tiers (ප්‍රමාද කාල පරාස ඉක්මනින් එක් කරන්න):
                                </span>
                            </div>
                            {(() => {
                                const isAdded10 = localPolicies.some(p => p.type === 'LATE_DEDUCTION' && Number(p.thresholdMinutes) === 10);
                                const isAdded20 = localPolicies.some(p => p.type === 'LATE_DEDUCTION' && Number(p.thresholdMinutes) === 20);
                                const isAdded30 = localPolicies.some(p => p.type === 'LATE_DEDUCTION' && Number(p.thresholdMinutes) === 30);
                                return (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => handleAddPresetTier(10, 100, 'Late 10+ mins (Tier 1)')}
                                            className={`px-2.5 py-1 text-[11px] font-bold rounded shadow-2xs transition cursor-pointer flex items-center gap-1 ${
                                                isAdded10
                                                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                                                    : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                                            }`}
                                            title={isAdded10 ? "10-minute rule already added" : "Add 10-minute late penalty rule"}
                                        >
                                            {isAdded10 ? <Check size={12} className="text-emerald-600" /> : null}
                                            {isAdded10 ? '10-Min Late (Added)' : '+ 10-Min Late (Rs. 100)'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleAddPresetTier(20, 200, 'Late 20+ mins (Tier 2)')}
                                            className={`px-2.5 py-1 text-[11px] font-bold rounded shadow-2xs transition cursor-pointer flex items-center gap-1 ${
                                                isAdded20
                                                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                                                    : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                                            }`}
                                            title={isAdded20 ? "20-minute rule already added" : "Add 20-minute late penalty rule"}
                                        >
                                            {isAdded20 ? <Check size={12} className="text-emerald-600" /> : null}
                                            {isAdded20 ? '20-Min Late (Added)' : '+ 20-Min Late (Rs. 200)'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleAddPresetTier(30, 300, 'Late 30+ mins (Tier 3)')}
                                            className={`px-2.5 py-1 text-[11px] font-bold rounded shadow-2xs transition cursor-pointer flex items-center gap-1 ${
                                                isAdded30
                                                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                                                    : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                                            }`}
                                            title={isAdded30 ? "30-minute rule already added" : "Add 30-minute late penalty rule"}
                                        >
                                            {isAdded30 ? <Check size={12} className="text-emerald-600" /> : null}
                                            {isAdded30 ? '30-Min Late (Added)' : '+ 30-Min Late (Rs. 300)'}
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Policies List */}
                        <div className="space-y-3">
                            {localPolicies.map((pol, idx) => {
                                const duplicateConflict = findDuplicateConflict(pol, idx, localPolicies);
                                return (
                                <div
                                    key={pol.id || idx}
                                    className={`border rounded-lg p-3 transition ${
                                        duplicateConflict
                                            ? 'bg-rose-50/40 border-rose-300 shadow-sm'
                                            : pol.isActive
                                                ? 'bg-white border-gray-300 shadow-xs'
                                                : 'bg-gray-50 border-gray-200 opacity-60'
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
                                                        className={`w-16 px-2 py-0.5 text-center font-bold border rounded focus:outline-none ${
                                                            duplicateConflict
                                                                ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50 text-rose-900 font-extrabold'
                                                                : 'border-gray-300 focus:border-indigo-500'
                                                        }`}
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

                                                {/* Duplicate Alert Banner */}
                                                {duplicateConflict && (
                                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded mt-1">
                                                        <AlertCircle size={14} className="shrink-0 text-rose-600" />
                                                        <span>
                                                            මිනිත්තු {duplicateConflict.minutes} සඳහා නීතියක් Rule #{duplicateConflict.otherIndex + 1} හි දැනටමත් ඇත. Duplicate minutes දැමිය නොහැක!
                                                        </span>
                                                    </div>
                                                )}

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
                                            <>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-gray-700">If leaves before shift end by more than</span>
                                                    <input
                                                        type="number"
                                                        value={pol.thresholdMinutes}
                                                        onChange={(e) => handlePolicyChange(idx, 'thresholdMinutes', Number(e.target.value))}
                                                        className={`w-16 px-2 py-0.5 text-center font-bold border rounded focus:outline-none ${
                                                            duplicateConflict
                                                                ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50 text-rose-900 font-extrabold'
                                                                : 'border-gray-300 focus:border-indigo-500'
                                                        }`}
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

                                                {/* Duplicate Alert Banner */}
                                                {duplicateConflict && (
                                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded mt-1">
                                                        <AlertCircle size={14} className="shrink-0 text-rose-600" />
                                                        <span>
                                                            මිනිත්තු {duplicateConflict.minutes} සඳහා නීතියක් Rule #{duplicateConflict.otherIndex + 1} හි දැනටමත් ඇත. Duplicate minutes දැමිය නොහැක!
                                                        </span>
                                                    </div>
                                                )}
                                            </>
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
                                            <>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-gray-700">If hours worked exceed</span>
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        value={pol.thresholdMinutes ? pol.thresholdMinutes / 60 : 9}
                                                        onChange={(e) => handlePolicyChange(idx, 'thresholdMinutes', Number(e.target.value) * 60)}
                                                        className={`w-16 px-2 py-0.5 text-center font-bold border rounded ${
                                                            duplicateConflict
                                                                ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50 text-rose-900 font-extrabold'
                                                                : 'border-gray-300'
                                                        }`}
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
                                                {duplicateConflict && (
                                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded mt-1">
                                                        <AlertCircle size={14} className="shrink-0 text-rose-600" />
                                                        <span>
                                                            පැය {duplicateConflict.minutes / 60} සඳහා නීතියක් Rule #{duplicateConflict.otherIndex + 1} හි දැනටමත් ඇත. Duplicate hours/minutes දැමිය නොහැක!
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {pol.type === 'MIN_HOURS_FULL_PAY' && (
                                            <>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-gray-700">If hours worked are at least</span>
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        value={pol.thresholdMinutes ? pol.thresholdMinutes / 60 : 8.5}
                                                        onChange={(e) => handlePolicyChange(idx, 'thresholdMinutes', Number(e.target.value) * 60)}
                                                        className={`w-16 px-2 py-0.5 text-center font-bold border rounded ${
                                                            duplicateConflict
                                                                ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50 text-rose-900 font-extrabold'
                                                                : 'border-gray-300'
                                                        }`}
                                                    />
                                                    <span className="text-gray-700">hours: Pay full shift day salary.</span>
                                                </div>
                                                {duplicateConflict && (
                                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded mt-1">
                                                        <AlertCircle size={14} className="shrink-0 text-rose-600" />
                                                        <span>
                                                            පැය {duplicateConflict.minutes / 60} සඳහා නීතියක් Rule #{duplicateConflict.otherIndex + 1} හි දැනටමත් ඇත. Duplicate hours/minutes දැමිය නොහැක!
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Target Employee Selector */}
                                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs">
                                            <span className="font-bold text-gray-700">Applies To (අදාළ සේවකයා):</span>
                                            <select
                                                value={pol.appliesTo || 'ALL'}
                                                onChange={(e) => handlePolicyChange(idx, 'appliesTo', e.target.value)}
                                                className="bg-white border border-gray-300 rounded px-2 py-1 text-xs font-semibold text-gray-800 focus:outline-none focus:border-indigo-500"
                                            >
                                                <option value="ALL">All Employees (සියලුම සේවකයින්ට පොදුයි)</option>
                                                {employees.map(emp => {
                                                    const name = emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name;
                                                    const code = emp.payrollNumber || emp.employeeCode || '';
                                                    return (
                                                        <option key={emp._id} value={emp._id}>
                                                            {name} {code ? `(${code})` : ''} - Only this employee
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            {pol.appliesTo && pol.appliesTo !== 'ALL' && (
                                                <span className="text-[10px] bg-purple-100 text-purple-800 font-extrabold px-2 py-0.5 rounded-full border border-purple-200">
                                                    Custom Employee Rule
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col gap-3">
                    {hasAnyDuplicate && (
                        <div className="w-full flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold animate-pulse">
                            <AlertCircle size={16} className="shrink-0 text-rose-600" />
                            <span>
                                නීති වල duplicate මිනිත්තු ගණන් (Duplicate minutes) පවතී. කරුණාකර රතු පැහැයෙන් දැක්වෙන duplicate මිනිත්තු වෙනස් කර Save කරන්න.
                            </span>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3">
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
                                disabled={isSaving || hasAnyDuplicate}
                                className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition ${
                                    hasAnyDuplicate
                                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                        : 'text-indigo-700 bg-indigo-50 border border-indigo-300 hover:bg-indigo-100'
                                }`}
                                title={hasAnyDuplicate ? "Duplicate minutes exist" : "Apply policies and recalculate all days immediately"}
                            >
                                <Sparkles size={14} className={hasAnyDuplicate ? "text-gray-400" : "text-indigo-600"} />
                                Save & Apply to Sheet Now
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSave(true)}
                                disabled={isSaving || hasAnyDuplicate}
                                className={`px-5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition ${
                                    hasAnyDuplicate
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                                        : 'text-white bg-indigo-600 hover:bg-indigo-700'
                                }`}
                            >
                                <Save size={14} />
                                {isSaving ? 'Saving...' : 'Save Policies'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
