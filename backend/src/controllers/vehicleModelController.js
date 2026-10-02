import asyncHandler from 'express-async-handler';
import VehicleModel from '../models/VehicleModel.js';

export const createVehicleModel = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
        res.status(400);
        throw new Error('Vehicle model name is required');
    }

    const trimmedName = name.trim();
    // Check if already exists (case-insensitive)
    const existing = await VehicleModel.findOne({
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    }).setOptions({ includeDeleted: true });
    if (existing) {
        if (existing.deletedAt) {
            existing.deletedAt = null;
            existing.isActive = true;
            if (description) existing.description = description.trim();
            await existing.save();
        }
        return res.status(200).json({ success: true, data: existing, message: 'Vehicle model already exists' });
    }

    const model = await VehicleModel.create({
        name: trimmedName,
        description: description?.trim() || '',
        createdBy: req.user?._id,
    });
    res.status(201).json({ success: true, data: model });
});

export const getVehicleModels = asyncHandler(async (req, res) => {
    const { search, isActive } = req.query;
    const filter = { deletedAt: null };

    if (search) {
        filter.name = { $regex: search, $options: 'i' };
    }
    if (isActive !== undefined && isActive !== '' && isActive !== null) {
        filter.isActive = isActive === 'true' || isActive === true;
    }

    const models = await VehicleModel.find(filter).sort({ name: 1 });
    res.json({ success: true, count: models.length, data: models });
});

export const updateVehicleModel = asyncHandler(async (req, res) => {
    const model = await VehicleModel.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!model) {
        res.status(404);
        throw new Error('Vehicle model not found');
    }
    res.json({ success: true, data: model });
});

export const deleteVehicleModel = asyncHandler(async (req, res) => {
    const model = await VehicleModel.findById(req.params.id);
    if (!model) {
        res.status(404);
        throw new Error('Vehicle model not found');
    }
    model.deletedAt = new Date();
    model.isActive = false;
    await model.save();
    res.json({ success: true, message: 'Vehicle model deleted' });
});
