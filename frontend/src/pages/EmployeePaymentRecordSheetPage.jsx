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
];

// Pure Helper: Evaluate policy for a single row
const evaluateRowPolicy = (row, shiftOnTime, shiftOffTime, hourlyRate, activePolicies = []) => {
    if (!row.isTicked) {
        const absentPol = activePolicies.find(p => p.isActive && p.type === 'ABSENT_DEDUCTION');
        const cut = absentPol ? -Math.abs(absentPol.deductionAmount) : -1000;
        return {
            ...row,
            inTime: '',
            outTime: '',
            hours: 0,
            daySalary: 0,
            deduction: cut,
            reason: 'No Work'
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

    // 1. Late Arrival Policies
    if (inMin !== null && shiftInMin !== null && inMin > shiftInMin) {
        const lateMinutes = inMin - shiftInMin;
        const matchedLatePolicies = activePolicies
            .filter(p => p.isActive && p.type === 'LATE_DEDUCTION' && lateMinutes >= p.thresholdMinutes)
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
    if (outMin !== null && shiftOutMin !== null && outMin < shiftOutMin) {
        const earlyMinutes = shiftOutMin - outMin;
        const matchedEarlyPolicies = activePolicies
            .filter(p => p.isActive && p.type === 'EARLY_DEPARTURE' && earlyMinutes >= p.thresholdMinutes)
            .sort((a, b) => b.thresholdMinutes - a.thresholdMinutes);

        if (matchedEarlyPolicies.length > 0) {
            const matchedPol = matchedEarlyPolicies[0];
            deduction -= Math.abs(matchedPol.deductionAmount);
            reasonParts.push(`Early ${earlyMinutes}m (-${matchedPol.deductionAmount})`);
        }
    }

    // 3. Day Salary
    let daySalary = Number((hrs * hourlyRate).toFixed(2));
    const minHoursPol = activePolicies.find(p => p.isActive && p.type === 'MIN_HOURS_FULL_PAY');
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

// Searchable Employee Combobox with Autocomplete Suggestions
function EmployeeSearchCombobox({ employees, selectedEmployeeId, onSelectEmployee, employeeFullName }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        setSearchTerm(employeeFullName || '');
    }, [employeeFullName, selectedEmployeeId]);

    const filteredEmployees = useMemo(() => {
        if (!searchTerm.trim()) return employees;
        const q = searchTerm.toLowerCase();
        return employees.filter(emp => {
            const name = (emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.displayName || '').toLowerCase();
            const code = (emp.payrollNumber || emp.employeeCode || '').toLowerCase();
            const desig = (emp.designationId?.title || '').toLowerCase();
            return name.includes(q) || code.includes(q) || desig.includes(q);
        });
    }, [employees, searchTerm]);

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
                        className="text-gray-500 hover:text-black px-1 text-xs"
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
                <div className="absolute left-0 top-full mt-1 w-full min-w-[280px] bg-white border border-slate-300 shadow-2xl rounded-lg z-50 max-h-60 overflow-y-auto">
                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Available Employees ({filteredEmployees.length})
                    </div>
                    {filteredEmployees.length === 0 ? (
                        <div className="p-3 text-xs text-slate-500 text-center italic">
                            No employees matching "{searchTerm}"
                        </div>
                    ) : (
                        filteredEmployees.map(emp => {
                            const name = emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.displayName;
                            const isSelected = emp._id === selectedEmployeeId;
                            return (
                                <button
                                    key={emp._id}
                                    type="button"
                                    onClick={() => {
                                        onSelectEmployee(emp._id);
                                        setSearchTerm(name);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer ${
                                        isSelected ? 'bg-indigo-50 font-bold text-indigo-900 border-l-4 border-l-indigo-600' : 'text-slate-800'
                                    }`}
                                >
                                    <div>
                                        <div className="font-semibold text-slate-900">{name}</div>
                                        {emp.designationId?.title && (
                                            <div className="text-[10px] text-slate-500">{emp.designationId.title}</div>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                                        {emp.payrollNumber || emp.employeeCode || 'EMP'}
                                    </span>
                                </button>
                            );
                        })
                    )}
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
    const [hideHeaderForLetterhead, setHideHeaderForLetterhead] = useState(false);

    // EPF / ETF Toggle & Rates (Global for all employees)
    const [includeEpfEtf, setIncludeEpfEtf] = useState(false);
    const [epfEmployeeRate, setEpfEmployeeRate] = useState(8);
    const [epfEmployerRate, setEpfEmployerRate] = useState(12);
    const [etfEmployerRate, setEtfEmployerRate] = useState(3);
    const [salaryPolicies, setSalaryPolicies] = useState(defaultPoliciesFallback);

    // Fetch active employees
    const { data: employeesData } = useQuery({
        queryKey: ['active-employees-list'],
        queryFn: () => employeesApi.list({ limit: 500, status: 'active' }),
    });

    const employees = useMemo(() => employeesData?.data || [], [employeesData]);

    // Select first employee automatically
    useEffect(() => {
        if (!selectedEmployeeId && employees.length > 0) {
            setSelectedEmployeeId(employees[0]._id);
        }
    }, [selectedEmployeeId, employees]);

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
        if (sheetData?.employee) return sheetData.employee;
        return employees.find(e => e._id === selectedEmployeeId) || {};
    }, [sheetData, employees, selectedEmployeeId]);

    const employeeFullName = useMemo(() => {
        return currentEmployee.name || currentEmployee.fullName || `${currentEmployee.firstName || ''} ${currentEmployee.lastName || ''}`.trim() || currentEmployee.displayName || 'Employee';
    }, [currentEmployee]);

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
            return evaluateRowPolicy(r, onTime, offTime, effectiveHourlyRate, policiesToApply);
        }));
        toast.success('Policies applied to all days successfully!');
    };

    // Save policies from modal and optionally apply to sheet
    const handleSavePoliciesFromModal = async (payload) => {
        await savePoliciesMutation.mutateAsync(payload);
        setSalaryPolicies(payload.salaryPolicies);
        setEpfEmployeeRate(payload.epfEmployeeRate);
        setEpfEmployerRate(payload.epfEmployerRate);
        setEtfEmployerRate(payload.etfEmployerRate);
    };

    // Handle in-place row editing with AUTO-POLICY EVALUATION
    // Focus grid cell helper for spreadsheet keyboard responsiveness
    const focusGridCell = (rowIndex, colIndex, preferredDirection = 'next') => {
        let r = Math.max(0, Math.min(rowIndex, rows.length - 1));
        let c = Math.max(0, Math.min(colIndex, 7));

        let target = document.querySelector(`[data-grid-cell="true"][data-row="${r}"][data-col="${c}"]`);
        
        if (!target) {
            if (preferredDirection === 'next' || preferredDirection === 'down') {
                for (let nextC = c + 1; nextC <= 7; nextC++) {
                    target = document.querySelector(`[data-grid-cell="true"][data-row="${r}"][data-col="${nextC}"]`);
                    if (target) break;
                }
            } else {
                for (let prevC = c - 1; prevC >= 0; prevC--) {
                    target = document.querySelector(`[data-grid-cell="true"][data-row="${r}"][data-col="${prevC}"]`);
                    if (target) break;
                }
            }
        }

        if (target) {
            target.focus();
            if (typeof target.select === 'function' && target.type !== 'checkbox' && target.type !== 'time') {
                try { target.select(); } catch {}
            }
        }
    };

    const handleCellKeyDown = (e, rowIndex, colIndex) => {
        const isTime = e.target.type === 'time';
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

        // Enter -> Next row, same column (Excel style)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            focusGridCell(rowIndex + 1, colIndex, 'down');
            return;
        }
        // Shift + Enter -> Prev row, same column
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            focusGridCell(rowIndex - 1, colIndex, 'up');
            return;
        }
        // ArrowDown / ArrowUp: If inside time input, let native browser adjust hours/minutes; otherwise navigate rows
        if (!isTime) {
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
        }
        // Tab -> Next cell in row or wrap to next row
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            if (colIndex < 7) {
                focusGridCell(rowIndex, colIndex + 1, 'next');
            } else if (rowIndex < rows.length - 1) {
                focusGridCell(rowIndex + 1, 0, 'next');
            }
            return;
        }
        // Shift + Tab -> Prev cell in row or wrap to prev row
        if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            if (colIndex > 0) {
                focusGridCell(rowIndex, colIndex - 1, 'prev');
            } else if (rowIndex > 0) {
                focusGridCell(rowIndex - 1, 7, 'prev');
            }
            return;
        }
        // ArrowRight -> if at end of text or checkbox
        if (e.key === 'ArrowRight' && (cursorAtEnd || !isText)) {
            if (colIndex < 7) {
                e.preventDefault();
                focusGridCell(rowIndex, colIndex + 1, 'next');
            }
            return;
        }
        // ArrowLeft -> if at start of text or checkbox
        if (e.key === 'ArrowLeft' && (cursorAtStart || !isText)) {
            if (colIndex > 0) {
                e.preventDefault();
                focusGridCell(rowIndex, colIndex - 1, 'prev');
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
                row = evaluateRowPolicy(row, onTime, offTime, effectiveHourlyRate, salaryPolicies);
            } else if (field === 'inTime' || field === 'outTime') {
                row[field] = value;
                row.isTicked = true;
                row = evaluateRowPolicy(row, onTime, offTime, effectiveHourlyRate, salaryPolicies);
            } else if (field === 'hours') {
                const hrs = Number(value) || 0;
                row.hours = hrs;
                if (hrs > 0) {
                    row.isTicked = true;
                    row.daySalary = Number((hrs * effectiveHourlyRate).toFixed(2));
                } else {
                    row.daySalary = 0;
                }
            } else if (field === 'daySalary') {
                row.daySalary = Number(value) || 0;
                if (row.daySalary > 0) row.isTicked = true;
            } else if (field === 'advance') {
                row.advance = value === '' ? 0 : Number(value);
                setCustomTotalAdvance(null);
            } else if (field === 'deduction') {
                row.deduction = Number(value) || 0;
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
            return evaluateRowPolicy(raw, onTime, offTime, effectiveHourlyRate, salaryPolicies);
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
        
        // EPF / ETF calculations
        const epfEmployeeDeduction = includeEpfEtf ? Number((totalSalary * (epfEmployeeRate / 100)).toFixed(2)) : 0;
        const epfEmployerContribution = includeEpfEtf ? Number((totalSalary * (epfEmployerRate / 100)).toFixed(2)) : 0;
        const etfEmployerContribution = includeEpfEtf ? Number((totalSalary * (etfEmployerRate / 100)).toFixed(2)) : 0;

        // Net Salary calculation
        const netSalary = Math.max(0, totalSalary - effectiveTotalAdvance + totalDeduction - epfEmployeeDeduction);

        return {
            totalLeave,
            totalDays,
            totalHours: Number(totalHours.toFixed(2)),
            totalSalary: Number(totalSalary.toFixed(2)),
            totalAdvance: Number(effectiveTotalAdvance.toFixed(2)),
            totalDeduction: Number(totalDeduction.toFixed(2)),
            epfEmployeeDeduction,
            epfEmployerContribution,
            etfEmployerContribution,
            netSalary: Number(netSalary.toFixed(2))
        };
    }, [rows, customTotalAdvance, includeEpfEtf, epfEmployeeRate, epfEmployerRate, etfEmployerRate]);

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

    // Print Sheet Action
    const handlePrint = () => {
        toast.dismiss();
        window.print();
    };

    // Executive PDF Download Function
    const handleDownloadOfficialPdf = () => {
        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const empName = employeeFullName;
            const payrollNo = currentEmployee.payrollNumber || '000-00-0293';

            let startY = 8;
            if (!hideHeaderForLetterhead) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(13);
                doc.text(systemSettings.companyName || 'GLX INDUSTRIES (PVT) LTD', 105, startY, { align: 'center' });
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(systemSettings.companyAddress || 'High-Quality Manufacturing & Vehicle Body Engineering', 105, startY + 4.5, { align: 'center' });
                doc.text(`Contact: ${systemSettings.companyPhone || '+94 11 234 5678'} | Email: ${systemSettings.companyEmail || 'info@glx.lk'}`, 105, startY + 8.5, { align: 'center' });
                startY += 12;
            }

            // Title Banner
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.35);
            doc.rect(10, startY, 190, 6.5);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.text('EMPLOYEE PAYMENT RECORD SHEET', 105, startY + 4.5, { align: 'center' });

            startY += 8;

            // Header Metadata Grid
            const metadataBody = [
                ['NAME', `: ${empName}`, 'Payroll No', `: ${payrollNo}`],
                ['SALARY PER HOURS', `: Rs. ${Number(effectiveHourlyRate).toFixed(0)}`, '', ''],
                ['ON TIME', `: ${onTime}`, 'OFF TIME', `: ${offTime}`],
                ['DATE FROM', `: ${startDate}`, 'DATE TO', `: ${endDate}`],
                ['TOTAL LEAVE', `: ${dynamicTotals.totalLeave}`, 'TOTAL SALARY', `: Rs. ${dynamicTotals.totalSalary.toLocaleString()}`],
                ['TOTAL DAYS', `: ${dynamicTotals.totalDays}`, 'TOTAL ADVANCE', `: Rs. ${dynamicTotals.totalAdvance.toLocaleString()}`],
            ];

            if (includeEpfEtf) {
                metadataBody.push(['TOTAL HOURS', `: ${dynamicTotals.totalHours}`, `EPF (${epfEmployeeRate}%)`, `: -Rs. ${dynamicTotals.epfEmployeeDeduction.toLocaleString()}`]);
                metadataBody.push(['', '', 'NET SALARY', `: Rs. ${dynamicTotals.netSalary.toLocaleString()}`]);
            } else {
                metadataBody.push(['TOTAL HOURS', `: ${dynamicTotals.totalHours}`, 'NET SALARY', `: Rs. ${dynamicTotals.netSalary.toLocaleString()}`]);
            }

            autoTable(doc, {
                startY: startY,
                margin: { left: 10, right: 10 },
                theme: 'plain',
                styles: { fontSize: 7.5, cellPadding: 0.9, textColor: [0, 0, 0] },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 32 },
                    1: { cellWidth: 55 },
                    2: { fontStyle: 'bold', cellWidth: 32, halign: 'right' },
                    3: { cellWidth: 71, halign: 'right', fontStyle: 'bold' }
                },
                body: metadataBody
            });

            const tableStartY = doc.lastAutoTable.finalY + 2;

            // 31-Day Ledger Table
            const tableRows = rows.map(r => [
                r.isTicked ? '✓' : '',
                r.date ? r.date.substring(5) : '',
                r.day || '',
                r.isTicked ? (r.inTime || '') : '',
                r.isTicked ? (r.outTime || '') : '',
                r.isTicked && r.hours > 0 ? Number(r.hours).toFixed(2) : '',
                r.isTicked && r.daySalary > 0 ? Number(r.daySalary).toFixed(0) : '',
                r.advance > 0 ? Number(r.advance).toFixed(0) : '',
                r.deduction !== 0 ? Number(r.deduction).toFixed(0) : '0',
                r.reason || ''
            ]);

            autoTable(doc, {
                startY: tableStartY,
                margin: { left: 10, right: 10 },
                theme: 'grid',
                styles: {
                    fontSize: 6.8,
                    cellPadding: 0.8,
                    textColor: [0, 0, 0],
                    lineColor: [0, 0, 0],
                    lineWidth: 0.15
                },
                headStyles: {
                    fillColor: [255, 255, 255],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    halign: 'center',
                    lineColor: [0, 0, 0]
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 9, fillColor: [255, 242, 204] }, // TICK
                    1: { halign: 'center', cellWidth: 15, fillColor: [226, 239, 218] }, // DATE
                    2: { halign: 'left', cellWidth: 26, fontStyle: 'bold', fillColor: [226, 239, 218] }, // DAY
                    3: { halign: 'center', cellWidth: 16, fillColor: [255, 242, 204] }, // IN
                    4: { halign: 'center', cellWidth: 16, fillColor: [255, 242, 204] }, // OUT
                    5: { halign: 'center', cellWidth: 14, fontStyle: 'bold', fillColor: [226, 239, 218] }, // HOURS
                    6: { halign: 'right', cellWidth: 24, fontStyle: 'bold', fillColor: [226, 239, 218] }, // DAY SALARY
                    7: { halign: 'right', cellWidth: 18, fillColor: [255, 242, 204] }, // ADVANCE
                    8: { halign: 'right', cellWidth: 18, fontStyle: 'bold', fillColor: [226, 239, 218] }, // DEDUCTION
                    9: { halign: 'left', cellWidth: 34, fillColor: [226, 239, 218] } // Reason
                },
                head: [['TICK', 'DATE', 'DAY', 'IN', 'OUT', 'HOURS', 'DAY SALARY', 'ADVANCE', 'DEDUCTION', 'Reason']],
                body: tableRows,
                didParseCell: (data) => {
                    if (data.section === 'body') {
                        const r = rows[data.row.index];
                        if (r && r.day === 'SUNDAY') {
                            if (data.column.index === 1 || data.column.index === 2) {
                                data.cell.styles.fillColor = [252, 232, 230];
                                data.cell.styles.textColor = [192, 0, 0];
                                data.cell.styles.fontStyle = 'bold';
                            }
                        }
                    }
                }
            });

            const finalY = doc.lastAutoTable.finalY + 3;

            // Optional EPF/ETF statutory note if included
            if (includeEpfEtf) {
                doc.setFontSize(7);
                doc.setFont('helvetica', 'italic');
                doc.text(`* Statutory: Employer EPF (${epfEmployerRate}%): Rs. ${dynamicTotals.epfEmployerContribution.toLocaleString()} | Employer ETF (${etfEmployerRate}%): Rs. ${dynamicTotals.etfEmployerContribution.toLocaleString()} (Paid by company)`, 10, finalY);
            }

            // Signature Section
            const sigY = includeEpfEtf ? finalY + 4 : finalY + 2;
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.text('Prepared By: __________________________', 10, sigY + 4);
            doc.text('Checked By: __________________________', 60, sigY + 4);
            doc.text('Employee Signature: __________________________', 110, sigY + 4);
            doc.text('Authorized Signature: __________________________', 155, sigY + 4);

            doc.save(`Payment_Sheet_${empName.replace(/\s+/g, '_')}_${startDate}.pdf`);
            toast.success('Executive PDF downloaded successfully!');
        } catch (err) {
            toast.error('Failed to export PDF: ' + err.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100/90 p-3 sm:p-6 font-sans text-slate-900 print:bg-white print:p-0">
            
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

            {/* TOP EXECUTIVE APP BAR (Screen Only - No Emojis) */}
            <div className="max-w-[960px] mx-auto mb-4 print:hidden">
                <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs mb-3 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-extrabold tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-full uppercase">
                                Human Resources Operations
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs font-medium text-slate-500">
                                Manual Spreadsheet & Payment Ledger
                            </span>
                        </div>
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                            Employee Payment Record Sheet
                        </h1>
                    </div>

                    {/* Live Overview Badges */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                        <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-center min-w-[85px]">
                            <span className="text-[10px] text-slate-500 font-semibold block uppercase">Days Worked</span>
                            <span className="font-bold text-slate-900 font-mono text-sm">{dynamicTotals.totalDays}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-center min-w-[85px]">
                            <span className="text-[10px] text-slate-500 font-semibold block uppercase">Total Hours</span>
                            <span className="font-bold text-slate-900 font-mono text-sm">{dynamicTotals.totalHours}</span>
                        </div>
                        <div className="bg-indigo-50/80 border border-indigo-200 px-3 py-1.5 rounded-lg text-center min-w-[105px]">
                            <span className="text-[10px] text-indigo-700 font-semibold block uppercase">Net Payable</span>
                            <span className="font-extrabold text-indigo-950 font-mono text-sm">
                                Rs. {Number(dynamicTotals.netSalary).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Keyboard Navigation Shortcuts Bar (Screen Only) */}
                <div className="flex items-center justify-between text-[11px] bg-slate-50 border border-slate-200/90 rounded-lg px-3 py-1.5 text-slate-600 mt-2.5 shadow-2xs">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                            <Keyboard size={13} className="text-indigo-600" />
                            Keyboard Shortcuts:
                        </span>
                        <span><kbd className="bg-white border border-slate-300 px-1 py-0.2 rounded font-mono font-semibold text-[10px]">Enter</kbd> / <kbd className="bg-white border border-slate-300 px-1 py-0.2 rounded font-mono font-semibold text-[10px]">↓</kbd> Down</span>
                        <span><kbd className="bg-white border border-slate-300 px-1 py-0.2 rounded font-mono font-semibold text-[10px]">Shift+Enter</kbd> / <kbd className="bg-white border border-slate-300 px-1 py-0.2 rounded font-mono font-semibold text-[10px]">↑</kbd> Up</span>
                        <span><kbd className="bg-white border border-slate-300 px-1 py-0.2 rounded font-mono font-semibold text-[10px]">Tab</kbd> / <kbd className="bg-white border border-slate-300 px-1 py-0.2 rounded font-mono font-semibold text-[10px]">→</kbd> Next Cell</span>
                        <span><kbd className="bg-white border border-slate-300 px-1 py-0.2 rounded font-mono font-semibold text-[10px]">Space</kbd> Toggle Tick</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span><kbd className="bg-white border border-slate-300 px-1 py-0.2 rounded font-mono font-semibold text-[10px]">Ctrl+S</kbd> Save</span>
                        <span><kbd className="bg-white border border-slate-300 px-1 py-0.2 rounded font-mono font-semibold text-[10px]">Ctrl+P</kbd> Print</span>
                        <span><kbd className="bg-white border border-slate-300 px-1 py-0.2 rounded font-mono font-semibold text-[10px]">Alt+A</kbd> Advance</span>
                    </div>
                </div>

                {/* Streamlined Action Control Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                    {/* Left Workflow Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => navigate('/hr/daily-manual-attendance')}
                            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-700 rounded-lg shadow-xs hover:bg-slate-50 hover:border-slate-400 flex items-center gap-1.5 transition"
                        >
                            <ArrowLeft size={14} className="text-slate-500" />
                            Daily Attendance Grid
                        </button>
                        
                        <button
                            onClick={() => setIsPoliciesModalOpen(true)}
                            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-800 rounded-lg shadow-xs hover:bg-slate-50 hover:border-slate-400 flex items-center gap-1.5 transition"
                            title="Configure Late Arrival rules, grace cover hours, absent cuts and EPF/ETF rates"
                        >
                            <Sliders size={14} className="text-slate-600" />
                            Salary Policies
                        </button>

                        <button
                            onClick={handleFillAllDays}
                            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-800 rounded-lg shadow-xs hover:bg-slate-50 hover:border-slate-400 flex items-center gap-1.5 transition"
                            title="Auto-tick all days with default shift hours & apply policies"
                        >
                            <CheckCheck size={14} className="text-slate-600" />
                            Fill Shift Hours
                        </button>

                        <button
                            onClick={() => setIsPayslipModalOpen(true)}
                            className="px-3.5 py-1.5 text-xs font-semibold bg-[#131943] hover:bg-[#1a2259] text-white rounded-lg shadow-xs flex items-center gap-1.5 transition"
                            title="View and download modern executive salary slip"
                        >
                            <FileText size={14} className="text-emerald-400" />
                            Salary Slip (Slip)
                        </button>

                        <button
                            onClick={() => setIsAdvanceModalOpen(true)}
                            className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 transition"
                            title="Record salary advance for this employee"
                        >
                            <Plus size={14} className="text-white" />
                            Record Advance
                        </button>
                    </div>

                    {/* Right Output & Print Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setHideHeaderForLetterhead(!hideHeaderForLetterhead)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition ${
                                hideHeaderForLetterhead
                                    ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                            title={hideHeaderForLetterhead ? 'For printing on pre-printed letterhead paper' : 'Print with company header'}
                        >
                            {hideHeaderForLetterhead ? <EyeOff size={13} className="text-amber-700" /> : <Eye size={13} className="text-slate-500" />}
                            {hideHeaderForLetterhead ? 'Letterhead Mode' : 'With Header'}
                        </button>

                        <button
                            onClick={handleDownloadOfficialPdf}
                            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg shadow-xs flex items-center gap-1.5 transition"
                        >
                            <Download size={14} className="text-slate-600" />
                            Download PDF
                        </button>

                        <button
                            onClick={handlePrint}
                            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-800 rounded-lg shadow-xs hover:bg-slate-50 flex items-center gap-1.5 transition"
                        >
                            <Printer size={14} className="text-slate-600" />
                            Print Sheet
                        </button>

                        <button
                            onClick={() => refetch()}
                            disabled={Boolean(isFetching)}
                            className="p-1.5 text-xs bg-white border border-slate-300 rounded-lg shadow-xs hover:bg-slate-50 text-slate-700 transition"
                            title="Reload sheet"
                        >
                            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* SPREADSHEET PAGE CANVAS (Matches Reference Design on Paper & Pure White in Print) */}
            <div className="sheet-print-container max-w-[960px] mx-auto bg-white border border-slate-300 rounded-xl p-4 sm:p-8 shadow-xl print:shadow-none print:border-0 print:p-0 print:rounded-none">
                
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

                {/* 1. Header Box (Screen Only) */}
                <div className="border border-black py-1 px-4 text-center font-bold text-gray-950 tracking-wider text-sm uppercase bg-white mb-3 print:hidden">
                    EMPLOYEE PAYMENT RECORD SHEET
                </div>

                {/* 2. Top Header Metadata Grid — STRICT 2-COLUMN PARALLEL GRID (Screen Only) */}
                <div 
                    className="header-two-columns mb-3 text-[12px] print:hidden"
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '24px', rowGap: '4px' }}
                >
                    {/* Left Column */}
                    <div className="space-y-1">
                        {/* NAME */}
                        <div className="flex items-center">
                            <span className="w-36 font-bold text-black uppercase text-right pr-2">NAME</span>
                            <div className="flex-1 bg-[#BAC8E8] border border-black p-0.5 min-h-[24px] flex items-center relative">
                                <EmployeeSearchCombobox
                                    employees={employees}
                                    selectedEmployeeId={selectedEmployeeId}
                                    onSelectEmployee={(empId) => {
                                        setSelectedEmployeeId(empId);
                                        setCustomHourlyRate(null);
                                        setSearchParams({ employeeId: empId, startDate, endDate });
                                    }}
                                    employeeFullName={employeeFullName}
                                />
                            </div>
                        </div>

                        {/* SALARY PER HOURS */}
                        <div className="flex items-center">
                            <span className="w-36 font-bold text-black uppercase text-right pr-2">SALARY PER HOURS</span>
                            <div className="w-24 bg-[#BAC8E8] border border-black px-1 py-0.5 text-center min-h-[24px] flex items-center justify-center">
                                <input
                                    type="number"
                                    value={effectiveHourlyRate}
                                    onChange={(e) => handleHourlyRateChange(e.target.value)}
                                    className="w-full bg-transparent text-center font-bold text-black focus:bg-white focus:outline-none print-hide-input"
                                    placeholder="260"
                                />
                                <span className="hidden print:block font-bold text-black font-mono">
                                    {effectiveHourlyRate}
                                </span>
                            </div>
                        </div>

                        {/* ON TIME */}
                        <div className="flex items-center">
                            <span className="w-36 font-bold text-black uppercase text-right pr-2">ON TIME</span>
                            <div className="w-44 bg-[#D9D9D9] border border-black px-2 py-0.5 font-bold text-black text-center min-h-[24px] flex items-center justify-center">
                                <input
                                    type="time"
                                    value={onTime}
                                    onChange={(e) => setOnTime(e.target.value)}
                                    className="bg-transparent w-full text-center font-bold focus:bg-white focus:outline-none print-hide-input text-xs cursor-pointer"
                                />
                                <span className="hidden print:block font-bold text-black font-mono">
                                    {onTime}
                                </span>
                            </div>
                        </div>

                        {/* DATE FROM */}
                        <div className="flex items-center">
                            <span className="w-36 font-bold text-black uppercase text-right pr-2">DATE FROM</span>
                            <div className="w-44 bg-[#D9D9D9] border border-black px-1.5 py-0.5 font-bold text-black text-center min-h-[24px] flex items-center justify-center">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        setSearchParams({ employeeId: selectedEmployeeId, startDate: e.target.value, endDate });
                                    }}
                                    className="bg-transparent w-full text-center focus:outline-none cursor-pointer print-hide-input"
                                />
                                <span className="hidden print:block font-bold text-black font-mono">
                                    {startDate}
                                </span>
                            </div>
                        </div>

                        {/* Space before Totals */}
                        <div className="pt-2 space-y-1">
                            {/* TOTAL LEAVE */}
                            <div className="flex items-center">
                                <span className="w-36 font-bold text-black uppercase text-right pr-2">TOTAL LEAVE</span>
                                <div className="w-24 bg-[#BAC8E8] border border-black px-2 py-0.5 font-bold text-black text-center font-mono">
                                    {dynamicTotals.totalLeave}
                                </div>
                            </div>

                            {/* TOTAL DAYS */}
                            <div className="flex items-center">
                                <span className="w-36 font-bold text-black uppercase text-right pr-2">TOTAL DAYS</span>
                                <div className="w-24 bg-[#BAC8E8] border border-black px-2 py-0.5 font-bold text-black text-center font-mono">
                                    {dynamicTotals.totalDays}
                                </div>
                            </div>

                            {/* TOTAL HOURS */}
                            <div className="flex items-center">
                                <span className="w-36 font-bold text-black uppercase text-right pr-2">TOTAL HOURS</span>
                                <div className="w-24 bg-[#BAC8E8] border border-black px-2 py-0.5 font-bold text-black text-center font-mono">
                                    {dynamicTotals.totalHours}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-1">
                        {/* Row 1: Payroll No + EPF/ETF Checkbox */}
                        <div className="flex items-center justify-between h-6 pr-2">
                            {/* INCLUDE EPF/ETF TICK CHECKBOX */}
                            <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-bold text-slate-800 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded print-hide-input hover:bg-slate-200 transition">
                                <input
                                    type="checkbox"
                                    checked={includeEpfEtf}
                                    onChange={(e) => setIncludeEpfEtf(e.target.checked)}
                                    className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                                />
                                <span>Include EPF / ETF ({epfEmployeeRate}%)</span>
                            </label>

                            <div className="flex items-center ml-auto">
                                <span className="font-bold text-black mr-2">Payroll No</span>
                                <span className="font-bold text-black font-mono">{currentEmployee.payrollNumber || '000-00-0293'}</span>
                            </div>
                        </div>

                        {/* Row 2: Spacer to align horizontally with SALARY PER HOURS */}
                        <div className="h-6"></div>

                        {/* Row 3: OFF TIME + SAVE Button */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <span className="w-28 font-bold text-black uppercase text-right pr-2">OFF TIME</span>
                                <div className="w-44 bg-[#D9D9D9] border border-black px-2 py-0.5 font-bold text-black text-center min-h-[24px] flex items-center justify-center">
                                    <input
                                        type="time"
                                        value={offTime}
                                        onChange={(e) => setOffTime(e.target.value)}
                                        className="bg-transparent w-full text-center font-bold focus:bg-white focus:outline-none print-hide-input text-xs cursor-pointer"
                                    />
                                    <span className="hidden print:block font-bold text-black font-mono">
                                        {offTime}
                                    </span>
                                </div>
                            </div>

                            {/* SAVE BUTTON */}
                            <button
                                onClick={handleSave}
                                disabled={saveMutation.isPending}
                                className="bg-[#EFEFEF] hover:bg-[#E0E0E0] active:bg-[#CCCCCC] border border-black px-5 py-0.5 font-bold text-black uppercase tracking-wider rounded-none shadow-xs text-xs cursor-pointer ml-2 print:hidden"
                            >
                                {saveMutation.isPending ? 'SAVING...' : 'SAVE'}
                            </button>
                        </div>

                        {/* Row 4: DATE TO */}
                        <div className="flex items-center">
                            <span className="w-28 font-bold text-black uppercase text-right pr-2">DATE TO</span>
                            <div className="w-44 bg-[#D9D9D9] border border-black px-1.5 py-0.5 font-bold text-black text-center min-h-[24px] flex items-center justify-center">
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        setSearchParams({ employeeId: selectedEmployeeId, startDate, endDate: e.target.value });
                                    }}
                                    className="bg-transparent w-full text-center focus:outline-none cursor-pointer print-hide-input"
                                />
                                <span className="hidden print:block font-bold text-black font-mono">
                                    {endDate}
                                </span>
                            </div>
                        </div>

                        {/* Space before Totals */}
                        <div className="pt-2 space-y-1">
                            {/* TOTAL SALARY */}
                            <div className="flex items-center">
                                <span className="w-28 font-bold text-black uppercase text-right pr-2">TOTAL SALARY</span>
                                <div className="w-44 bg-[#BAC8E8] border border-black px-2 py-0.5 font-bold text-black text-right font-mono">
                                    {Number(dynamicTotals.totalSalary).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                </div>
                            </div>

                            {/* TOTAL ADVANCE */}
                            <div className="flex items-center">
                                <div className="w-28 flex items-center justify-end gap-1 pr-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAdvanceModalOpen(true)}
                                        className="print:hidden text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 p-0.5 rounded text-[10px] font-bold flex items-center transition"
                                        title="Record Salary Advance"
                                    >
                                        <Plus size={11} />
                                    </button>
                                    <span className="font-bold text-black uppercase">TOTAL ADVANCE</span>
                                </div>
                                <div className="w-44 bg-[#BAC8E8] border border-black px-1 py-0.5 min-h-[24px] flex items-center justify-end">
                                    <input
                                        type="number"
                                        value={dynamicTotals.totalAdvance === 0 ? '' : dynamicTotals.totalAdvance}
                                        placeholder="0"
                                        onChange={(e) => handleHeaderAdvanceChange(e.target.value)}
                                        className="w-full bg-transparent text-right font-bold text-black font-mono focus:bg-white focus:outline-none print-hide-input"
                                        title="Type monthly total advance or enter daily advances in the table below"
                                    />
                                    <span className="hidden print:block font-bold text-black font-mono text-right">
                                        {dynamicTotals.totalAdvance > 0 ? dynamicTotals.totalAdvance.toLocaleString() : '0'}
                                    </span>
                                </div>
                            </div>

                            {/* CONDITIONAL EPF DEDUCTION LINE */}
                            {includeEpfEtf && (
                                <div className="flex items-center">
                                    <span className="w-28 font-bold text-rose-800 uppercase text-right pr-2">
                                        EPF ({epfEmployeeRate}%)
                                    </span>
                                    <div className="w-44 bg-[#BAC8E8] border border-black px-2 py-0.5 font-bold text-rose-800 text-right font-mono">
                                        -{Number(dynamicTotals.epfEmployeeDeduction).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                    </div>
                                </div>
                            )}

                            {/* NET SALARY */}
                            <div className="flex items-center">
                                <span className="w-28 font-bold text-black uppercase text-right pr-2">NET SALARY</span>
                                <div className="w-44 bg-[#BAC8E8] border border-black px-2 py-0.5 font-bold text-black text-right font-mono text-sm sm:text-base">
                                    {Number(dynamicTotals.netSalary).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                </div>
                            </div>

                            {/* Statutory Employer Contributions Callout */}
                            {includeEpfEtf && (
                                <div className="text-[10px] text-gray-600 text-right pr-1 pt-0.5 font-medium">
                                    Employer EPF ({epfEmployerRate}%): Rs. {Number(dynamicTotals.epfEmployerContribution).toLocaleString()} | ETF ({etfEmployerRate}%): Rs. {Number(dynamicTotals.etfEmployerContribution).toLocaleString()}
                                </div>
                            )}
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
                    <div className="no-sticky-height employee-payment-sheet-print print-container overflow-x-auto border border-black mb-3 print:overflow-visible print:border-none print:m-0 print:p-0">
                        <table className="no-sticky-height employee-payment-sheet-print w-full border-collapse text-[11px] font-sans">
                            <thead>
                                <tr className="bg-white border-b border-black font-bold text-black text-center">
                                    <th className="border-r border-black py-1 px-1 w-10">
                                        <button
                                            type="button"
                                            onClick={handleFillAllDays}
                                            className="text-[9px] text-blue-700 underline font-bold print-hide-input"
                                            title="Click to check all days & apply policies"
                                        >
                                            TICK
                                        </button>
                                        <span className="hidden print:inline font-bold text-black">TICK</span>
                                    </th>
                                    <th className="border-r border-black py-1 px-2 w-16">DATE</th>
                                    <th className="border-r border-black py-1 px-2 w-28">DAY</th>
                                    <th className="border-r border-black py-1 px-1 w-24">IN</th>
                                    <th className="border-r border-black py-1 px-1 w-24">OUT</th>
                                    <th className="border-r border-black py-1 px-2 w-16">HOURS</th>
                                    <th className="border-r border-black py-1 px-2 w-24">DAY SALARY</th>
                                    <th className="border-r border-black py-1 px-2 w-20">ADVANCE</th>
                                    <th className="border-r border-black py-1 px-2 w-20">DEDUCTION</th>
                                    <th className="py-1 px-2 text-left w-32">Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, idx) => (
                                    <tr 
                                        key={row.date || idx} 
                                        className={`border-b border-black transition-colors ${
                                            !row.isTicked ? 'opacity-80' : ''
                                        }`}
                                    >
                                        {/* 1. TICK (Light Yellow) */}
                                        <td className="border-r border-black bg-[#FFF2CC] text-center p-0.5">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(row.isTicked)}
                                                onChange={(e) => handleRowChange(idx, 'isTicked', e.target.checked)}
                                                data-grid-cell="true"
                                                data-row={idx}
                                                data-col={0}
                                                onKeyDown={(e) => handleCellKeyDown(e, idx, 0)}
                                                className="w-3.5 h-3.5 cursor-pointer accent-blue-600 print-hide-input focus:ring-2 focus:ring-blue-500 rounded"
                                            />
                                            <span className="hidden print:inline font-bold text-black text-xs">
                                                {row.isTicked ? '✓' : ''}
                                            </span>
                                        </td>

                                        {/* 2. DATE (Light Green, or Red for Sunday) */}
                                        <td className={`border-r border-black px-1 py-0.5 text-center font-bold ${
                                            row.day === 'SUNDAY' ? 'bg-[#FCE8E6] text-[#C00000]' : 'bg-[#E2EFDA] text-black font-medium'
                                        }`}>
                                            {row.date ? row.date.substring(5) : ''}
                                        </td>

                                        {/* 3. DAY (Light Green, or Red for Sunday) */}
                                        <td className={`border-r border-black px-2 py-0.5 font-bold uppercase ${
                                            row.day === 'SUNDAY' ? 'bg-[#FCE8E6] text-[#C00000]' : 'bg-[#E2EFDA] text-black'
                                        }`}>
                                            {row.day}
                                        </td>

                                        {/* 4. IN TIME (Light Yellow) — STRICT TIME ONLY */}
                                        <td className="border-r border-black bg-[#FFF2CC] p-0.5 text-center font-mono">
                                            <input
                                                type="time"
                                                value={row.isTicked ? (row.inTime || onTime) : ''}
                                                disabled={!row.isTicked}
                                                onChange={(e) => handleRowChange(idx, 'inTime', e.target.value)}
                                                data-grid-cell="true"
                                                data-row={idx}
                                                data-col={1}
                                                onKeyDown={(e) => handleCellKeyDown(e, idx, 1)}
                                                className="w-full bg-transparent text-center focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none p-0 text-[11px] font-semibold text-black print-hide-input cursor-pointer disabled:cursor-not-allowed"
                                            />
                                            <span className="hidden print:inline font-mono font-semibold text-black">
                                                {row.isTicked ? (row.inTime || onTime) : ''}
                                            </span>
                                        </td>

                                        {/* 5. OUT TIME (Light Yellow) — STRICT TIME ONLY */}
                                        <td className="border-r border-black bg-[#FFF2CC] p-0.5 text-center font-mono">
                                            <input
                                                type="time"
                                                value={row.isTicked ? (row.outTime || offTime) : ''}
                                                disabled={!row.isTicked}
                                                onChange={(e) => handleRowChange(idx, 'outTime', e.target.value)}
                                                data-grid-cell="true"
                                                data-row={idx}
                                                data-col={2}
                                                onKeyDown={(e) => handleCellKeyDown(e, idx, 2)}
                                                className="w-full bg-transparent text-center focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none p-0 text-[11px] font-semibold text-black print-hide-input cursor-pointer disabled:cursor-not-allowed"
                                            />
                                            <span className="hidden print:inline font-mono font-semibold text-black">
                                                {row.isTicked ? (row.outTime || offTime) : ''}
                                            </span>
                                        </td>

                                        {/* 6. HOURS (Light Green) */}
                                        <td className="border-r border-black bg-[#E2EFDA] p-0.5 text-center font-mono font-bold text-black">
                                            <input
                                                type="number"
                                                step="0.5"
                                                value={row.isTicked && row.hours > 0 ? row.hours : ''}
                                                placeholder=""
                                                onChange={(e) => handleRowChange(idx, 'hours', e.target.value)}
                                                data-grid-cell="true"
                                                data-row={idx}
                                                data-col={3}
                                                onKeyDown={(e) => handleCellKeyDown(e, idx, 3)}
                                                className="w-full bg-transparent text-center font-bold text-black focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none p-0 text-[11px] print-hide-input"
                                            />
                                            <span className="hidden print:inline font-mono font-bold text-black">
                                                {row.isTicked && row.hours > 0 ? row.hours : ''}
                                            </span>
                                        </td>

                                        {/* 7. DAY SALARY (Light Green) */}
                                        <td className="border-r border-black bg-[#E2EFDA] p-0.5 text-right font-mono font-bold text-black">
                                            <input
                                                type="number"
                                                value={row.isTicked && row.daySalary > 0 ? row.daySalary : ''}
                                                placeholder=""
                                                onChange={(e) => handleRowChange(idx, 'daySalary', e.target.value)}
                                                data-grid-cell="true"
                                                data-row={idx}
                                                data-col={4}
                                                onKeyDown={(e) => handleCellKeyDown(e, idx, 4)}
                                                className="w-full bg-transparent text-right font-bold text-black focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none p-0 text-[11px] print-hide-input"
                                            />
                                            <span className="hidden print:inline font-mono font-bold text-black">
                                                {row.isTicked && row.daySalary > 0 ? Number(row.daySalary).toLocaleString() : ''}
                                            </span>
                                        </td>

                                        {/* 8. ADVANCE (Light Yellow) */}
                                        <td className="border-r border-black bg-[#FFF2CC] p-0.5 text-right font-mono">
                                            <input
                                                type="number"
                                                value={row.advance > 0 ? row.advance : ''}
                                                placeholder=""
                                                onChange={(e) => handleRowChange(idx, 'advance', e.target.value)}
                                                data-grid-cell="true"
                                                data-row={idx}
                                                data-col={5}
                                                onKeyDown={(e) => handleCellKeyDown(e, idx, 5)}
                                                className="w-full bg-transparent text-right focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none p-0 text-[11px] font-bold text-black print-hide-input"
                                                title="Type advance for this date"
                                            />
                                            <span className="hidden print:inline font-mono font-bold text-black">
                                                {row.advance > 0 ? Number(row.advance).toLocaleString() : ''}
                                            </span>
                                        </td>

                                        {/* 9. DEDUCTION (Light Green) */}
                                        <td className="border-r border-black bg-[#E2EFDA] p-0.5 text-right font-mono font-bold text-black">
                                            <input
                                                type="number"
                                                value={row.deduction}
                                                onChange={(e) => handleRowChange(idx, 'deduction', e.target.value)}
                                                data-grid-cell="true"
                                                data-row={idx}
                                                data-col={6}
                                                onKeyDown={(e) => handleCellKeyDown(e, idx, 6)}
                                                className={`w-full bg-transparent text-right focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none p-0 text-[11px] print-hide-input ${row.deduction < 0 ? 'text-rose-700 font-bold' : ''}`}
                                            />
                                            <span className={`hidden print:inline font-mono font-bold ${row.deduction < 0 ? 'text-black' : 'text-black'}`}>
                                                {row.deduction !== 0 ? row.deduction : ''}
                                            </span>
                                        </td>

                                        {/* 10. REASON (Light Green) */}
                                        <td className="bg-[#E2EFDA] p-0.5">
                                            <input
                                                type="text"
                                                value={row.reason || ''}
                                                placeholder=""
                                                onChange={(e) => handleRowChange(idx, 'reason', e.target.value)}
                                                data-grid-cell="true"
                                                data-row={idx}
                                                data-col={7}
                                                onKeyDown={(e) => handleCellKeyDown(e, idx, 7)}
                                                className="w-full bg-transparent px-1 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none text-[11px] font-semibold text-black print-hide-input"
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

            {/* Normal Payslip Modal */}
            <NormalPayslipModal
                isOpen={isPayslipModalOpen}
                onClose={() => setIsPayslipModalOpen(false)}
                employeeId={selectedEmployeeId}
                startDate={startDate}
                endDate={endDate}
                includeEpfEtf={includeEpfEtf}
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
