import asyncHandler from 'express-async-handler';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import SalaryAdvance from '../models/SalaryAdvance.js';
import Settings from '../models/Settings.js';
import SalaryPayment from '../models/SalaryPayment.js';

// Helper: Format Date to YYYY-MM-DD
const formatDateStr = (d) => {
    const date = new Date(d);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper: Calculate working hours with overnight shift support
export const calculateWorkingHours = (inTimeStr, outTimeStr, unpaidBreakMinutes = 0) => {
    if (!inTimeStr || !outTimeStr) return 0;
    const [inH, inM] = inTimeStr.split(':').map(Number);
    const [outH, outM] = outTimeStr.split(':').map(Number);
    if (isNaN(inH) || isNaN(outH)) return 0;

    let inMin = inH * 60 + (inM || 0);
    let outMin = outH * 60 + (outM || 0);

    // Support overnight shift
    if (outMin < inMin) {
        outMin += 24 * 60;
    }

    const netMinutes = Math.max(0, (outMin - inMin) - (unpaidBreakMinutes || 0));
    return Number((netMinutes / 60).toFixed(2));
};

// Helper: Day name in uppercase
const getDayName = (dateStr) => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const d = new Date(dateStr + 'T00:00:00');
    return days[d.getDay()] || '';
};

// Helper: Get employee's registered payment rate from employee profile
export const getEmployeeRegisteredRate = (employee, fallback = 260) => {
    if (!employee) return fallback;
    if (employee.labourRate && Number(employee.labourRate) > 0) {
        return Number(employee.labourRate);
    }
    if (employee.hourlyRate && Number(employee.hourlyRate) > 0 && Number(employee.hourlyRate) !== 260) {
        return Number(employee.hourlyRate);
    }
    if (employee.basicWageRate && Number(employee.basicWageRate) > 0) {
        return Number(employee.basicWageRate);
    }
    if (employee.hourlyRate && Number(employee.hourlyRate) > 0) {
        return Number(employee.hourlyRate);
    }
    if (employee.basicSalary && Number(employee.basicSalary) > 0) {
        return Number((Number(employee.basicSalary) / 200).toFixed(2));
    }
    return fallback;
};

/**
 * @desc    Get Daily Manual Attendance for all active employees for a selected date
 * @route   GET /api/hr/manual-attendance/daily
 * @access  Private (hr.attendance.view)
 */
export const getDailyManualAttendance = asyncHandler(async (req, res) => {
    const { date } = req.query;
    const selectedDateStr = date || formatDateStr(new Date());

    // 1. Fetch all employees (active & inactive) and settings
    const [employees, settings] = await Promise.all([
        Employee.find({
            deletedAt: null
        }).sort({ status: 1, fullName: 1, firstName: 1 }),
        Settings.findOne()
    ]);
    const activePolicies = (settings?.salaryPolicies && settings.salaryPolicies.length > 0) ? settings.salaryPolicies : defaultSalaryPolicies;

    // 2. Query existing attendance records for this dateString
    const existingAttendance = await Attendance.find({
        dateString: selectedDateStr
    });

    const attendanceMap = new Map();
    existingAttendance.forEach(att => {
        if (att.employeeId) {
            attendanceMap.set(att.employeeId.toString(), att);
        }
    });

    // 3. Query advances on this date (with timezone tolerance)
    const [dY, dM, dD] = selectedDateStr.split('-').map(Number);
    const dayQueryStart = new Date(Date.UTC(dY, dM - 1, dD, 0, 0, 0));
    dayQueryStart.setDate(dayQueryStart.getDate() - 1);
    const dayQueryEnd = new Date(Date.UTC(dY, dM - 1, dD, 23, 59, 59, 999));
    dayQueryEnd.setDate(dayQueryEnd.getDate() + 1);

    const existingAdvances = await SalaryAdvance.find({
        status: { $ne: 'rejected' },
        $or: [
            { date: { $gte: dayQueryStart, $lte: dayQueryEnd } },
            { createdAt: { $gte: dayQueryStart, $lte: dayQueryEnd } }
        ]
    });
    const advanceMap = new Map();
    existingAdvances.forEach(adv => {
        if (adv.employeeId) {
            const d = adv.date || adv.createdAt;
            if (formatDateStr(d) === selectedDateStr) {
                const current = advanceMap.get(adv.employeeId.toString()) || 0;
                advanceMap.set(adv.employeeId.toString(), current + (adv.amount || 0));
            }
        }
    });

    // 4. Default Shift Times
    const defaultOnTime = settings?.defaultOnTime || '08:00';
    const defaultOffTime = settings?.defaultOffTime || '18:00';

    // 5. Construct rows
    const rows = employees.map(emp => {
        const empIdStr = emp._id.toString();
        const existing = attendanceMap.get(empIdStr);
        const hourlyRate = getEmployeeRegisteredRate(emp);
        const recordedAdvance = advanceMap.get(empIdStr) || 0;
        const employeeStatus = emp.status || 'active';
        const isEmpActive = (employeeStatus === 'active') && (emp.isActive !== false);

        // Strict Inactive Employee Policy: If employee is inactive, lock completely and force all calculations to 0
        if (!isEmpActive) {
            return {
                employeeId: emp._id,
                payrollNumber: emp.payrollNumber || emp.employeeCode || '',
                name: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.displayName || 'Employee',
                hourlyRate: hourlyRate,
                employeeStatus: employeeStatus,
                isTicked: false,
                inTime: defaultOnTime,
                outTime: defaultOffTime,
                hours: 0,
                daySalary: 0,
                advance: 0,
                deduction: 0,
                reason: 'INACTIVE_LOCKED',
                isSaved: existing ? true : false,
                isLocked: true,
                isInactive: true
            };
        }

        if (existing) {
            const isTicked = existing.isTicked !== undefined
                ? Boolean(existing.isTicked)
                : (existing.status === 'present');
            const inTime = existing.manualInTime || defaultOnTime;
            const outTime = existing.manualOutTime || defaultOffTime;
            const deduction = existing.dailyDeduction || 0;
            const reason = deduction !== 0 ? (existing.deductionReason || '') : '';
            let hours = existing.payableHours !== undefined ? existing.payableHours : calculateWorkingHours(inTime, outTime);

            // Method 1: If late penalty was applied, credit hours from defaultOnTime
            if (deduction < 0 && reason && reason.startsWith('Late')) {
                hours = calculateWorkingHours(defaultOnTime, outTime);
            }
            const daySalary = existing.daySalary !== undefined ? existing.daySalary : (isTicked ? Number((hours * hourlyRate).toFixed(2)) : 0);

            return {
                employeeId: emp._id,
                payrollNumber: emp.payrollNumber || emp.employeeCode || '',
                name: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.displayName || 'Employee',
                hourlyRate: hourlyRate,
                employeeStatus: employeeStatus,
                isTicked: isTicked,
                inTime: inTime,
                outTime: outTime,
                hours: hours,
                daySalary: daySalary,
                advance: existing.dailyAdvance !== undefined ? existing.dailyAdvance : recordedAdvance,
                deduction: deduction,
                reason: reason,
                isSaved: true,
                isLocked: false,
                isInactive: false
            };
        } else {
            // New record for this date (auto-tick only active employees)
            const isTicked = isEmpActive;
            const hours = isTicked ? calculateWorkingHours(defaultOnTime, defaultOffTime) : 0;
            const daySalary = isTicked ? Number((hours * hourlyRate).toFixed(2)) : 0;

            return {
                employeeId: emp._id,
                payrollNumber: emp.payrollNumber || emp.employeeCode || '',
                name: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.displayName || 'Employee',
                hourlyRate: hourlyRate,
                employeeStatus: employeeStatus,
                isTicked: isTicked,
                inTime: defaultOnTime,
                outTime: defaultOffTime,
                hours: hours,
                daySalary: daySalary,
                advance: recordedAdvance,
                deduction: 0,
                reason: '',
                isSaved: false,
                isLocked: false,
                isInactive: false
            };
        }
    });

    res.json({
        success: true,
        date: selectedDateStr,
        defaultOnTime,
        defaultOffTime,
        rows,
        epfEmployeeRate: settings?.epfEmployeeRate !== undefined ? settings.epfEmployeeRate : 8,
        epfEmployerRate: settings?.epfEmployerRate !== undefined ? settings.epfEmployerRate : 12,
        etfEmployerRate: settings?.etfEmployerRate !== undefined ? settings.etfEmployerRate : 3,
        salaryPolicies: activePolicies
    });
});

/**
 * @desc    Save Daily Manual Attendance for all employees for a selected date
 * @route   POST /api/hr/manual-attendance/daily
 * @access  Private (hr.attendance.manage)
 */
export const saveDailyManualAttendance = asyncHandler(async (req, res) => {
    const { date, defaultOnTime = '08:00', defaultOffTime = '18:00', rows } = req.body;

    if (!date) {
        res.status(400);
        throw new Error('Date is required in YYYY-MM-DD format');
    }
    if (!Array.isArray(rows)) {
        res.status(400);
        throw new Error('Attendance rows must be provided');
    }

    const dateObj = new Date(date + 'T00:00:00.000Z');

    if (defaultOnTime || defaultOffTime) {
        let settings = await Settings.findOne();
        if (!settings) settings = await Settings.create({});
        if (defaultOnTime) settings.defaultOnTime = defaultOnTime;
        if (defaultOffTime) settings.defaultOffTime = defaultOffTime;
        await settings.save();
    }

    const bulkOperations = [];
    const advancesToUpsert = [];

    // Query active status of employees being saved to strictly lock inactive staff at 0
    const employeeIds = rows.map(r => r.employeeId).filter(Boolean);
    const existingEmployees = await Employee.find({ _id: { $in: employeeIds } }).select('_id status isActive');
    const employeeStatusMap = new Map();
    existingEmployees.forEach(e => {
        const isAct = (e.status === 'active') && (e.isActive !== false);
        employeeStatusMap.set(e._id.toString(), isAct);
    });

    for (const row of rows) {
        if (!row.employeeId) continue;

        const empIdStr = row.employeeId.toString();
        const isEmpActive = employeeStatusMap.get(empIdStr) !== false && (row.employeeStatus !== 'inactive');

        // For inactive employees: strictly enforce locked 0 values and do not allow ticking
        const isTicked = isEmpActive ? Boolean(row.isTicked) : false;
        const inTimeStr = row.inTime || defaultOnTime;
        const outTimeStr = row.outTime || defaultOffTime;
        const hours = (isEmpActive && isTicked) ? (Number(row.hours) || calculateWorkingHours(inTimeStr, outTimeStr)) : 0;
        const hourlyRate = Number(row.hourlyRate) || 260;
        const daySalary = (isEmpActive && isTicked) ? (Number(row.daySalary) || Number((hours * hourlyRate).toFixed(2))) : 0;
        const advance = isEmpActive ? (Number(row.advance) || 0) : 0;
        const deduction = isEmpActive ? (Number(row.deduction) || 0) : 0;
        const reason = (isEmpActive && deduction !== 0) ? (row.reason || '') : (isEmpActive ? '' : 'INACTIVE_LOCKED');

        // Construct checkInTime & checkOutTime timestamps for integration
        const [inH, inM] = inTimeStr.split(':').map(Number);
        const [outH, outM] = outTimeStr.split(':').map(Number);
        const checkIn = new Date(dateObj);
        checkIn.setHours(inH || 8, inM || 0, 0, 0);
        const checkOut = new Date(dateObj);
        checkOut.setHours(outH || 17, outM || 0, 0, 0);
        if (outH < inH) {
            checkOut.setDate(checkOut.getDate() + 1); // overnight
        }

        bulkOperations.push({
            updateOne: {
                filter: { employeeId: row.employeeId, dateString: date },
                update: {
                    $set: {
                        employeeId: row.employeeId,
                        date: dateObj,
                        dateString: date,
                        isTicked: isTicked,
                        manualInTime: inTimeStr,
                        manualOutTime: outTimeStr,
                        checkInTime: checkIn,
                        checkOutTime: checkOut,
                        totalWorkedMinutes: Math.round(hours * 60),
                        payableHours: hours,
                        hourlyRateApplied: hourlyRate,
                        daySalary: daySalary,
                        dailyAdvance: advance,
                        dailyDeduction: deduction,
                        deductionReason: reason,
                        defaultOnTime: defaultOnTime,
                        defaultOffTime: defaultOffTime,
                        status: isTicked ? 'present' : 'absent',
                        checkInMethod: 'manual_spreadsheet',
                        markedBy: req.user?._id
                    }
                },
                upsert: true
            }
        });

        // Sync Advance if entered
        if (advance > 0) {
            advancesToUpsert.push({
                employeeId: row.employeeId,
                date: dateObj,
                amount: advance,
                reason: `Daily Advance entered in Manual Attendance (${date})`
            });
        }
    }

    if (bulkOperations.length > 0) {
        await Attendance.bulkWrite(bulkOperations);
    }

    // Sync advances to SalaryAdvance collection
    for (const row of rows) {
        const advanceAmount = Number(row.advance) || 0;
        if (advanceAmount > 0 && row.date) {
            const dayStart = new Date(row.date + 'T00:00:00.000Z');
            const dayEnd = new Date(row.date + 'T23:59:59.999Z');
            const existingAdv = await SalaryAdvance.findOne({
                employeeId: employee._id,
                date: { $gte: dayStart, $lte: dayEnd }
            });
            if (existingAdv) {
                existingAdv.amount = advanceAmount;
                await existingAdv.save();
            } else {
                await SalaryAdvance.create({
                    employeeId: employee._id,
                    amount: advanceAmount,
                    date: dayStart,
                    reason: `Advance entered in Manual Payment Sheet (${row.date})`,
                    status: 'approved',
                    approvedBy: req.user?._id
                });
            }
        }
    }

    // Advance record sync
    for (const adv of advancesToUpsert) {
        const start = new Date(adv.date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(adv.date);
        end.setHours(23, 59, 59, 999);

        const existingAdv = await SalaryAdvance.findOne({
            employeeId: adv.employeeId,
            date: { $gte: start, $lte: end },
            reason: { $regex: /Daily Advance entered in Manual Attendance/i }
        });

        if (existingAdv) {
            existingAdv.amount = adv.amount;
            await existingAdv.save();
        } else {
            await SalaryAdvance.create({
                employeeId: adv.employeeId,
                amount: adv.amount,
                date: adv.date,
                reason: adv.reason,
                status: 'approved',
                approvedBy: req.user?._id
            });
        }
    }

    res.json({
        success: true,
        message: `Successfully saved attendance records for ${bulkOperations.length} employees on ${date}`
    });
});

/**
 * @desc    Get Detailed Employee Payment Record Sheet for a single employee over date range
 * @route   GET /api/hr/manual-attendance/employee-sheet
 * @access  Private (hr.employees.view)
 */
export const getDetailedEmployeePaymentRecordSheet = asyncHandler(async (req, res) => {
    const { employeeId, startDate, endDate } = req.query;

    if (!employeeId) {
        res.status(400);
        throw new Error('Employee ID is required');
    }

    const [employee, settings] = await Promise.all([
        Employee.findById(employeeId),
        Settings.findOne()
    ]);
    if (!employee) {
        res.status(404);
        throw new Error('Employee not found');
    }

    // Default to last 30 days if not provided
    const today = new Date();
    const defaultStart = new Date();
    defaultStart.setDate(today.getDate() - 30);

    const startStr = startDate || formatDateStr(defaultStart);
    const endStr = endDate || formatDateStr(today);

    const startObj = new Date(startStr + 'T00:00:00.000Z');
    const endObj = new Date(endStr + 'T23:59:59.999Z');

    // Query existing attendances in range
    // Query existing salary advances for this employee in range (with timezone buffer)
    const [sY, sM, sD] = startStr.split('-').map(Number);
    const [eY, eM, eD] = endStr.split('-').map(Number);
    const advQueryStart = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0));
    advQueryStart.setDate(advQueryStart.getDate() - 2);
    const advQueryEnd = new Date(Date.UTC(eY, eM - 1, eD, 23, 59, 59, 999));
    advQueryEnd.setDate(advQueryEnd.getDate() + 2);

    const existingAdvances = await SalaryAdvance.find({
        employeeId: employee._id,
        status: { $ne: 'rejected' },
        ...(employee.lastSalarySettlementDateString && !startDate ? { isDeducted: { $ne: true } } : {}),
        $or: [
            { date: { $gte: advQueryStart, $lte: advQueryEnd } },
            { createdAt: { $gte: advQueryStart, $lte: advQueryEnd } }
        ]
    });
    const advanceMap = new Map();
    existingAdvances.forEach(adv => {
        const d = adv.date || adv.createdAt;
        const dateKey = formatDateStr(d);
        if (dateKey >= startStr && dateKey <= endStr) {
            const cur = advanceMap.get(dateKey) || 0;
            advanceMap.set(dateKey, cur + (adv.amount || 0));
        }
    });

    const attendances = await Attendance.find({
        employeeId: employee._id,
        $or: [
            { dateString: { $gte: startStr, $lte: endStr } },
            { date: { $gte: startObj, $lte: endObj } }
        ]
    }).sort({ date: 1, dateString: 1 });

    const attendanceMap = new Map();
    attendances.forEach(att => {
        const key = att.dateString || formatDateStr(att.date);
        attendanceMap.set(key, att);
    });

    const hourlyRate = getEmployeeRegisteredRate(employee, settings?.defaultHourlyRate || 260);
    const isEmpActive = (employee.status === 'active') && (employee.isActive !== false);

    // Generate date sequence
    const rows = [];
    const curr = new Date(startObj);

    let totalLeave = 0;
    let totalDays = 0;
    let totalHours = 0;
    let totalSalary = 0;
    let totalAdvance = 0;
    let totalDeduction = 0;

    const defaultShiftOn = employee.defaultOnTime || settings?.defaultOnTime || '08:00';
    const defaultShiftOff = employee.defaultOffTime || settings?.defaultOffTime || '18:00';

    while (curr <= endObj) {
        const dateStr = formatDateStr(curr);
        const dayName = getDayName(dateStr);
        const att = attendanceMap.get(dateStr);

        let row;
        if (!isEmpActive) {
            // Strictly lock inactive employee rows at 0
            totalLeave += 1;
            row = {
                date: dateStr,
                day: dayName,
                isTicked: false,
                inTime: defaultShiftOn,
                outTime: defaultShiftOff,
                hours: 0,
                daySalary: 0,
                advance: 0,
                deduction: 0,
                reason: 'INACTIVE_LOCKED',
                attendanceId: att?._id || null,
                isSettled: false,
                settledDate: null,
                settledDateString: null,
                settledPaymentId: null,
                isLocked: true,
                isInactive: true
            };
        } else if (att) {
            // Do NOT auto-tick rows on employee selection unless explicitly saved in this manual payment sheet
            const isTicked = att.isManualSheetSaved ? Boolean(att.isTicked) : false;
            const inTime = att.manualInTime || defaultShiftOn;
            const outTime = att.manualOutTime || defaultShiftOff;
            const deduction = isTicked ? (att.dailyDeduction || 0) : 0;
            const reason = deduction !== 0 ? (att.deductionReason || '') : '';
            let hours = isTicked ? (att.payableHours !== undefined ? att.payableHours : calculateWorkingHours(inTime, outTime)) : 0;
            if (isTicked && deduction < 0 && reason && reason.startsWith('Late')) {
                hours = calculateWorkingHours(defaultShiftOn, outTime);
            }
            const daySalary = isTicked ? (att.daySalary !== undefined ? att.daySalary : Number((hours * hourlyRate).toFixed(2))) : 0;
            const advance = Math.max(Number(att.dailyAdvance) || 0, Number(advanceMap.get(dateStr)) || 0);

            if (isTicked) {
                totalDays += 1;
            } else {
                totalLeave += 1;
            }
            totalHours += hours;
            totalSalary += daySalary;
            totalAdvance += advance;
            totalDeduction += deduction;

            row = {
                date: dateStr,
                day: dayName,
                isTicked,
                inTime,
                outTime,
                hours,
                daySalary,
                advance,
                deduction,
                reason,
                attendanceId: att._id,
                isSettled: Boolean(att.isSettled),
                settledDate: att.settledDate || null,
                settledDateString: att.settledDateString || null,
                settledPaymentId: att.settledPaymentId || null,
                isLocked: false,
                isInactive: false
            };
        } else {
            // Default row for date without record
            totalLeave += 1;
            const advance = Number(advanceMap.get(dateStr)) || 0;
            totalAdvance += advance;
            row = {
                date: dateStr,
                day: dayName,
                isTicked: false,
                inTime: defaultShiftOn,
                outTime: defaultShiftOff,
                hours: 0,
                daySalary: 0,
                advance: advance,
                deduction: 0,
                reason: '',
                attendanceId: null,
                isSettled: false,
                settledDate: null,
                settledDateString: null,
                settledPaymentId: null,
                isLocked: false,
                isInactive: false
            };
        }

        rows.push(row);
        curr.setDate(curr.getDate() + 1);
    }

    const netSalary = Math.max(0, totalSalary - totalAdvance + totalDeduction);
    const activePolicies = (settings?.salaryPolicies && settings.salaryPolicies.length > 0) ? settings.salaryPolicies : defaultSalaryPolicies;

    const isMonthly = employee.paymentType === 'monthly';
    const monthlySalary = isMonthly ? Number(employee.monthlySalary || employee.basicSalary || 0) : 0;
    const minSalary = Number(employee.minimumSalary || employee.basicSalary || 0);

    let earnedTotal = 0;
    let basicSalary = 0;
    let otCommission = 0;
    let effectiveTotalSalary = Number(totalSalary.toFixed(2));

    if (isMonthly && monthlySalary > 0) {
        effectiveTotalSalary = monthlySalary;
        earnedTotal = monthlySalary;
        if (minSalary > 0) {
            basicSalary = Math.min(minSalary, monthlySalary);
            otCommission = Number((monthlySalary - basicSalary).toFixed(2));
        } else {
            basicSalary = monthlySalary;
            otCommission = 0;
        }
    } else {
        earnedTotal = Number(totalSalary.toFixed(2));
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

    let effectiveNetSalary = Math.max(0, effectiveTotalSalary - totalAdvance + totalDeduction);

    // Calculate unsettled totals starting from day after last salary settlement date
    const lastSettledDateStr = employee.lastSalarySettlementDateString || null;
    let unsettledDays = 0;
    let unsettledHours = 0;
    let unsettledSalary = 0;
    let unsettledAdvance = 0;
    let unsettledDeduction = 0;

    rows.forEach(r => {
        const isAlreadySettled = r.isSettled || (lastSettledDateStr && r.date <= lastSettledDateStr);
        if (!isAlreadySettled) {
            if (r.isTicked) {
                unsettledDays += 1;
                unsettledHours += Number(r.hours) || 0;
                unsettledSalary += Number(r.daySalary) || 0;
                unsettledDeduction += Number(r.deduction) || 0;
            }
            unsettledAdvance += Number(r.advance) || 0;
        }
    });

    let effectiveUnsettledSalary = unsettledSalary;
    if (isMonthly && monthlySalary > 0) {
        effectiveUnsettledSalary = monthlySalary;
    }
    let unsettledNetSalary = Math.max(0, effectiveUnsettledSalary - unsettledAdvance + (isMonthly ? 0 : unsettledDeduction));

    // Strictly enforce 0 totals if employee is inactive
    if (!isEmpActive) {
        effectiveTotalSalary = 0;
        basicSalary = 0;
        otCommission = 0;
        totalAdvance = 0;
        totalDeduction = 0;
        effectiveNetSalary = 0;
        totalDays = 0;
        totalHours = 0;
        effectiveUnsettledSalary = 0;
        unsettledAdvance = 0;
        unsettledDeduction = 0;
        unsettledNetSalary = 0;
        unsettledDays = 0;
        unsettledHours = 0;
    }

    res.json({
        success: true,
        employee: {
            id: employee._id,
            name: employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.displayName,
            payrollNumber: employee.payrollNumber || employee.employeeCode || '000-00-0293',
            status: employee.status || 'active',
            isLocked: !isEmpActive,
            isInactive: !isEmpActive,
            paymentType: employee.paymentType || (isMonthly ? 'monthly' : 'hourly'),
            monthlySalary: isEmpActive ? monthlySalary : 0,
            hourlyRate: isEmpActive ? hourlyRate : 0,
            department: employee.departmentId?.name || '',
            designation: employee.designationId?.title || '',
            minimumSalary: isEmpActive ? minSalary : 0
        },
        startDate: startStr,
        endDate: endStr,
        defaultOnTime: employee.defaultOnTime || settings?.defaultOnTime || '08:00',
        defaultOffTime: employee.defaultOffTime || settings?.defaultOffTime || '18:00',
        totals: {
            totalLeave,
            totalDays,
            totalHours: Number(totalHours.toFixed(2)),
            totalSalary: effectiveTotalSalary,
            basicSalary: Number(basicSalary.toFixed(2)),
            otCommission: Number(otCommission.toFixed(2)),
            minimumSalary: minSalary,
            totalAdvance: Number(totalAdvance.toFixed(2)),
            totalDeduction: Number(totalDeduction.toFixed(2)),
            netSalary: Number(effectiveNetSalary.toFixed(2))
        },
        salaryPolicies: activePolicies,
        lastSalarySettlementDateString: lastSettledDateStr,
        lastSalarySettlementDate: employee.lastSalarySettlementDate || null,
        lastSalaryPaymentId: employee.lastSalaryPaymentId || null,
        unsettledTotals: {
            totalLeave: rows.filter(r => !r.isTicked && (!lastSettledDateStr || r.date > lastSettledDateStr)).length,
            totalDays: unsettledDays,
            totalHours: Number(unsettledHours.toFixed(2)),
            totalSalary: Number(effectiveUnsettledSalary.toFixed(2)),
            basicSalary: Number(basicSalary.toFixed(2)),
            otCommission: Number(otCommission.toFixed(2)),
            minimumSalary: minSalary,
            totalAdvance: Number(unsettledAdvance.toFixed(2)),
            totalDeduction: Number(unsettledDeduction.toFixed(2)),
            netSalary: Number(unsettledNetSalary.toFixed(2))
        },
        epfEmployeeRate: settings?.epfEmployeeRate !== undefined ? settings.epfEmployeeRate : 8,
        epfEmployerRate: settings?.epfEmployerRate !== undefined ? settings.epfEmployerRate : 12,
        etfEmployerRate: settings?.etfEmployerRate !== undefined ? settings.etfEmployerRate : 3,
        rows
    });
});

/**
 * @desc    Save/Update Detailed Employee Payment Record Sheet for an employee
 * @route   POST /api/hr/manual-attendance/employee-sheet
 * @access  Private (hr.attendance.manage)
 */
export const saveDetailedEmployeePaymentRecordSheet = asyncHandler(async (req, res) => {
    const { employeeId, rows, hourlyRate: inputRate, onTime, offTime } = req.body;

    if (!employeeId) {
        res.status(400);
        throw new Error('Employee ID is required');
    }
    if (!Array.isArray(rows)) {
        res.status(400);
        throw new Error('Rows must be provided');
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
        res.status(404);
        throw new Error('Employee not found');
    }

    const isEmpActive = (employee.status === 'active') && (employee.isActive !== false);
    if (!isEmpActive) {
        res.status(400);
        throw new Error('Cannot edit or save payment sheet for an inactive employee. Inactive accounts are fully locked.');
    }

    // Persist default rate and shift times for this employee
    if (inputRate !== undefined && !isNaN(inputRate) && Number(inputRate) > 0) {
        employee.hourlyRate = Number(inputRate);
    }
    if (onTime) {
        employee.defaultOnTime = onTime;
    }
    if (offTime) {
        employee.defaultOffTime = offTime;
    }
    await employee.save();

    // Also persist as system defaults so they auto-apply to subsequent employees and sheets
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    if (onTime) settings.defaultOnTime = onTime;
    if (offTime) settings.defaultOffTime = offTime;
    if (inputRate && Number(inputRate) > 0) settings.defaultHourlyRate = Number(inputRate);
    await settings.save();

    if (inputRate !== undefined && !isNaN(inputRate) && Number(inputRate) > 0) {
        employee.hourlyRate = Number(inputRate);
        employee.labourRate = Number(inputRate);
        await employee.save();
    }

    const hourlyRate = (inputRate !== undefined && !isNaN(inputRate) && Number(inputRate) > 0)
        ? Number(inputRate)
        : getEmployeeRegisteredRate(employee, settings?.defaultHourlyRate || 260);
    const bulkOperations = [];

    for (const row of rows) {
        if (!row.date) continue;

        const isTicked = Boolean(row.isTicked);
        const inTimeStr = row.inTime || '08:00';
        const outTimeStr = row.outTime || '18:00';
        const hours = isTicked ? (Number(row.hours) || calculateWorkingHours(inTimeStr, outTimeStr)) : 0;
        const daySalary = isTicked ? (Number(row.daySalary) || Number((hours * hourlyRate).toFixed(2))) : 0;
        const advance = Number(row.advance) || 0;
        const deduction = Number(row.deduction) || 0;
        const reason = deduction !== 0 ? (row.reason || '') : '';

        const dateObj = new Date(row.date + 'T00:00:00.000Z');

        bulkOperations.push({
            updateOne: {
                filter: { employeeId, dateString: row.date },
                update: {
                    $set: {
                        employeeId,
                        date: dateObj,
                        dateString: row.date,
                        isTicked,
                        manualInTime: inTimeStr,
                        manualOutTime: outTimeStr,
                        payableHours: hours,
                        hourlyRateApplied: hourlyRate,
                        daySalary,
                        dailyAdvance: advance,
                        dailyDeduction: deduction,
                        deductionReason: reason,
                        status: isTicked ? 'present' : 'absent',
                        checkInMethod: 'manual_spreadsheet',
                        isManualSheetSaved: true,
                        markedBy: req.user?._id
                    }
                },
                upsert: true
            }
        });
    }

    if (bulkOperations.length > 0) {
        await Attendance.bulkWrite(bulkOperations);
    }

    // Sync non-zero advances to SalaryAdvance collection
    for (const row of rows) {
        const advanceAmount = Number(row.advance) || 0;
        if (advanceAmount > 0 && row.date) {
            const [y, m, d] = row.date.split('-').map(Number);
            const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
            const dayEnd = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));

            const existingAdv = await SalaryAdvance.findOne({
                employeeId: employee._id,
                status: { $ne: 'rejected' },
                $or: [
                    { date: { $gte: dayStart, $lte: dayEnd } },
                    { createdAt: { $gte: dayStart, $lte: dayEnd } }
                ]
            });

            if (existingAdv) {
                existingAdv.amount = advanceAmount;
                await existingAdv.save();
            } else {
                await SalaryAdvance.create({
                    employeeId: employee._id,
                    amount: advanceAmount,
                    date: dayStart,
                    reason: `Advance entered in Manual Payment Sheet (${row.date})`,
                    status: 'approved',
                    approvedBy: req.user?._id
                });
            }
        }
    }

    res.json({
        success: true,
        message: `Successfully saved ${bulkOperations.length} payment sheet rows`
    });
});

/**
 * @desc    Get Normal Payslip (Employee Copy) data with Sri Lankan EPF/ETF breakdown
 * @route   GET /api/hr/manual-attendance/normal-payslip
 * @access  Private (hr.employees.view)
 */
export const getNormalEmployeePayslip = asyncHandler(async (req, res) => {
    const { employeeId, startDate, endDate, includeEpfEtf, paymentId } = req.query;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
        res.status(404);
        throw new Error('Employee not found');
    }

    const isEmpActive = (employee.status === 'active') && (employee.isActive !== false);
    if (!paymentId && !isEmpActive) {
        const isMonthlyP = employee.paymentType === 'monthly';
        const settings = await Settings.findOne() || {};
        return res.json({
            success: true,
            isPaid: false,
            paymentStatus: 'locked',
            isLocked: true,
            isInactive: true,
            company: {
                name: settings.companyName || 'GLX INDUSTRIES',
                address: settings.companyAddress || '',
                phone: settings.companyPhone || '',
                logo: settings.companyLogo || ''
            },
            employee: {
                id: employee._id,
                name: employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.displayName,
                payrollNumber: employee.payrollNumber || employee.employeeCode || '000-00-0293',
                designation: employee.designationId?.title || '',
                department: employee.departmentId?.name || '',
                paymentType: employee.paymentType || (isMonthlyP ? 'monthly' : 'hourly'),
                monthlySalary: 0,
                hourlyRate: 0,
                minimumSalary: 0,
                epfNumber: employee.epfNumber || '',
                isLocked: true,
                isInactive: true
            },
            period: {
                startDate: startDate || formatDateStr(new Date()),
                endDate: endDate || formatDateStr(new Date()),
                totalDays: 0,
                totalHours: 0
            },
            earnings: {
                basicSalary: 0,
                totalHours: 0,
                overtimePayment: 0,
                commission: 0,
                otherAllowances: 0,
                grossEarnings: 0
            },
            deductions: {
                epfEmployee: 0,
                advances: 0,
                otherDeductions: 0,
                totalDeductions: 0
            },
            employerContributions: {
                epfEmployer: 0,
                etfEmployer: 0,
                totalContributions: 0
            },
            netSalary: 0
        });
    }

    const settings = await Settings.findOne() || {};

    // 1. If requesting a specific settled payment voucher:
    if (paymentId) {
        const payment = await SalaryPayment.findById(paymentId).populate('bankAccountId');
        if (payment) {
            const isMonthlyP = employee.paymentType === 'monthly';
            const monthlySalaryP = isMonthlyP ? Number(employee.monthlySalary || employee.basicSalary || 0) : 0;
            const minSalaryP = Number(employee.minimumSalary || employee.basicSalary || 0);

            return res.json({
                success: true,
                isPaid: true,
                paymentStatus: 'paid',
                voucherNumber: payment.voucherNumber,
                paymentDate: payment.paymentDate,
                paymentDateString: payment.paymentDateString,
                paymentMethod: payment.paymentMethod,
                bankAccount: payment.bankAccountId ? `${payment.bankAccountId.bankName} - ${payment.bankAccountId.accountNumber}` : '',
                reference: payment.reference,
                notes: payment.notes,
                company: {
                    name: settings.companyName || 'GLX INDUSTRIES',
                    address: settings.companyAddress || '',
                    phone: settings.companyPhone || '',
                    logo: settings.companyLogo || '',
                    bossSignature: settings.bossSignature || '',
                    bossTitle: settings.bossTitle || 'MANAGING DIRECTOR',
                    companySeal: settings.companySeal || ''
                },
                employee: {
                    id: employee._id,
                    name: payment.employeeName,
                    payrollNumber: payment.employeeCode,
                    designation: employee.designationId?.title || '',
                    department: employee.departmentId?.name || '',
                    paymentType: employee.paymentType || (isMonthlyP ? 'monthly' : 'hourly'),
                    monthlySalary: monthlySalaryP,
                    hourlyRate: payment.hourlyRateApplied || getEmployeeRegisteredRate(employee, 260),
                    minimumSalary: minSalaryP,
                    epfNumber: employee.epfNumber || '',
                    accountNumber: employee.bankDetails?.accountNumber || ''
                },
                period: {
                    startDate: payment.periodStartDate,
                    endDate: payment.periodEndDate,
                    totalDays: payment.workingDays,
                    totalHours: payment.totalHours
                },
                earnings: {
                    basicSalary: payment.basicSalary,
                    totalHours: payment.totalHours,
                    overtimePayment: payment.otCommission,
                    commission: 0,
                    otherAllowances: 0,
                    grossEarnings: payment.grossSalary
                },
                deductions: {
                    epfEmployee: payment.epfEmployeeDeduction,
                    advances: payment.totalAdvance,
                    otherDeductions: payment.totalDeductions,
                    totalDeductions: Number((payment.epfEmployeeDeduction + payment.totalAdvance + payment.totalDeductions).toFixed(2))
                },
                employerContributions: {
                    epfEmployer: payment.epfEmployerContribution,
                    etfEmployer: payment.etfEmployerContribution,
                    totalContributions: Number((payment.epfEmployerContribution + payment.etfEmployerContribution).toFixed(2))
                },
                netSalary: payment.netSalary
            });
        }
    }

    const today = new Date();
    const defaultStart = new Date();
    defaultStart.setDate(today.getDate() - 30);

    // If no startDate provided and last settlement date exists, start from next day after settlement
    let effectiveStartStr = startDate;
    if (!effectiveStartStr && employee.lastSalarySettlementDateString) {
        const nextDay = new Date(employee.lastSalarySettlementDateString + 'T00:00:00.000Z');
        nextDay.setDate(nextDay.getDate() + 1);
        effectiveStartStr = formatDateStr(nextDay);
    }

    const startStr = effectiveStartStr || formatDateStr(defaultStart);
    const endStr = endDate || formatDateStr(today);

    // Get attendance records in date range: strictly count explicitly ticked records
    const attendances = await Attendance.find({
        employeeId: employee._id,
        dateString: { $gte: startStr, $lte: endStr },
        isTicked: true,
        ...(employee.lastSalarySettlementDateString && !startDate ? { isSettled: { $ne: true } } : {})
    });

    const hourlyRate = getEmployeeRegisteredRate(employee, 260);
    let totalHours = 0;
    let totalEarnedSalary = 0;
    let totalAdvance = 0;
    let totalDeductions = 0;

    attendances.forEach(att => {
        const hrs = att.payableHours || 0;
        totalHours += hrs;
        // Prioritize employee's registered hourly rate unless daySalary was locked via saved manual sheet with matching rate
        const effectiveRate = (att.isManualSheetSaved && att.hourlyRateApplied && Math.abs(att.hourlyRateApplied - hourlyRate) < 0.01)
            ? att.hourlyRateApplied
            : hourlyRate;
        const dSal = (att.isManualSheetSaved && att.daySalary !== undefined && att.daySalary > 0 && Math.abs(att.hourlyRateApplied - hourlyRate) < 0.01)
            ? att.daySalary
            : Number((hrs * effectiveRate).toFixed(2));
        totalEarnedSalary += dSal;
        totalAdvance += att.dailyAdvance || 0;
        if (att.dailyDeduction < 0) {
            totalDeductions += Math.abs(att.dailyDeduction);
        }
    });

    // Also include any advances recorded in SalaryAdvance collection
    const [sY, sM, sD] = startStr.split('-').map(Number);
    const [eY, eM, eD] = endStr.split('-').map(Number);
    const advQueryStart = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0));
    advQueryStart.setDate(advQueryStart.getDate() - 2);
    const advQueryEnd = new Date(Date.UTC(eY, eM - 1, eD, 23, 59, 59, 999));
    advQueryEnd.setDate(advQueryEnd.getDate() + 2);

    const existingAdvances = await SalaryAdvance.find({
        employeeId: employee._id,
        status: { $ne: 'rejected' },
        $or: [
            { date: { $gte: advQueryStart, $lte: advQueryEnd } },
            { createdAt: { $gte: advQueryStart, $lte: advQueryEnd } }
        ]
    });

    let advanceFromCollection = 0;
    existingAdvances.forEach(adv => {
        const d = adv.date || adv.createdAt;
        const dateKey = formatDateStr(d);
        if (dateKey >= startStr && dateKey <= endStr) {
            advanceFromCollection += (adv.amount || 0);
        }
    });

    totalAdvance = Math.max(totalAdvance, advanceFromCollection);

    // Calculate Minimum Salary vs OT / Commission breakdown
    // For monthly employee: Basic = minimumSalary, OT/Commission = monthlySalary - minimumSalary, Total = monthlySalary
    const isMonthly = employee.paymentType === 'monthly';
    const monthlySalary = isMonthly ? Number(employee.monthlySalary || employee.basicSalary || 0) : 0;
    const minSalary = Number(employee.minimumSalary || employee.basicSalary || 0);

    let basicSalary = 0;
    let overtimePayment = 0;
    let earnedTotal = 0;

    if (isMonthly && monthlySalary > 0) {
        earnedTotal = monthlySalary;
        if (minSalary > 0) {
            basicSalary = Math.min(minSalary, monthlySalary);
            overtimePayment = Number((monthlySalary - basicSalary).toFixed(2));
        } else {
            basicSalary = monthlySalary;
            overtimePayment = 0;
        }
    } else {
        earnedTotal = Number(totalEarnedSalary.toFixed(2));
        if (minSalary > 0) {
            if (earnedTotal > minSalary) {
                basicSalary = minSalary;
                overtimePayment = Number((earnedTotal - minSalary).toFixed(2));
            } else {
                basicSalary = earnedTotal;
                overtimePayment = 0;
            }
        } else {
            basicSalary = earnedTotal;
            overtimePayment = 0;
        }
    }

    // EPF/ETF statutory calculation ONLY if includeEpfEtf is true/ticked!
    const shouldIncludeEpf = (includeEpfEtf === 'true' || includeEpfEtf === true);

    const epfEmployeeRate = shouldIncludeEpf ? (employee.epfRate || settings?.epfEmployeeRate || 8) : 0;
    const epfEmployerRate = shouldIncludeEpf ? (settings?.epfEmployerRate || 12) : 0;
    const etfEmployerRate = shouldIncludeEpf ? (settings?.etfEmployerRate || 3) : 0;

    const epfEmployee = shouldIncludeEpf ? Number(((basicSalary * epfEmployeeRate) / 100).toFixed(2)) : 0;
    const epfEmployer = shouldIncludeEpf ? Number(((basicSalary * epfEmployerRate) / 100).toFixed(2)) : 0;
    const etfEmployer = shouldIncludeEpf ? Number(((basicSalary * etfEmployerRate) / 100).toFixed(2)) : 0;

    const commission = 0;
    const otherAllowances = 0;
    const grossEarnings = Number((basicSalary + overtimePayment + commission + otherAllowances).toFixed(2));

    // Net Salary: Gross - Employee EPF (if included) - Advances - Deductions
    const netSalary = Math.max(0, Number((grossEarnings - epfEmployee - totalAdvance - totalDeductions).toFixed(2)));

    res.json({
        success: true,
        company: {
            name: settings.companyName || 'GLX INDUSTRIES',
            address: settings.companyAddress || '',
            phone: settings.companyPhone || '',
            logo: settings.companyLogo || '',
            bossSignature: settings.bossSignature || '',
            bossTitle: settings.bossTitle || 'MANAGING DIRECTOR',
            companySeal: settings.companySeal || ''
        },
        employee: {
            id: employee._id,
            name: employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.displayName,
            payrollNumber: employee.payrollNumber || employee.employeeCode || '000-00-0293',
            designation: employee.designationId?.title || '',
            department: employee.departmentId?.name || '',
            paymentType: employee.paymentType || (isMonthly ? 'monthly' : 'hourly'),
            monthlySalary,
            hourlyRate,
            minimumSalary: minSalary,
            epfNumber: employee.epfNumber || ''
        },
        period: {
            startDate: startStr,
            endDate: endStr
        },
        earnings: {
            basicSalary: Number(basicSalary.toFixed(2)),
            totalHours: Number(totalHours.toFixed(2)),
            overtimePayment,
            commission,
            otherAllowances,
            grossEarnings
        },
        deductions: {
            epfEmployee,
            advances: Number(totalAdvance.toFixed(2)),
            otherDeductions: Number(totalDeductions.toFixed(2)),
            totalDeductions: Number((epfEmployee + totalAdvance + totalDeductions).toFixed(2))
        },
        employerContributions: {
            epfEmployer,
            etfEmployer,
            totalContributions: Number((epfEmployer + etfEmployer).toFixed(2))
        },
        netSalary
    });
});


export const defaultSalaryPolicies = [
    {
        id: 'pol-1',
        type: 'LATE_DEDUCTION',
        name: 'Late > 10 mins (Tier 1)',
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
        name: 'Late > 20 mins (Tier 2)',
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
        name: 'Late > 30 mins (Tier 3)',
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
    },
    {
        id: 'pol-5',
        type: 'EARLY_DEPARTURE',
        name: 'Early Leave > 15 mins (Cut Rs. 150)',
        thresholdMinutes: 15,
        deductionAmount: 150,
        bonusAmount: 0,
        waiveIfHoursCovered: false,
        standardShiftHours: 9,
        appliesTo: 'ALL',
        isActive: false
    }
];


// @desc    Get Manual Attendance Policies & Global EPF/ETF Rates
// @route   GET /api/hr/manual-attendance/policies
export const getManualAttendancePolicies = asyncHandler(async (req, res) => {
    let settings = await Settings.findOne();
    if (!settings) {
        settings = await Settings.create({});
    }

    const salaryPolicies = (settings.salaryPolicies && settings.salaryPolicies.length > 0)
        ? settings.salaryPolicies
        : defaultSalaryPolicies;

    res.json({
        success: true,
        epfEmployeeRate: settings.epfEmployeeRate !== undefined ? settings.epfEmployeeRate : 8,
        epfEmployerRate: settings.epfEmployerRate !== undefined ? settings.epfEmployerRate : 12,
        etfEmployerRate: settings.etfEmployerRate !== undefined ? settings.etfEmployerRate : 3,
        salaryPolicies
    });
});

// @desc    Save Manual Attendance Policies & Global EPF/ETF Rates
// @route   POST /api/hr/manual-attendance/policies
export const saveManualAttendancePolicies = asyncHandler(async (req, res) => {
    const { salaryPolicies, epfEmployeeRate, epfEmployerRate, etfEmployerRate } = req.body;

    let settings = await Settings.findOne();
    if (!settings) {
        settings = await Settings.create({});
    }

    if (salaryPolicies !== undefined) {
        if (!Array.isArray(salaryPolicies)) {
            res.status(400);
            throw new Error('Salary policies must be an array');
        }

        // Helper to check if two policy scopes overlap (ALL vs specific employees or shared employees)
        const doScopesOverlap = (scopeA, scopeB) => {
            const isAllA = !scopeA || scopeA === 'ALL' || (Array.isArray(scopeA) && (scopeA.length === 0 || scopeA.includes('ALL')));
            const isAllB = !scopeB || scopeB === 'ALL' || (Array.isArray(scopeB) && (scopeB.length === 0 || scopeB.includes('ALL')));
            if (isAllA || isAllB) return true;
            const listA = Array.isArray(scopeA) ? scopeA : [scopeA];
            const listB = Array.isArray(scopeB) ? scopeB : [scopeB];
            return listA.some(idA => listB.some(idB => String(idA) === String(idB)));
        };

        // Validate no duplicate thresholdMinutes for policies of same type with overlapping employees
        for (let i = 0; i < salaryPolicies.length; i++) {
            const polA = salaryPolicies[i];
            if (polA.type && polA.thresholdMinutes !== undefined && polA.thresholdMinutes !== null) {
                const minsA = Number(polA.thresholdMinutes);
                if (['LATE_DEDUCTION', 'EARLY_DEPARTURE', 'OVERTIME_BONUS', 'MIN_HOURS_FULL_PAY'].includes(polA.type)) {
                    for (let j = i + 1; j < salaryPolicies.length; j++) {
                        const polB = salaryPolicies[j];
                        if (polB.type === polA.type && Number(polB.thresholdMinutes) === minsA) {
                            if (doScopesOverlap(polA.appliesTo, polB.appliesTo)) {
                                res.status(400);
                                throw new Error(`Duplicate minutes (${minsA} mins) found for ${polA.type} policy with overlapping employees. Duplicate minutes are not allowed.`);
                            }
                        }
                    }
                }
            }
        }
        settings.salaryPolicies = salaryPolicies;
    }
    if (epfEmployeeRate !== undefined) settings.epfEmployeeRate = Number(epfEmployeeRate);
    if (epfEmployerRate !== undefined) settings.epfEmployerRate = Number(epfEmployerRate);
    if (etfEmployerRate !== undefined) settings.etfEmployerRate = Number(etfEmployerRate);

    await settings.save();

    res.json({
        success: true,
        message: 'Policies and EPF/ETF rates saved successfully',
        epfEmployeeRate: settings.epfEmployeeRate,
        epfEmployerRate: settings.epfEmployerRate,
        etfEmployerRate: settings.etfEmployerRate,
        salaryPolicies: settings.salaryPolicies
    });
});


/**
 * @desc    Pay Employee Salary / Mark Salary as Paid (Settle pay cycle)
 * @route   POST /api/hr/manual-attendance/pay-salary
 * @access  Private (hr.payroll.manage)
 */
export const payEmployeeSalary = asyncHandler(async (req, res) => {
    const {
        employeeId,
        periodStartDate,
        periodEndDate,
        paymentDate,
        paymentMethod = 'cash',
        bankAccountId,
        reference,
        notes,
        includeEpfEtf = false,
        overrideNetSalary,
        customTotalAdvance
    } = req.body;

    if (!employeeId) {
        res.status(400);
        throw new Error('Employee ID is required');
    }
    if (!periodStartDate || !periodEndDate) {
        res.status(400);
        throw new Error('Period start date and end date are required');
    }

    const [employee, settings] = await Promise.all([
        Employee.findById(employeeId),
        Settings.findOne()
    ]);
    if (!employee) {
        res.status(404);
        throw new Error('Employee not found');
    }

    const isEmpActive = (employee.status === 'active') && (employee.isActive !== false);
    if (!isEmpActive) {
        res.status(400);
        throw new Error('Cannot process salary payment for an inactive employee. Inactive accounts are fully locked.');
    }

    const payDate = paymentDate ? new Date(paymentDate) : new Date();
    const payDateStr = formatDateStr(payDate);

    // 1. Fetch attendances in period
    const attendances = await Attendance.find({
        employeeId: employee._id,
        dateString: { $gte: periodStartDate, $lte: periodEndDate },
        isTicked: true
    });

    const hourlyRate = getEmployeeRegisteredRate(employee, settings?.defaultHourlyRate || 260);

    let workingDays = 0;
    let totalHours = 0;
    let totalEarnedSalary = 0;
    let totalAdvanceFromAtt = 0;
    let totalDeductions = 0;

    attendances.forEach(att => {
        workingDays += 1;
        const hrs = att.payableHours || 0;
        totalHours += hrs;
        const effectiveRate = (att.isManualSheetSaved && att.hourlyRateApplied && Math.abs(att.hourlyRateApplied - hourlyRate) < 0.01)
            ? att.hourlyRateApplied
            : hourlyRate;
        const dSal = (att.isManualSheetSaved && att.daySalary !== undefined && att.daySalary > 0 && Math.abs(att.hourlyRateApplied - hourlyRate) < 0.01)
            ? att.daySalary
            : Number((hrs * effectiveRate).toFixed(2));
        totalEarnedSalary += dSal;
        totalAdvanceFromAtt += Number(att.dailyAdvance) || 0;
        if (att.dailyDeduction < 0) {
            totalDeductions += Math.abs(att.dailyDeduction);
        }
    });

    // 2. Fetch advances in period
    const [sY, sM, sD] = periodStartDate.split('-').map(Number);
    const [eY, eM, eD] = periodEndDate.split('-').map(Number);
    const advQueryStart = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0));
    advQueryStart.setDate(advQueryStart.getDate() - 2);
    const advQueryEnd = new Date(Date.UTC(eY, eM - 1, eD, 23, 59, 59, 999));
    advQueryEnd.setDate(advQueryEnd.getDate() + 2);

    const activeAdvances = await SalaryAdvance.find({
        employeeId: employee._id,
        status: { $ne: 'rejected' },
        isDeducted: { $ne: true },
        $or: [
            { date: { $gte: advQueryStart, $lte: advQueryEnd } },
            { createdAt: { $gte: advQueryStart, $lte: advQueryEnd } }
        ]
    });

    let advanceFromCollection = 0;
    const advanceIds = [];
    activeAdvances.forEach(adv => {
        const d = adv.date || adv.createdAt;
        const dateKey = formatDateStr(d);
        if (dateKey >= periodStartDate && dateKey <= periodEndDate) {
            advanceFromCollection += (adv.amount || 0);
            advanceIds.push(adv._id);
        }
    });

    const finalAdvance = customTotalAdvance !== null && customTotalAdvance !== undefined
        ? Number(customTotalAdvance)
        : Math.max(totalAdvanceFromAtt, advanceFromCollection);

    // 3. Earnings & Statutory
    const isMonthly = employee.paymentType === 'monthly';
    const monthlySalary = isMonthly ? Number(employee.monthlySalary || employee.basicSalary || 0) : 0;
    const minSalary = Number(employee.minimumSalary || employee.basicSalary || 0);

    let grossSalary = 0;
    let basicSalary = 0;
    let otCommission = 0;

    if (isMonthly && monthlySalary > 0) {
        grossSalary = monthlySalary;
        if (minSalary > 0) {
            basicSalary = Math.min(minSalary, monthlySalary);
            otCommission = Number((monthlySalary - basicSalary).toFixed(2));
        } else {
            basicSalary = monthlySalary;
            otCommission = 0;
        }
    } else {
        grossSalary = Number(totalEarnedSalary.toFixed(2));
        if (minSalary > 0) {
            if (grossSalary > minSalary) {
                basicSalary = minSalary;
                otCommission = Number((grossSalary - minSalary).toFixed(2));
            } else {
                basicSalary = grossSalary;
                otCommission = 0;
            }
        } else {
            basicSalary = grossSalary;
            otCommission = 0;
        }
    }

    const shouldIncludeEpf = Boolean(includeEpfEtf);
    const epfEmployeeRate = shouldIncludeEpf ? (employee.epfRate || settings?.epfEmployeeRate || 8) : 0;
    const epfEmployerRate = shouldIncludeEpf ? (settings?.epfEmployerRate || 12) : 0;
    const etfEmployerRate = shouldIncludeEpf ? (settings?.etfEmployerRate || 3) : 0;

    const epfEmployee = shouldIncludeEpf ? Number(((basicSalary * epfEmployeeRate) / 100).toFixed(2)) : 0;
    const epfEmployer = shouldIncludeEpf ? Number(((basicSalary * epfEmployerRate) / 100).toFixed(2)) : 0;
    const etfEmployer = shouldIncludeEpf ? Number(((basicSalary * etfEmployerRate) / 100).toFixed(2)) : 0;

    const calculatedNet = Math.max(0, grossSalary - finalAdvance - (isMonthly ? 0 : totalDeductions) - epfEmployee);
    const finalNet = (overrideNetSalary !== undefined && overrideNetSalary !== null)
        ? Number(overrideNetSalary)
        : calculatedNet;

    // 4. Create and save SalaryPayment
    const salaryPayment = new SalaryPayment({
        employeeId: employee._id,
        employeeCode: employee.employeeCode || 'EMP',
        employeeName: employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.displayName || 'Employee',
        periodStartDate,
        periodEndDate,
        paymentDate: payDate,
        paymentDateString: payDateStr,
        workingDays,
        totalHours: Number(totalHours.toFixed(2)),
        hourlyRateApplied: hourlyRate,
        basicSalary,
        otCommission,
        grossSalary,
        totalAdvance: finalAdvance,
        totalDeductions: isMonthly ? 0 : totalDeductions,
        epfEmployeeDeduction: epfEmployee,
        epfEmployerContribution: epfEmployer,
        etfEmployerContribution: etfEmployer,
        includeEpfEtf: shouldIncludeEpf,
        netSalary: finalNet,
        paymentMethod,
        bankAccountId: bankAccountId || undefined,
        reference: reference || '',
        notes: notes || '',
        attendanceIds: attendances.map(a => a._id),
        advanceIds,
        status: 'paid',
        paidBy: req.user?._id
    });

    await salaryPayment.save();

    // 5. Mark attendances up to periodEndDate as settled
    await Attendance.updateMany(
        {
            employeeId: employee._id,
            dateString: { $gte: periodStartDate, $lte: periodEndDate }
        },
        {
            $set: {
                isSettled: true,
                settledDate: payDate,
                settledDateString: payDateStr,
                settledPaymentId: salaryPayment._id
            }
        }
    );

    // 6. Mark advances as deducted
    if (advanceIds.length > 0) {
        await SalaryAdvance.updateMany(
            { _id: { $in: advanceIds } },
            {
                $set: {
                    isDeducted: true,
                    deductedSalaryPaymentId: salaryPayment._id,
                    status: 'approved'
                }
            }
        );
    }

    // 7. Update Employee settlement tracker
    employee.lastSalarySettlementDate = payDate;
    employee.lastSalarySettlementDateString = periodEndDate;
    employee.lastSalaryPaymentId = salaryPayment._id;
    await employee.save();

    res.status(201).json({
        success: true,
        message: `Salary payment of Rs. ${finalNet.toLocaleString()} for ${employee.firstName} ${employee.lastName || ''} marked as paid successfully!`,
        salaryPayment
    });
});

/**
 * @desc    Get Salary Payment History for an employee
 * @route   GET /api/hr/manual-attendance/salary-payments/:employeeId
 * @access  Private (hr.employees.view)
 */
export const getEmployeeSalaryPayments = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const payments = await SalaryPayment.find({ employeeId, deletedAt: null })
        .sort({ paymentDate: -1, createdAt: -1 })
        .populate('bankAccountId', 'bankName accountNumber')
        .populate('paidBy', 'name firstName lastName');

    res.json({
        success: true,
        data: payments
    });
});

/**
 * @desc    Get Single Salary Payment Voucher details
 * @route   GET /api/hr/manual-attendance/salary-payment/:id
 * @access  Private (hr.employees.view)
 */
export const getSalaryPaymentVoucher = asyncHandler(async (req, res) => {
    const payment = await SalaryPayment.findById(req.params.id)
        .populate('employeeId')
        .populate('bankAccountId')
        .populate('paidBy', 'name firstName lastName');

    if (!payment) {
        res.status(404);
        throw new Error('Salary payment record not found');
    }

    const settings = await Settings.findOne() || {};

    res.json({
        success: true,
        data: payment,
        company: {
            name: settings.companyName || 'GLX INDUSTRIES',
            address: settings.companyAddress || '',
            phone: settings.companyPhone || '',
            logo: settings.companyLogo || '',
            bossSignature: settings.bossSignature || '',
            bossTitle: settings.bossTitle || 'MANAGING DIRECTOR',
            companySeal: settings.companySeal || ''
        }
    });
});
