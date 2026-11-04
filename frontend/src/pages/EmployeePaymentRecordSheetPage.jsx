import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Save, Printer, ArrowLeft, RefreshCw, FileText, Check,
    Calendar, Users, Download, Sparkles, Building2, Eye, EyeOff,
    ShieldAlert, Sliders, Keyboard, Percent, Search, Clock, CheckCheck, Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { manualAttendanceApi, employeesApi } from '../features/hr/hrApi';
import { useSettings } from '../features/settings/useSettings';
import NormalPayslipModal from '../components/NormalPayslipModal';
import SalaryPoliciesModal from '../components/SalaryPoliciesModal';
import RecordAdvanceModal from '../components/RecordAdvanceModal';
import { Plus } from 'lucide-react';

// Helper: Format Date to YYYY-MM-DD
const formatDateStr = (d) => {
    const date = new Date(d);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper: Format Date to M/D/YYYY matching physical payment sheet (e.g. 8/8/2026)
const formatPrintDate = (val) => {
    if (!val) return '';
    if (typeof val === 'string' && val.includes('-')) {
        const parts = val.split('-');
        if (parts.length === 3) {
            const y = parts[0];
            const m = parseInt(parts[1], 10);
            const d = parseInt(parts[2], 10);
            if (!isNaN(m) && !isNaN(d)) {
                return `${m}/${d}/${y}`;
            }
        }
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};

// Helper: Format Time to HH:mm:00 (e.g. 08:40:00)
const formatPrintTime = (val) => {
    if (!val) return '00:00:00';
    const s = String(val).trim();
    if (!s) return '00:00:00';
    const parts = s.split(':');
    const h = (parts[0] || '0').padStart(2, '0');
    const m = (parts[1] || '0').padStart(2, '0');
    const sec = parts[2] ? parts[2].padStart(2, '0') : '00';
    return `${h}:${m}:${sec}`;
};

// Helper: Format duration between IN and OUT as HH:mm:00 (e.g. 09:20:00)
const formatPrintDuration = (row) => {
    if (!row) return '00:00:00';
    const inT = row.inTime || row.in;
    const outT = row.outTime || row.out;
    if (inT && outT) {
        const inMins = parseTimeToMinutes(inT);
        let outMins = parseTimeToMinutes(outT);
        if (inMins !== null && outMins !== null) {
            let diff = outMins - inMins;
            if (diff < 0) diff += 24 * 60; // overnight shift
            const h = Math.floor(diff / 60);
            const m = diff % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
        }
    }
    if (row.hours && !isNaN(row.hours) && Number(row.hours) > 0) {
        const totalMins = Math.round(Number(row.hours) * 60);
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    }
    return '00:00:00';
};

// Helper: Format Currency with 2 decimals (e.g. 2,333.33)
const formatPrintCurrency = (amount) => {
    const num = Number(amount) || 0;
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

// Flexible Time Parser
const parseTimeToMinutes = (str) => {
    if (!str) return null;
    const s = String(str).trim().toLowerCase();
    const isPm = s.includes('pm') || s.includes('p');
    const isAm = s.includes('am') || s.includes('a');
    const cleaned = s.replace(/[a-z]/g, '').trim();
    if (!cleaned) return null;

    let h = 0;
    let m = 0;
    if (cleaned.includes(':')) {
        const parts = cleaned.split(':');
        h = parseInt(parts[0], 10);
        m = parseInt(parts[1] || '0', 10);
    } else if (cleaned.includes('.')) {
        const parts = cleaned.split('.');
        h = parseInt(parts[0], 10);
        m = parseInt(parts[1] || '0', 10);
    } else {
        const digits = cleaned.replace(/\D/g, '');
        if (digits.length <= 2) {
            h = parseInt(digits, 10);
            m = 0;
        } else if (digits.length === 3) {
            if (parseInt(digits[0], 10) > 2) {
                h = parseInt(digits.slice(0, 1), 10);
                m = parseInt(digits.slice(1, 3), 10);
            } else {
                h = parseInt(digits.slice(0, 2), 10);
                m = parseInt(digits.slice(2, 3), 10) * 10;
            }
        } else if (digits.length >= 4) {
            h = parseInt(digits.slice(0, 2), 10);
            m = parseInt(digits.slice(2, 4), 10);
        }
    }

    if (isNaN(h)) return null;
    if (isNaN(m)) m = 0;

    if (isPm && h < 12) h += 12;
    if (isAm && h === 12) h = 0;

    return h * 60 + m;
};

// Helper: Format time as user types digits (e.g. "1800" -> "18:00", "830" -> "8:30")
const formatTimeAsYouType = (val) => {
    if (!val) return '';
    const clean = String(val).replace(/[^0-9:]/g, '');
    if (clean.includes(':')) {
        const parts = clean.split(':');
        const h = parts[0].slice(0, 2);
        const m = (parts[1] || '').slice(0, 2);
        return `${h}:${m}`;
    }
    const digits = clean.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) {
        if (digits.length === 2 && parseInt(digits, 10) > 23) {
            return `${digits[0]}:${digits[1]}`;
        }
        return digits;
    }
    if (digits.length === 3) {
        if (parseInt(digits[0], 10) > 2) {
            return `${digits[0]}:${digits.slice(1, 3)}`;
        }
        return `${digits.slice(0, 2)}:${digits[2]}`;
    }
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
};

// Helper: Normalize user time inputs (e.g. "8" -> "08:00", "8:30" -> "08:30", "1700" -> "17:00")
const normalizeTimeString = (val, fallback = '08:00') => {
    if (!val || typeof val !== 'string') return fallback;
    let clean = val.trim().replace(/[^0-9:]/g, '');
    if (!clean) return fallback;

    let h = 0;
    let m = 0;

    if (clean.includes(':')) {
        const parts = clean.split(':');
        h = parseInt(parts[0], 10);
        let mPart = parts[1] || '';
        if (mPart.length === 1) {
            m = parseInt(mPart + '0', 10);
        } else {
            m = parseInt(mPart, 10);
        }
    } else {
        const digits = clean.replace(/\D/g, '');
        if (digits.length === 1 || digits.length === 2) {
            h = parseInt(digits, 10);
            m = 0;
        } else if (digits.length === 3) {
            if (parseInt(digits[0], 10) > 2) {
                h = parseInt(digits.slice(0, 1), 10);
                m = parseInt(digits.slice(1, 3), 10);
            } else {
                h = parseInt(digits.slice(0, 2), 10);
                m = (parseInt(digits.slice(2, 3), 10) || 0) * 10;
            }
        } else if (digits.length >= 4) {
            h = parseInt(digits.slice(0, 2), 10);
            m = parseInt(digits.slice(2, 4), 10);
        }
    }

    if (isNaN(h)) h = 8;
    if (isNaN(m)) m = 0;
    h = Math.min(23, Math.max(0, h));
    m = Math.min(59, Math.max(0, m));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Calculate Working Hours
const calculateHoursFromTimes = (inStr, outStr) => {
    const inMin = parseTimeToMinutes(inStr);
    const outMin = parseTimeToMinutes(outStr);
    if (inMin === null || outMin === null) return 0;

    let diff = outMin - inMin;
    if (diff < 0) diff += 24 * 60; // Overnight shift
    return Number((diff / 60).toFixed(2));
};

// Default Policies Fallback
const defaultPoliciesFallback = [
    {
        id: 'pol-1',
        type: 'LATE_DEDUCTION',
        name: 'Late 10+ mins (Tier 1)',
        thresholdMinutes: 10,
        deductionAmount: 100,
        bonusAmount: 0,
        waiveIfHoursCovered: false,
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
        waiveIfHoursCovered: false,
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
        waiveIfHoursCovered: false,
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
];

// Pure Helper: Evaluate policy for a single row
const doesPolicyApplyToEmployee = (policy, employeeId) => {
    if (!policy) return false;
    const scope = policy.appliesTo;
    if (!scope || scope === 'ALL') return true;
    if (Array.isArray(scope)) {
        if (scope.length === 0 || scope.includes('ALL')) return true;
        return scope.some(id => String(id) === String(employeeId));
    }
    return String(scope) === String(employeeId);
};

const isPolicyEmployeeSpecific = (policy, employeeId) => {
    if (!policy) return false;
    const scope = policy.appliesTo;
    if (!scope || scope === 'ALL') return false;
    if (Array.isArray(scope)) {
        if (scope.length === 0 || scope.includes('ALL')) return false;
        return scope.some(id => String(id) === String(employeeId));
    }
    return String(scope) === String(employeeId);
};

const evaluateRowPolicy = (row, shiftOnTime, shiftOffTime, hourlyRate, activePolicies = [], currentEmployeeId = null, isMonthly = false) => {
    // Unticking day -> NO automatic 1000 cut!
    if (!row.isTicked) {
        const absentPol = activePolicies.find(p => p.isActive && p.type === 'ABSENT_DEDUCTION' && doesPolicyApplyToEmployee(p, currentEmployeeId));
        const cut = (!isMonthly && absentPol && absentPol.deductionAmount > 0) ? -Math.abs(absentPol.deductionAmount) : 0;
        return {
            ...row,
            inTime: '',
            outTime: '',
            in: '',
            out: '',
            hours: 0,
            daySalary: 0,
            deduction: cut,
            reason: cut !== 0 ? (absentPol?.name || 'Absent') : ''
        };
    }

    const inT = row.inTime || shiftOnTime;
    const outT = row.outTime || shiftOffTime;
    const hrs = calculateHoursFromTimes(inT, outT) || 9;
    const standardHrs = calculateHoursFromTimes(shiftOnTime, shiftOffTime) || 9;

    // For monthly salary employee: late/early/absent policy deductions do NOT apply
    if (isMonthly) {
        return {
            ...row,
            inTime: inT,
            outTime: outT,
            in: inT,
            out: outT,
            hours: hrs,
            daySalary: Number((hrs * hourlyRate).toFixed(2)),
            deduction: 0,
            reason: ''
        };
    }

    let deduction = 0;
    let reasonParts = [];

    const inMin = parseTimeToMinutes(inT);
    const shiftInMin = parseTimeToMinutes(shiftOnTime);
    const outMin = parseTimeToMinutes(outT);
    const shiftOutMin = parseTimeToMinutes(shiftOffTime);

    // Filter policies for this specific employee or ALL
    const activePols = activePolicies.filter(p => p.isActive);

    // Prefer employee-specific late rules if defined, otherwise fallback to ALL rules
    const empSpecificLatePols = activePols.filter(p => p.type === 'LATE_DEDUCTION' && isPolicyEmployeeSpecific(p, currentEmployeeId));
    const latePolsToUse = empSpecificLatePols.length > 0
        ? empSpecificLatePols
        : activePols.filter(p => p.type === 'LATE_DEDUCTION' && doesPolicyApplyToEmployee(p, currentEmployeeId));

    // 1. Late Arrival Policies
    if (inMin !== null && shiftInMin !== null && inMin > shiftInMin) {
        const lateMinutes = inMin - shiftInMin;
        const matchedLatePolicies = latePolsToUse
            .filter(p => lateMinutes >= p.thresholdMinutes)
            .sort((a, b) => b.thresholdMinutes - a.thresholdMinutes);

        if (matchedLatePolicies.length > 0) {
            const matchedPol = matchedLatePolicies[0];
            if (matchedPol.waiveIfHoursCovered && hrs >= standardHrs) {
                reasonParts.push(`Late ${lateMinutes}m (Covered)`);
            } else {
                deduction -= Math.abs(matchedPol.deductionAmount);
                reasonParts.push(`Late ${lateMinutes}m (-${matchedPol.deductionAmount})`);
            }
        }
    }

    // 2. Early Departure Policies
    const empSpecificEarlyPols = activePols.filter(p => p.type === 'EARLY_DEPARTURE' && isPolicyEmployeeSpecific(p, currentEmployeeId));
    const earlyPolsToUse = empSpecificEarlyPols.length > 0
        ? empSpecificEarlyPols
        : activePols.filter(p => p.type === 'EARLY_DEPARTURE' && doesPolicyApplyToEmployee(p, currentEmployeeId));

    if (outMin !== null && shiftOutMin !== null && outMin < shiftOutMin) {
        const earlyMinutes = shiftOutMin - outMin;
        const matchedEarlyPolicies = earlyPolsToUse
            .filter(p => earlyMinutes >= p.thresholdMinutes)
            .sort((a, b) => b.thresholdMinutes - a.thresholdMinutes);

        if (matchedEarlyPolicies.length > 0) {
            const matchedPol = matchedEarlyPolicies[0];
            deduction -= Math.abs(matchedPol.deductionAmount);
            reasonParts.push(`Early ${earlyMinutes}m (-${matchedPol.deductionAmount})`);
        }
    }

    // 3. Day Salary
    let daySalary = Number((hrs * hourlyRate).toFixed(2));
    const minHoursPol = activePols.find(p => p.type === 'MIN_HOURS_FULL_PAY' && doesPolicyApplyToEmployee(p, currentEmployeeId));
    if (minHoursPol && hrs >= (minHoursPol.thresholdMinutes / 60)) {
        daySalary = Number((standardHrs * hourlyRate).toFixed(2));
    }

    return {
        ...row,
        inTime: inT,
        outTime: outT,
        hours: hrs,
        daySalary,
        deduction,
        reason: reasonParts.join(', ') || ''
    };
};

// Searchable Employee Combobox with Autocomplete Suggestions, Status Badges & Quick Tick Activation
function EmployeeSearchCombobox({ employees, selectedEmployeeId, onSelectEmployee, employeeFullName, onToggleStatus }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
    const containerRef = useRef(null);

    useEffect(() => {
        setSearchTerm(employeeFullName || '');
    }, [employeeFullName, selectedEmployeeId]);

    const counts = useMemo(() => {
        const all = employees.length;
        const active = employees.filter(e => e.status === 'active').length;
        const inactive = all - active;
        return { all, active, inactive };
    }, [employees]);

    const filteredEmployees = useMemo(() => {
        let list = employees;
        if (statusFilter === 'active') {
            list = list.filter(e => e.status === 'active');
        } else if (statusFilter === 'inactive') {
            list = list.filter(e => e.status !== 'active');
        }
        if (!searchTerm.trim()) return list;
        const q = searchTerm.toLowerCase();
        return list.filter(emp => {
            const name = (emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.displayName || '').toLowerCase();
            const code = (emp.payrollNumber || emp.employeeCode || '').toLowerCase();
            const desig = (emp.designationId?.title || '').toLowerCase();
            return name.includes(q) || code.includes(q) || desig.includes(q);
        });
    }, [employees, searchTerm, statusFilter]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearchTerm(employeeFullName || '');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [employeeFullName]);

    return (
        <div ref={containerRef} className="relative flex-1 min-h-[24px] flex items-center">
            {/* Screen Search Input */}
            <div className="flex items-center w-full print-hide-input px-1">
                <Search size={13} className="text-slate-700 mr-1.5 shrink-0" />
                <input
                    type="text"
                    value={searchTerm}
                    placeholder="Search employee by name or code..."
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="w-full bg-transparent font-bold text-black focus:outline-none focus:bg-white text-[12px]"
                />
                {searchTerm && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm('');
                            setIsOpen(true);
                        }}
                        className="text-gray-500 hover:text-black px-1 text-xs cursor-pointer"
                        title="Clear search"
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Print Clean Typography */}
            <span className="hidden print:block font-bold text-black px-1 uppercase tracking-wide">
                {employeeFullName}
            </span>

            {/* Autocomplete Suggestions Popover */}
            {isOpen && (
                <div className="absolute left-0 top-full mt-1 w-full min-w-[340px] bg-white border border-slate-300 shadow-2xl rounded-xl z-50 max-h-72 overflow-hidden flex flex-col">
                    {/* Filter Tabs Header */}
                    <div className="p-2 bg-slate-50 border-b border-slate-200 shrink-0">
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Employees ({filteredEmployees.length})
                            </span>
                            <span className="text-[9px] text-slate-400">
                                Click tick to activate/deactivate
                            </span>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-[10px] font-bold">
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                className={`flex-1 py-1 px-1.5 rounded-md transition cursor-pointer text-center ${
                                    statusFilter === 'all'
                                        ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                All ({counts.all})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('active')}
                                className={`flex-1 py-1 px-1.5 rounded-md transition cursor-pointer text-center ${
                                    statusFilter === 'active'
                                        ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                                        : 'text-emerald-700 hover:text-emerald-900'
                                }`}
                            >
                                Active ({counts.active})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('inactive')}
                                className={`flex-1 py-1 px-1.5 rounded-md transition cursor-pointer text-center ${
                                    statusFilter === 'inactive'
                                        ? 'bg-rose-600 text-white shadow-2xs font-extrabold'
                                        : 'text-rose-700 hover:text-rose-900'
                                }`}
                            >
                                Inactive ({counts.inactive})
                            </button>
                        </div>
                    </div>

                    {/* Scrollable list */}
                    <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                        {filteredEmployees.length === 0 ? (
                            <div className="p-4 text-xs text-slate-500 text-center italic">
                                No employees matching "{searchTerm}" ({statusFilter})
                            </div>
                        ) : (
                            filteredEmployees.map(emp => {
                                const name = emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.displayName;
                                const isSelected = emp._id === selectedEmployeeId;
                                const isActive = emp.status === 'active';

                                return (
                                    <div
                                        key={emp._id}
                                        onClick={() => {
                                            onSelectEmployee(emp._id);
                                            setSearchTerm(name);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-slate-50 transition cursor-pointer ${
                                            isSelected ? 'bg-indigo-50/80 border-l-4 border-l-indigo-600 font-bold' : ''
                                        }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-semibold text-slate-900 truncate">{name}</span>
                                                <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold ${
                                                    isActive 
                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                }`}>
                                                    {isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                                                <span>{emp.payrollNumber || emp.employeeCode || 'EMP'}</span>
                                                {emp.designationId?.title && <span>· {emp.designationId.title}</span>}
                                            </div>
                                        </div>

                                        {/* Quick Tick / Toggle Checkbox to Activate or Deactivate in 1-Click */}
                                        <div 
                                            onClick={(e) => e.stopPropagation()} 
                                            className="shrink-0 flex items-center pl-1"
                                        >
                                            <label 
                                                className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border cursor-pointer select-none transition hover:bg-slate-100"
                                                title={isActive ? 'Active (Click tick to deactivate)' : 'Inactive (Click tick to ACTIVATE)'}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isActive}
                                                    onChange={(e) => onToggleStatus && onToggleStatus(emp._id, emp.status, e)}
                                                    className="w-3.5 h-3.5 text-emerald-600 accent-emerald-600 rounded cursor-pointer"
                                                />
                                                <span className={isActive ? 'text-emerald-700' : 'text-slate-500 font-normal'}>
                                                    {isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function EmployeePaymentRecordSheetPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { data: settingsData } = useSettings();
    const systemSettings = settingsData?.data || {};

    // Default Date Range: 1st of month to end of month
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const [selectedEmployeeId, setSelectedEmployeeId] = useState(() => searchParams.get('employeeId') || '');
    const [startDate, setStartDate] = useState(() => searchParams.get('startDate') || formatDateStr(firstDay));
    const [endDate, setEndDate] = useState(() => searchParams.get('endDate') || formatDateStr(lastDay));
    const [onTime, setOnTime] = useState('08:00');
    const [offTime, setOffTime] = useState('17:00');
    const [customHourlyRate, setCustomHourlyRate] = useState(null);
    const [customTotalAdvance, setCustomTotalAdvance] = useState(null);
    const [rows, setRows] = useState([]);
    const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
    const [isPoliciesModalOpen, setIsPoliciesModalOpen] = useState(false);
    const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
    const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
    const [hideHeaderForLetterhead, setHideHeaderForLetterhead] = useState(false);
    const sheetPrintRef = useRef(null);
    const officialPrintRef = useRef(null);
    const onTimeInputRef = useRef(null);
    const offTimeInputRef = useRef(null);
    const [logoBase64, setLogoBase64] = useState(null);

    // Preload GLX Monochrome Logo for high-resolution instant PDF rendering
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                setLogoBase64(canvas.toDataURL('image/png'));
            } catch (e) {
                console.warn('Could not encode logo to base64', e);
            }
        };
        img.src = '/logo-mono-white.png';
    }, []);

    const getLogoDataUrl = async () => {
        if (logoBase64) return logoBase64;
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const dataUrl = canvas.toDataURL('image/png');
                    setLogoBase64(dataUrl);
                    resolve(dataUrl);
                } catch (e) {
                    resolve(null);
                }
            };
            img.onerror = () => resolve(null);
            img.src = '/logo-mono-white.png';
        });
    };

    // EPF / ETF Toggle & Rates (Global for all employees)
    const [includeEpfEtf, setIncludeEpfEtf] = useState(false);
    const [epfEmployeeRate, setEpfEmployeeRate] = useState(8);
    const [epfEmployerRate, setEpfEmployerRate] = useState(12);
    const [etfEmployerRate, setEtfEmployerRate] = useState(3);
    const [salaryPolicies, setSalaryPolicies] = useState(defaultPoliciesFallback);

    // Active rows filtered for official print/PDF matching GLX physical paysheet
    const printableRows = useMemo(() => {
        const active = rows.filter(r => r.isTicked || (Number(r.hours) > 0) || (Number(r.advance) > 0) || (Number(r.daySalary) > 0));
        return active.length > 0 ? active : rows;
    }, [rows]);

    // Fetch active employees
    const { data: employeesData } = useQuery({
        queryKey: ['all-employees-list'],
        queryFn: () => employeesApi.list({ limit: 500 }),
    });

    const employees = useMemo(() => employeesData?.data || [], [employeesData]);

    // Generate initial blank calendar rows (always unticked by default)
    useEffect(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
            const daysList = [];
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = formatDateStr(d);
                const dayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                daysList.push({
                    date: dateStr,
                    day: dayName,
                    isTicked: false,
                    inTime: onTime || '08:00',
                    outTime: offTime || '17:00',
                    in: onTime || '08:00',
                    out: offTime || '17:00',
                    hours: 0,
                    daySalary: 0,
                    advance: 0,
                    deduction: 0,
                    reason: ''
                });
            }
            setRows(daysList);
        }
    }, [selectedEmployeeId, startDate, endDate]);

    // Reset custom rates and advances when employee changes so their own rate is loaded
    useEffect(() => {
        setCustomHourlyRate(null);
        setCustomTotalAdvance(null);
    }, [selectedEmployeeId]);

    // Fetch Policies from Backend
    const { data: policiesData } = useQuery({
        queryKey: ['manual-attendance-policies'],
        queryFn: () => manualAttendanceApi.getPolicies(),
    });

    useEffect(() => {
        if (policiesData) {
            if (policiesData.salaryPolicies && policiesData.salaryPolicies.length > 0) {
                setSalaryPolicies(policiesData.salaryPolicies);
            }
            if (policiesData.epfEmployeeRate !== undefined) setEpfEmployeeRate(policiesData.epfEmployeeRate);
            if (policiesData.epfEmployerRate !== undefined) setEpfEmployerRate(policiesData.epfEmployerRate);
            if (policiesData.etfEmployerRate !== undefined) setEtfEmployerRate(policiesData.etfEmployerRate);
        }
    }, [policiesData]);

    // Fetch Payment Sheet Data
    const { data: sheetData, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['employee-payment-sheet', selectedEmployeeId, startDate, endDate],
        queryFn: () => manualAttendanceApi.getEmployeeSheet({
            employeeId: selectedEmployeeId,
            startDate,
            endDate
        }),
        enabled: Boolean(selectedEmployeeId),
    });

    // Populate rows and defaults from backend
    useEffect(() => {
        if (sheetData?.rows) {
            setRows(sheetData.rows);
            if (sheetData.defaultOnTime) setOnTime(sheetData.defaultOnTime);
            if (sheetData.defaultOffTime) setOffTime(sheetData.defaultOffTime);
            if (sheetData.employee?.hourlyRate !== undefined && customHourlyRate === null) {
                setCustomHourlyRate(sheetData.employee.hourlyRate);
            }
            if (sheetData.salaryPolicies && sheetData.salaryPolicies.length > 0) {
                setSalaryPolicies(sheetData.salaryPolicies);
            }
            if (sheetData.epfEmployeeRate !== undefined) setEpfEmployeeRate(sheetData.epfEmployeeRate);
            if (sheetData.epfEmployerRate !== undefined) setEpfEmployerRate(sheetData.epfEmployerRate);
            if (sheetData.etfEmployerRate !== undefined) setEtfEmployerRate(sheetData.etfEmployerRate);
        }
    }, [sheetData]);

    // Current employee
    const currentEmployee = useMemo(() => {
        if (!selectedEmployeeId) return {};
        if (sheetData?.employee) return sheetData.employee;
        return employees.find(e => e._id === selectedEmployeeId) || {};
    }, [sheetData, employees, selectedEmployeeId]);

    const isMonthlyEmployee = useMemo(() => {
        return currentEmployee?.paymentType === 'monthly';
    }, [currentEmployee]);

    const employeeFullName = useMemo(() => {
        if (!selectedEmployeeId) return '';
        return currentEmployee.name || currentEmployee.fullName || `${currentEmployee.firstName || ''} ${currentEmployee.lastName || ''}`.trim() || currentEmployee.displayName || '';
    }, [currentEmployee, selectedEmployeeId]);

    // Effective hourly rate (uses employee profile rate by default)
    const effectiveHourlyRate = useMemo(() => {
        if (customHourlyRate !== null && !isNaN(customHourlyRate) && Number(customHourlyRate) > 0) {
            return Number(customHourlyRate);
        }
        const regRate = currentEmployee.labourRate || currentEmployee.hourlyRate || currentEmployee.basicWageRate;
        if (regRate && Number(regRate) > 0) {
            return Number(regRate);
        }
        if (currentEmployee.basicSalary && Number(currentEmployee.basicSalary) > 0) {
            return Number((Number(currentEmployee.basicSalary) / 200).toFixed(2));
        }
        return 260;
    }, [customHourlyRate, currentEmployee]);

    // Save Sheet Mutation
    // Quick activate / deactivate employee status
    const toggleStatusMutation = useMutation({
        mutationFn: async ({ id, newStatus }) => {
            return employeesApi.update(id, { status: newStatus });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries(['all-employees-list']);
            toast.success(`Employee marked as ${variables.newStatus}!`);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to update employee status');
        }
    });

    const handleToggleEmployeeStatus = (empId, currentStatus, e) => {
        if (e) e.stopPropagation();
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        toggleStatusMutation.mutate({ id: empId, newStatus });
    };

    const saveMutation = useMutation({
        mutationFn: (payload) => manualAttendanceApi.saveEmployeeSheet(payload),
        onSuccess: (res) => {
            toast.success('Payment sheet & default shift details saved successfully!');
            queryClient.invalidateQueries(['employee-payment-sheet', selectedEmployeeId, startDate, endDate]);
            queryClient.invalidateQueries(['manual-attendance-daily']);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to save');
        }
    });

    // Save Policies Mutation
    const savePoliciesMutation = useMutation({
        mutationFn: (payload) => manualAttendanceApi.savePolicies(payload),
        onSuccess: (res) => {
            queryClient.invalidateQueries(['manual-attendance-policies']);
            queryClient.invalidateQueries(['employee-payment-sheet']);
        }
    });

    // Update Hourly Rate and instantly recalculate all row Day Salaries
    const handleHourlyRateChange = (newRate) => {
        const rateVal = Number(newRate) || 0;
        setCustomHourlyRate(rateVal);
        setRows(prevRows => prevRows.map(r => {
            if (!r.isTicked) return r;
            const daySalary = Number((r.hours * rateVal).toFixed(2));
            return { ...r, daySalary };
        }));
    };

    // Apply Active Policies to ALL Rows
    const handleApplyPoliciesToAllRows = (policiesToApply = salaryPolicies) => {
        setRows(prevRows => prevRows.map(r => {
            return evaluateRowPolicy(r, onTime, offTime, effectiveHourlyRate, policiesToApply, selectedEmployeeId, isMonthlyEmployee);
        }));
        toast.success('Policies applied to all days successfully!');
    };

    // Save policies from modal and immediately apply to sheet
    const handleSavePoliciesFromModal = async (payload) => {
        await savePoliciesMutation.mutateAsync(payload);
        setSalaryPolicies(payload.salaryPolicies);
        if (payload.epfEmployeeRate !== undefined) setEpfEmployeeRate(payload.epfEmployeeRate);
        if (payload.epfEmployerRate !== undefined) setEpfEmployerRate(payload.epfEmployerRate);
        if (payload.etfEmployerRate !== undefined) setEtfEmployerRate(payload.etfEmployerRate);

        // Immediately recalculate all rows currently in the sheet with the newly saved policies!
        setRows(prevRows => prevRows.map(r => {
            return evaluateRowPolicy(r, onTime, offTime, effectiveHourlyRate, payload.salaryPolicies, selectedEmployeeId, isMonthlyEmployee);
        }));
    };

    // Helper: Select all text on mouse click/focus/mouseup (never leaves cursor in the middle)
    const handleCellSelectAll = (e) => {
        const target = e.target;
        if (!target || target.type === 'checkbox') return;
        setTimeout(() => {
            try {
                if (typeof target.select === 'function') {
                    target.select();
                }
                if (typeof target.setSelectionRange === 'function' && target.value !== undefined) {
                    target.setSelectionRange(0, String(target.value).length);
                }
            } catch {}
        }, 15);
    };

    // Handle in-place row editing with AUTO-POLICY EVALUATION
    // Focus grid cell helper for spreadsheet keyboard responsiveness
    const focusGridCell = (rowIndex, colIndex, preferredDirection = 'next') => {
        let r = Math.max(0, Math.min(rowIndex, rows.length - 1));
        let c = colIndex;
        // Col 3 (hours) and Col 4 (daySalary) are locked
        if (c === 3 || c === 4) {
            c = (preferredDirection === 'next' || preferredDirection === 'down') ? 5 : 2;
        }
        c = Math.max(0, Math.min(c, 7));

        // If target row is not ticked and user is focusing IN or OUT via keyboard navigation, auto-tick the row
        if ((c === 1 || c === 2) && !rows[r]?.isTicked) {
            handleRowChange(r, 'isTicked', true);
        }

        setTimeout(() => {
            let target = document.querySelector(`[data-grid-cell="true"][data-row="${r}"][data-col="${c}"]`);
            
            if (!target) {
                if (preferredDirection === 'next' || preferredDirection === 'down') {
                    for (let nextC = c + 1; nextC <= 7; nextC++) {
                        if (nextC === 3 || nextC === 4) continue;
                        target = document.querySelector(`[data-grid-cell="true"][data-row="${r}"][data-col="${nextC}"]`);
                        if (target) break;
                    }
                } else {
                    for (let prevC = c - 1; prevC >= 0; prevC--) {
                        if (prevC === 3 || prevC === 4) continue;
                        target = document.querySelector(`[data-grid-cell="true"][data-row="${r}"][data-col="${prevC}"]`);
                        if (target) break;
                    }
                }
            }

            if (target) {
                target.focus();
                try {
                    if (target.type !== 'checkbox') {
                        target.select();
                        if (typeof target.setSelectionRange === 'function' && target.value !== undefined) {
                            target.setSelectionRange(0, String(target.value).length);
                        }
                    }
                } catch {}
            }
        }, 30);
    };

    const handleCellKeyDown = (e, rowIndex, colIndex) => {
        const isText = e.target.type === 'text';
        let cursorAtStart = true;
        let cursorAtEnd = true;
        if (isText) {
            try {
                cursorAtStart = e.target.selectionStart === 0 && e.target.selectionEnd === 0;
                cursorAtEnd = e.target.selectionStart === e.target.value?.length && e.target.selectionEnd === e.target.value?.length;
            } catch {
                cursorAtStart = true;
                cursorAtEnd = true;
            }
        }

        // Enter -> Alternate between IN and OUT ONLY!
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (colIndex === 1) {
                // In IN -> normalize and commit current value first
                const formatted = normalizeTimeString(e.target.value, onTime);
                handleRowChange(rowIndex, 'inTime', formatted);
                // From IN -> go to OUT on same row
                focusGridCell(rowIndex, 2, 'next');
            } else if (colIndex === 2) {
                // In OUT -> normalize and commit current value first
                const formatted = normalizeTimeString(e.target.value, offTime);
                handleRowChange(rowIndex, 'outTime', formatted);
                // From OUT -> go to IN on next row
                if (rowIndex < rows.length - 1) {
                    if (!rows[rowIndex + 1]?.isTicked) {
                        handleRowChange(rowIndex + 1, 'isTicked', true);
                    }
                    focusGridCell(rowIndex + 1, 1, 'next');
                }
            } else if (colIndex === 0) {
                // From Checkbox -> go to IN on same row
                focusGridCell(rowIndex, 1, 'next');
            } else if (colIndex === 5 || colIndex === 6) {
                // From Advance (5) or Deduction (6) -> go down in same column
                if (rowIndex < rows.length - 1) {
                    focusGridCell(rowIndex + 1, colIndex, 'down');
                }
            } else {
                // From reason -> wrap to IN on next row
                if (rowIndex < rows.length - 1) {
                    focusGridCell(rowIndex + 1, 1, 'next');
                }
            }
            return;
        }

        // Shift + Enter -> Prev IN/OUT navigation
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            if (colIndex === 2) {
                const formatted = normalizeTimeString(e.target.value, offTime);
                handleRowChange(rowIndex, 'outTime', formatted);
                // From OUT -> go to IN on same row
                focusGridCell(rowIndex, 1, 'prev');
            } else if (colIndex === 1) {
                const formatted = normalizeTimeString(e.target.value, onTime);
                handleRowChange(rowIndex, 'inTime', formatted);
                // From IN -> go to OUT on prev row
                if (rowIndex > 0) {
                    focusGridCell(rowIndex - 1, 2, 'prev');
                }
            } else {
                focusGridCell(rowIndex, 1, 'prev');
            }
            return;
        }

        // ArrowDown / ArrowUp -> Navigate rows smoothly with full cell selection
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            focusGridCell(rowIndex + 1, colIndex, 'down');
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            focusGridCell(rowIndex - 1, colIndex, 'up');
            return;
        }

        // Tab -> Next cell in row or wrap to next row (skipping locked 3 & 4)
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            let nextCol = colIndex + 1;
            if (nextCol === 3 || nextCol === 4) nextCol = 5;
            if (nextCol <= 7) {
                focusGridCell(rowIndex, nextCol, 'next');
            } else if (rowIndex < rows.length - 1) {
                focusGridCell(rowIndex + 1, 0, 'next');
            }
            return;
        }

        // Shift + Tab -> Prev cell in row or wrap to prev row (skipping locked 4 & 3)
        if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            let prevCol = colIndex - 1;
            if (prevCol === 4 || prevCol === 3) prevCol = 2;
            if (prevCol >= 0) {
                focusGridCell(rowIndex, prevCol, 'prev');
            } else if (rowIndex > 0) {
                focusGridCell(rowIndex - 1, 7, 'prev');
            }
            return;
        }

        // ArrowRight -> if at end of text or checkbox (skipping 3 & 4)
        if (e.key === 'ArrowRight' && (cursorAtEnd || !isText)) {
            let nextCol = colIndex + 1;
            if (nextCol === 3 || nextCol === 4) nextCol = 5;
            if (nextCol <= 7) {
                e.preventDefault();
                focusGridCell(rowIndex, nextCol, 'next');
            }
            return;
        }

        // ArrowLeft -> if at start of text or checkbox (skipping 4 & 3)
        if (e.key === 'ArrowLeft' && (cursorAtStart || !isText)) {
            let prevCol = colIndex - 1;
            if (prevCol === 4 || prevCol === 3) prevCol = 2;
            if (prevCol >= 0) {
                e.preventDefault();
                focusGridCell(rowIndex, prevCol, 'prev');
            }
            return;
        }
    };

    // Global shortcut listener for spreadsheet actions
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            // Ctrl+S or Cmd+S -> Save
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleSave();
                return;
            }
            // Ctrl+P or Cmd+P -> Print / Export PDF
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                handlePrint();
                return;
            }
            // Alt+A -> Open Record Advance Modal
            if (e.altKey && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                setIsAdvanceModalOpen(true);
                return;
            }
            // Alt+S -> Open Salary Slip Modal
            if (e.altKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                setIsPayslipModalOpen(true);
                return;
            }
            // Alt+P -> Open Salary Policies Modal
            if (e.altKey && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                setIsPoliciesModalOpen(true);
                return;
            }
            // Alt+F -> Fill All Shift Hours
            if (e.altKey && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                handleFillAllDays();
                return;
            }
            // Alt+T -> Toggle EPF/ETF
            if (e.altKey && e.key.toLowerCase() === 't') {
                e.preventDefault();
                setIncludeEpfEtf(prev => !prev);
                return;
            }
            // Escape -> Close any open modals
            if (e.key === 'Escape') {
                setIsAdvanceModalOpen(false);
                setIsPayslipModalOpen(false);
                setIsPoliciesModalOpen(false);
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [rows, isAdvanceModalOpen, isPayslipModalOpen, isPoliciesModalOpen]);

    const handleRowChange = (index, field, value) => {
        setRows(prevRows => {
            const updated = [...prevRows];
            let row = { ...updated[index] };

            if (field === 'isTicked') {
                row.isTicked = Boolean(value);
                if (row.isTicked) {
                    if (!row.inTime) row.inTime = onTime;
                    if (!row.outTime) row.outTime = offTime;
                }
                row = evaluateRowPolicy(row, onTime, offTime, effectiveHourlyRate, salaryPolicies, selectedEmployeeId, isMonthlyEmployee);
            } else if (field === 'inTime' || field === 'outTime') {
                row[field] = value;
                row.isTicked = true;
                if (!row.inTime) row.inTime = onTime;
                if (!row.outTime) row.outTime = offTime;
                row = evaluateRowPolicy(row, onTime, offTime, effectiveHourlyRate, salaryPolicies, selectedEmployeeId, isMonthlyEmployee);
            } else if (field === 'hours') {
                const val = String(value).trim();
                const hrs = val === '' ? 0 : Number(val);
                row.hours = isNaN(hrs) ? row.hours : hrs;
                if (row.hours > 0) {
                    row.isTicked = true;
                    row.daySalary = Number((row.hours * effectiveHourlyRate).toFixed(2));
                } else {
                    row.daySalary = 0;
                }
            } else if (field === 'daySalary') {
                const val = String(value).trim();
                const num = val === '' ? 0 : Number(val);
                row.daySalary = isNaN(num) ? row.daySalary : num;
                if (row.daySalary > 0) row.isTicked = true;
            } else if (field === 'advance') {
                const val = String(value).trim();
                const num = val === '' ? 0 : Number(val);
                row.advance = isNaN(num) ? row.advance : num;
                setCustomTotalAdvance(null);
            } else if (field === 'deduction') {
                // Allow user to freely type '-', '-100', '100', ''
                if (value === '' || value === '-') {
                    row.deduction = value;
                } else {
                    const num = Number(value);
                    row.deduction = isNaN(num) ? value : num;
                }
            } else if (field === 'reason') {
                row.reason = value;
            }

            updated[index] = row;
            return updated;
        });
    };

    // Handle Direct Typing in Header TOTAL ADVENCE
    const handleHeaderAdvanceChange = (val) => {
        const num = val === '' ? 0 : Number(val);
        setCustomTotalAdvance(num);
    };

    // Apply shift working hours to onTime, offTime, and update all table rows below
    const applyShiftWorkingHours = (newOn, newOff, forceAllRows = false) => {
        const validatedOn = normalizeTimeString(newOn, onTime || '08:00');
        const validatedOff = normalizeTimeString(newOff, offTime || '17:00');
        setOnTime(validatedOn);
        setOffTime(validatedOff);

        setRows(prevRows => prevRows.map(r => {
            const wasCustomIn = r.inTime && r.inTime !== '08:00' && r.inTime !== onTime && r.inTime !== validatedOn;
            const wasCustomOut = r.outTime && r.outTime !== '17:00' && r.outTime !== '18:00' && r.outTime !== offTime && r.outTime !== validatedOff;

            const shouldUpdate = forceAllRows || (!wasCustomIn && !wasCustomOut);

            const updatedIn = shouldUpdate ? validatedOn : (r.inTime || validatedOn);
            const updatedOut = shouldUpdate ? validatedOff : (r.outTime || validatedOff);

            const updated = {
                ...r,
                inTime: r.isTicked ? updatedIn : validatedOn,
                outTime: r.isTicked ? updatedOut : validatedOff,
                in: validatedOn,
                out: validatedOff
            };

            if (r.isTicked) {
                return evaluateRowPolicy(updated, validatedOn, validatedOff, effectiveHourlyRate, salaryPolicies, selectedEmployeeId, isMonthlyEmployee);
            }
            return updated;
        }));
    };

    // Quick Fill All Days with Default Shift
    const handleFillAllDays = () => {
        const hrs = calculateHoursFromTimes(onTime, offTime) || 9;
        setRows(prevRows => prevRows.map(r => {
            const raw = {
                ...r,
                isTicked: true,
                inTime: onTime,
                outTime: offTime,
                hours: hrs
            };
            return evaluateRowPolicy(raw, onTime, offTime, effectiveHourlyRate, salaryPolicies, selectedEmployeeId, isMonthlyEmployee);
        }));
        toast.success(`Filled all days with ${onTime} - ${offTime} and applied policies`);
    };

    // Calculate Summary Totals dynamically with EPF/ETF Support
    const dynamicTotals = useMemo(() => {
        let totalLeave = 0;
        let totalDays = 0;
        let totalHours = 0;
        let totalSalary = 0;
        let rowAdvanceSum = 0;
        let totalDeduction = 0;

        rows.forEach(r => {
            if (r.isTicked) {
                totalDays++;
                totalHours += Number(r.hours) || 0;
                totalSalary += Number(r.daySalary) || 0;
            } else {
                totalLeave++;
            }
            rowAdvanceSum += Number(r.advance) || 0;
            totalDeduction += Number(r.deduction) || 0;
        });

        const effectiveTotalAdvance = customTotalAdvance !== null ? customTotalAdvance : rowAdvanceSum;
        const minSalary = Number(currentEmployee?.minimumSalary || currentEmployee?.basicSalary || 0);
        const monthlyPackage = isMonthlyEmployee ? Number(currentEmployee?.monthlySalary || currentEmployee?.basicSalary || 0) : 0;

        let finalTotalSalary = Number(totalSalary.toFixed(2));
        let basicSalary = 0;
        let otCommission = 0;

        if (isMonthlyEmployee && monthlyPackage > 0) {
            // For Monthly salaried employee: Fixed monthly package, NOT daily hours!
            finalTotalSalary = monthlyPackage;
            if (minSalary > 0) {
                basicSalary = Math.min(minSalary, monthlyPackage);
                otCommission = Math.max(0, Number((monthlyPackage - basicSalary).toFixed(2)));
            } else {
                basicSalary = monthlyPackage;
                otCommission = 0;
            }
        } else {
            // For Hourly/Daily employee: Accumulated from daily hours worked
            const earnedTotal = Number(totalSalary.toFixed(2));
            finalTotalSalary = earnedTotal;
            if (minSalary > 0) {
                if (earnedTotal > minSalary) {
                    basicSalary = minSalary;
                    otCommission = Number((earnedTotal - minSalary).toFixed(2));
                } else {
                    basicSalary = earnedTotal;
                    otCommission = 0;
                }
            } else {
                basicSalary = earnedTotal;
                otCommission = 0;
            }
        }

        // EPF / ETF calculations
        const epfEmployeeDeduction = includeEpfEtf ? Number((finalTotalSalary * (epfEmployeeRate / 100)).toFixed(2)) : 0;
        const epfEmployerContribution = includeEpfEtf ? Number((finalTotalSalary * (epfEmployerRate / 100)).toFixed(2)) : 0;
        const etfEmployerContribution = includeEpfEtf ? Number((finalTotalSalary * (etfEmployerRate / 100)).toFixed(2)) : 0;

        // Net Salary calculation (no penalty policy deductions for monthly staff)
        const netSalary = Math.max(0, finalTotalSalary - effectiveTotalAdvance + (isMonthlyEmployee ? 0 : totalDeduction) - epfEmployeeDeduction);

        return {
            totalLeave,
            totalDays,
            totalHours: Number(totalHours.toFixed(2)),
            totalSalary: Number(finalTotalSalary.toFixed(2)),
            basicSalary: Number(basicSalary.toFixed(2)),
            otCommission: Number(otCommission.toFixed(2)),
            minimumSalary: minSalary,
            totalAdvance: Number(effectiveTotalAdvance.toFixed(2)),
            totalDeduction: isMonthlyEmployee ? 0 : Number(totalDeduction.toFixed(2)),
            epfEmployeeDeduction,
            epfEmployerContribution,
            etfEmployerContribution,
            netSalary: Number(netSalary.toFixed(2))
        };
    }, [rows, customTotalAdvance, includeEpfEtf, epfEmployeeRate, epfEmployerRate, etfEmployerRate, currentEmployee, isMonthlyEmployee]);

    const handleSave = () => {
        if (!selectedEmployeeId) {
            toast.error('Please select an employee');
            return;
        }
        saveMutation.mutate({
            employeeId: selectedEmployeeId,
            rows,
            hourlyRate: effectiveHourlyRate,
            onTime,
            offTime
        });
    };

    // Dedicated Corporate Print Handler - Prints Official 6-Column Format Matching GLX Physical Paysheet
    const handlePrint = () => {
        toast.dismiss();
        const empName = employeeFullName || 'Employee';

        // Clean up any existing print iframe
        const existingFrame = document.getElementById('employee-sheet-print-iframe');
        if (existingFrame) existingFrame.remove();

        const iframe = document.createElement('iframe');
        iframe.id = 'employee-sheet-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);

        const rowsHtml = printableRows.map(r => `
            <tr>
                <td style="padding: 3px 6px; text-align: left;">${formatPrintDate(r.date)}</td>
                <td style="padding: 3px 6px; text-align: center; font-family: 'Courier New', Courier, monospace;">${formatPrintTime(r.inTime || r.in)}</td>
                <td style="padding: 3px 6px; text-align: center; font-family: 'Courier New', Courier, monospace;">${formatPrintTime(r.outTime || r.out)}</td>
                <td style="padding: 3px 6px; text-align: center; font-family: 'Courier New', Courier, monospace;">${formatPrintDuration(r)}</td>
                <td style="padding: 3px 6px; text-align: right; font-family: 'Courier New', Courier, monospace;">${formatPrintCurrency(r.daySalary)}</td>
                <td style="padding: 3px 6px; text-align: right; font-family: 'Courier New', Courier, monospace;">${formatPrintCurrency(r.advance)}</td>
            </tr>
        `).join('');

        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Employee Payment Sheet - ${empName}</title>
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 12mm 15mm 12mm 15mm;
                    }
                    * {
                        box-sizing: border-box;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        font-family: Arial, "Helvetica Neue", Helvetica, sans-serif !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .container {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 auto !important;
                    }
                    .header-box {
                        text-align: center !important;
                        margin-bottom: 8px !important;
                    }
                    .logo-img {
                        height: 48px !important;
                        max-height: 48px !important;
                        width: auto !important;
                        margin: 0 auto 6px auto !important;
                        display: block !important;
                        object-fit: contain !important;
                    }
                    .sheet-title {
                        font-size: 11pt !important;
                        font-weight: 700 !important;
                        letter-spacing: 0.5px !important;
                        text-transform: uppercase !important;
                        margin: 6px 0 6px 0 !important;
                    }
                    .divider-line {
                        border: none !important;
                        border-top: 1px solid #000000 !important;
                        width: 100% !important;
                        margin: 0 0 10px 0 !important;
                    }
                    .meta-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        font-size: 9pt !important;
                        margin-bottom: 10px !important;
                    }
                    .meta-table td {
                        padding: 2.5px 0 !important;
                        vertical-align: middle !important;
                    }
                    .meta-label {
                        font-weight: 700 !important;
                        width: 130px !important;
                    }
                    .meta-sep {
                        font-weight: 700 !important;
                        width: 18px !important;
                        text-align: center !important;
                    }
                    .meta-val {
                        font-weight: 400 !important;
                    }
                    .meta-val-bold {
                        font-weight: 700 !important;
                    }
                    .data-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        font-size: 8.5pt !important;
                    }
                    .data-table th {
                        border-top: 1px solid #000000 !important;
                        border-bottom: 1px solid #000000 !important;
                        padding: 5px 6px !important;
                        font-weight: 700 !important;
                        text-transform: uppercase !important;
                    }
                    .data-table td {
                        padding: 3px 6px !important;
                        border: none !important;
                    }
                    .table-bottom-line {
                        border-top: 1px solid #000000 !important;
                        width: 100% !important;
                        margin-top: 0 !important;
                        margin-bottom: 8px !important;
                    }
                    .summary-table {
                        width: 250px !important;
                        border-collapse: collapse !important;
                        font-size: 9pt !important;
                        margin-left: auto !important;
                        margin-right: 0 !important;
                    }
                    .summary-table td {
                        padding: 2.5px 0 !important;
                    }
                    .line-single {
                        border-bottom: 1px solid #000000 !important;
                    }
                    .line-double {
                        border-bottom: 3px double #000000 !important;
                    }
                    .text-left { text-align: left !important; }
                    .text-center { text-align: center !important; }
                    .text-right { text-align: right !important; }
                    .font-bold { font-weight: 700 !important; }
                </style>
            </head>
            <body>
                <div class="container">
                    ${!hideHeaderForLetterhead ? `
                        <div class="header-box">
                            <img src="/logo-mono-white.png" class="logo-img" alt="GLX Logo" />
                            <div class="sheet-title">EMPLOYEE PAYMENT SHEET</div>
                            <hr class="divider-line" />
                        </div>
                    ` : `
                        <div class="header-box" style="padding-top: 25mm;">
                            <div class="sheet-title">EMPLOYEE PAYMENT SHEET</div>
                            <hr class="divider-line" />
                        </div>
                    `}

                    <table class="meta-table">
                        <tr>
                            <td class="meta-label">Name</td>
                            <td class="meta-sep">:</td>
                            <td class="meta-val meta-val-bold">${empName}</td>
                            <td colspan="3"></td>
                        </tr>
                        <tr>
                            <td class="meta-label">Salary Per Hour</td>
                            <td class="meta-sep">:</td>
                            <td class="meta-val">${formatPrintCurrency(effectiveHourlyRate)}</td>
                            <td colspan="3"></td>
                        </tr>
                        <tr>
                            <td class="meta-label">Date From</td>
                            <td class="meta-sep">:</td>
                            <td class="meta-val" style="width: 160px;">${formatPrintDate(startDate)}</td>
                            <td class="meta-label" style="width: 80px; text-align: right;">Date To</td>
                            <td class="meta-sep">:</td>
                            <td class="meta-val">${formatPrintDate(endDate)}</td>
                        </tr>
                    </table>

                    <table class="data-table">
                        <thead>
                            <tr>
                                <th class="text-left" style="width: 17%;">Date</th>
                                <th class="text-center" style="width: 15%;">IN</th>
                                <th class="text-center" style="width: 15%;">OUT</th>
                                <th class="text-center" style="width: 15%;">HOURS</th>
                                <th class="text-right" style="width: 19%;">DAY SALARY</th>
                                <th class="text-right" style="width: 19%;">ADVANCE</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                    <div class="table-bottom-line"></div>

                    <table class="summary-table">
                        <tr>
                            <td class="font-bold text-left">Basic Salary</td>
                            <td class="text-right">${formatPrintCurrency(dynamicTotals.basicSalary)}</td>
                        </tr>
                        ${dynamicTotals.otCommission > 0 ? `
                        <tr>
                            <td class="font-bold text-left">OT / Commission</td>
                            <td class="text-right">${formatPrintCurrency(dynamicTotals.otCommission)}</td>
                        </tr>
                        ` : ''}
                        <tr style="border-top: 1px solid #000;">
                            <td class="font-bold text-left">Total Salary</td>
                            <td class="text-right">${formatPrintCurrency(dynamicTotals.totalSalary)}</td>
                        </tr>
                        <tr class="line-single">
                            <td class="font-bold text-left" style="padding-bottom: 3px;">Total Advances</td>
                            <td class="text-right" style="padding-bottom: 3px;">${formatPrintCurrency(dynamicTotals.totalAdvance)}</td>
                        </tr>
                        ${includeEpfEtf && dynamicTotals.epfEmployeeDeduction > 0 ? `
                            <tr class="line-single">
                                <td class="font-bold text-left" style="padding-bottom: 3px;">EPF (${epfEmployeeRate}%)</td>
                                <td class="text-right" style="padding-bottom: 3px;">-${formatPrintCurrency(dynamicTotals.epfEmployeeDeduction)}</td>
                            </tr>
                        ` : ''}
                        <tr class="line-double">
                            <td class="font-bold text-left" style="padding-top: 4px; padding-bottom: 3px;">Net Salary</td>
                            <td class="font-bold text-right" style="padding-top: 4px; padding-bottom: 3px;">${formatPrintCurrency(dynamicTotals.netSalary)}</td>
                        </tr>
                    </table>
                </div>
            </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (err) {
                console.error('Print iframe error:', err);
                window.print();
            }
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    iframe.remove();
                }
            }, 3000);
        }, 300);
    };

    // Executive PDF Download Function - Exact 6-Column Layout Matching GLX Physical Paysheet
    const handleDownloadOfficialPdf = async () => {
        try {
            toast.loading('Generating official PDF...', { id: 'pdf-toast' });
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const empName = employeeFullName || 'Employee';
            const logoData = await getLogoDataUrl();

            let currentY = 10;

            if (!hideHeaderForLetterhead) {
                if (logoData) {
                    // Centered GLX Monochrome Logo (210mm A4 width -> (210 - 22) / 2 = 94mm)
                    doc.addImage(logoData, 'PNG', 94, currentY, 22, 21.7);
                    currentY += 21.7 + 6.5; // Clear separation so text never collides with logo
                } else {
                    currentY += 10;
                }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.text('EMPLOYEE PAYMENT SHEET', 105, currentY, { align: 'center' });
                currentY += 3.5;

                // Horizontal divider line
                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.25);
                doc.line(15, currentY, 195, currentY);
                currentY += 5.5;
            } else {
                currentY += 25;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.text('EMPLOYEE PAYMENT SHEET', 105, currentY, { align: 'center' });
                currentY += 3.5;
                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.25);
                doc.line(15, currentY, 195, currentY);
                currentY += 5.5;
            }

            // Header Metadata Rows
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Name', 15, currentY);
            doc.text(':', 48, currentY);
            doc.text(empName, 52, currentY);
            currentY += 5;

            doc.setFont('helvetica', 'bold');
            doc.text('Salary Per Hour', 15, currentY);
            doc.text(':', 48, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(formatPrintCurrency(effectiveHourlyRate), 52, currentY);
            currentY += 5;

            doc.setFont('helvetica', 'bold');
            doc.text('Date From', 15, currentY);
            doc.text(':', 48, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(formatPrintDate(startDate), 52, currentY);

            doc.setFont('helvetica', 'bold');
            doc.text('Date To', 105, currentY);
            doc.text(':', 125, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(formatPrintDate(endDate), 129, currentY);
            currentY += 5.5;

            // 6-Column Data Rows
            const tableBody = printableRows.map(r => [
                formatPrintDate(r.date),
                formatPrintTime(r.inTime || r.in),
                formatPrintTime(r.outTime || r.out),
                formatPrintDuration(r),
                formatPrintCurrency(r.daySalary),
                formatPrintCurrency(r.advance)
            ]);

            autoTable(doc, {
                startY: currentY,
                margin: { left: 15, right: 15 },
                theme: 'plain',
                head: [['Date', 'IN', 'OUT', 'HOURS', 'DAY SALARY', 'ADVANCE']],
                body: tableBody,
                styles: {
                    font: 'helvetica',
                    fontSize: 8.5,
                    cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
                    textColor: [0, 0, 0],
                    lineWidth: 0
                },
                headStyles: {
                    fillColor: [255, 255, 255],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    lineWidth: { top: 0.25, bottom: 0.25 },
                    lineColor: [0, 0, 0]
                },
                columnStyles: {
                    0: { cellWidth: 30, halign: 'left' },
                    1: { cellWidth: 26, halign: 'center' },
                    2: { cellWidth: 26, halign: 'center' },
                    3: { cellWidth: 26, halign: 'center' },
                    4: { cellWidth: 36, halign: 'right' },
                    5: { cellWidth: 36, halign: 'right' }
                }
            });

            const finalTableY = doc.lastAutoTable.finalY;
            // Horizontal rule below table
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.25);
            doc.line(15, finalTableY, 195, finalTableY);

            // Right-Aligned Summary Box
            let sumY = finalTableY + 4.5;
            const labelX = 135;
            const valX = 195;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('Basic Salary', labelX, sumY);
            doc.setFont('helvetica', 'normal');
            doc.text(formatPrintCurrency(dynamicTotals.basicSalary), valX, sumY, { align: 'right' });

            if (dynamicTotals.otCommission > 0) {
                sumY += 5;
                doc.setFont('helvetica', 'bold');
                doc.text('OT / Commission', labelX, sumY);
                doc.setFont('helvetica', 'normal');
                doc.text(formatPrintCurrency(dynamicTotals.otCommission), valX, sumY, { align: 'right' });
            }

            sumY += 5;
            doc.setFont('helvetica', 'bold');
            doc.text('Total Salary', labelX, sumY);
            doc.setFont('helvetica', 'normal');
            doc.text(formatPrintCurrency(dynamicTotals.totalSalary), valX, sumY, { align: 'right' });

            sumY += 5;
            doc.setFont('helvetica', 'bold');
            doc.text('Total Advances', labelX, sumY);
            doc.setFont('helvetica', 'normal');
            doc.text(formatPrintCurrency(dynamicTotals.totalAdvance), valX, sumY, { align: 'right' });

            // Single underline under Total Advances
            doc.setLineWidth(0.25);
            doc.line(labelX, sumY + 1.2, valX, sumY + 1.2);

            if (includeEpfEtf && dynamicTotals.epfEmployeeDeduction > 0) {
                sumY += 5;
                doc.setFont('helvetica', 'bold');
                doc.text(`EPF (${epfEmployeeRate}%)`, labelX, sumY);
                doc.setFont('helvetica', 'normal');
                doc.text(`-${formatPrintCurrency(dynamicTotals.epfEmployeeDeduction)}`, valX, sumY, { align: 'right' });
                doc.line(labelX, sumY + 1.2, valX, sumY + 1.2);
            }

            sumY += 5.5;
            doc.setFont('helvetica', 'bold');
            doc.text('Net Salary', labelX, sumY);
            doc.text(formatPrintCurrency(dynamicTotals.netSalary), valX, sumY, { align: 'right' });

            // Double underline under Net Salary
            doc.setLineWidth(0.25);
            doc.line(labelX, sumY + 1.2, valX, sumY + 1.2);
            doc.line(labelX, sumY + 1.8, valX, sumY + 1.8);

            doc.save(`Payment_Sheet_${empName.replace(/\s+/g, '_')}_${startDate}.pdf`);
            toast.dismiss('pdf-toast');
            toast.success('Official Payment Sheet PDF downloaded!');
        } catch (err) {
            console.error('PDF generation error:', err);
            toast.dismiss('pdf-toast');
            toast.error('Failed to export PDF: ' + err.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-3 sm:p-6 font-sans text-slate-900 w-full print:bg-white print:p-0">
            
            {/* PRISTINE EXECUTIVE PRINT CSS */}
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 5mm 6mm 5mm 6mm;
                    }
                    html, body {
                        background: #ffffff !important;
                        color: #000000 !important;
                        font-family: Arial, "Helvetica Neue", Helvetica, sans-serif !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        width: 100% !important;
                        height: auto !important;
                        min-height: auto !important;
                        overflow: visible !important;
                        overflow-y: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    /* Hide App Navigation, Top Bars, Shortcuts */
                    .print\\:hidden, header, nav, .keyboard-shortcuts-bar, aside, #main-header, #tabs-bar {
                        display: none !important;
                    }
                    /* Neutralize App Layout fixed-height scrolling containers */
                    main, #main-content, div.h-screen, div.overflow-hidden, div[class*="overflow-y-auto"], div[class*="overflow-x-auto"] {
                        height: auto !important;
                        min-height: auto !important;
                        max-height: none !important;
                        overflow: visible !important;
                        overflow-y: visible !important;
                        overflow-x: visible !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                    }
                    /* ELIMINATE ALL SCROLLBARS FROM PRINT OUT */
                    ::-webkit-scrollbar {
                        display: none !important;
                        width: 0 !important;
                        height: 0 !important;
                    }
                    * {
                        scrollbar-width: none !important;
                        -ms-overflow-style: none !important;
                    }
                    .sheet-print-container {
                        max-width: 100% !important;
                        width: 100% !important;
                        border: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        overflow: visible !important;
                    }
                    body.payslip-modal-open .sheet-print-container {
                        display: none !important;
                    }
                    .print-hide-input {
                        display: none !important;
                    }
                    .print-show-text {
                        display: block !important;
                    }
                    .print-show-inline {
                        display: inline-block !important;
                    }
                    .bg-\\[\\#BAC8E8\\] {
                        background-color: #BAC8E8 !important;
                    }
                    .bg-\\[\\#D9D9D9\\] {
                        background-color: #D9D9D9 !important;
                    }
                    .bg-\\[\\#FFF2CC\\] {
                        background-color: #FFF2CC !important;
                    }
                    .bg-\\[\\#E2EFDA\\] {
                        background-color: #E2EFDA !important;
                    }
                    .bg-\\[\\#FCE8E6\\] {
                        background-color: #FCE8E6 !important;
                    }
                    .text-\\[\\#C00000\\] {
                        color: #C00000 !important;
                    }
                    .overflow-x-auto, div:has(> table) {
                        overflow: visible !important;
                        overflow-y: visible !important;
                        max-height: none !important;
                        border: none !important;
                    }
                    table {
                        border-collapse: collapse !important;
                        width: 100% !important;
                        margin-bottom: 1.5mm !important;
                    }
                    thead {
                        display: table-header-group !important;
                    }
                    tbody {
                        display: table-row-group !important;
                    }
                    th, td {
                        border: 1px solid #000000 !important;
                        padding: 1px 2px !important;
                        font-size: 8px !important;
                        line-height: 1.15 !important;
                    }
                    tr {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .signature-section {
                        display: block !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        margin-top: 2.5mm !important;
                        padding-top: 2mm !important;
                    }
                }
            `}</style>

            {/* TOP EXECUTIVE APP BAR (Screen Only - Fills Full Screen Width) */}
            <div className="w-full mb-3 print:hidden">
                <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 shadow-xs mb-2 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                            Employee Payment Record Sheet
                        </h1>
                    </div>

                    {/* Live Overview Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                        <div className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-center min-w-[75px]">
                            <span className="text-[9px] text-slate-500 font-semibold block uppercase">Days Worked</span>
                            <span className="font-bold text-slate-900 font-mono text-xs">{dynamicTotals.totalDays}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-center min-w-[75px]">
                            <span className="text-[9px] text-slate-500 font-semibold block uppercase">Total Hours</span>
                            <span className="font-bold text-slate-900 font-mono text-xs">{dynamicTotals.totalHours}</span>
                        </div>
                        <div className="bg-indigo-50/80 border border-indigo-200 px-2.5 py-1 rounded-lg text-center min-w-[95px]">
                            <span className="text-[9px] text-indigo-700 font-semibold block uppercase">Net Payable</span>
                            <span className="font-extrabold text-indigo-950 font-mono text-xs">
                                Rs. {Number(dynamicTotals.netSalary).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Keyboard Navigation Shortcuts Bar (Screen Only) */}
                <div className="flex items-center justify-between text-[10px] bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1 text-slate-600 mb-2 shadow-2xs">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                            <Keyboard size={12} className="text-indigo-600" />
                            Shortcuts:
                        </span>
                        <span><kbd className="bg-white border border-slate-300 px-1 py-0.2 rounded font-mono font-semibold text-[9px]">Enter</kbd> Down</span>
                        <span><kbd className="bg-white border border-slate-300 px-1 py-0.2 rounded font-mono font-semibold text-[9px]">Tab</kbd> Next</span>
                        <span><kbd className="bg-white border border-slate-300 px-1 py-0.2 rounded font-mono font-semibold text-[9px]">Space</kbd> Tick</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span><kbd className="bg-white border border-slate-300 px-1 py-0.2 rounded font-mono font-semibold text-[9px]">Ctrl+S</kbd> Save</span>
                        <span><kbd className="bg-white border border-slate-300 px-1 py-0.2 rounded font-mono font-semibold text-[9px]">Ctrl+P</kbd> Print</span>
                        <span><kbd className="bg-white border border-slate-300 px-1 py-0.2 rounded font-mono font-semibold text-[9px]">Alt+A</kbd> Advance</span>
                    </div>
                </div>

                {/* Streamlined Action Control Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Left Workflow Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            onClick={() => navigate('/hr/daily-manual-attendance')}
                            className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 text-slate-700 rounded-lg shadow-xs hover:bg-slate-50 hover:border-slate-400 flex items-center gap-1.5 transition cursor-pointer"
                        >
                            <ArrowLeft size={13} className="text-slate-500" />
                            Daily Attendance Grid
                        </button>
                        
                        <button
                            onClick={() => setIsPoliciesModalOpen(true)}
                            className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 text-slate-800 rounded-lg shadow-xs hover:bg-slate-50 hover:border-slate-400 flex items-center gap-1.5 transition cursor-pointer"
                            title="Configure Late Arrival rules, grace cover hours, absent cuts and EPF/ETF rates"
                        >
                            <Sliders size={13} className="text-slate-600" />
                            Salary Policies
                        </button>

                        <button
                            onClick={handleFillAllDays}
                            className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 text-slate-800 rounded-lg shadow-xs hover:bg-slate-50 hover:border-slate-400 flex items-center gap-1.5 transition cursor-pointer"
                            title="Auto-tick all days with default shift hours & apply policies"
                        >
                            <CheckCheck size={13} className="text-slate-600" />
                            Fill Shift Hours
                        </button>

                        <button
                            onClick={() => setIsPayslipModalOpen(true)}
                            className="px-3 py-1 text-xs font-semibold bg-[#131943] hover:bg-[#1a2259] text-white rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                            title="View and download modern executive salary slip"
                        >
                            <FileText size={13} className="text-emerald-400" />
                            Salary Slip
                        </button>

                        <button
                            onClick={() => setIsAdvanceModalOpen(true)}
                            className="px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                            title="Record salary advance for this employee"
                        >
                            <Plus size={13} className="text-white" />
                            Record Advance
                        </button>
                    </div>

                    {/* Right Output & Print Controls */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setHideHeaderForLetterhead(!hideHeaderForLetterhead)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition cursor-pointer ${
                                hideHeaderForLetterhead
                                    ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                            title={hideHeaderForLetterhead ? 'For printing on pre-printed letterhead paper' : 'Print with company header'}
                        >
                            {hideHeaderForLetterhead ? <EyeOff size={12} className="text-amber-700" /> : <Eye size={12} className="text-slate-500" />}
                            {hideHeaderForLetterhead ? 'Letterhead' : 'Header'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsPrintPreviewOpen(true)}
                            className="px-3 py-1 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 border border-indigo-200 rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                            title="Open official paper print preview matching GLX physical paysheet"
                        >
                            <Eye size={13} className="text-indigo-600 dark:text-indigo-400" />
                            Print Preview
                        </button>

                        <button
                            type="button"
                            onClick={handleDownloadOfficialPdf}
                            className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                            <Download size={13} className="text-slate-600" />
                            PDF
                        </button>

                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-3 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                            <Printer size={13} />
                            Print
                        </button>

                        <button
                            onClick={() => refetch()}
                            disabled={Boolean(isFetching)}
                            className="p-1 text-xs bg-white border border-slate-300 rounded-lg shadow-xs hover:bg-slate-50 text-slate-700 transition cursor-pointer"
                            title="Reload sheet"
                        >
                            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* SPREADSHEET PAGE CANVAS (Interactive on-screen spreadsheet - Fills Full Screen Width) */}
            <div ref={sheetPrintRef} className="sheet-print-container w-full bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-xs print:hidden">
                
                {/* Optional Company Letterhead Banner (Print Only) */}
                {!hideHeaderForLetterhead && (
                    <div className="hidden print:block mb-2 pb-2 border-b-2 border-black">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-lg font-black tracking-wider uppercase text-black font-sans leading-tight">
                                    {systemSettings.companyName || 'GLX INDUSTRIES'}
                                </h1>
                                <p className="text-[9px] font-semibold text-gray-700 tracking-wide uppercase mt-0.5">
                                    {systemSettings.companyAddress || 'High-Quality Manufacturing & Vehicle Body Engineering'}
                                </p>
                            </div>
                            <div className="text-right text-[8.5px] font-mono text-gray-800 space-y-0.5">
                                <p>Tel: {systemSettings.companyPhone || '+94 11 234 5678'}</p>
                                <p>Email: {systemSettings.companyEmail || 'info@glx.lk'}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* DEDICATED EXECUTIVE PRINT SUMMARY BLOCK (Print Only) */}
                <div className="hidden print:block mb-2.5">
                    {/* Title & Payroll No Header */}
                    <div className="flex justify-between items-center bg-gray-100 border border-black px-2.5 py-1 mb-2">
                        <span className="text-[11.5px] font-black uppercase tracking-widest text-black">
                            EMPLOYEE PAYMENT RECORD SHEET
                        </span>
                        <div className="text-[10px] font-mono font-bold text-black flex items-center gap-1.5">
                            <span className="uppercase text-gray-700">Payroll No:</span>
                            <span className="font-extrabold text-[11px] bg-white px-2 py-0.5 border border-black">
                                {currentEmployee.payrollNumber || 'EMP-13'}
                            </span>
                        </div>
                    </div>

                    {/* Structured 2-Column Summary Cards with Clean Corporate Borders */}
                    <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                        {/* Left Column: Employee & Shift Parameters */}
                        <table className="w-full border border-black border-collapse text-[9px]">
                            <tbody>
                                <tr className="border-b border-black">
                                    <td className="bg-[#BAC8E8]/40 font-bold px-2 py-1 w-32 border-r border-black uppercase text-gray-800">Employee Name</td>
                                    <td className="px-2 py-1 font-bold text-black text-[10px]">{employeeFullName}</td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td className="bg-[#BAC8E8]/40 font-bold px-2 py-1 border-r border-black uppercase text-gray-800">Hourly Wage Rate</td>
                                    <td className="px-2 py-1 font-mono font-bold text-black">Rs. {Number(effectiveHourlyRate).toFixed(2)} / Hr</td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td className="bg-[#BAC8E8]/40 font-bold px-2 py-1 border-r border-black uppercase text-gray-800">Pay Period</td>
                                    <td className="px-2 py-1 font-mono font-semibold">{startDate} &nbsp;to&nbsp; {endDate}</td>
                                </tr>
                                <tr>
                                    <td className="bg-[#BAC8E8]/40 font-bold px-2 py-1 border-r border-black uppercase text-gray-800">Standard Shift</td>
                                    <td className="px-2 py-1 font-mono">{onTime} - {offTime}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Right Column: Attendance & Compensation Totals */}
                        <table className="w-full border border-black border-collapse text-[9px]">
                            <tbody>
                                <tr className="border-b border-black">
                                    <td className="bg-[#BAC8E8]/40 font-bold px-2 py-1 w-36 border-r border-black uppercase text-gray-800">Days / Hours Worked</td>
                                    <td className="px-2 py-1 font-mono font-bold text-black">
                                        {dynamicTotals.totalDays} Days &nbsp;|&nbsp; {dynamicTotals.totalHours} Hrs
                                        <span className="text-[8px] font-normal text-gray-600 ml-1">({dynamicTotals.totalLeave} Off)</span>
                                    </td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td className="bg-[#BAC8E8]/40 font-bold px-2 py-1 border-r border-black uppercase text-gray-800">Gross Earnings</td>
                                    <td className="px-2 py-1 font-mono font-bold text-right text-black">Rs. {Number(dynamicTotals.totalSalary).toLocaleString()}</td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td className="bg-[#BAC8E8]/40 font-bold px-2 py-1 border-r border-black uppercase text-gray-800">Advance & Deductions</td>
                                    <td className="px-2 py-1 font-mono text-right font-bold text-black">
                                        - Rs. {(Number(dynamicTotals.totalAdvance) + Math.abs(Number(dynamicTotals.totalDeduction) < 0 ? Number(dynamicTotals.totalDeduction) : 0)).toLocaleString()}
                                    </td>
                                </tr>
                                <tr className="bg-[#BAC8E8] font-bold">
                                    <td className="font-extrabold px-2 py-1 border-r border-black uppercase text-black text-[10px]">NET SALARY PAYABLE</td>
                                    <td className="px-2 py-1 font-mono font-black text-right text-black text-[11.5px]">
                                        Rs. {Number(dynamicTotals.netSalary).toLocaleString()}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Screen Only: Ultra-Modern Executive Parameters Deck */}
                <div className="print:hidden space-y-2 mb-2.5">
                    {/* 1. Employee Selection & Status Card (Clean Modern Light Surface) */}
                    <div className="bg-white border border-slate-200/90 rounded-xl p-2 sm:p-2.5 shadow-2xs text-slate-900">
                        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
                            {/* Employee Profile & Autocomplete */}
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-black text-xs shadow-2xs shrink-0">
                                    {employeeFullName ? employeeFullName.slice(0, 2).toUpperCase() : 'EMP'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.2 rounded-full">
                                            Active Employee Record
                                        </span>
                                        {currentEmployee.payrollNumber && (
                                            <span className="text-[9px] font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded-full border border-slate-200">
                                                #{currentEmployee.payrollNumber}
                                            </span>
                                        )}
                                        {currentEmployee.designationId?.title && (
                                            <span className="text-[9px] text-slate-500 font-semibold truncate">
                                                · {currentEmployee.designationId.title}
                                            </span>
                                        )}
                                    </div>
                                    {/* Modern Clean Combobox Search */}
                                    <div className="bg-slate-50 hover:bg-slate-100/70 focus-within:bg-white border border-slate-200 focus-within:border-indigo-500 rounded-lg px-2 py-1 transition">
                                        <EmployeeSearchCombobox
                                            employees={employees}
                                            selectedEmployeeId={selectedEmployeeId}
                                            onSelectEmployee={(empId) => {
                                                setSelectedEmployeeId(empId);
                                                setCustomHourlyRate(null);
                                                setSearchParams({ employeeId: empId, startDate, endDate });
                                            }}
                                            employeeFullName={employeeFullName}
                                            onToggleStatus={handleToggleEmployeeStatus}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Shift Rate Pill & Actions */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <div className="bg-slate-50 border border-slate-200/90 rounded-lg px-3 py-1 text-center min-w-[110px]">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Wage Rate / Hr</span>
                                    <div className="flex items-center justify-center gap-1">
                                        <span className="text-[11px] text-emerald-600 font-bold">Rs.</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={effectiveHourlyRate}
                                            onChange={(e) => handleHourlyRateChange(e.target.value)}
                                            onFocus={handleCellSelectAll}
                                            className="bg-transparent text-slate-900 font-bold font-mono text-sm w-12 text-center outline-none focus:bg-white rounded border border-transparent focus:border-slate-300"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={saveMutation.isPending}
                                    className="px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    <Save size={14} className={saveMutation.isPending ? 'animate-spin' : ''} />
                                    {saveMutation.isPending ? 'Saving...' : 'Save Sheet'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 2. Shift & Date Range Control Deck (Clean 3-tile grid) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {/* Tile A: Shift Hours */}
                        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                                Shift Working Hours
                            </span>
                            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                                <div>
                                    <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">ON TIME (In)</label>
                                    <input
                                        ref={onTimeInputRef}
                                        type="text"
                                        inputMode="numeric"
                                        value={onTime}
                                        placeholder="08:00"
                                        maxLength={5}
                                        onChange={(e) => {
                                            const formatted = formatTimeAsYouType(e.target.value);
                                            setOnTime(formatted);
                                            if (formatted.length === 5 && /^([01]\d|2[0-3]):[0-5]\d$/.test(formatted)) {
                                                applyShiftWorkingHours(formatted, offTime, true);
                                            }
                                        }}
                                        onBlur={(e) => {
                                            const norm = normalizeTimeString(e.target.value, '08:00');
                                            applyShiftWorkingHours(norm, offTime, true);
                                        }}
                                        onFocus={handleCellSelectAll}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const norm = normalizeTimeString(e.target.value, '08:00');
                                                applyShiftWorkingHours(norm, offTime, true);
                                                offTimeInputRef.current?.focus();
                                                offTimeInputRef.current?.select();
                                            }
                                        }}
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white text-center outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">OFF TIME (Out)</label>
                                    <input
                                        ref={offTimeInputRef}
                                        type="text"
                                        inputMode="numeric"
                                        value={offTime}
                                        placeholder="17:00"
                                        maxLength={5}
                                        onChange={(e) => {
                                            const formatted = formatTimeAsYouType(e.target.value);
                                            setOffTime(formatted);
                                            if (formatted.length === 5 && /^([01]\d|2[0-3]):[0-5]\d$/.test(formatted)) {
                                                applyShiftWorkingHours(onTime, formatted, true);
                                            }
                                        }}
                                        onBlur={(e) => {
                                            const norm = normalizeTimeString(e.target.value, '17:00');
                                            applyShiftWorkingHours(onTime, norm, true);
                                        }}
                                        onFocus={handleCellSelectAll}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const norm = normalizeTimeString(e.target.value, '17:00');
                                                applyShiftWorkingHours(onTime, norm, true);
                                                focusGridCell(0, 1, 'next');
                                            }
                                        }}
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white text-center outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    applyShiftWorkingHours(onTime, offTime, true);
                                    toast.success(`Applied ${onTime} - ${offTime} to all rows`);
                                }}
                                className="w-full mt-1 py-1 px-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm"
                                title="Set all table rows below to these shift hours"
                            >
                                ⚡ Apply Shift to All Rows
                            </button>
                        </div>

                        {/* Tile B: Pay Period Date Range */}
                        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                                Pay Period Range
                            </span>
                            <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                    <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">DATE FROM</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => {
                                            setStartDate(e.target.value);
                                            setSearchParams({ employeeId: selectedEmployeeId, startDate: e.target.value, endDate });
                                        }}
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">DATE TO</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => {
                                            setEndDate(e.target.value);
                                            setSearchParams({ employeeId: selectedEmployeeId, startDate, endDate: e.target.value });
                                        }}
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    applyShiftWorkingHours(onTime, offTime);
                                    toast.success(`Applied ${onTime} - ${offTime} to all rows`);
                                }}
                                className="w-full mt-1 py-1 px-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm"
                                title="Set all table rows below to these shift hours"
                            >
                                ⚡ Apply Shift to All Rows
                            </button>
                        </div>

                        {/* Tile C: Statutory & Advance Control */}
                        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Statutory & Advance
                                </span>
                                <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-indigo-700 dark:text-indigo-400">
                                    <input
                                        type="checkbox"
                                        checked={includeEpfEtf}
                                        onChange={(e) => setIncludeEpfEtf(e.target.checked)}
                                        className="w-3 h-3 accent-indigo-600 rounded cursor-pointer"
                                    />
                                    <span>EPF / ETF ({epfEmployeeRate}%)</span>
                                </label>
                            </div>

                            <div className="flex items-center justify-between gap-1.5 mt-1.5">
                                <div className="flex-1">
                                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block">Total Month Advance</span>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rs.</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={dynamicTotals.totalAdvance === 0 ? '' : dynamicTotals.totalAdvance}
                                            placeholder="0"
                                            onChange={(e) => handleHeaderAdvanceChange(e.target.value)}
                                            onFocus={handleCellSelectAll}
                                            className="w-full pl-6 pr-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 text-right"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsAdvanceModalOpen(true)}
                                    className="mt-3.5 p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 transition cursor-pointer"
                                    title="Record advance payment"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 3. Live Financial KPI Metric Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Days Worked</span>
                            <span className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white">{dynamicTotals.totalDays}</span>
                            <span className="text-[8.5px] text-slate-400 block">({dynamicTotals.totalLeave} Off)</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Hours</span>
                            <span className="text-sm sm:text-base font-black font-mono text-indigo-600 dark:text-indigo-400">{dynamicTotals.totalHours}</span>
                            <span className="text-[8.5px] text-slate-400 block">worked</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Gross Earnings</span>
                            <span className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white">Rs. {Math.round(dynamicTotals.totalSalary).toLocaleString()}</span>
                            <span className="text-[8.5px] text-slate-400 block">
                                Basic: Rs. {Math.round(dynamicTotals.basicSalary).toLocaleString()} {dynamicTotals.otCommission > 0 ? `| OT: Rs. ${Math.round(dynamicTotals.otCommission).toLocaleString()}` : ''}
                            </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Advance Taken</span>
                            <span className="text-sm sm:text-base font-black font-mono text-amber-600 dark:text-amber-400">Rs. {Math.round(dynamicTotals.totalAdvance).toLocaleString()}</span>
                            <span className="text-[8.5px] text-slate-400 block">deducted</span>
                        </div>
                        {includeEpfEtf && (
                            <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                                <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider block">EPF ({epfEmployeeRate}%)</span>
                                <span className="text-sm sm:text-base font-black font-mono text-rose-600">-Rs. {Math.round(dynamicTotals.epfEmployeeDeduction).toLocaleString()}</span>
                                <span className="text-[8.5px] text-slate-400 block">statutory</span>
                            </div>
                        )}
                        <div className={`bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-300 dark:border-emerald-800 p-2 rounded-xl text-center ${includeEpfEtf ? '' : 'col-span-2 sm:col-span-1'}`}>
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">Net Payable</span>
                            <span className="text-base sm:text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
                                Rs. {Math.round(dynamicTotals.netSalary).toLocaleString()}
                            </span>
                            <span className="text-[8.5px] text-emerald-700/80 font-bold block">Take home</span>
                        </div>
                    </div>
                </div>

                {/* 3. Detailed Table Grid (Colors Matching Screenshot Exactly) */}
                {isLoading ? (
                    <div className="py-20 text-center text-gray-500">
                        <RefreshCw size={24} className="animate-spin text-blue-600 mx-auto mb-2" />
                        <p className="font-semibold text-xs">Loading sheet rows...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-270px)] border border-slate-200 rounded-2xl shadow-xs mb-3 relative">
                        <table className="w-full border-collapse text-xs font-sans">
                            <thead className="sticky top-0 z-20 bg-slate-100 shadow-xs border-b border-slate-300 select-none">
                                <tr className="border-b border-slate-300 font-black text-slate-800 text-center text-[12px] uppercase tracking-wider">
                                    <th className="sticky top-0 z-20 bg-slate-100 border-r border-slate-200 py-2.5 px-1.5 w-12 text-slate-800">
                                        <button
                                            type="button"
                                            onClick={handleFillAllDays}
                                            className="text-[10px] text-indigo-600 underline font-bold print-hide-input hover:text-indigo-800 cursor-pointer"
                                            title="Click to check all days & apply policies"
                                        >
                                            TICK
                                        </button>
                                        <span className="hidden print:inline font-bold text-black">TICK</span>
                                    </th>
                                    <th className="sticky top-0 z-20 bg-slate-100 border-r border-slate-200 py-2.5 px-2 w-16 text-slate-800">DATE</th>
                                    <th className="sticky top-0 z-20 bg-slate-100 border-r border-slate-200 py-2.5 px-2 w-28 text-slate-800">DAY</th>
                                    <th className="sticky top-0 z-20 bg-slate-100 border-r border-slate-200 py-2.5 px-1 w-24 text-slate-800">IN</th>
                                    <th className="sticky top-0 z-20 bg-slate-100 border-r border-slate-200 py-2.5 px-1 w-24 text-slate-800">OUT</th>
                                    <th className="sticky top-0 z-20 bg-slate-100 border-r border-slate-200 py-2.5 px-2 w-20 text-slate-800">HOURS</th>
                                    <th className="sticky top-0 z-20 bg-slate-100 border-r border-slate-200 py-2.5 px-2 w-28 text-right text-slate-800">DAY SALARY</th>
                                    <th className="sticky top-0 z-20 bg-slate-100 border-r border-slate-200 py-2.5 px-2 w-24 text-right text-slate-800">ADVANCE</th>
                                    <th className="sticky top-0 z-20 bg-slate-100 border-r border-slate-200 py-2.5 px-2 w-24 text-right text-slate-800">DEDUCTION</th>
                                    <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-2 text-left w-36 text-slate-800">REASON</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, idx) => (
                                    <tr 
                                        key={row.date || idx} 
                                        className={`border-b border-slate-100 dark:border-slate-800/80 print:border-black transition-colors ${
                                            !row.isTicked ? 'opacity-80' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                                        }`}
                                    >
                                        {/* 1. TICK (Checkbox) */}
                                        <td className="border-r border-slate-200 dark:border-slate-800 print:border-black bg-amber-50/40 dark:bg-amber-950/20 print:bg-[#FFF2CC] text-center p-1">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(row.isTicked)}
                                                onChange={(e) => handleRowChange(idx, 'isTicked', e.target.checked)}
                                                data-grid-cell="true"
                                                data-row={idx}
                                                data-col={0}
                                                onKeyDown={(e) => handleCellKeyDown(e, idx, 0)}
                                                className="w-4 h-4 cursor-pointer accent-emerald-600 print-hide-input focus:ring-2 focus:ring-emerald-500 rounded transition"
                                            />
                                            <span className="hidden print:inline font-bold text-black text-xs">
                                                {row.isTicked ? '✓' : ''}
                                            </span>
                                        </td>

                                        {/* 2. DATE */}
                                        <td className={`border-r border-slate-200 dark:border-slate-800 print:border-black px-1.5 py-1 text-center font-bold font-mono text-[16px] print:text-xs ${
                                            row.day === 'SUNDAY' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 print:bg-[#FCE8E6] print:text-[#C00000]' : 'bg-slate-50/70 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 print:bg-[#E2EFDA] print:text-black font-bold'
                                        }`}>
                                            {row.date ? row.date.substring(5) : ''}
                                        </td>

                                        {/* 3. DAY */}
                                        <td className={`border-r border-slate-200 dark:border-slate-800 print:border-black px-2 py-1 font-bold font-mono uppercase text-[15px] print:text-xs ${
                                            row.day === 'SUNDAY' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 print:bg-[#FCE8E6] print:text-[#C00000]' : 'bg-slate-50/70 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 print:bg-[#E2EFDA] print:text-black'
                                        }`}>
                                            {row.day}
                                        </td>

                                        {/* 4. IN TIME */}
                                        <td className="border-r border-slate-200 dark:border-slate-800 print:border-black bg-emerald-50/30 dark:bg-emerald-950/20 print:bg-[#FFF2CC] p-1 text-center font-mono">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={row.isTicked ? (row.inTime || onTime) : ''}
                                                placeholder={onTime || '08:00'}
                                                maxLength={5}
                                                onChange={(e) => {
                                                    const formatted = formatTimeAsYouType(e.target.value);
                                                    handleRowChange(idx, 'inTime', formatted);
                                                }}
                                                onBlur={(e) => {
                                                    if (!row.isTicked) return;
                                                    const formatted = normalizeTimeString(e.target.value, onTime);
                                                    handleRowChange(idx, 'inTime', formatted);
                                                }}
                                                onFocus={(e) => {
                                                    if (!row.isTicked) {
                                                        handleRowChange(idx, 'isTicked', true);
                                                    }
                                                    handleCellSelectAll(e);
                                                }}
                                                onMouseUp={handleCellSelectAll}
                                                onClick={handleCellSelectAll}
                                                data-grid-cell="true"
                                                data-row={idx}
                                                data-col={1}
                                                onKeyDown={(e) => handleCellKeyDown(e, idx, 1)}
                                                className={`w-full bg-transparent text-center focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-none px-1 py-0.5 rounded text-[16px] font-mono font-bold ${row.isTicked ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'} print:text-black print:text-xs print-hide-input cursor-text`}
                                            />
                                            <span className="hidden print:inline font-mono font-semibold text-black">
                                                {row.isTicked ? (row.inTime || onTime) : ''}
                                            </span>
                                        </td>

                                        {/* 5. OUT TIME */}
                                        <td className="border-r border-slate-200 dark:border-slate-800 print:border-black bg-amber-50/30 dark:bg-amber-950/20 print:bg-[#FFF2CC] p-1 text-center font-mono">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={row.isTicked ? (row.outTime || offTime) : ''}
                                                placeholder={offTime || '17:00'}
                                                maxLength={5}
                                                onChange={(e) => {
                                                    const formatted = formatTimeAsYouType(e.target.value);
                                                    handleRowChange(idx, 'outTime', formatted);
                                                }}
                                                onBlur={(e) => {
                                                    if (!row.isTicked) return;
                                                    const formatted = normalizeTimeString(e.target.value, offTime);
                                                    handleRowChange(idx, 'outTime', formatted);
                                                }}
                                                onFocus={(e) => {
                                                    if (!row.isTicked) {
                                                        handleRowChange(idx, 'isTicked', true);
                                                    }
                                                    handleCellSelectAll(e);
                                                }}
                                                onMouseUp={handleCellSelectAll}
                                                onClick={handleCellSelectAll}
                                                data-grid-cell="true"
                                                data-row={idx}
                                                data-col={2}
                                                onKeyDown={(e) => handleCellKeyDown(e, idx, 2)}
                                                className={`w-full bg-transparent text-center focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-none px-1 py-0.5 rounded text-[16px] font-mono font-bold ${row.isTicked ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'} print:text-black print:text-xs print-hide-input cursor-text`}
                                            />
                                            <span className="hidden print:inline font-mono font-semibold text-black">
                                                {row.isTicked ? (row.outTime || offTime) : ''}
                                            </span>
                                        </td>

                                        {/* 6. HOURS (Locked / Read-Only Calculated) */}
                                        <td className="border-r border-slate-200 dark:border-slate-800 print:border-black bg-slate-50/50 dark:bg-slate-900/40 print:bg-[#E2EFDA] p-1 text-center font-mono select-none cursor-not-allowed" title="Hours are auto-calculated from IN and OUT times">
                                            <span className="block py-0.5 text-[16px] font-mono font-semibold text-slate-900 dark:text-white print:text-black print:text-xs">
                                                {row.isTicked && row.hours > 0 ? row.hours : ''}
                                            </span>
                                        </td>

                                        {/* 7. DAY SALARY (Locked / Read-Only Calculated) */}
                                        <td className="border-r border-slate-200 dark:border-slate-800 print:border-black bg-slate-50/50 dark:bg-slate-900/40 print:bg-[#E2EFDA] p-1 text-right font-mono select-none cursor-not-allowed" title="Day Salary is auto-calculated from Hours × Wage Rate">
                                            <span className="block py-0.5 px-1 text-[16px] font-mono font-bold text-emerald-700 dark:text-emerald-400 print:text-black print:text-xs">{row.isTicked && row.daySalary > 0 ? Number(row.daySalary).toLocaleString() : ''}</span>
                                        </td>

                                        {/* 8. ADVANCE */}
                                        <td className="border-r border-slate-200 dark:border-slate-800 print:border-black bg-white dark:bg-slate-900 print:bg-[#FFF2CC] p-1 text-right font-mono">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={row.advance > 0 ? row.advance : ''}
                                                placeholder=""
                                                onChange={(e) => handleRowChange(idx, 'advance', e.target.value)}
                                                onFocus={handleCellSelectAll}
                                                onMouseUp={handleCellSelectAll}
                                                onClick={handleCellSelectAll}
                                                data-grid-cell="true"
                                                data-row={idx}
                                                data-col={5}
                                                onKeyDown={(e) => handleCellKeyDown(e, idx, 5)}
                                                className="w-full bg-transparent text-right focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-none p-0 text-[16px] font-mono font-bold text-amber-700 dark:text-amber-400 print:text-black print:text-xs print-hide-input"
                                                title="Type advance for this date"
                                            />
                                            <span className="hidden print:inline font-mono font-bold text-black">
                                                {row.advance > 0 ? Number(row.advance).toLocaleString() : ''}
                                            </span>
                                        </td>

                                        {/* 9. DEDUCTION */}
                                        <td className={`border-r border-slate-200 dark:border-slate-800 print:border-black print:bg-[#E2EFDA] p-1 text-right font-mono font-bold ${
                                            Number(row.deduction) < 0 || String(row.deduction).startsWith('-')
                                                ? 'bg-rose-50/60 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                                                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 print:text-black'
                                        }`}>
                                            <input
                                                type="text"
                                                inputMode="text"
                                                value={row.deduction !== undefined && row.deduction !== null && row.deduction !== 0 ? row.deduction : ''}
                                                placeholder=""
                                                onChange={(e) => handleRowChange(idx, 'deduction', e.target.value)}
                                                onFocus={handleCellSelectAll}
                                                onMouseUp={handleCellSelectAll}
                                                onClick={handleCellSelectAll}
                                                onBlur={(e) => {
                                                    let val = String(e.target.value).trim();
                                                    if (val === '' || val === '-') {
                                                        handleRowChange(idx, 'deduction', 0);
                                                    } else {
                                                        const num = Number(val);
                                                        if (!isNaN(num)) {
                                                            handleRowChange(idx, 'deduction', num > 0 ? -num : num);
                                                        }
                                                    }
                                                }}
                                                data-grid-cell="true"
                                                data-row={idx}
                                                data-col={6}
                                                onKeyDown={(e) => handleCellKeyDown(e, idx, 6)}
                                                className={`w-full bg-transparent text-right focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-rose-500 focus:outline-none p-0 text-[16px] font-mono font-bold print-hide-input print:text-xs ${
                                                    Number(row.deduction) < 0 || String(row.deduction).startsWith('-')
                                                        ? 'text-rose-700 dark:text-rose-300'
                                                        : 'text-slate-800 dark:text-slate-200 print:text-black'
                                                }`}
                                            />
                                            <span className={`hidden print:inline font-mono font-bold ${row.deduction < 0 ? 'text-black' : 'text-black'}`}>
                                                {row.deduction !== 0 ? row.deduction : ''}
                                            </span>
                                        </td>

                                        {/* 10. REASON */}
                                        <td className="bg-white dark:bg-slate-900 print:bg-[#E2EFDA] p-1">
                                            <input
                                                type="text"
                                                value={row.reason || ''}
                                                placeholder=""
                                                onChange={(e) => handleRowChange(idx, 'reason', e.target.value)}
                                                onFocus={handleCellSelectAll}
                                                onMouseUp={handleCellSelectAll}
                                                onClick={handleCellSelectAll}
                                                data-grid-cell="true"
                                                data-row={idx}
                                                data-col={7}
                                                onKeyDown={(e) => handleCellKeyDown(e, idx, 7)}
                                                className="w-full bg-transparent px-1.5 focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-[15px] font-medium text-slate-800 dark:text-slate-200 print:text-black print:text-xs print-hide-input"
                                            />
                                            <span className="hidden print:inline font-semibold text-black px-1">
                                                {row.reason || ''}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Executive Official Signatures Section */}
                <div className="signature-section pt-3 pb-1 border-t-2 border-black mt-2">
                    <div className="grid grid-cols-4 gap-4 text-[9px] font-bold text-black">
                        <div className="flex flex-col justify-between h-16">
                            <p className="text-gray-900 uppercase font-bold text-[8.5px]">Prepared By:</p>
                            <div>
                                <div className="border-b border-black w-full mb-0.5"></div>
                                <p className="text-[8px] text-gray-700 uppercase font-semibold">HR / Accounts Officer</p>
                                <p className="text-[7.5px] text-gray-500 font-mono">Date: ___ / ___ / 2026</p>
                            </div>
                        </div>

                        <div className="flex flex-col justify-between h-16">
                            <p className="text-gray-900 uppercase font-bold text-[8.5px]">Checked By:</p>
                            <div>
                                <div className="border-b border-black w-full mb-0.5"></div>
                                <p className="text-[8px] text-gray-700 uppercase font-semibold">Operations Manager</p>
                                <p className="text-[7.5px] text-gray-500 font-mono">Date: ___ / ___ / 2026</p>
                            </div>
                        </div>

                        <div className="flex flex-col justify-between h-16">
                            <p className="text-gray-900 uppercase font-bold text-[8.5px]">Employee Signature:</p>
                            <div>
                                <div className="border-b border-black w-full mb-0.5"></div>
                                <p className="text-[8px] text-gray-900 truncate font-bold">{employeeFullName}</p>
                                <p className="text-[7.5px] text-gray-500 font-mono">Date: ___ / ___ / 2026</p>
                            </div>
                        </div>

                        <div className="flex flex-col justify-between h-16">
                            <p className="text-gray-900 uppercase font-bold text-[8.5px]">Authorized Signature & Seal:</p>
                            <div>
                                <div className="border-b border-black w-full mb-0.5"></div>
                                <p className="text-[8px] text-gray-700 uppercase font-semibold">Managing Director / Partner</p>
                                <p className="text-[7.5px] text-gray-500 font-mono">Date: ___ / ___ / 2026</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* DEDICATED OFFICIAL PRINT CONTAINER (Matching GLX Physical Paysheet - Rendered on physical print & used for iframe print) */}
            <div ref={officialPrintRef} className="hidden print:block bg-white text-black font-sans w-full max-w-[800px] mx-auto p-4 print:p-0">
                {/* Centered Brand Header */}
                {!hideHeaderForLetterhead ? (
                    <div className="text-center mb-3">
                        <div className="flex justify-center mb-2">
                            <img
                                src="/logo-mono-white.png"
                                alt="GLX Logo"
                                className="h-12 w-auto object-contain mx-auto"
                            />
                        </div>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-black mt-1.5">
                            EMPLOYEE PAYMENT SHEET
                        </h2>
                        <div className="border-b border-black w-full mt-2.5 mb-3"></div>
                    </div>
                ) : (
                    <div className="text-center mb-3 pt-8">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-black">
                            EMPLOYEE PAYMENT SHEET
                        </h2>
                        <div className="border-b border-black w-full mt-2.5 mb-3"></div>
                    </div>
                )}

                {/* Metadata Section */}
                <table className="w-full text-xs font-sans text-black mb-3 border-collapse">
                    <tbody>
                        <tr>
                            <td className="w-36 font-bold py-0.5">Name</td>
                            <td className="w-5 font-bold text-center py-0.5">:</td>
                            <td className="font-bold py-0.5">{employeeFullName}</td>
                            <td colSpan={3}></td>
                        </tr>
                        <tr>
                            <td className="font-bold py-0.5">Salary Per Hour</td>
                            <td className="font-bold text-center py-0.5">:</td>
                            <td className="font-normal py-0.5">{formatPrintCurrency(effectiveHourlyRate)}</td>
                            <td colSpan={3}></td>
                        </tr>
                        <tr>
                            <td className="font-bold py-0.5">Date From</td>
                            <td className="font-bold text-center py-0.5">:</td>
                            <td className="font-normal py-0.5 w-40">{formatPrintDate(startDate)}</td>
                            <td className="w-20 font-bold text-right py-0.5">Date To</td>
                            <td className="w-5 font-bold text-center py-0.5">:</td>
                            <td className="font-normal py-0.5">{formatPrintDate(endDate)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* 6-Column Data Table */}
                <table className="w-full text-xs font-sans border-collapse mb-0">
                    <thead>
                        <tr className="border-t border-b border-black text-[11px] font-bold text-black uppercase">
                            <th className="py-1.5 px-2 text-left font-bold w-[17%]">Date</th>
                            <th className="py-1.5 px-2 text-center font-bold w-[15%]">IN</th>
                            <th className="py-1.5 px-2 text-center font-bold w-[15%]">OUT</th>
                            <th className="py-1.5 px-2 text-center font-bold w-[15%]">HOURS</th>
                            <th className="py-1.5 px-2 text-right font-bold w-[19%]">DAY SALARY</th>
                            <th className="py-1.5 px-2 text-right font-bold w-[19%]">ADVANCE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {printableRows.map((r, i) => (
                            <tr key={i} className="text-black">
                                <td className="py-1 px-2 text-left">{formatPrintDate(r.date)}</td>
                                <td className="py-1 px-2 text-center font-mono">{formatPrintTime(r.inTime || r.in)}</td>
                                <td className="py-1 px-2 text-center font-mono">{formatPrintTime(r.outTime || r.out)}</td>
                                <td className="py-1 px-2 text-center font-mono">{formatPrintDuration(r)}</td>
                                <td className="py-1 px-2 text-right font-mono">{formatPrintCurrency(r.daySalary)}</td>
                                <td className="py-1 px-2 text-right font-mono">{formatPrintCurrency(r.advance)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="border-b border-black w-full mb-3"></div>

                {/* Bottom Summary Section */}
                <table className="w-64 ml-auto text-xs font-sans text-black border-collapse">
                    <tbody>
                        <tr>
                            <td className="font-bold py-0.5">Total Salary</td>
                            <td className="text-right py-0.5 font-mono">{formatPrintCurrency(dynamicTotals.totalSalary)}</td>
                        </tr>
                        <tr className="border-b border-black">
                            <td className="font-bold py-0.5 pb-1">Total Advances</td>
                            <td className="text-right py-0.5 pb-1 font-mono">{formatPrintCurrency(dynamicTotals.totalAdvance)}</td>
                        </tr>
                        {includeEpfEtf && dynamicTotals.epfEmployeeDeduction > 0 && (
                            <tr className="border-b border-black">
                                <td className="font-bold py-0.5 pb-1">EPF ({epfEmployeeRate}%)</td>
                                <td className="text-right py-0.5 pb-1 font-mono">-{formatPrintCurrency(dynamicTotals.epfEmployeeDeduction)}</td>
                            </tr>
                        )}
                        <tr className="border-b-4 border-double border-black">
                            <td className="font-bold py-1 pt-1.5">Net Salary</td>
                            <td className="font-bold text-right py-1 pt-1.5 font-mono">{formatPrintCurrency(dynamicTotals.netSalary)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* OFFICIAL PRINT PREVIEW MODAL */}
            {isPrintPreviewOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
                    <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-300 dark:border-slate-800 w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-5 py-3.5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                    <Eye size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                        Official Payment Sheet Print Preview
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Exact layout matching GLX Industries physical A4 paysheet
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleDownloadOfficialPdf}
                                    className="px-3.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                                >
                                    <Download size={14} className="text-slate-600 dark:text-slate-300" />
                                    Download PDF
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePrint}
                                    className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                                >
                                    <Printer size={14} />
                                    Print Now
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsPrintPreviewOpen(false)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition ml-1 text-base font-bold cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Modal Scrollable Canvas */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-300/60 dark:bg-slate-950 flex justify-center">
                            <div className="bg-white text-black shadow-2xl border border-slate-300 w-full max-w-[760px] p-8 sm:p-12 min-h-[950px] font-sans">
                                {/* Centered Brand Header */}
                                {!hideHeaderForLetterhead ? (
                                    <div className="text-center mb-3">
                                        <div className="flex justify-center mb-2">
                                            <img
                                                src="/logo-mono-white.png"
                                                alt="GLX Logo"
                                                className="h-12 w-auto object-contain mx-auto"
                                            />
                                        </div>
                                        <h2 className="text-xs font-bold uppercase tracking-wider text-black mt-1.5">
                                            EMPLOYEE PAYMENT SHEET
                                        </h2>
                                        <div className="border-b border-black w-full mt-2.5 mb-3"></div>
                                    </div>
                                ) : (
                                    <div className="text-center mb-3 pt-8">
                                        <h2 className="text-xs font-bold uppercase tracking-wider text-black">
                                            EMPLOYEE PAYMENT SHEET
                                        </h2>
                                        <div className="border-b border-black w-full mt-2.5 mb-3"></div>
                                    </div>
                                )}

                                {/* Metadata Section */}
                                <table className="w-full text-xs font-sans text-black mb-3 border-collapse">
                                    <tbody>
                                        <tr>
                                            <td className="w-36 font-bold py-0.5">Name</td>
                                            <td className="w-5 font-bold text-center py-0.5">:</td>
                                            <td className="font-bold py-0.5">{employeeFullName}</td>
                                            <td colSpan={3}></td>
                                        </tr>
                                        <tr>
                                            <td className="font-bold py-0.5">Salary Per Hour</td>
                                            <td className="font-bold text-center py-0.5">:</td>
                                            <td className="font-normal py-0.5">{formatPrintCurrency(effectiveHourlyRate)}</td>
                                            <td colSpan={3}></td>
                                        </tr>
                                        <tr>
                                            <td className="font-bold py-0.5">Date From</td>
                                            <td className="font-bold text-center py-0.5">:</td>
                                            <td className="font-normal py-0.5 w-40">{formatPrintDate(startDate)}</td>
                                            <td className="w-20 font-bold text-right py-0.5">Date To</td>
                                            <td className="w-5 font-bold text-center py-0.5">:</td>
                                            <td className="font-normal py-0.5">{formatPrintDate(endDate)}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Table */}
                                <table className="w-full text-xs font-sans border-collapse mb-0">
                                    <thead>
                                        <tr className="border-t border-b border-black text-[11px] font-bold text-black uppercase">
                                            <th className="py-2 px-2 text-left font-bold w-[17%]">Date</th>
                                            <th className="py-2 px-2 text-center font-bold w-[15%]">IN</th>
                                            <th className="py-2 px-2 text-center font-bold w-[15%]">OUT</th>
                                            <th className="py-2 px-2 text-center font-bold w-[15%]">HOURS</th>
                                            <th className="py-2 px-2 text-right font-bold w-[19%]">DAY SALARY</th>
                                            <th className="py-2 px-2 text-right font-bold w-[19%]">ADVANCE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {printableRows.map((r, i) => (
                                            <tr key={i} className="text-black">
                                                <td className="py-1 px-2 text-left">{formatPrintDate(r.date)}</td>
                                                <td className="py-1 px-2 text-center font-mono">{formatPrintTime(r.inTime || r.in)}</td>
                                                <td className="py-1 px-2 text-center font-mono">{formatPrintTime(r.outTime || r.out)}</td>
                                                <td className="py-1 px-2 text-center font-mono">{formatPrintDuration(r)}</td>
                                                <td className="py-1 px-2 text-right font-mono">{formatPrintCurrency(r.daySalary)}</td>
                                                <td className="py-1 px-2 text-right font-mono">{formatPrintCurrency(r.advance)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="border-b border-black w-full mb-3"></div>

                                {/* Summary Totals */}
                                <table className="w-64 ml-auto text-xs font-sans text-black border-collapse">
                                    <tbody>
                                        <tr>
                                            <td className="font-bold py-0.5">Basic Salary</td>
                                            <td className="text-right py-0.5 font-mono">{formatPrintCurrency(dynamicTotals.basicSalary)}</td>
                                        </tr>
                                        {dynamicTotals.otCommission > 0 && (
                                            <tr>
                                                <td className="font-bold py-0.5">OT / Commission</td>
                                                <td className="text-right py-0.5 font-mono">{formatPrintCurrency(dynamicTotals.otCommission)}</td>
                                            </tr>
                                        )}
                                        <tr className="border-t border-gray-300">
                                            <td className="font-bold py-0.5">Total Salary</td>
                                            <td className="text-right py-0.5 font-mono">{formatPrintCurrency(dynamicTotals.totalSalary)}</td>
                                        </tr>
                                        <tr className="border-b border-black">
                                            <td className="font-bold py-0.5 pb-1">Total Advances</td>
                                            <td className="text-right py-0.5 pb-1 font-mono">{formatPrintCurrency(dynamicTotals.totalAdvance)}</td>
                                        </tr>
                                        {includeEpfEtf && dynamicTotals.epfEmployeeDeduction > 0 && (
                                            <tr className="border-b border-black">
                                                <td className="font-bold py-0.5 pb-1">EPF (${epfEmployeeRate}%)</td>
                                                <td className="text-right py-0.5 pb-1 font-mono">-{formatPrintCurrency(dynamicTotals.epfEmployeeDeduction)}</td>
                                            </tr>
                                        )}
                                        <tr className="border-b-4 border-double border-black">
                                            <td className="font-bold py-1 pt-1.5">Net Salary</td>
                                            <td className="font-bold text-right py-1 pt-1.5 font-mono">{formatPrintCurrency(dynamicTotals.netSalary)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Normal Payslip Modal */}
            <NormalPayslipModal
                isOpen={isPayslipModalOpen}
                onClose={() => setIsPayslipModalOpen(false)}
                employeeId={selectedEmployeeId}
                startDate={startDate}
                endDate={endDate}
                includeEpfEtf={includeEpfEtf}
                dynamicTotals={dynamicTotals}
                employee={currentEmployee}
                hourlyRate={effectiveHourlyRate}
            />

            {/* Record Advance Modal */}
            <RecordAdvanceModal
                isOpen={isAdvanceModalOpen}
                onClose={() => setIsAdvanceModalOpen(false)}
                defaultEmployeeId={selectedEmployeeId}
                defaultEmployeeName={employeeFullName || ''}
                defaultDate={startDate}
                onSuccess={() => {
                    refetch();
                }}
            />

            {/* Salary Policies Modal */}
            <SalaryPoliciesModal
                isOpen={isPoliciesModalOpen}
                onClose={() => setIsPoliciesModalOpen(false)}
                policies={salaryPolicies}
                employees={employees}
                selectedEmployeeId={selectedEmployeeId}
                epfRates={{
                    employeeRate: epfEmployeeRate,
                    employerRate: epfEmployerRate,
                    etfRate: etfEmployerRate
                }}
                onSavePolicies={handleSavePoliciesFromModal}
                onApplyToSheet={(newPolicies) => handleApplyPoliciesToAllRows(newPolicies)}
            />
        </div>
    );
}
