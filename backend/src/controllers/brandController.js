import asyncHandler from 'express-async-handler';
import Brand from '../models/Brand.js';

export const createBrand = asyncHandler(async (req, res) => {
    let { name, code } = req.body;
    if (name) name = name.trim();
    if (!name) {
        res.status(400);
        throw new Error('Brand name is required');
    }

    const existing = await Brand.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
    });
    if (existing) {
        if (existing.deletedAt) {
            existing.deletedAt = null;
            existing.isActive = true;
            await existing.save();
        }
        return res.status(200).json({ success: true, data: existing, message: 'Brand already exists' });
    }

    if (!code) {
        const clean = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
        const randomSuffix = Math.floor(100 + Math.random() * 900);
        code = clean ? `${clean}_${randomSuffix}` : `BRD_${randomSuffix}`;
    }

    const brand = await Brand.create({ ...req.body, name, code, createdBy: req.user._id });
    res.status(201).json({ success: true, data: brand });
});

export const getBrands = asyncHandler(async (req, res) => {
    const { search, isActive } = req.query;
    const filter = {};

    if (search) filter.name = { $regex: search, $options: 'i' };
    if (isActive !== undefined && isActive !== '' && isActive !== null) {
        filter.isActive = isActive === 'true' || isActive === true;
    }

    const brands = await Brand.find(filter).sort({ name: 1 });
    res.json({ success: true, count: brands.length, data: brands });
});

export const getBrandById = asyncHandler(async (req, res) => {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
        res.status(404);
        throw new Error('Brand not found');
    }
    res.json({ success: true, data: brand });
});

export const updateBrand = asyncHandler(async (req, res) => {
    const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!brand) {
        res.status(404);
        throw new Error('Brand not found');
    }
    res.json({ success: true, data: brand });
});

export const deleteBrand = asyncHandler(async (req, res) => {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
        res.status(404);
        throw new Error('Brand not found');
    }
    brand.deletedAt = new Date();
    brand.isActive = false;
    await brand.save();
    res.json({ success: true, message: 'Brand deleted' });
});