import fs from 'fs';
import path from 'path';
import express from 'express';
import asyncHandler from 'express-async-handler';
import Quotation from '../models/Quotation.js';
import Invoice from '../models/Invoice.js';
import Settings from '../models/Settings.js';

const router = express.Router();

/**
 * GET /api/public/documents/:token
 * Fetch quotation/invoice details passwordless using a unique token
 */
router.get('/documents/:token', asyncHandler(async (req, res) => {
    const { token } = req.params;
    const settings = await Settings.findOne().lean();

    // Search Quotation
    let doc = await Quotation.findOne({ publicToken: token })
        .populate('customerId', 'displayName companyName primaryContact billingAddress')
        .populate('introducer', 'firstName lastName callingName employeeCode')
        .populate('items.product', 'name productCode uom basePrice sku')
        .lean();

    if (doc) {
        return res.json({
            success: true,
            documentType: doc.documentType || 'quotation',
            data: doc,
            companyInfo: settings
        });
    }

    // Search Invoice
    doc = await Invoice.findOne({ publicToken: token })
        .populate('customerId', 'displayName companyName primaryContact billingAddress')
        .populate('items.productId', 'name productCode uom basePrice sku')
        .lean();

    if (doc) {
        return res.json({
            success: true,
            documentType: 'invoice',
            data: doc,
            companyInfo: settings
        });
    }

    res.status(404);
    throw new Error('Document not found');
}));


/**
 * GET /api/public/documents/:token/download
 * Download professional PDF file passwordless
 */
router.get('/documents/:token/download', asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { generateDocumentPDF } = await import('../services/documentPdfService.js');
    const settings = await Settings.findOne().lean();
    
    let doc = await Quotation.findOne({ publicToken: token })
        .populate('customerId', 'displayName companyName primaryContact billingAddress')
        .populate('introducer', 'firstName lastName callingName employeeCode')
        .populate('items.product', 'name productCode uom basePrice sku')
        .lean();

    let docType = 'quotation';
    if (!doc) {
        doc = await Invoice.findOne({ publicToken: token })
            .populate('customerId', 'displayName companyName primaryContact billingAddress')
            .populate('items.productId', 'name productCode uom basePrice sku')
            .lean();
        docType = 'invoice';
    }
    
    if (!doc) {
        res.status(404);
        throw new Error('Document not found');
    }
    
    const docCode = doc.quotationCode || doc.invoiceNumber || doc.quoteNumber || doc._id.toString();
    const filename = `${docType}_${String(docCode).replace(/[\\/:*?"<>|]/g, '_')}.pdf`;
    
    const pdfBuffer = await generateDocumentPDF({ doc, docType, settings });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
}));

export default router;
