import asyncHandler from 'express-async-handler';
import SmsTemplate from '../models/SmsTemplate.js';

const INITIAL_DEFAULT_TEMPLATES = [
    {
        title: 'Work Completed / Vehicle Ready',
        content: 'Dear {customer_name}, your vehicle work has been completed and is ready for collection at GLX Industries Ja-Ela. Thank you!',
        category: 'delivery',
        isDefault: true
    },
    {
        title: 'Payment Reminder',
        content: 'Dear {customer_name}, this is a gentle reminder regarding the outstanding balance of your account at GLX Industries. Please settle at your earliest convenience. Thank you!',
        category: 'billing',
        isDefault: true
    },
    {
        title: 'Quotation Follow-Up',
        content: 'Dear {customer_name}, thank you for requesting a quotation from GLX Industries. Please let us know if you have any questions or require any adjustments.',
        category: 'followup',
        isDefault: true
    },
    {
        title: 'Thank You for Choosing GLX',
        content: 'Dear {customer_name}, thank you for choosing GLX Industries for your truck body building and engineering needs. We truly appreciate your valued business!',
        category: 'general',
        isDefault: true
    }
];

/**
 * @desc    Get all SMS templates (seeds defaults if collection is empty)
 * @route   GET /api/sms/templates
 * @access  Private
 */
export const getTemplates = asyncHandler(async (req, res) => {
    let templates = await SmsTemplate.find().sort({ createdAt: -1 });

    if (templates.length === 0) {
        try {
            await SmsTemplate.insertMany(INITIAL_DEFAULT_TEMPLATES);
            templates = await SmsTemplate.find().sort({ createdAt: -1 });
        } catch (e) {
            console.error('Failed to seed default SMS templates:', e);
        }
    }

    res.json({
        success: true,
        data: templates
    });
});

/**
 * @desc    Create a new SMS template
 * @route   POST /api/sms/templates
 * @access  Private
 */
export const createTemplate = asyncHandler(async (req, res) => {
    const { title, content, category } = req.body;

    if (!title || !title.trim()) {
        res.status(400);
        throw new Error('Template title is required');
    }

    if (!content || !content.trim()) {
        res.status(400);
        throw new Error('Template message content is required');
    }

    const template = await SmsTemplate.create({
        title: title.trim(),
        content: content.trim(),
        category: category?.trim() || 'general',
        createdBy: req.user?._id
    });

    res.status(201).json({
        success: true,
        message: 'SMS template saved successfully',
        data: template
    });
});

/**
 * @desc    Update an SMS template
 * @route   PUT /api/sms/templates/:id
 * @access  Private
 */
export const updateTemplate = asyncHandler(async (req, res) => {
    const { title, content, category } = req.body;
    const template = await SmsTemplate.findById(req.params.id);

    if (!template) {
        res.status(404);
        throw new Error('SMS template not found');
    }

    if (title && title.trim()) template.title = title.trim();
    if (content && content.trim()) template.content = content.trim();
    if (category && category.trim()) template.category = category.trim();

    const updated = await template.save();

    res.json({
        success: true,
        message: 'SMS template updated successfully',
        data: updated
    });
});

/**
 * @desc    Delete an SMS template
 * @route   DELETE /api/sms/templates/:id
 * @access  Private
 */
export const deleteTemplate = asyncHandler(async (req, res) => {
    const template = await SmsTemplate.findById(req.params.id);

    if (!template) {
        res.status(404);
        throw new Error('SMS template not found');
    }

    await SmsTemplate.deleteOne({ _id: template._id });

    res.json({
        success: true,
        message: 'SMS template deleted successfully'
    });
});
