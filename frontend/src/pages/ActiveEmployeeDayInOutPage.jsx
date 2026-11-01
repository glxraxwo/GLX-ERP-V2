import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Calendar as CalendarIcon, Clock, Save, FileText, Printer,
    RefreshCw, CheckSquare, Square, ChevronLeft, ChevronRight,
    Search, UserCheck, AlertCircle, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { manualAttendanceApi } from '../features/hr/hrApi';
import Button from '../components/ui/Button';

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

// Calculate Working Hours
const calculateHours = (inTime, outTime) => {
    if (!inTime || !outTime) return 0;
    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);
    if (isNaN(inH) || isNaN(outH)) return 0;

    let inMin = inH * 60 + (inM || 0);
    let outMin = outH * 60 + (outM || 0);
    if (outMin < inMin) {
        outMin += 24 * 60; // Overnight shift
    }
    return Number(((outMin - inMin) / 60).toFixed(2));
};

export default function ActiveEmployeeDayInOutPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Default to today
    const [selectedDate, setSelectedDate] = useState(() => formatDateStr(new Date()));
    const [onTime, setOnTime] = useState('08:00');
    const [offTime, setOffTime] = useState('17:00');
    const [searchQuery, setSearchQuery] = useState('');
    const [rows, setRows] = useState([]);

    // Query daily manual attendance
    const { data: dailyData, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['manual-attendance-daily', selectedDate],
        queryFn: () => manualAttendanceApi.getDaily(selectedDate),
        staleTime: 1000 * 60 * 2,
    });

    // Populate rows when data arrives
    useEffect(() => {
        if (dailyData?.rows) {
            setRows(dailyData.rows);
            if (dailyData.defaultOnTime) setOnTime(dailyData.defaultOnTime);
            if (dailyData.defaultOffTime) setOffTime(dailyData.defaultOffTime);
        }
    }, [dailyData]);

    // Save Mutation
    const saveMutation = useMutation({
        mutationFn: (payload) => manualAttendanceApi.saveDaily(payload),
        onSuccess: (res) => {
            toast.success(res.message || 'Daily attendance saved successfully!');
            queryClient.invalidateQueries(['manual-attendance-daily', selectedDate]);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to save attendance');
        }
    });

    // Handle Field Change in Row
    const handleRowChange = (index, field, value) => {
        setRows(prevRows => {
            const updated = [...prevRows];
            const row = { ...updated[index] };

            if (field === 'isTicked') {
                const isTicked = Boolean(value);
                row.isTicked = isTicked;
                if (!isTicked) {
                    row.hours = 0;
                    row.daySalary = 0;
                    row.deduction = -1000;
                    row.reason = 'No Work';
                } else {
                    const hrs = calculateHours(row.inTime || onTime, row.outTime || offTime);
                    row.hours = hrs;
                    row.daySalary = Number((hrs * (row.hourlyRate || 260)).toFixed(2));
                    row.deduction = 0;
                    row.reason = 'FILL';
                }
            } else if (field === 'inTime' || field === 'outTime') {
                row[field] = value;
                if (row.isTicked) {
                    const inT = field === 'inTime' ? value : (row.inTime || onTime);
                    const outT = field === 'outTime' ? value : (row.outTime || offTime);
                    const hrs = calculateHours(inT, outT);
                    row.hours = hrs;
                    row.daySalary = Number((hrs * (row.hourlyRate || 260)).toFixed(2));
                }
            } else if (field === 'advance' || field === 'deduction') {
                row[field] = Number(value) || 0;
            } else {
                row[field] = value;
            }

            updated[index] = row;
            return updated;
        });
    };

    // Quick Apply Default Times to All Ticked Employees
    const handleApplyDefaultTimes = () => {
        setRows(prevRows => prevRows.map(row => {
            if (!row.isTicked) return row;
            const hrs = calculateHours(onTime, offTime);
            return {
                ...row,
                inTime: onTime,
                outTime: offTime,
                hours: hrs,
                daySalary: Number((hrs * (row.hourlyRate || 260)).toFixed(2)),
                reason: row.reason === 'No Work' ? 'FILL' : row.reason
            };
        }));
        toast.success(`Applied default times (${onTime} - ${offTime}) to all ticked employees`);
    };

    // Save All Changes
    const handleSave = () => {
        saveMutation.mutate({
            date: selectedDate,
            defaultOnTime: onTime,
            defaultOffTime: offTime,
            rows: rows
        });
    };

    // Filtered Rows for Search
    const filteredRows = useMemo(() => {
        if (!searchQuery.trim()) return rows;
        const q = searchQuery.toLowerCase();
        return rows.filter(r =>
            r.name?.toLowerCase().includes(q) ||
            r.payrollNumber?.toLowerCase().includes(q)
        );
    }, [rows, searchQuery]);

    // Totals Calculation
    const totals = useMemo(() => {
        let presentCount = 0;
        let absentCount = 0;
        let totalHours = 0;
        let totalSalary = 0;
        let totalAdvance = 0;
        let totalDeductions = 0;

        rows.forEach(r => {
            if (r.isTicked) {
                presentCount++;
                totalHours += Number(r.hours) || 0;
                totalSalary += Number(r.daySalary) || 0;
            } else {
                absentCount++;
            }
            totalAdvance += Number(r.advance) || 0;
            if (r.deduction < 0) totalDeductions += Math.abs(r.deduction);
        });

        return {
            presentCount,
            absentCount,
            totalHours: Number(totalHours.toFixed(2)),
            totalSalary: Number(totalSalary.toFixed(2)),
            totalAdvance: Number(totalAdvance.toFixed(2)),
            totalDeductions: Number(totalDeductions.toFixed(2))
        };
    }, [rows]);

    return (
        <div className="min-h-screen bg-gray-50/70 p-3 sm:p-6 font-sans">
            {/* Top Toolbar / Navigation */}
            <div className="max-w-7xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/hr/manual-payment-sheet')}
                        className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded shadow-xs hover:bg-gray-100 flex items-center gap-1.5 text-gray-700"
                    >
                        <FileText size={14} className="text-blue-600" />
                        Detailed Payment Record Sheet
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => window.print()}
                        className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded shadow-xs hover:bg-gray-100 flex items-center gap-1.5 text-gray-700"
                    >
                        <Printer size={14} />
                        Print Sheet
                    </button>
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded shadow-xs hover:bg-gray-100 flex items-center gap-1.5 text-gray-700"
                    >
                        <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                        Reload
                    </button>
                </div>
            </div>

            {/* Main Sheet Container */}
            <div className="max-w-7xl mx-auto bg-white border border-gray-300 shadow-sm rounded-sm p-4 sm:p-6 print:p-0 print:border-0 print:shadow-none">
                
                {/* 1. Header Title Box (Matching Screenshot 2) */}
                <div className="border border-gray-400 py-2.5 px-4 text-center font-bold text-gray-900 tracking-wide text-sm sm:text-base uppercase bg-white mb-6">
                    ACTIVE EMPOLYEE DAY IN OUT (Manual Enter)
                </div>

                {/* 2. Top Header Controls (ON TIME, OFF TIME, DATE, SAVE) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mb-6 text-xs sm:text-sm">
                    {/* ON TIME */}
                    <div className="md:col-span-3 flex items-center gap-2">
                        <span className="font-bold text-gray-800 uppercase min-w-[70px]">ON TIME</span>
                        <input
                            type="time"
                            value={onTime}
                            onChange={(e) => setOnTime(e.target.value)}
                            className="bg-gray-200 border border-gray-400 px-3 py-1.5 font-bold text-gray-800 rounded-none w-32 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-600 text-center"
                        />
                    </div>

                    {/* OFF TIME */}
                    <div className="md:col-span-3 flex items-center gap-2">
                        <span className="font-bold text-gray-800 uppercase min-w-[75px]">OFF TIME</span>
                        <input
                            type="time"
                            value={offTime}
                            onChange={(e) => setOffTime(e.target.value)}
                            className="bg-gray-200 border border-gray-400 px-3 py-1.5 font-bold text-gray-800 rounded-none w-32 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-600 text-center"
                        />
                        <button
                            type="button"
                            onClick={handleApplyDefaultTimes}
                            className="text-[11px] text-blue-700 underline font-semibold hover:text-blue-900"
                            title="Set this ON/OFF time for all ticked employees"
                        >
                            Apply All
                        </button>
                    </div>

                    {/* DATE PICKER & FORMATTED DISPLAY */}
                    <div className="md:col-span-4 flex items-center gap-2">
                        <span className="font-bold text-gray-800 uppercase min-w-[50px]">DATE</span>
                        <div className="relative flex-1">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-gray-200 border border-gray-400 px-3 py-1.5 font-bold text-gray-800 rounded-none w-full focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-600 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* SAVE BUTTON */}
                    <div className="md:col-span-2 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saveMutation.isPending}
                            className="bg-gray-200 hover:bg-gray-300 active:bg-gray-400 border border-gray-400 px-6 py-1.5 font-bold text-gray-900 uppercase tracking-wider rounded-none shadow-xs transition flex items-center gap-1.5 text-xs sm:text-sm"
                        >
                            <Save size={14} className={saveMutation.isPending ? 'animate-spin' : ''} />
                            {saveMutation.isPending ? 'SAVING...' : 'SAVE'}
                        </button>
                    </div>
                </div>

                {/* Subtitle / Selected Date Confirmation Bar */}
                <div className="flex flex-wrap items-center justify-between pb-3 mb-2 border-b border-gray-300 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                        <CalendarIcon size={14} className="text-gray-500" />
                        <span className="font-bold text-gray-800 text-sm">
                            {formatLongDate(selectedDate)}
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded">
                            {totals.presentCount} Present
                        </span>
                        <span className="bg-rose-100 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded">
                            {totals.absentCount} Absent
                        </span>
                    </div>

                    {/* Quick Search */}
                    <div className="relative w-64">
                        <input
                            type="text"
                            placeholder="Filter employee name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full border border-gray-300 rounded px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <Search size={12} className="absolute right-2.5 top-2 text-gray-400" />
                    </div>
                </div>

                {/* 3. The Spreadsheet Grid (Matching Screenshots Exact Colors) */}
                {isLoading ? (
                    <div className="py-20 text-center text-gray-500">
                        <RefreshCw size={24} className="animate-spin text-blue-600 mx-auto mb-2" />
                        <p className="font-semibold text-xs">Loading attendance records for {selectedDate}...</p>
                    </div>
                ) : filteredRows.length === 0 ? (
                    <div className="py-16 text-center text-gray-500 border border-dashed border-gray-300 my-4">
                        <AlertCircle size={24} className="mx-auto mb-2 text-amber-500" />
                        <p className="font-semibold">No active employees found.</p>
                        <p className="text-xs text-gray-400">Ensure active employees are registered in Employee Management.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto border border-gray-400">
                        <table className="w-full border-collapse text-xs select-none">
                            <thead>
                                <tr className="bg-white border-b border-gray-400 font-bold text-gray-900 text-center">
                                    <th className="border-r border-gray-400 py-2 px-3 w-14">TICK</th>
                                    <th className="border-r border-gray-400 py-2 px-3 text-left min-w-[200px]">NAME</th>
                                    <th className="border-r border-gray-400 py-2 px-3 w-24">IN</th>
                                    <th className="border-r border-gray-400 py-2 px-3 w-24">OUT</th>
                                    <th className="border-r border-gray-400 py-2 px-3 w-20">HOURS</th>
                                    <th className="border-r border-gray-400 py-2 px-3 w-28 text-right">DAY SALARY</th>
                                    <th className="border-r border-gray-400 py-2 px-3 w-28 text-right">ADVANCE</th>
                                    <th className="border-r border-gray-400 py-2 px-3 w-28 text-right">DEDUCTION</th>
                                    <th className="py-2 px-3 text-left w-36">Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.map((row, idx) => {
                                    // True original index in the main rows state
                                    const realIdx = rows.findIndex(r => r.employeeId === row.employeeId);

                                    return (
                                        <tr key={row.employeeId || idx} className="border-b border-gray-300">
                                            {/* 1. TICK (Light Yellow) */}
                                            <td className="border-r border-gray-400 bg-[#FFF2CC] text-center p-1.5">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(row.isTicked)}
                                                    onChange={(e) => handleRowChange(realIdx, 'isTicked', e.target.checked)}
                                                    className="w-4 h-4 cursor-pointer accent-blue-600"
                                                />
                                            </td>

                                            {/* 2. NAME (Light Green) */}
                                            <td className="border-r border-gray-400 bg-[#E2EFDA] px-3 py-1.5 font-medium text-gray-900">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className="truncate">{row.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/hr/manual-payment-sheet?employeeId=${row.employeeId}`)}
                                                        className="text-[10px] text-blue-600 hover:text-blue-800 underline ml-1"
                                                        title="Open detailed payment record sheet"
                                                    >
                                                        sheet
                                                    </button>
                                                </div>
                                            </td>

                                            {/* 3. IN TIME (Light Yellow) */}
                                            <td className="border-r border-gray-400 bg-[#FFF2CC] p-1 text-center font-mono">
                                                <input
                                                    type="time"
                                                    disabled={!row.isTicked}
                                                    value={row.inTime || ''}
                                                    onChange={(e) => handleRowChange(realIdx, 'inTime', e.target.value)}
                                                    className="w-full bg-transparent text-center font-mono focus:bg-white focus:outline-none px-1 py-0.5 rounded-none disabled:opacity-30"
                                                />
                                            </td>

                                            {/* 4. OUT TIME (Light Yellow) */}
                                            <td className="border-r border-gray-400 bg-[#FFF2CC] p-1 text-center font-mono">
                                                <input
                                                    type="time"
                                                    disabled={!row.isTicked}
                                                    value={row.outTime || ''}
                                                    onChange={(e) => handleRowChange(realIdx, 'outTime', e.target.value)}
                                                    className="w-full bg-transparent text-center font-mono focus:bg-white focus:outline-none px-1 py-0.5 rounded-none disabled:opacity-30"
                                                />
                                            </td>

                                            {/* 5. HOURS (Light Green) */}
                                            <td className="border-r border-gray-400 bg-[#E2EFDA] px-2 py-1.5 text-center font-mono font-bold text-gray-800">
                                                {row.isTicked ? Number(row.hours || 0).toFixed(2) : '0.00'}
                                            </td>

                                            {/* 6. DAY SALARY (Light Green) */}
                                            <td className="border-r border-gray-400 bg-[#E2EFDA] px-3 py-1.5 text-right font-mono font-bold text-gray-900">
                                                {row.isTicked ? Number(row.daySalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                            </td>

                                            {/* 7. ADVANCE (Light Yellow) */}
                                            <td className="border-r border-gray-400 bg-[#FFF2CC] p-1 text-right font-mono">
                                                <input
                                                    type="number"
                                                    value={row.advance === 0 ? '' : row.advance}
                                                    placeholder="0"
                                                    onChange={(e) => handleRowChange(realIdx, 'advance', e.target.value)}
                                                    className="w-full bg-transparent text-right font-mono focus:bg-white focus:outline-none px-1 py-0.5 rounded-none"
                                                />
                                            </td>

                                            {/* 8. DEDUCTION (Light Green) */}
                                            <td className="border-r border-gray-400 bg-[#E2EFDA] p-1 text-right font-mono font-semibold text-gray-800">
                                                <input
                                                    type="number"
                                                    value={row.deduction}
                                                    onChange={(e) => handleRowChange(realIdx, 'deduction', e.target.value)}
                                                    className={`w-full bg-transparent text-right font-mono focus:bg-white focus:outline-none px-1 py-0.5 rounded-none ${row.deduction < 0 ? 'text-red-700 font-bold' : ''}`}
                                                />
                                            </td>

                                            {/* 9. REASON (Light Green) */}
                                            <td className="bg-[#E2EFDA] p-1">
                                                <input
                                                    type="text"
                                                    value={row.reason || ''}
                                                    onChange={(e) => handleRowChange(realIdx, 'reason', e.target.value)}
                                                    placeholder="FILL"
                                                    className="w-full bg-transparent px-2 py-0.5 focus:bg-white focus:outline-none text-gray-800 font-medium"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>

                            {/* Summary Footer Row */}
                            <tfoot>
                                <tr className="bg-gray-100 border-t-2 border-gray-400 font-bold text-gray-900">
                                    <td colSpan={4} className="border-r border-gray-400 py-2.5 px-3 text-right uppercase">
                                        Total ({totals.presentCount} Employees Present):
                                    </td>
                                    <td className="border-r border-gray-400 py-2.5 px-2 text-center font-mono">
                                        {totals.totalHours.toFixed(2)}
                                    </td>
                                    <td className="border-r border-gray-400 py-2.5 px-3 text-right font-mono text-emerald-800">
                                        Rs. {totals.totalSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="border-r border-gray-400 py-2.5 px-3 text-right font-mono text-amber-800">
                                        Rs. {totals.totalAdvance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="border-r border-gray-400 py-2.5 px-3 text-right font-mono text-rose-800">
                                        Rs. -{totals.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-3 text-xs text-gray-500">
                                        Net: Rs. {(totals.totalSalary - totals.totalAdvance - totals.totalDeductions).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                {/* Bottom Action Footer */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 bg-[#FFF2CC] border border-gray-400 inline-block"></span>
                            Manual Entry (Editable)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 bg-[#E2EFDA] border border-gray-400 inline-block"></span>
                            Calculated / Status Fields
                        </span>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        className="bg-gray-800 hover:bg-gray-900 text-white font-bold px-6 py-2 rounded shadow-xs flex items-center gap-2"
                    >
                        <Save size={14} />
                        {saveMutation.isPending ? 'Saving to Database...' : 'Save All Attendance Records'}
                    </button>
                </div>
            </div>
        </div>
    );
}
