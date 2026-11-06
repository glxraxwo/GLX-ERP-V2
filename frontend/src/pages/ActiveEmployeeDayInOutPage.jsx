import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Calendar as CalendarIcon, Clock, Save, FileText,
    RefreshCw, CheckSquare, Square, ChevronLeft, ChevronRight,
    Search, UserCheck, UserX, Users, AlertCircle, ArrowRight, ArrowLeft,
    Sparkles, Sliders, DollarSign, CheckCircle2, Zap, Filter, Check, X,
    FileSpreadsheet, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { manualAttendanceApi, employeesApi } from '../features/hr/hrApi';
import Button from '../components/ui/Button';
import SalaryPoliciesModal from '../components/SalaryPoliciesModal';

// Format Date to YYYY-MM-DD
const formatDateStr = (d) => {
    const date = new Date(d);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Format Display Date: e.g. "Sunday, January 11, 2026"
const formatLongDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
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

    let parts;
    if (cleaned.includes(':')) parts = cleaned.split(':');
    else if (cleaned.includes('.')) parts = cleaned.split('.');
    else parts = [cleaned, '0'];

    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1] || '0', 10);
    if (isNaN(h)) return null;

    if (isPm && h < 12) h += 12;
    if (isAm && h === 12) h = 0;

    return h * 60 + (isNaN(m) ? 0 : m);
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

    if (!clean.includes(':')) {
        if (clean.length === 1 || clean.length === 2) {
            let h = Math.min(23, Math.max(0, parseInt(clean, 10)));
            return `${String(h).padStart(2, '0')}:00`;
        }
        if (clean.length === 3) {
            let h = Math.min(23, Math.max(0, parseInt(clean.substring(0, 1), 10)));
            let m = Math.min(59, Math.max(0, parseInt(clean.substring(1), 10)));
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
        if (clean.length >= 4) {
            let h = Math.min(23, Math.max(0, parseInt(clean.substring(0, 2), 10)));
            let m = Math.min(59, Math.max(0, parseInt(clean.substring(2, 4), 10)));
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
    }

    const parts = clean.split(':');
    let h = parseInt(parts[0] || '0', 10);
    let m = parseInt(parts[1] || '0', 10);
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

// Pure Helper: Check if policy applies to employee
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

// Pure Helper: Evaluate policy for a single row
const evaluateRowPolicy = (row, shiftOnTime, shiftOffTime, hourlyRate, activePolicies = [], currentEmployeeId = null) => {
    // Unticking day -> NO automatic 1000 cut if deductionAmount is 0!
    if (!row.isTicked) {
        const absentPol = activePolicies.find(p => p.isActive && p.type === 'ABSENT_DEDUCTION' && doesPolicyApplyToEmployee(p, currentEmployeeId));
        const cut = (absentPol && absentPol.deductionAmount > 0) ? -Math.abs(absentPol.deductionAmount) : 0;
        return {
            ...row,
            inTime: '',
            outTime: '',
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

    let deduction = 0;
    let reasonParts = [];

    const inMin = parseTimeToMinutes(inT);
    const shiftInMin = parseTimeToMinutes(shiftOnTime);
    const outMin = parseTimeToMinutes(outT);
    const shiftOutMin = parseTimeToMinutes(shiftOffTime);

    // Filter policies for this specific employee or ALL
    const activePols = (activePolicies || []).filter(p => p.isActive);

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

    // 3. Day Salary & Working Hours (Method 1: Full shift day pay & hours when late penalty applies)
    const hasLatePenalty = reasonParts.some(p => p.startsWith('Late') && p.includes('(-'));
    const minHoursPol = activePols.find(p => p.type === 'MIN_HOURS_FULL_PAY' && doesPolicyApplyToEmployee(p, currentEmployeeId));
    const meetsMinHours = minHoursPol && hrs >= (minHoursPol.thresholdMinutes / 60);

    let finalHours = hrs;
    if (hasLatePenalty) {
        // Method 1: Credit full shift hours starting from shiftOnTime because late penalty is charged in Deductions
        finalHours = calculateHoursFromTimes(shiftOnTime, outT);
    } else if (meetsMinHours) {
        finalHours = standardHrs;
    }

    const daySalary = Number((finalHours * hourlyRate).toFixed(2));

    const finalReason = deduction !== 0
        ? (reasonParts.join(', ') || (row.reason && !row.reason.startsWith('Late') && !row.reason.startsWith('Early') && row.reason !== 'No Work' ? row.reason : ''))
        : (reasonParts.filter(p => p.includes('Covered')).join(', ') || '');

    return {
        ...row,
        inTime: inT,
        outTime: outT,
        hours: finalHours,
        daySalary,
        deduction,
        reason: finalReason
    };
};

export default function ActiveEmployeeDayInOutPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Default to today
    const [selectedDate, setSelectedDate] = useState(() => formatDateStr(new Date()));
    
    // Official Scheduled Shift Start & End (against which late arrival & early departure policies are evaluated)
    const [shiftOnTime, setShiftOnTime] = useState('08:00');
    const [shiftOffTime, setShiftOffTime] = useState('18:00');

    // Quick Apply In / Out Times for present employees
    const [applyInTime, setApplyInTime] = useState('08:00');
    const [applyOutTime, setApplyOutTime] = useState('18:00');

    const [searchQuery, setSearchQuery] = useState('');
    const [rows, setRows] = useState([]);

    // Policy & Statutory Rates State
    const [salaryPolicies, setSalaryPolicies] = useState(defaultPoliciesFallback);
    const [epfEmployeeRate, setEpfEmployeeRate] = useState(8);
    const [epfEmployerRate, setEpfEmployerRate] = useState(12);
    const [etfEmployerRate, setEtfEmployerRate] = useState(3);
    const [isPoliciesModalOpen, setIsPoliciesModalOpen] = useState(false);

    // Fetch active employees list for policy mapping
    const { data: employeesData } = useQuery({
        queryKey: ['active-employees-list'],
        queryFn: () => employeesApi.list({ limit: 500, status: 'active' }),
        staleTime: 1000 * 60 * 5,
    });
    const employees = employeesData?.data || [];

    // Query daily manual attendance
    const { data: dailyData, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['manual-attendance-daily', selectedDate],
        queryFn: () => manualAttendanceApi.getDaily(selectedDate),
        staleTime: 1000 * 60 * 2,
    });

    // Populate rows and policies when data arrives
    useEffect(() => {
        if (dailyData) {
            const shiftOn = dailyData.defaultOnTime || '08:00';
            const shiftOff = dailyData.defaultOffTime || '18:00';
            setShiftOnTime(shiftOn);
            setShiftOffTime(shiftOff);
            setApplyInTime(shiftOn);
            setApplyOutTime(shiftOff);

            const pols = (dailyData.salaryPolicies && dailyData.salaryPolicies.length > 0)
                ? dailyData.salaryPolicies
                : salaryPolicies;

            if (dailyData.salaryPolicies && dailyData.salaryPolicies.length > 0) {
                setSalaryPolicies(dailyData.salaryPolicies);
            }
            if (dailyData.epfEmployeeRate !== undefined) setEpfEmployeeRate(dailyData.epfEmployeeRate);
            if (dailyData.epfEmployerRate !== undefined) setEpfEmployerRate(dailyData.epfEmployerRate);
            if (dailyData.etfEmployerRate !== undefined) setEtfEmployerRate(dailyData.etfEmployerRate);

            if (dailyData.rows) {
                setRows(dailyData.rows.map(r => {
                    // Evaluate policies right away for accurate late/early deductions against official shift
                    return evaluateRowPolicy(r, shiftOn, shiftOff, r.hourlyRate || 260, pols, r.employeeId);
                }));
            }
        }
    }, [dailyData]);

    // Save Mutation
    const saveMutation = useMutation({
        mutationFn: (payload) => manualAttendanceApi.saveDaily(payload),
        onSuccess: (res) => {
            toast.success(res.message || 'Daily attendance saved successfully!');
            queryClient.invalidateQueries(['manual-attendance-daily', selectedDate]);
            queryClient.invalidateQueries(['employee-payment-sheet']);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to save attendance');
        }
    });

    // Save Policies Mutation
    const savePoliciesMutation = useMutation({
        mutationFn: (payload) => manualAttendanceApi.savePolicies(payload),
        onSuccess: () => {
            queryClient.invalidateQueries(['manual-attendance-policies']);
            queryClient.invalidateQueries(['manual-attendance-daily', selectedDate]);
        }
    });

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

    // Save policies from modal and immediately apply to daily sheet
    const handleSavePoliciesFromModal = async (payload) => {
        await savePoliciesMutation.mutateAsync(payload);
        setSalaryPolicies(payload.salaryPolicies);
        if (payload.epfEmployeeRate !== undefined) setEpfEmployeeRate(payload.epfEmployeeRate);
        if (payload.epfEmployerRate !== undefined) setEpfEmployerRate(payload.epfEmployerRate);
        if (payload.etfEmployerRate !== undefined) setEtfEmployerRate(payload.etfEmployerRate);

        // Immediately recalculate all rows currently on screen with newly saved policies
        setRows(prevRows => prevRows.map(r => {
            return evaluateRowPolicy(r, shiftOnTime, shiftOffTime, r.hourlyRate || 260, payload.salaryPolicies, r.employeeId);
        }));
        toast.success('Policies saved & applied to attendance grid!');
    };

    // When Official Shift Schedule changes, re-evaluate all rows automatically!
    const handleShiftScheduleChange = (type, val) => {
        const clean = formatTimeAsYouType(val);
        const newShiftOn = type === 'on' ? clean : shiftOnTime;
        const newShiftOff = type === 'off' ? clean : shiftOffTime;

        if (type === 'on') setShiftOnTime(clean);
        if (type === 'off') setShiftOffTime(clean);

        if (clean.length === 5 && /^([01]\d|2[0-3]):[0-5]\d$/.test(clean)) {
            // Recalculate policies dynamically for all rows against the new schedule
            setRows(prevRows => prevRows.map(r => {
                return evaluateRowPolicy(r, newShiftOn, newShiftOff, r.hourlyRate || 260, salaryPolicies, r.employeeId);
            }));
        }
    };

    // Handle in-place row editing with AUTO-POLICY EVALUATION
    const handleRowChange = (index, field, value) => {
        setRows(prevRows => {
            const updated = [...prevRows];
            let row = { ...updated[index] };

            if (field === 'isTicked') {
                row.isTicked = Boolean(value);
                row = evaluateRowPolicy(row, shiftOnTime, shiftOffTime, row.hourlyRate || 260, salaryPolicies, row.employeeId);
            } else if (field === 'inTime' || field === 'outTime') {
                const clean = String(value).replace(/[^0-9:]/g, '').slice(0, 5);
                row[field] = clean;
                row.isTicked = true;
                row = evaluateRowPolicy(row, shiftOnTime, shiftOffTime, row.hourlyRate || 260, salaryPolicies, row.employeeId);
            } else if (field === 'hours') {
                const val = String(value).trim();
                const hrs = val === '' ? 0 : Number(val);
                row.hours = isNaN(hrs) ? row.hours : hrs;
                if (row.hours > 0) {
                    row.isTicked = true;
                    row.daySalary = Number((row.hours * (row.hourlyRate || 260)).toFixed(2));
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
            } else if (field === 'deduction') {
                // Freely allow typing '-', '-100', '100', ''
                if (value === '' || value === '-') {
                    row.deduction = value;
                    if (row.reason && (row.reason.startsWith('Late') || row.reason.startsWith('Early'))) {
                        row.reason = '';
                    }
                } else {
                    const num = Number(value);
                    row.deduction = isNaN(num) ? value : num;
                    if (num === 0 && row.reason && (row.reason.startsWith('Late') || row.reason.startsWith('Early'))) {
                        row.reason = '';
                    }
                }
            } else if (field === 'reason') {
                row.reason = value;
            }

            updated[index] = row;
            return updated;
        });
    };

    // Quick Apply In / Out Times to All Ticked Employees with immediate Policy Evaluation against official shift
    const handleApplyDefaultTimes = () => {
        const normIn = normalizeTimeString(applyInTime, shiftOnTime);
        const normOut = normalizeTimeString(applyOutTime, shiftOffTime);
        setApplyInTime(normIn);
        setApplyOutTime(normOut);

        setRows(prevRows => prevRows.map(row => {
            if (!row.isTicked) return row;
            const updated = {
                ...row,
                inTime: normIn,
                outTime: normOut
            };
            return evaluateRowPolicy(updated, shiftOnTime, shiftOffTime, row.hourlyRate || 260, salaryPolicies, row.employeeId);
        }));
        toast.success(`Applied ${normIn} - ${normOut} to present staff & evaluated policies against shift (${shiftOnTime} - ${shiftOffTime})!`);
    };

    // Save All Changes
    const handleSave = () => {
        saveMutation.mutate({
            date: selectedDate,
            defaultOnTime: shiftOnTime,
            defaultOffTime: shiftOffTime,
            rows: rows
        });
    };

    // Filter states: attendance status ('all' | 'present' | 'absent') and employee employment status ('all' | 'active' | 'inactive')
    const [statusFilter, setStatusFilter] = useState('all');
    const [employeeStatusFilter, setEmployeeStatusFilter] = useState('active');

    // Quick Date Shift
    const changeDate = (days) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(formatDateStr(d));
    };

    // Filtered Rows for Search, Employee Status Filter and Attendance Status Filter
    const filteredRows = useMemo(() => {
        return rows.filter(r => {
            const matchesSearch = !searchQuery.trim() ||
                r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.payrollNumber?.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            const isEmpActive = (r.employeeStatus || 'active') === 'active';
            if (employeeStatusFilter === 'active' && !isEmpActive) return false;
            if (employeeStatusFilter === 'inactive' && isEmpActive) return false;

            if (statusFilter === 'present') return Boolean(r.isTicked);
            if (statusFilter === 'absent') return !r.isTicked;
            return true;
        });
    }, [rows, searchQuery, statusFilter, employeeStatusFilter]);

    // Totals Calculation
    const totals = useMemo(() => {
        let presentCount = 0;
        let absentCount = 0;
        let activeStaffCount = 0;
        let inactiveStaffCount = 0;
        let totalHours = 0;
        let totalSalary = 0;
        let totalAdvance = 0;
        let totalDeductions = 0;

        rows.forEach(r => {
            const isEmpActive = (r.employeeStatus || 'active') === 'active';
            if (isEmpActive) {
                activeStaffCount++;
            } else {
                inactiveStaffCount++;
            }

            if (r.isTicked) {
                presentCount++;
                totalHours += Number(r.hours) || 0;
                totalSalary += Number(r.daySalary) || 0;
            } else {
                absentCount++;
            }
            totalAdvance += Number(r.advance) || 0;
            const dedNum = Number(r.deduction) || 0;
            if (dedNum < 0) totalDeductions += Math.abs(dedNum);
        });

        return {
            presentCount,
            absentCount,
            activeStaffCount,
            inactiveStaffCount,
            totalHours: Number(totalHours.toFixed(2)),
            totalSalary: Number(totalSalary.toFixed(2)),
            totalAdvance: Number(totalAdvance.toFixed(2)),
            totalDeductions: Number(totalDeductions.toFixed(2))
        };
    }, [rows]);

    const netEstimatedPay = Math.max(0, totals.totalSalary - totals.totalAdvance - totals.totalDeductions);

    // Focus daily grid cell helper for IN/OUT/ADVANCE/DEDUCTION keyboard navigation
    const focusDailyCell = (rowIdx, colType) => {
        const r = Math.max(0, Math.min(rowIdx, filteredRows.length - 1));
        const targetRow = filteredRows[r];
        if (!targetRow) return;

        // If target row is unticked / absent and user navigates into it, auto-tick it
        if (!targetRow.isTicked && (colType === 'in' || colType === 'out')) {
            const realIdx = rows.findIndex(rowItem => rowItem.employeeId === targetRow.employeeId);
            if (realIdx !== -1) {
                handleRowChange(realIdx, 'isTicked', true);
            }
        }

        setTimeout(() => {
            const el = document.querySelector(`[data-daily-row="${r}"][data-daily-col="${colType}"]`);
            if (el) {
                el.focus();
                try {
                    if (typeof el.select === 'function') {
                        el.select();
                    }
                    if (typeof el.setSelectionRange === 'function' && el.value !== undefined) {
                        el.setSelectionRange(0, String(el.value).length);
                    }
                } catch {}
            }
        }, 30);
    };

    const handleDailyKeyDown = (e, rowIdx, colType) => {
        const isText = e.target.type === 'text';
        let isAtStart = true;
        let isAtEnd = true;
        if (isText) {
            try {
                isAtStart = e.target.selectionStart === 0 && e.target.selectionEnd === 0;
                isAtEnd = e.target.selectionStart === e.target.value?.length && e.target.selectionEnd === e.target.value?.length;
                if (e.target.selectionStart === 0 && e.target.selectionEnd === e.target.value?.length) {
                    isAtStart = true;
                    isAtEnd = true;
                }
            } catch {
                isAtStart = true;
                isAtEnd = true;
            }
        }

        // ArrowDown -> Move to next employee in same column (In, Out, Advance, Deduction)
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (rowIdx < filteredRows.length - 1) {
                focusDailyCell(rowIdx + 1, colType);
            }
            return;
        }

        // ArrowUp -> Move to previous employee in same column (In, Out, Advance, Deduction)
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (rowIdx > 0) {
                focusDailyCell(rowIdx - 1, colType);
            }
            return;
        }

        // ArrowLeft -> Move to previous column on same row
        if (e.key === 'ArrowLeft' && isAtStart) {
            e.preventDefault();
            if (colType === 'deduction') focusDailyCell(rowIdx, 'advance');
            else if (colType === 'advance') focusDailyCell(rowIdx, 'out');
            else if (colType === 'out') focusDailyCell(rowIdx, 'in');
            return;
        }

        // ArrowRight -> Move to next column on same row
        if (e.key === 'ArrowRight' && isAtEnd) {
            e.preventDefault();
            if (colType === 'in') focusDailyCell(rowIdx, 'out');
            else if (colType === 'out') focusDailyCell(rowIdx, 'advance');
            else if (colType === 'advance') focusDailyCell(rowIdx, 'deduction');
            return;
        }

        // Enter -> Smooth horizontal & vertical navigation
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const realIdx = rows.findIndex(r => r.employeeId === filteredRows[rowIdx]?.employeeId);
            if (colType === 'in') {
                const norm = normalizeTimeString(e.target.value, shiftOnTime);
                if (realIdx !== -1) handleRowChange(realIdx, 'inTime', norm);
                focusDailyCell(rowIdx, 'out');
            } else if (colType === 'out') {
                const norm = normalizeTimeString(e.target.value, shiftOffTime);
                if (realIdx !== -1) handleRowChange(realIdx, 'outTime', norm);
                if (rowIdx < filteredRows.length - 1) {
                    focusDailyCell(rowIdx + 1, 'in');
                }
            } else if (colType === 'advance') {
                focusDailyCell(rowIdx, 'deduction');
            } else if (colType === 'deduction') {
                if (rowIdx < filteredRows.length - 1) {
                    focusDailyCell(rowIdx + 1, 'advance');
                }
            }
            return;
        }

        // Shift + Enter -> Reverse navigation
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            const realIdx = rows.findIndex(r => r.employeeId === filteredRows[rowIdx]?.employeeId);
            if (colType === 'out') {
                const norm = normalizeTimeString(e.target.value, shiftOffTime);
                if (realIdx !== -1) handleRowChange(realIdx, 'outTime', norm);
                focusDailyCell(rowIdx, 'in');
            } else if (colType === 'in') {
                const norm = normalizeTimeString(e.target.value, shiftOnTime);
                if (realIdx !== -1) handleRowChange(realIdx, 'inTime', norm);
                if (rowIdx > 0) {
                    focusDailyCell(rowIdx - 1, 'out');
                }
            } else if (colType === 'deduction') {
                focusDailyCell(rowIdx, 'advance');
            } else if (colType === 'advance') {
                if (rowIdx > 0) {
                    focusDailyCell(rowIdx - 1, 'deduction');
                }
            }
            return;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-3 sm:p-6 font-sans text-slate-900 w-full print:bg-white print:p-0">
            {/* Top Corporate Command Bar */}
            <div className="w-full mb-3 print:hidden space-y-2.5">
                {/* Header & Navigation */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 shadow-2xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            Active Employee Day In / Out
                        </h1>
                    </div>

                    {/* Quick Action Navigation Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
                        <button
                            type="button"
                            onClick={() => navigate('/hr/manual-payment-sheet')}
                            className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
                        >
                            <FileSpreadsheet size={13} className="text-indigo-600" />
                            31-Day Paysheet
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsPoliciesModalOpen(true)}
                            className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
                            title="Configure late arrival rules, grace times, and absent deductions"
                        >
                            <Sliders size={13} className="text-indigo-600" />
                            Policies
                        </button>

                        <button
                            type="button"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="p-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition cursor-pointer"
                            title="Refresh data"
                        >
                            <RefreshCw size={13} className={isFetching ? 'animate-spin text-blue-600' : 'text-slate-500'} />
                        </button>
                    </div>
                </div>

                {/* Metric KPI Cards (5 Pillars - Same Executive Theme) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {/* 1. Total Employees */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-blue-300 transition">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Staff</span>
                            <div className="p-1 rounded-lg bg-blue-50 text-blue-600">
                                <Users size={13} />
                            </div>
                        </div>
                        <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5 font-mono">{rows.length}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">Active on roll</p>
                    </div>

                    {/* 2. Present Today */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-emerald-300 transition">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Present</span>
                            <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <span className="relative flex h-1.5 w-1.5 mr-1">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                <UserCheck size={13} />
                            </div>
                        </div>
                        <p className="text-base sm:text-lg font-black text-emerald-600 mt-0.5 font-mono">{totals.presentCount}</p>
                        <p className="text-[9px] text-emerald-600/80 mt-0.5 font-semibold">Ticked & on shift</p>
                    </div>

                    {/* 3. Absent / Off */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-rose-300 transition">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-rose-600">Absent / Leave</span>
                            <div className="p-1 rounded-lg bg-rose-50 text-rose-600">
                                <UserX size={13} />
                            </div>
                        </div>
                        <p className="text-base sm:text-lg font-black text-rose-600 mt-0.5 font-mono">{totals.absentCount}</p>
                        <p className="text-[9px] text-rose-500 mt-0.5 font-medium">Off duty today</p>
                    </div>

                    {/* 4. Total Worked Hours */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-purple-300 transition">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-purple-600">Hours Logged</span>
                            <div className="p-1 rounded-lg bg-purple-50 text-purple-600">
                                <Clock size={13} />
                            </div>
                        </div>
                        <p className="text-base sm:text-lg font-black text-purple-600 mt-0.5 font-mono">{totals.totalHours}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">Shift hours</p>
                    </div>

                    {/* 5. Total Daily Wages */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-indigo-300 transition col-span-2 sm:col-span-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600">Daily Gross Wage</span>
                            <div className="p-1 rounded-lg bg-indigo-50 text-indigo-600">
                                <DollarSign size={13} />
                            </div>
                        </div>
                        <p className="text-base sm:text-lg font-black text-indigo-600 mt-0.5 font-mono">
                            Rs. {Math.round(totals.totalSalary).toLocaleString()}
                        </p>
                        <p className="text-[9px] text-indigo-500/80 mt-0.5 font-medium">
                            Net: Rs. {Math.round(netEstimatedPay).toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Shift Control & Quick Action Bar (Compact Same Theme) */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 sm:p-3 shadow-2xs">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
                        {/* Left: Date Switcher */}
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => changeDate(-1)}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition"
                                title="Previous Day"
                            >
                                <ChevronLeft size={14} />
                            </button>

                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                                <CalendarIcon size={13} className="text-indigo-600" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-transparent font-bold text-xs text-slate-900 outline-none cursor-pointer font-mono"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => changeDate(1)}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition"
                                title="Next Day"
                            >
                                <ChevronRight size={14} />
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedDate(formatDateStr(new Date()))}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                    selectedDate === formatDateStr(new Date())
                                        ? 'bg-blue-600 text-white shadow-2xs'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                Today
                            </button>
                        </div>

                        {/* Center: Shift Schedule & Quick Apply Controls */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Shift Working Hours / Policy Schedule */}
                            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 px-2.5 py-1 rounded-lg" title="Company Shift Schedule: Late arrival & early departure policies are evaluated against these scheduled hours">
                                <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider">Shift</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={shiftOnTime}
                                    placeholder="08:00"
                                    maxLength={5}
                                    onChange={(e) => handleShiftScheduleChange('on', e.target.value)}
                                    onBlur={(e) => {
                                        const norm = normalizeTimeString(e.target.value, '08:00');
                                        handleShiftScheduleChange('on', norm);
                                    }}
                                    onFocus={handleCellSelectAll}
                                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-mono font-bold text-xs px-1.5 py-0.5 rounded w-14 text-center outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <span className="text-slate-400 font-bold text-xs">-</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={shiftOffTime}
                                    placeholder="18:00"
                                    maxLength={5}
                                    onChange={(e) => handleShiftScheduleChange('off', e.target.value)}
                                    onBlur={(e) => {
                                        const norm = normalizeTimeString(e.target.value, '18:00');
                                        handleShiftScheduleChange('off', norm);
                                    }}
                                    onFocus={handleCellSelectAll}
                                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-mono font-bold text-xs px-1.5 py-0.5 rounded w-14 text-center outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>

                            {/* Bulk Apply Times to Present Staff */}
                            <div className="flex items-center gap-1 bg-emerald-50/70 border border-emerald-200/80 px-2 py-1 rounded-lg">
                                <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wide">In Time</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    id="daily-header-ontime"
                                    value={applyInTime}
                                    placeholder={shiftOnTime || '08:00'}
                                    maxLength={5}
                                    onChange={(e) => setApplyInTime(formatTimeAsYouType(e.target.value))}
                                    onBlur={(e) => setApplyInTime(normalizeTimeString(e.target.value, shiftOnTime))}
                                    onFocus={handleCellSelectAll}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const offEl = document.getElementById('daily-header-offtime');
                                            if (offEl) { offEl.focus(); offEl.select(); }
                                        }
                                    }}
                                    className="bg-white border border-emerald-300 text-emerald-950 font-mono font-bold text-xs px-1.5 py-0.5 rounded w-14 text-center outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="flex items-center gap-1 bg-amber-50/70 border border-amber-200/80 px-2 py-1 rounded-lg">
                                <span className="text-[10px] font-black uppercase text-amber-800 tracking-wide">Out Time</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    id="daily-header-offtime"
                                    value={applyOutTime}
                                    placeholder={shiftOffTime || '18:00'}
                                    maxLength={5}
                                    onChange={(e) => setApplyOutTime(formatTimeAsYouType(e.target.value))}
                                    onBlur={(e) => setApplyOutTime(normalizeTimeString(e.target.value, shiftOffTime))}
                                    onFocus={handleCellSelectAll}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleApplyDefaultTimes();
                                        }
                                    }}
                                    className="bg-white border border-amber-300 text-amber-950 font-mono font-bold text-xs px-1.5 py-0.5 rounded w-14 text-center outline-none focus:ring-1 focus:ring-amber-500"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleApplyDefaultTimes}
                                className="px-2.5 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
                                title="Apply these in/out times to all present staff and calculate policy deductions against the shift schedule"
                            >
                                <Zap size={12} />
                                Apply to Present
                            </button>
                        </div>

                        {/* Right: Primary Save Attendance Button */}
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saveMutation.isPending}
                            className="px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            <Save size={14} className={saveMutation.isPending ? 'animate-spin' : ''} />
                            {saveMutation.isPending ? 'Saving...' : 'Save Attendance'}
                        </button>
                    </div>

                    {/* Filter Tabs & Search Row */}
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                        {/* Status Filter Pills: Employee Status & Attendance Status */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* 1. Employee Employment Status (Active vs Inactive) */}
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] font-bold text-slate-500 uppercase px-1.5">Staff:</span>
                                <button
                                    type="button"
                                    onClick={() => setEmployeeStatusFilter('all')}
                                    className={`px-2 py-0.5 rounded text-xs font-bold transition ${
                                        employeeStatusFilter === 'all'
                                            ? 'bg-slate-900 text-white shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                                    }`}
                                >
                                    All ({rows.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEmployeeStatusFilter('active')}
                                    className={`px-2 py-0.5 rounded text-xs font-bold transition flex items-center gap-1 ${
                                        employeeStatusFilter === 'active'
                                            ? 'bg-emerald-600 text-white shadow-2xs'
                                            : 'text-emerald-700 hover:bg-emerald-100/60 dark:text-emerald-400'
                                    }`}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    Active ({totals.activeStaffCount})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEmployeeStatusFilter('inactive')}
                                    className={`px-2 py-0.5 rounded text-xs font-bold transition flex items-center gap-1 ${
                                        employeeStatusFilter === 'inactive'
                                            ? 'bg-rose-600 text-white shadow-2xs'
                                            : 'text-rose-700 hover:bg-rose-100/60 dark:text-rose-400'
                                    }`}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                    Inactive ({totals.inactiveStaffCount})
                                </button>
                            </div>

                            {/* 2. Attendance Status (Present vs Absent) */}
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] font-bold text-slate-500 uppercase px-1.5">Attend:</span>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('all')}
                                    className={`px-2 py-0.5 rounded text-xs font-bold transition ${
                                        statusFilter === 'all'
                                            ? 'bg-slate-900 text-white shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                                    }`}
                                >
                                    All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('present')}
                                    className={`px-2 py-0.5 rounded text-xs font-bold transition flex items-center gap-1 ${
                                        statusFilter === 'present'
                                            ? 'bg-emerald-600 text-white shadow-2xs'
                                            : 'text-emerald-700 hover:bg-emerald-100/60 dark:text-emerald-400'
                                    }`}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    Present ({totals.presentCount})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('absent')}
                                    className={`px-2 py-0.5 rounded text-xs font-bold transition flex items-center gap-1 ${
                                        statusFilter === 'absent'
                                            ? 'bg-rose-600 text-white shadow-2xs'
                                            : 'text-rose-700 hover:bg-rose-100/60 dark:text-rose-400'
                                    }`}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                    Absent ({totals.absentCount})
                                </button>
                            </div>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-64">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, employee code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-7 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Interactive Spreadsheet Canvas */}
            <div className="w-full bg-white border border-slate-200/90 shadow-sm rounded-2xl overflow-hidden print:border-none print:shadow-none print:rounded-none">
                {/* Print Title Header (Only for Print) */}
                <div className="hidden print:block text-center border-b pb-2 mb-3">
                    <h1 className="text-base font-bold uppercase tracking-wide">ACTIVE EMPLOYEE DAY IN / OUT</h1>
                    <p className="text-xs text-slate-600">Date: {formatLongDate(selectedDate)} | Shift: {shiftOnTime} - {shiftOffTime}</p>
                </div>

                {isLoading ? (
                    <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center">
                        <RefreshCw size={28} className="animate-spin text-blue-600 mb-2" />
                        <p className="font-bold text-sm text-slate-800">Loading attendance records...</p>
                        <p className="text-xs text-slate-400 mt-0.5">Evaluating active policies and shift calculations</p>
                    </div>
                ) : filteredRows.length === 0 ? (
                    <div className="py-20 text-center text-slate-500 space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                            <AlertCircle size={24} />
                        </div>
                        <p className="font-bold text-slate-800 text-sm">No employee records match the filter</p>
                        <p className="text-xs text-slate-400">Try adjusting your search query or reset the filter status.</p>
                        {(searchQuery || statusFilter !== 'all') && (
                            <button
                                type="button"
                                onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                                className="text-xs font-bold text-indigo-600 hover:underline pt-1"
                            >
                                Reset all filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-270px)] relative">
                        <table className="w-full text-left text-xs border-collapse">
                            {/* Sticky Column Header - Does not scroll off screen */}
                            <thead className="sticky top-0 z-20 bg-slate-100 shadow-xs border-b border-slate-300 select-none">
                                <tr className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                                    <th className="sticky top-0 z-20 bg-slate-100 py-3 px-3 text-center w-14">Tick</th>
                                    <th className="sticky top-0 z-20 bg-slate-100 py-3 px-3 min-w-[220px]">Employee Name</th>
                                    <th className="sticky top-0 z-20 bg-slate-100 py-3 px-3 text-center w-28">Clock In</th>
                                    <th className="sticky top-0 z-20 bg-slate-100 py-3 px-3 text-center w-28">Clock Out</th>
                                    <th className="sticky top-0 z-20 bg-slate-100 py-3 px-3 text-center w-20">Hours</th>
                                    <th className="sticky top-0 z-20 bg-slate-100 py-3 px-3 text-right w-28">Day Salary</th>
                                    <th className="sticky top-0 z-20 bg-slate-100 py-3 px-3 text-right w-28">Advance</th>
                                    <th className="sticky top-0 z-20 bg-slate-100 py-3 px-3 text-right w-28">Deduction</th>
                                </tr>
                            </thead>

                            {/* Table Rows with Modern Styling */}
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                {filteredRows.map((row, idx) => {
                                    const realIdx = rows.findIndex(r => r.employeeId === row.employeeId);
                                    const isPresent = Boolean(row.isTicked);
                                    const hasDeduction = Number(row.deduction) < 0 || String(row.deduction).startsWith('-');

                                    return (
                                        <tr
                                            key={row.employeeId || idx}
                                            className={`transition-colors group ${
                                                isPresent
                                                    ? 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40 bg-white dark:bg-[#111F33]'
                                                    : 'bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-50/40 opacity-85'
                                            }`}
                                        >
                                            {/* 1. TICK (Checkbox) */}
                                            <td className="py-2.5 px-3 text-center">
                                                <label className="inline-flex items-center justify-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={isPresent}
                                                        onChange={(e) => handleRowChange(realIdx, 'isTicked', e.target.checked)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                focusDailyCell(idx, 'in');
                                                            }
                                                        }}
                                                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 dark:bg-slate-900 border-slate-300 dark:border-slate-700 cursor-pointer accent-emerald-600 transition"
                                                    />
                                                </label>
                                            </td>

                                            {/* 2. Employee Name & Badges */}
                                            <td className="py-2.5 px-3 font-medium">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                                                        isPresent
                                                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                    }`}>
                                                        {row.name ? row.name.slice(0, 2) : 'EM'}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <p className="font-bold text-slate-900 dark:text-white truncate text-xs sm:text-[13px]">
                                                                {row.name}
                                                            </p>
                                                            <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                                                                (row.employeeStatus || 'active') === 'active'
                                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/60'
                                                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300/60'
                                                            }`}>
                                                                {(row.employeeStatus || 'active') === 'active' ? 'Active' : 'Inactive'}
                                                            </span>
                                                            {!isPresent && (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 shrink-0">
                                                                    Absent
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                                            <span>{row.payrollNumber || 'EMP'}</span>
                                                            {row.hourlyRate && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>Rs. {row.hourlyRate}/hr</span>
                                                                </>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => navigate(`/hr/manual-payment-sheet?employeeId=${row.employeeId}`)}
                                                                className="text-indigo-600 dark:text-indigo-400 hover:underline font-sans font-bold print:hidden"
                                                                title="Open 31-day paysheet"
                                                            >
                                                                Paysheet →
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 3. Clock In Time */}
                                            <td className="py-2.5 px-3 text-center">
                                                <div className="relative inline-block w-24">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        disabled={!isPresent}
                                                        value={isPresent ? (row.inTime || shiftOnTime) : ''}
                                                        placeholder={shiftOnTime || '08:00'}
                                                        maxLength={5}
                                                        onChange={(e) => {
                                                            const formatted = formatTimeAsYouType(e.target.value);
                                                            handleRowChange(realIdx, 'inTime', formatted);
                                                        }}
                                                        onBlur={(e) => {
                                                             if (!isPresent) return;
                                                             const norm = normalizeTimeString(e.target.value, shiftOnTime);
                                                             handleRowChange(realIdx, 'inTime', norm);
                                                        }}
                                                        onFocus={handleCellSelectAll}
                                                        data-daily-row={idx}
                                                        data-daily-col="in"
                                                        onKeyDown={(e) => handleDailyKeyDown(e, idx, 'in')}
                                                        className={`w-full text-center font-mono text-[16px] font-bold px-2 py-1.5 rounded-xl border transition ${
                                                            isPresent
                                                                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500'
                                                                : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                                                        }`}
                                                    />
                                                </div>
                                            </td>

                                            {/* 4. Clock Out Time */}
                                            <td className="py-2.5 px-3 text-center">
                                                <div className="relative inline-block w-24">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        disabled={!isPresent}
                                                        value={isPresent ? (row.outTime || shiftOffTime) : ''}
                                                        placeholder={shiftOffTime || '18:00'}
                                                        maxLength={5}
                                                        onChange={(e) => {
                                                            const formatted = formatTimeAsYouType(e.target.value);
                                                            handleRowChange(realIdx, 'outTime', formatted);
                                                        }}
                                                        onBlur={(e) => {
                                                             if (!isPresent) return;
                                                             const norm = normalizeTimeString(e.target.value, shiftOffTime);
                                                             handleRowChange(realIdx, 'outTime', norm);
                                                        }}
                                                        onFocus={handleCellSelectAll}
                                                        data-daily-row={idx}
                                                        data-daily-col="out"
                                                        onKeyDown={(e) => handleDailyKeyDown(e, idx, 'out')}
                                                        className={`w-full text-center font-mono text-[16px] font-bold px-2 py-1.5 rounded-xl border transition ${
                                                            isPresent
                                                                ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-amber-500'
                                                                : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                                                        }`}
                                                    />
                                                </div>
                                            </td>

                                            {/* 5. Hours Worked */}
                                            <td className="py-2.5 px-3 text-center">
                                                {isPresent && row.hours > 0 ? (
                                                    <span className="font-mono text-[16px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-2 py-1 rounded-xl inline-block">
                                                        {Number(row.hours).toFixed(2)} hrs
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 font-mono text-[16px] font-bold">0.00</span>
                                                )}
                                            </td>

                                            {/* 6. Day Salary */}
                                            <td className="py-2.5 px-3 text-right">
                                                {isPresent && row.daySalary > 0 ? (
                                                    <span className="font-mono text-[16px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-1 rounded-xl inline-block">
                                                        Rs. {Math.round(row.daySalary).toLocaleString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 font-mono text-[16px] font-bold">Rs. 0</span>
                                                )}
                                            </td>

                                            {/* 7. Advance */}
                                            <td className="py-2.5 px-3 text-right">
                                                <div className="relative inline-block w-24">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={row.advance === 0 ? '' : row.advance}
                                                        placeholder="0"
                                                        onChange={(e) => handleRowChange(realIdx, 'advance', e.target.value)}
                                                        onFocus={handleCellSelectAll}
                                                        data-daily-row={idx}
                                                        data-daily-col="advance"
                                                        onKeyDown={(e) => handleDailyKeyDown(e, idx, 'advance')}
                                                        className="w-full text-right font-mono text-[16px] font-bold px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                            </td>

                                            {/* 8. Deduction */}
                                            <td className="py-2.5 px-3 text-right">
                                                <div className="relative inline-block w-28">
                                                    <input
                                                        type="text"
                                                        inputMode="text"
                                                        value={row.deduction !== undefined && row.deduction !== null && row.deduction !== 0 ? row.deduction : ''}
                                                        placeholder="0"
                                                        onChange={(e) => handleRowChange(realIdx, 'deduction', e.target.value)}
                                                        onFocus={handleCellSelectAll}
                                                        data-daily-row={idx}
                                                        data-daily-col="deduction"
                                                        onKeyDown={(e) => handleDailyKeyDown(e, idx, 'deduction')}
                                                        onBlur={(e) => {
                                                            let val = String(e.target.value).trim();
                                                            if (val === '' || val === '-' || val === '0') {
                                                                handleRowChange(realIdx, 'deduction', 0);
                                                            } else {
                                                                const num = Number(val);
                                                                if (!isNaN(num)) {
                                                                    handleRowChange(realIdx, 'deduction', num > 0 ? -num : num);
                                                                }
                                                            }
                                                        }}
                                                        className={`w-full text-right font-mono text-[16px] font-bold px-2 py-1.5 rounded-xl border outline-none transition ${
                                                            hasDeduction
                                                                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 focus:ring-2 focus:ring-rose-500'
                                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500'
                                                        }`}
                                                    />
                                                    {row.reason && row.reason !== 'FILL' && hasDeduction && (
                                                        <span className="block text-[10px] text-rose-600 dark:text-rose-400 font-semibold truncate leading-tight mt-0.5 text-right" title={row.reason}>
                                                            {row.reason}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>


                            {/* Executive Summary Footer Bar */}
                            <tfoot>
                                <tr className="bg-slate-50 dark:bg-slate-900/90 border-t-2 border-slate-200 dark:border-slate-700 text-[14px] font-bold text-slate-900 dark:text-white">
                                    <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Summary ({totals.presentCount} Staff Present):
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono text-indigo-700 dark:text-indigo-300 font-black text-[16px]">
                                        {totals.totalHours.toFixed(2)}h
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono text-emerald-700 dark:text-emerald-300 font-black text-[16px]">
                                        Rs. {Math.round(totals.totalSalary).toLocaleString()}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono text-amber-700 dark:text-amber-300 font-black text-[16px]">
                                        Rs. {Math.round(totals.totalAdvance).toLocaleString()}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono text-rose-700 dark:text-rose-300 font-black text-[16px]">
                                        -Rs. {Math.round(totals.totalDeductions).toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                {/* Bottom Card Footer Action Bar */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px]">
                        <span className="flex items-center gap-1.5 font-medium">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                            Clock In (Emerald)
                        </span>
                        <span className="flex items-center gap-1.5 font-medium">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                            Clock Out (Amber)
                        </span>
                        <span className="flex items-center gap-1.5 font-medium">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
                            Auto-Policy Evaluated
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saveMutation.isPending}
                            className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wide text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <Save size={15} className={saveMutation.isPending ? 'animate-spin' : ''} />
                            {saveMutation.isPending ? 'Saving Records...' : 'Save All Attendance'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Salary Policies Modal */}
            <SalaryPoliciesModal
                isOpen={isPoliciesModalOpen}
                onClose={() => setIsPoliciesModalOpen(false)}
                policies={salaryPolicies}
                employees={employees}
                selectedEmployeeId={null}
                epfRates={{
                    employeeRate: epfEmployeeRate,
                    employerRate: epfEmployerRate,
                    etfRate: etfEmployerRate
                }}
                onSavePolicies={handleSavePoliciesFromModal}
                onApplyToSheet={(newPolicies) => {
                    setRows(prevRows => prevRows.map(r => {
                        return evaluateRowPolicy(r, shiftOnTime, shiftOffTime, r.hourlyRate || 260, newPolicies, r.employeeId);
                    }));
                    toast.success('Policies applied to all employees on grid!');
                }}
            />
        </div>
    );
}
