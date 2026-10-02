import mongoose from 'mongoose';

const insuranceCompanySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            maxlength: 150,
        },
        code: {
            type: String,
            trim: true,
            uppercase: true,
            maxlength: 50,
        },
        contactPhone: {
            type: String,
            trim: true,
            maxlength: 50,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

insuranceCompanySchema.index({ name: 'text' });

insuranceCompanySchema.pre(/^find/, function () {
    if (!this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
});

const InsuranceCompany = mongoose.model('InsuranceCompany', insuranceCompanySchema);
export default InsuranceCompany;
