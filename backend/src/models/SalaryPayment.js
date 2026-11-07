import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const salaryPaymentSchema = new mongoose.Schema({
    voucherNumber: { type: String, unique: true, uppercase: true, trim: true },

    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    employeeCode: { type: String, required: true },
    employeeName: { type: String, required: true },

    // Settlement Period
    periodStartDate: { type: String, required: true }, // 'YYYY-MM-DD'
    periodEndDate: { type: String, required: true },   // 'YYYY-MM-DD' (Cutoff date)
    paymentDate: { type: Date, default: Date.now },
    paymentDateString: { type: String },               // 'YYYY-MM-DD'

    // Work Summary
    workingDays: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
    hourlyRateApplied: { type: Number, default: 0 },

    // Earnings Breakdown
    basicSalary: { type: Number, default: 0 },
    otCommission: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },

    // Deductions Breakdown
    totalAdvance: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    epfEmployeeDeduction: { type: Number, default: 0 },
    epfEmployerContribution: { type: Number, default: 0 },
    etfEmployerContribution: { type: Number, default: 0 },
    includeEpfEtf: { type: Boolean, default: false },

    // Net Amount Paid
    netSalary: { type: Number, required: true, default: 0 },

    // Payment Method & Banking
    paymentMethod: { type: String, enum: ['cash', 'bank_transfer', 'cheque'], default: 'cash' },
    bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
    reference: { type: String, default: '' },
    notes: { type: String, default: '' },

    // Linked IDs
    attendanceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' }],
    advanceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SalaryAdvance' }],

    status: { type: String, enum: ['paid', 'cancelled'], default: 'paid' },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null }
}, { timestamps: true });

salaryPaymentSchema.index({ employeeId: 1, periodEndDate: -1 });
salaryPaymentSchema.index({ paymentDate: -1 });

salaryPaymentSchema.pre('save', async function () {
    if (this.isNew && !this.voucherNumber) {
        const seq = await getNextSequence('salary_payment');
        const now = this.paymentDate || new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        this.voucherNumber = `SLR-${y}${m}-${seq}`;
    }
    if (!this.paymentDateString && this.paymentDate) {
        const d = new Date(this.paymentDate);
        const yr = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        this.paymentDateString = `${yr}-${mo}-${da}`;
    }
});

const SalaryPayment = mongoose.model('SalaryPayment', salaryPaymentSchema);
export default SalaryPayment;
