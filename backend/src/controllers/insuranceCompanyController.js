import asyncHandler from 'express-async-handler';
import InsuranceCompany from '../models/InsuranceCompany.js';

export const createInsuranceCompany = asyncHandler(async (req, res) => {
    const { name, code, contactPhone } = req.body;
    if (!name || !name.trim()) {
        res.status(400);
        throw new Error('Insurance company name is required');
    }

    const trimmedName = name.trim();
    // Check if already exists (case-insensitive)
    const existing = await InsuranceCompany.findOne({
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    }).setOptions({ includeDeleted: true });
    if (existing) {
        if (existing.deletedAt) {
            existing.deletedAt = null;
            existing.isActive = true;
            if (contactPhone) existing.contactPhone = contactPhone.trim();
            if (code) existing.code = code.trim().toUpperCase();
            await existing.save();
        }
        return res.status(200).json({ success: true, data: existing, message: 'Insurance company already exists' });
    }

    const company = await InsuranceCompany.create({
        name: trimmedName,
        code: code?.trim().toUpperCase() || '',
        contactPhone: contactPhone?.trim() || '',
        createdBy: req.user?._id,
    });
    res.status(201).json({ success: true, data: company });
});

export const getInsuranceCompanies = asyncHandler(async (req, res) => {
    const { search, isActive } = req.query;
    const filter = { deletedAt: null };

    if (search) {
        filter.name = { $regex: search, $options: 'i' };
    }
    if (isActive !== undefined && isActive !== '' && isActive !== null) {
        filter.isActive = isActive === 'true' || isActive === true;
    }

    const companies = await InsuranceCompany.find(filter).sort({ name: 1 });
    res.json({ success: true, count: companies.length, data: companies });
});

export const updateInsuranceCompany = asyncHandler(async (req, res) => {
    const company = await InsuranceCompany.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!company) {
        res.status(404);
        throw new Error('Insurance company not found');
    }
    res.json({ success: true, data: company });
});

export const deleteInsuranceCompany = asyncHandler(async (req, res) => {
    const company = await InsuranceCompany.findById(req.params.id);
    if (!company) {
        res.status(404);
        throw new Error('Insurance company not found');
    }
    company.deletedAt = new Date();
    company.isActive = false;
    await company.save();
    res.json({ success: true, message: 'Insurance company deleted' });
});
