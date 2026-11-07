import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: false },
    employeeCode: String,
    employeeName: String,

    date: { type: Date, required: false },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },

    checkInTime: Date,
    checkOutTime: Date,
    totalWorkedMinutes: { type: Number, default: 0 },

    lateMinutes: { type: Number, default: 0 },
    earlyLeaveMinutes: { type: Number, default: 0 },
    overtimeMinutes: { type: Number, default: 0 },

    overtimeAmount: { type: Number, default: 0 },
    earlyLeavePenaltyAmount: { type: Number, default: 0 },
    latePenaltyAmount: { type: Number, default: 0 },
    latePenaltyHours: { type: Number, default: 0 },
    waivedLatePenalty: { type: Boolean, default: false },
    latePenaltyReason: String,
    earnedSalary: { type: Number, default: 0 },
    policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendancePolicy' },
    importedViaFingerprint: { type: Boolean, default: false },

    status: {
        type: String,
        default: 'present',
    },

    leaveId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveRequest' },
    leaveType: String,

    // Unauthorized Leave Deduction
    isUnauthorizedLeave: { type: Boolean, default: false },
    unauthorizedLeaveDeductionAmount: { type: Number, default: 0 },
    unauthorizedLeaveDeductionReason: String,
    unauthorizedLeaveDeductionAppliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    unauthorizedLeaveDeductionAppliedAt: Date,

    checkInMethod: { type: String, default: 'manual' },
    location: { latitude: Number, longitude: Number, address: String },

    notes: String,

    // ── Spreadsheet / Manual Entry Specific Fields ─────────────────────────
    isTicked: { type: Boolean, default: false },
    isManualSheetSaved: { type: Boolean, default: false },
    dateString: { type: String, index: true }, // Format: YYYY-MM-DD
    manualInTime: { type: String, default: '08:00' },
    manualOutTime: { type: String, default: '17:00' },
    unpaidBreakMinutes: { type: Number, default: 0 },
    payableHours: { type: Number, default: 0 },
    hourlyRateApplied: { type: Number, default: 0 },
    daySalary: { type: Number, default: 0 },
    dailyAdvance: { type: Number, default: 0 },
    dailyDeduction: { type: Number, default: 0 },
    deductionReason: { type: String, default: 'FILL' },
    defaultOnTime: { type: String, default: '08:00' },
    defaultOffTime: { type: String, default: '17:00' },
    isOvernight: { type: Boolean, default: false },

    // Settlement Tracking (Salary Paid)
    isSettled: { type: Boolean, default: false },
    settledDate: Date,
    settledDateString: String,
    settledPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryPayment' },

    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ── Pre-save Hook: Auto-calculate OT based on 8-hour standard shift ──────────
attendanceSchema.pre('save', function() {
    if (this.checkInTime && this.checkOutTime) {
        const workedMs      = new Date(this.checkOutTime) - new Date(this.checkInTime);
        const workedMinutes = Math.floor(workedMs / (1000 * 60));

        this.totalWorkedMinutes = workedMinutes;
        // Standard shift = 8 hours = 480 minutes
        this.overtimeMinutes    = Math.max(0, workedMinutes - 480);
    }
});

// Unique: one attendance record per employee per date
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ dateString: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
