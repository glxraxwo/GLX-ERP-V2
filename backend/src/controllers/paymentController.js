import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Bill from '../models/Bill.js';
import Customer from '../models/Customer.js';
import BankAccount from '../models/BankAccount.js';
import { broadcast } from '../services/socketService.js';
import { updateCustomerBalance } from './invoiceController.js';
import { enrichPaymentWithDocumentDetails } from '../utils/paymentEnrichment.js';
import { buildDocumentFileName, getDocumentPartyName, pdfContentDisposition } from '../utils/pdfFileName.js';

/**
 * POST /api/payments
 * Record a payment (received from customer or paid to supplier)
 */
export const createPayment = asyncHandler(async (req, res) => {
    const { direction, customerId, supplierId, bankAccountId, amount, allocations = [], method, chequeStatus, ...rest } = req.body;

    const hasQuotationAlloc = allocations.some(a => a.documentType === 'quotation' || a.documentType === 'estimate');

    if (direction === 'received' && !customerId && !req.body.partyName && !hasQuotationAlloc) {
        res.status(400); throw new Error('customerId or customer name required for received payments');
    }
    if (direction === 'paid' && !supplierId && !req.body.partyName) {
        res.status(400); throw new Error('supplierId required for paid payments');
    }

    let payment;
    const isChequePending = method === 'cheque' && chequeStatus !== 'cleared';

    try {
        let partyName = req.body.partyName || '';
        let customerPhone = req.body.customerPhone || rest.customerPhone || '';
        let vehicleNo = req.body.vehicleNo || rest.vehicleNo || '';

        // Validate & adjust allocations
        for (const alloc of allocations) {
            if (alloc.documentType === 'invoice') {
                const inv = await Invoice.findById(alloc.documentId);
                if (!inv) throw new Error(`Invoice ${alloc.documentId} not found`);
                if (alloc.amount > (inv.balanceDue + 0.01)) {
                    throw new Error(`Cannot allocate ${alloc.amount} to invoice ${inv.invoiceNumber}, balance is ${inv.balanceDue}`);
                }
                alloc.documentNumber = inv.invoiceNumber;
                if (!vehicleNo && inv.vehicleNo) vehicleNo = inv.vehicleNo;
                if (!partyName && (inv.vehicleOwner || inv.customerSnapshot?.name)) {
                    partyName = inv.vehicleOwner || inv.customerSnapshot?.name;
                }
                if (!customerId && inv.customerId) {
                    customerId = inv.customerId;
                }
                if (!customerPhone) {
                    const isP = (v) => v && typeof v === 'string' && /^[0-9+() -]{7,15}$/.test(v.trim());
                    customerPhone = (isP(inv.customerPhone) && inv.customerPhone.trim()) ||
                                    (isP(inv.whatsappNum) && inv.whatsappNum.trim()) ||
                                    (isP(inv.customerSnapshot?.mobile) && inv.customerSnapshot.mobile.trim()) ||
                                    (isP(inv.customerSnapshot?.phone) && inv.customerSnapshot.phone.trim()) ||
                                    (isP(inv.customerSnapshot?.whatsappNum) && inv.customerSnapshot.whatsappNum.trim()) ||
                                    (isP(inv.customerSnapshot?.contactName) && inv.customerSnapshot.contactName.trim()) || '';
                }
            } else if (alloc.documentType === 'bill') {
                const bill = await Bill.findById(alloc.documentId);
                if (!bill) throw new Error(`Bill ${alloc.documentId} not found`);
                if (alloc.amount > (bill.balanceDue + 0.01)) {
                    throw new Error(`Cannot allocate ${alloc.amount} to bill ${bill.billNumber}, balance is ${bill.balanceDue}`);
                }
                alloc.documentNumber = bill.billNumber;
            } else if (alloc.documentType === 'quotation' || alloc.documentType === 'estimate') {
                const Quotation = (await import('../models/Quotation.js')).default;
                const quote = await Quotation.findById(alloc.documentId);
                if (!quote) throw new Error(`Quotation/Estimate ${alloc.documentId} not found`);
                const currentBalance = quote.balanceAmount !== undefined ? Number(quote.balanceAmount) : Math.max(0, Number(quote.grandTotal || 0) - Number(quote.advanceAmount || 0));
                if (alloc.amount > currentBalance + 0.01) {
                    throw new Error(`Cannot allocate ${alloc.amount} to ${quote.quoteNumber || 'document'}, balance is ${currentBalance}`);
                }
                alloc.documentNumber = quote.quoteNumber || quote.quotationCode;
                if (!vehicleNo && quote.vehicleNo) vehicleNo = quote.vehicleNo;
                if (!partyName) {
                    partyName = quote.vehicleOwner || quote.customerName || 'Valued Customer';
                }
                if (!customerPhone) {
                    customerPhone = quote.customerPhone || quote.whatsappNum || quote.contactPerson?.mobile || quote.contactPerson?.phone || '';
                }
            }
        }

        // Get party name and phone from Customer master if still missing
        if (direction === 'received') {
            if (customerId) {
                const Customer = (await import('../models/Customer.js')).default;
                const c = await Customer.findById(customerId).lean();
                if (c?.displayName && (!partyName || partyName === 'Valued Customer')) {
                    partyName = c.displayName;
                }
                if (!customerPhone && c) {
                    customerPhone = c.primaryContact?.mobile || c.primaryContact?.phone || c.whatsappNumber || c.phone || (c.contacts && c.contacts[0]?.mobile) || (c.contacts && c.contacts[0]?.phone) || '';
                }
            }
            if (!partyName) partyName = 'Valued Customer';
        } else {
            if (supplierId) {
                const Supplier = (await import('../models/Supplier.js')).default;
                const s = await Supplier.findById(supplierId);
                if (s?.displayName) partyName = s.displayName;
            }
        }

        // Update bank account balance if bankAccountId is provided and not a pending cheque
        if (bankAccountId && !isChequePending) {
            const bankAccount = await BankAccount.findById(bankAccountId);
            if (!bankAccount) throw new Error('Company bank account not found');
            
            const payAmount = Number(amount || 0);
            if (direction === 'received') {
                bankAccount.balance = +(bankAccount.balance + payAmount).toFixed(2);
            } else if (direction === 'paid') {
                bankAccount.balance = +(bankAccount.balance - payAmount).toFixed(2);
            }
            await bankAccount.save();
        }

        payment = new Payment({
            direction,
            customerId: direction === 'received' ? customerId : undefined,
            supplierId: direction === 'paid' ? supplierId : undefined,
            bankAccountId,
            amount,
            method,
            chequeStatus: method === 'cheque' ? (chequeStatus || 'pending') : undefined,
            partyName,
            customerPhone,
            vehicleNo,
            allocations,
            receivedBy: req.user._id,
            createdBy: req.user._id,
            ...rest,
        });

        await payment.save();

        // Apply allocations to invoices/bills/quotations
        for (const alloc of allocations) {
            if (alloc.documentType === 'invoice') {
                const inv = await Invoice.findById(alloc.documentId);
                if (inv) {
                    inv.amountPaid = +(Number(inv.amountPaid || 0) + Number(alloc.amount)).toFixed(2);
                    inv.lastPaymentDate = payment.paymentDate;
                    await inv.save();

                    // Synchronize with source Quotation / Estimate if this invoice originated from one
                    try {
                        const Quotation = (await import('../models/Quotation.js')).default;
                        let quote = null;
                        if (inv.sourceDocumentId && (inv.sourceDocumentType === 'quotation' || inv.sourceDocumentType === 'estimate')) {
                            quote = await Quotation.findById(inv.sourceDocumentId);
                        }
                        if (!quote) {
                            quote = await Quotation.findOne({ convertedInvoiceId: inv._id });
                        }
                        if (!quote && inv.sourceDocumentCode) {
                            quote = await Quotation.findOne({ quoteNumber: inv.sourceDocumentCode });
                        }
                        if (!quote && inv.projectId) {
                            quote = await Quotation.findOne({ convertedProjectId: inv.projectId });
                        }

                        if (quote) {
                            quote.advanceAmount = Number(inv.amountPaid || 0);
                            quote.balanceAmount = Math.max(0, +(Number(quote.grandTotal || inv.grandTotal || 0) - Number(inv.amountPaid || 0)).toFixed(2));
                            await quote.save();
                        }
                    } catch (syncErr) {
                        console.error('[Quotation-Invoice Sync Error]:', syncErr.message);
                    }
                }
            } else if (alloc.documentType === 'bill') {
                const bill = await Bill.findById(alloc.documentId);
                if (bill) {
                    bill.amountPaid = +(Number(bill.amountPaid || 0) + Number(alloc.amount)).toFixed(2);
                    bill.lastPaymentDate = payment.paymentDate;
                    await bill.save();
                }
            } else if (alloc.documentType === 'quotation' || alloc.documentType === 'estimate') {
                const Quotation = (await import('../models/Quotation.js')).default;
                const quote = await Quotation.findById(alloc.documentId);
                if (quote) {
                    const newAdvance = +(Number(quote.advanceAmount || 0) + Number(alloc.amount)).toFixed(2);
                    quote.advanceAmount = newAdvance;
                    quote.balanceAmount = Math.max(0, +(Number(quote.grandTotal || 0) - newAdvance).toFixed(2));
                    await quote.save();

                    // Synchronize with converted invoice if one exists
                    if (quote.convertedInvoiceId) {
                        try {
                            const inv = await Invoice.findById(quote.convertedInvoiceId);
                            if (inv) {
                                inv.amountPaid = newAdvance;
                                inv.balanceDue = Math.max(0, +(Number(inv.grandTotal || 0) - newAdvance).toFixed(2));
                                if (inv.balanceDue === 0 && inv.grandTotal > 0) {
                                    inv.paymentStatus = 'paid';
                                    inv.fullyPaidAt = new Date();
                                } else if (inv.amountPaid > 0) {
                                    inv.paymentStatus = 'partially_paid';
                                }
                                inv.lastPaymentDate = payment.paymentDate;
                                await inv.save();
                            }
                        } catch (invSyncErr) {
                            console.error('[Invoice-Quotation Sync Error]:', invSyncErr.message);
                        }
                    }
                }
            }
        }

        // Update customer balance if received and customer exists
        if (direction === 'received' && customerId) {
            await updateCustomerBalance(customerId);
        }
        try {
            broadcast('financial_update', {
                message: 'Financial accounts updated via new payment log',
            });
        } catch (_) {}

        // Broadcast bank account balance change after successful save
        if (bankAccountId && !isChequePending) {
            const updatedAccount = await BankAccount.findById(bankAccountId);
            if (updatedAccount) {
                broadcast('bank_balance_update', { 
                    bankAccountId, 
                    balance: updatedAccount.balance 
                });
            }
        }

        const populated = await Payment.findById(payment._id)
            .populate('customerId', 'displayName customerCode primaryContact billingAddress')
            .populate('supplierId', 'displayName supplierCode primaryContact address')
            .populate('bankAccountId', 'bankName accountNumber accountName')
            .populate('receivedBy', 'firstName lastName fullName signature')
            .populate('createdBy', 'firstName lastName fullName signature');

        // Dispatch payment receipt SMS with public view link to customer (defaults to true for received payments)
        const shouldSendSms = req.body.sendSms !== false && req.body.sendSms !== 'false';
        if (direction === 'received' && shouldSendSms) {
            let hostOrigin = req.get('origin') || `${req.protocol}://${req.get('host')}`;
            if (!hostOrigin || hostOrigin.includes('localhost:5000') || hostOrigin.includes(':5000')) {
                hostOrigin = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',')[0].trim() : 'https://manage.glxgroup.lk';
            }
            if (hostOrigin.includes(',')) hostOrigin = hostOrigin.split(',')[0].trim();

            import('../services/smsService.js').then(({ sendPaymentReceiptSms }) => {
                sendPaymentReceiptSms(populated || payment, hostOrigin).catch((err) =>
                    console.error('[Payment Receipt SMS Trigger Error]:', err.message)
                );
            }).catch((err) => console.error('[SMS Service import error]:', err.message));
        }

        res.status(201).json({ success: true, data: populated });
    } catch (err) {
        res.status(400);
        throw new Error(err.message || 'Failed to create payment');
    }
});

/**
 * PUT /api/payments/:id/clear
 * Clear a pending cheque payment, adjusting the linked bank account balance.
 */
export const clearPaymentCheque = asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
        res.status(404);
        throw new Error('Payment not found');
    }
    if (payment.method !== 'cheque') {
        res.status(400);
        throw new Error('Only cheque payments can be cleared');
    }
    if (payment.chequeStatus === 'cleared') {
        res.status(400);
        throw new Error('Cheque is already cleared');
    }

    try {
        payment.chequeStatus = 'cleared';
        await payment.save();

        if (payment.bankAccountId) {
            const bankAccount = await BankAccount.findById(payment.bankAccountId);
            if (!bankAccount) throw new Error('Associated company bank account not found');

            const payAmount = Number(payment.amount || 0);
            if (payment.direction === 'received') {
                bankAccount.balance = +(bankAccount.balance + payAmount).toFixed(2);
            } else if (payment.direction === 'paid') {
                bankAccount.balance = +(bankAccount.balance - payAmount).toFixed(2);
            }
            await bankAccount.save();
        }

        // Broadcast bank balance update
        if (payment.bankAccountId) {
            const updatedAccount = await BankAccount.findById(payment.bankAccountId);
            if (updatedAccount) {
                broadcast('bank_balance_update', {
                    bankAccountId: payment.bankAccountId,
                    balance: updatedAccount.balance,
                });
            }
        }

        // Broadcast cheque clearance event
        try {
            broadcast('cheque_cleared', {
                paymentId: payment._id,
                paymentNumber: payment.paymentNumber,
                amount: payment.amount,
                chequeNumber: payment.chequeNumber,
            });
            broadcast('financial_update', {
                message: 'Financial accounts updated via cheque clearance',
            });
        } catch (_) {}

        const populated = await Payment.findById(payment._id)
            .populate('customerId', 'displayName customerCode')
            .populate('supplierId', 'displayName supplierCode')
            .populate('bankAccountId', 'bankName accountNumber accountName');

        res.json({ success: true, message: 'Cheque cleared successfully', data: populated });
    } catch (err) {
        res.status(400);
        throw new Error(err.message || 'Failed to clear cheque');
    }
});

/**
 * PUT /api/payments/:id/status
 * Update the chequeStatus of a payment, adjusting bank account balance based on status transition.
 */
export const updatePaymentChequeStatus = asyncHandler(async (req, res) => {
    const { chequeStatus } = req.body;
    if (!['pending', 'cleared', 'bounced'].includes(chequeStatus)) {
        res.status(400);
        throw new Error('Invalid cheque status');
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
        res.status(404);
        throw new Error('Payment not found');
    }
    if (payment.method !== 'cheque') {
        res.status(400);
        throw new Error('Only cheque payments can have their status updated');
    }

    const oldStatus = payment.chequeStatus || 'pending';
    const newStatus = chequeStatus;

    if (oldStatus === newStatus) {
        return res.json({ success: true, message: 'Status is already set to ' + newStatus, data: payment });
    }

    try {
        payment.chequeStatus = newStatus;
        await payment.save();

        if (payment.bankAccountId) {
            const bankAccount = await BankAccount.findById(payment.bankAccountId);
            if (!bankAccount) throw new Error('Associated company bank account not found');

            const payAmount = Number(payment.amount || 0);

            // If transitioning from cleared -> non-cleared, reverse the bank balance adjustment
            if (oldStatus === 'cleared' && newStatus !== 'cleared') {
                if (payment.direction === 'received') {
                    bankAccount.balance = +(bankAccount.balance - payAmount).toFixed(2);
                } else if (payment.direction === 'paid') {
                    bankAccount.balance = +(bankAccount.balance + payAmount).toFixed(2);
                }
                await bankAccount.save();
            }
            // If transitioning from non-cleared -> cleared, apply the bank balance adjustment
            else if (oldStatus !== 'cleared' && newStatus === 'cleared') {
                if (payment.direction === 'received') {
                    bankAccount.balance = +(bankAccount.balance + payAmount).toFixed(2);
                } else if (payment.direction === 'paid') {
                    bankAccount.balance = +(bankAccount.balance - payAmount).toFixed(2);
                }
                await bankAccount.save();
            }
        }

        // Broadcast bank balance update if bankAccountId was adjusted
        if (payment.bankAccountId && (oldStatus === 'cleared' || newStatus === 'cleared')) {
            const updatedAccount = await BankAccount.findById(payment.bankAccountId);
            if (updatedAccount) {
                broadcast('bank_balance_update', {
                    bankAccountId: payment.bankAccountId,
                    balance: updatedAccount.balance,
                });
            }
        }

        // Broadcast cheque status update event
        try {
            broadcast('cheque_cleared', {
                paymentId: payment._id,
                paymentNumber: payment.paymentNumber,
                amount: payment.amount,
                chequeNumber: payment.chequeNumber,
                status: newStatus,
            });
            broadcast('financial_update', {
                message: `Financial accounts updated via cheque status change to ${newStatus}`,
            });
        } catch (_) {}

        const populated = await Payment.findById(payment._id)
            .populate('customerId', 'displayName customerCode')
            .populate('supplierId', 'displayName supplierCode')
            .populate('bankAccountId', 'bankName accountNumber accountName');

        res.json({ success: true, message: `Cheque status updated to ${newStatus} successfully`, data: populated });
    } catch (err) {
        res.status(400);
        throw new Error(err.message || 'Failed to update cheque status');
    }
});


export const getPayments = asyncHandler(async (req, res) => {
    const {
        direction, voucherType, customerId, supplierId, method, status,
        startDate, endDate, search,
        page = 1, limit = 50,
    } = req.query;

    const { documentId } = req.query;

    const filter = {};
    if (direction) filter.direction = direction;
    if (voucherType) filter.voucherType = voucherType;
    if (customerId) filter.customerId = customerId;
    if (documentId) {
        filter['allocations.documentId'] = documentId;
    }
    if (supplierId) filter.supplierId = supplierId;
    if (method) filter.method = method;
    if (status) filter.status = status;
    if (startDate || endDate) {
        filter.paymentDate = {};
        if (startDate) filter.paymentDate.$gte = new Date(startDate);
        if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }
    if (search) {
        const searchRegex = new RegExp(search, 'i');
        filter.$or = [
            { paymentNumber: searchRegex },
            { partyName: searchRegex },
            { notes: searchRegex },
            { hireNoteNumber: searchRegex },
            { vehicleNo: searchRegex },
            { 'allocations.documentNumber': searchRegex },
        ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [payments, total] = await Promise.all([
        Payment.find(filter)
            .populate('customerId', 'displayName customerCode companyName')
            .populate('supplierId', 'displayName supplierCode companyName')
            .populate('employeeId', 'firstName lastName employeeCode')
            .populate('receivedBy', 'firstName lastName')
            .populate('createdBy', 'firstName lastName')
            .sort({ paymentDate: -1, createdAt: -1 }).skip(skip).limit(Number(limit)),
        Payment.countDocuments(filter),
    ]);

    res.json({
        success: true,
        count: payments.length, total,
        page: Number(page), totalPages: Math.ceil(total / Number(limit)),
        data: payments,
    });
});

export const getPaymentById = asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id)
        .populate('customerId', 'displayName customerCode companyName billingAddress primaryContact')
        .populate('supplierId', 'displayName supplierCode companyName')
        .populate('employeeId', 'firstName lastName employeeCode')
        .populate('receivedBy', 'firstName lastName signature jobTitle')
        .populate('createdBy', 'firstName lastName signature jobTitle')
        .populate('bankAccountId', 'bankName accountNumber accountName branch')
        .lean();
    if (!payment) { res.status(404); throw new Error('Payment or Voucher not found'); }

    // Enrich allocations with linked invoice/quotation totals & remaining balance due
    await enrichPaymentWithDocumentDetails(payment);

    res.json({ success: true, data: payment });
});

/**
 * POST /api/payments/voucher
 * Issue a Voucher (Cash OUT / Payment Out)
 * Reason Types:
 * 1. customer_advance_refund (Customer Advance Refund)
 * 2. supplier_payment (Supplier Payment)
 * 3. transport_hire (Transport & Hire Expense)
 * 4. operational_expense (Petty Cash / Daily Yard Expenses)
 * 5. labor_advance / salary_advance (Labor / Employee Salary Advance)
 */
export const createVoucher = asyncHandler(async (req, res) => {
    const {
        voucherType,
        customerId,
        supplierId,
        employeeId,
        partyName,
        bankAccountId,
        amount,
        method = 'cash',
        chequeNumber,
        chequeDate,
        bankName,
        transactionReference,
        hireNoteNumber,
        vehicleNo,
        transportDriver,
        notes,
        signatureNote,
        allocations = [],
    } = req.body;

    if (!voucherType) {
        res.status(400); throw new Error('voucherType is required for issuing a voucher');
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
        res.status(400); throw new Error('Valid positive voucher amount is required');
    }

    let voucher;

    try {
        let resolvedPartyName = partyName || '';

        // Handle party name resolution and party validation
        if (voucherType === 'customer_advance_refund') {
            if (!customerId) throw new Error('customerId is required for Customer Advance Refund');
            const c = await Customer.findById(customerId);
            if (!c) throw new Error('Customer not found');
            resolvedPartyName = c.displayName || c.companyName || `${c.firstName} ${c.lastName}`;
        } else if (voucherType === 'supplier_payment') {
            if (!supplierId) throw new Error('supplierId is required for Supplier Payment');
            const Supplier = (await import('../models/Supplier.js')).default;
            const s = await Supplier.findById(supplierId);
            if (!s) throw new Error('Supplier not found');
            resolvedPartyName = s.displayName || s.companyName;
        } else if (voucherType === 'labor_advance' || voucherType === 'salary_advance') {
            if (!employeeId) throw new Error('Employee selection is required for Labor Advance Voucher');
            const Employee = (await import('../models/Employee.js')).default;
            const emp = await Employee.findById(employeeId);
            if (!emp) throw new Error('Employee not found');
            resolvedPartyName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeCode || 'Employee';
        }

        // Update bank account if provided
        if (bankAccountId) {
            const bankAccount = await BankAccount.findById(bankAccountId);
            if (!bankAccount) throw new Error('Selected bank account not found');
            bankAccount.balance = +(bankAccount.balance - numAmount).toFixed(2);
            await bankAccount.save();
        }

        // Create Voucher payment doc
        voucher = new Payment({
            direction: 'paid',
            voucherType,
            voucherCategory: voucherType,
            customerId: voucherType === 'customer_advance_refund' ? customerId : undefined,
            supplierId: voucherType === 'supplier_payment' ? supplierId : undefined,
            employeeId: (voucherType === 'labor_advance' || voucherType === 'salary_advance') ? employeeId : undefined,
            partyName: resolvedPartyName,
            bankAccountId,
            amount: numAmount,
            method,
            chequeNumber,
            chequeDate: chequeDate ? new Date(chequeDate) : undefined,
            bankName,
            transactionReference,
            hireNoteNumber,
            vehicleNo,
            transportDriver,
            notes,
            signatureNote,
            allocations,
            receivedBy: req.user._id,
            createdBy: req.user._id,
        });

        await voucher.save();

        // If voucher is labor_advance or salary_advance, auto-create SalaryAdvance record for payroll deduction
        if ((voucherType === 'labor_advance' || voucherType === 'salary_advance') && employeeId) {
            const SalaryAdvance = (await import('../models/SalaryAdvance.js')).default;
            await SalaryAdvance.create([{
                employeeId,
                date: voucher.paymentDate || new Date(),
                advanceType: 'amount',
                amount: numAmount,
                reason: notes || `Payment Voucher Advance: ${voucher.paymentNumber}`,
                status: 'approved',
                approvedBy: req.user._id,
                approvedAt: new Date(),
                createdBy: req.user._id,
            }]);
        }

        // Apply allocations or update document amounts
        for (const alloc of allocations) {
            if (alloc.documentType === 'invoice' && alloc.documentId) {
                const inv = await Invoice.findById(alloc.documentId);
                if (inv) {
                    if (voucherType === 'customer_advance_refund') {
                        inv.amountPaid = Math.max(0, +(inv.amountPaid - alloc.amount).toFixed(2));
                    } else {
                        inv.amountPaid = +(inv.amountPaid + alloc.amount).toFixed(2);
                    }
                    inv.lastPaymentDate = voucher.paymentDate;
                    await inv.save();
                }
            } else if (alloc.documentType === 'bill' && alloc.documentId) {
                const bill = await Bill.findById(alloc.documentId);
                if (bill) {
                    bill.amountPaid = +(bill.amountPaid + alloc.amount).toFixed(2);
                    bill.lastPaymentDate = voucher.paymentDate;
                    await bill.save();
                }
            }
        }

        // Update customer balance if advance refund
        if (voucherType === 'customer_advance_refund' && customerId) {
            await updateCustomerBalance(customerId);
        }

        // Broadcast financial update
        try {
            broadcast('financial_update', {
                message: `New Voucher issued: ${voucher.paymentNumber} (${voucherType})`,
            });
        } catch (_) {}

        const populated = await Payment.findById(voucher._id)
            .populate('customerId', 'displayName customerCode companyName')
            .populate('supplierId', 'displayName supplierCode companyName')
            .populate('employeeId', 'firstName lastName employeeCode')
            .populate('bankAccountId', 'bankName accountNumber accountName')
            .populate('receivedBy', 'firstName lastName');

        res.status(201).json({ success: true, data: populated });
    } catch (err) {
        res.status(400);
        throw new Error(err.message || 'Failed to issue voucher');
    }
});

/**
 * GET /api/payments/linkable-documents
 * Search for Invoices, Quotations, Estimates, Bills, GRNs for document linking during Voucher / Receipt entry
 */
export const searchLinkableDocuments = asyncHandler(async (req, res) => {
    const { customerId, supplierId, search, type } = req.query;
    const documents = [];

    // Customer documents (Invoices, Quotations, Estimates)
    if (customerId || type === 'customer') {
        const queryFilter = {};
        if (customerId) queryFilter.customerId = customerId;

        // Invoices
        const invList = await Invoice.find(queryFilter)
            .select('_id invoiceNumber invoiceCode grandTotal amountPaid status createdAt')
            .sort({ createdAt: -1 })
            .limit(30);

        invList.forEach(inv => {
            const balanceDue = +(inv.grandTotal - (inv.amountPaid || 0)).toFixed(2);
            documents.push({
                documentType: 'invoice',
                documentId: inv._id,
                documentNumber: inv.invoiceNumber || inv.invoiceCode,
                totalAmount: inv.grandTotal,
                amountPaid: inv.amountPaid || 0,
                balanceDue: balanceDue > 0 ? balanceDue : 0,
                status: inv.status,
                label: `Invoice: ${inv.invoiceNumber || inv.invoiceCode} (Total: LKR ${inv.grandTotal.toLocaleString()})`,
            });
        });

        // Quotations & Estimates
        const Quotation = (await import('../models/Quotation.js')).default;
        const qList = await Quotation.find(queryFilter)
            .select('_id quotationCode quoteNumber documentType grandTotal advanceAmount balanceAmount status createdAt')
            .sort({ createdAt: -1 })
            .limit(30);

        qList.forEach(q => {
            const adv = Number(q.advanceAmount || 0);
            const bal = q.balanceAmount !== undefined ? Number(q.balanceAmount) : Math.max(0, Number(q.grandTotal || 0) - adv);
            documents.push({
                documentType: q.documentType || 'quotation',
                documentId: q._id,
                documentNumber: q.quoteNumber || q.quotationCode,
                totalAmount: q.grandTotal,
                amountPaid: adv,
                balanceDue: bal,
                status: q.status,
                label: `${q.documentType === 'estimate' ? 'Estimate' : 'Quotation'}: ${q.quoteNumber || q.quotationCode} (Balance: LKR ${bal.toLocaleString()})`,
            });
        });
    }

    // Supplier documents (Bills & GRNs)
    if (supplierId || type === 'supplier') {
        const queryFilter = {};
        if (supplierId) queryFilter.supplierId = supplierId;

        const billList = await Bill.find(queryFilter)
            .select('_id billNumber totalAmount amountPaid status createdAt')
            .sort({ createdAt: -1 })
            .limit(30);

        billList.forEach(b => {
            const balanceDue = +(b.totalAmount - (b.amountPaid || 0)).toFixed(2);
            documents.push({
                documentType: 'bill',
                documentId: b._id,
                documentNumber: b.billNumber,
                totalAmount: b.totalAmount,
                amountPaid: b.amountPaid || 0,
                balanceDue: balanceDue > 0 ? balanceDue : 0,
                status: b.status,
                label: `Supplier Bill: ${b.billNumber} (Total: LKR ${b.totalAmount.toLocaleString()})`,
            });
        });

        const GoodsReceiptNote = (await import('../models/GoodsReceiptNote.js')).default;
        const grnList = await GoodsReceiptNote.find(queryFilter)
            .select('_id grnNumber totalAmount status createdAt')
            .sort({ createdAt: -1 })
            .limit(30);

        grnList.forEach(grn => {
            documents.push({
                documentType: 'grn',
                documentId: grn._id,
                documentNumber: grn.grnNumber,
                totalAmount: grn.totalAmount || 0,
                amountPaid: 0,
                balanceDue: grn.totalAmount || 0,
                status: grn.status,
                label: `GRN: ${grn.grnNumber}`,
            });
        });
    }

    // Filter by search text if provided
    let results = documents;
    if (search) {
        const s = search.toLowerCase();
        results = documents.filter(d => 
            d.documentNumber.toLowerCase().includes(s) || 
            d.label.toLowerCase().includes(s)
        );
    }

    res.json({ success: true, count: results.length, data: results });
});

/**
 * PUT /api/payments/:id/cancel
 * Cancel a payment or voucher, reversing allocations on Invoices, Quotations, Estimates, Bills, BankAccount, and Customer balances.
 */
export const cancelPayment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason = 'Cancelled by user' } = req.body;

    const payment = await Payment.findById(id);
    if (!payment) {
        res.status(404);
        throw new Error('Payment not found');
    }

    if (payment.status === 'cancelled') {
        res.status(400);
        throw new Error('This payment is already cancelled');
    }

    // 1. Reverse Bank Account balance if it was adjusted
    const isChequePending = payment.method === 'cheque' && payment.chequeStatus !== 'cleared';
    if (payment.bankAccountId && !isChequePending) {
        const bankAccount = await BankAccount.findById(payment.bankAccountId);
        if (bankAccount) {
            const payAmount = Number(payment.amount || 0);
            if (payment.direction === 'received') {
                bankAccount.balance = +(bankAccount.balance - payAmount).toFixed(2);
            } else if (payment.direction === 'paid') {
                bankAccount.balance = +(bankAccount.balance + payAmount).toFixed(2);
            }
            await bankAccount.save();

            try {
                broadcast('bank_balance_update', {
                    bankAccountId: payment.bankAccountId,
                    balance: bankAccount.balance,
                });
            } catch (_) {}
        }
    }

    // 2. Reverse allocations across Invoices, Quotations, Estimates, and Bills
    const allocations = Array.isArray(payment.allocations) ? payment.allocations : [];
    for (const alloc of allocations) {
        const allocAmt = Number(alloc.amount || 0);
        if (allocAmt <= 0) continue;

        if (alloc.documentType === 'invoice') {
            const inv = await Invoice.findById(alloc.documentId);
            if (inv) {
                inv.amountPaid = Math.max(0, +(Number(inv.amountPaid || 0) - allocAmt).toFixed(2));
                inv.balanceDue = Math.max(0, +(Number(inv.grandTotal || 0) - Number(inv.amountPaid)).toFixed(2));
                if (inv.amountPaid <= 0) {
                    inv.paymentStatus = 'unpaid';
                    inv.fullyPaidAt = null;
                } else if (inv.amountPaid < inv.grandTotal) {
                    inv.paymentStatus = 'partially_paid';
                    inv.fullyPaidAt = null;
                } else {
                    inv.paymentStatus = 'paid';
                }

                // Recalculate lastPaymentDate
                const lastPay = await Payment.findOne({
                    'allocations.documentId': inv._id,
                    status: 'confirmed',
                    _id: { $ne: payment._id }
                }).sort({ paymentDate: -1 });
                inv.lastPaymentDate = lastPay ? lastPay.paymentDate : null;

                await inv.save();

                // Synchronize with source Quotation / Estimate if this invoice originated from one
                try {
                    const Quotation = (await import('../models/Quotation.js')).default;
                    let quote = null;
                    if (inv.sourceDocumentId && (inv.sourceDocumentType === 'quotation' || inv.sourceDocumentType === 'estimate')) {
                        quote = await Quotation.findById(inv.sourceDocumentId);
                    }
                    if (!quote) quote = await Quotation.findOne({ convertedInvoiceId: inv._id });
                    if (!quote && inv.sourceDocumentCode) quote = await Quotation.findOne({ quoteNumber: inv.sourceDocumentCode });
                    if (!quote && inv.projectId) quote = await Quotation.findOne({ convertedProjectId: inv.projectId });

                    if (quote) {
                        quote.advanceAmount = Number(inv.amountPaid || 0);
                        quote.balanceAmount = Math.max(0, +(Number(quote.grandTotal || inv.grandTotal || 0) - Number(inv.amountPaid || 0)).toFixed(2));
                        await quote.save();
                    }
                } catch (syncErr) {
                    console.error('[Quotation-Invoice Sync on Cancel Error]:', syncErr.message);
                }
            }
        } else if (alloc.documentType === 'quotation' || alloc.documentType === 'estimate') {
            const Quotation = (await import('../models/Quotation.js')).default;
            const quote = await Quotation.findById(alloc.documentId);
            if (quote) {
                const newAdvance = Math.max(0, +(Number(quote.advanceAmount || 0) - allocAmt).toFixed(2));
                quote.advanceAmount = newAdvance;
                quote.balanceAmount = Math.max(0, +(Number(quote.grandTotal || 0) - newAdvance).toFixed(2));
                await quote.save();

                // Synchronize with converted invoice if one exists
                if (quote.convertedInvoiceId) {
                    try {
                        const inv = await Invoice.findById(quote.convertedInvoiceId);
                        if (inv) {
                            inv.amountPaid = newAdvance;
                            inv.balanceDue = Math.max(0, +(Number(inv.grandTotal || 0) - newAdvance).toFixed(2));
                            if (inv.amountPaid <= 0) {
                                inv.paymentStatus = 'unpaid';
                                inv.fullyPaidAt = null;
                            } else if (inv.amountPaid < inv.grandTotal) {
                                inv.paymentStatus = 'partially_paid';
                                inv.fullyPaidAt = null;
                            } else {
                                inv.paymentStatus = 'paid';
                            }
                            const lastPay = await Payment.findOne({
                                'allocations.documentId': inv._id,
                                status: 'confirmed',
                                _id: { $ne: payment._id }
                            }).sort({ paymentDate: -1 });
                            inv.lastPaymentDate = lastPay ? lastPay.paymentDate : null;
                            await inv.save();
                        }
                    } catch (invSyncErr) {
                        console.error('[Invoice-Quotation Sync on Cancel Error]:', invSyncErr.message);
                    }
                }
            }
        } else if (alloc.documentType === 'bill') {
            const bill = await Bill.findById(alloc.documentId);
            if (bill) {
                bill.amountPaid = Math.max(0, +(Number(bill.amountPaid || 0) - allocAmt).toFixed(2));
                bill.balanceDue = Math.max(0, +(Number(bill.grandTotal || 0) - Number(bill.amountPaid)).toFixed(2));
                if (bill.amountPaid <= 0) {
                    bill.paymentStatus = 'unpaid';
                } else if (bill.amountPaid < bill.grandTotal) {
                    bill.paymentStatus = 'partially_paid';
                } else {
                    bill.paymentStatus = 'paid';
                }
                const lastPay = await Payment.findOne({
                    'allocations.documentId': bill._id,
                    status: 'confirmed',
                    _id: { $ne: payment._id }
                }).sort({ paymentDate: -1 });
                bill.lastPaymentDate = lastPay ? lastPay.paymentDate : null;
                await bill.save();
            }
        }
    }

    // 3. Update customer balance if received and customer exists
    if (payment.direction === 'received' && payment.customerId) {
        await updateCustomerBalance(payment.customerId);
    }

    // 4. Mark payment as cancelled
    payment.status = 'cancelled';
    payment.cancellationReason = reason;
    payment.cancelledAt = new Date();
    payment.cancelledBy = req.user._id;
    await payment.save();

    // 5. Broadcast updates
    try {
        broadcast('payment_cancelled', {
            paymentId: payment._id,
            paymentNumber: payment.paymentNumber,
            direction: payment.direction,
            amount: payment.amount,
        });
        broadcast('financial_update', {
            message: `Payment ${payment.paymentNumber || id} has been cancelled`,
        });
    } catch (_) {}

    const populated = await Payment.findById(payment._id)
        .populate('customerId', 'displayName customerCode primaryContact billingAddress')
        .populate('supplierId', 'displayName supplierCode primaryContact address')
        .populate('bankAccountId', 'bankName accountNumber accountName')
        .populate('receivedBy', 'firstName lastName fullName signature')
        .populate('createdBy', 'firstName lastName fullName signature')
        .populate('cancelledBy', 'firstName lastName fullName');

    res.json({
        success: true,
        message: `Payment ${payment.paymentNumber || id} cancelled successfully. Balances have been recalculated.`,
        data: populated,
    });
});

/**
 * GET /api/payments/document-summary/:documentId
 * Fetch Payment History Audit & Total Paid Summary for a given document (Invoice, Quotation, Estimate, Bill, GRN, etc.)
 */
export const getDocumentPaymentSummary = asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    if (!documentId) {
        res.status(400); throw new Error('documentId is required');
    }

    // Find all payments / vouchers where allocations contain this documentId
    const payments = await Payment.find({
        'allocations.documentId': documentId,
    })
    .populate('customerId', 'displayName customerCode companyName')
    .populate('supplierId', 'displayName supplierCode companyName')
    .populate('receivedBy', 'firstName lastName')
    .populate('createdBy', 'firstName lastName')
    .populate('cancelledBy', 'firstName lastName')
    .sort({ paymentDate: -1 });

    let totalPaidSoFar = 0;
    const auditLogs = payments.map(p => {
        const alloc = p.allocations.find(a => a.documentId?.toString() === documentId.toString());
        const allocAmount = alloc ? alloc.amount : p.amount;
        
        const isCancelled = p.status === 'cancelled';
        if (!isCancelled) {
            // Receipts add to net paid; Advance Refunds deduct from net paid
            if (p.direction === 'paid' || p.voucherType === 'customer_advance_refund') {
                totalPaidSoFar -= allocAmount;
            } else {
                totalPaidSoFar += allocAmount;
            }
        }

        return {
            paymentId: p._id,
            paymentNumber: p.paymentNumber,
            direction: p.direction,
            voucherType: p.voucherType,
            status: p.status || 'confirmed',
            cancellationReason: p.cancellationReason,
            cancelledAt: p.cancelledAt,
            cancelledByName: p.cancelledBy ? `${p.cancelledBy.firstName || ''} ${p.cancelledBy.lastName || ''}`.trim() : null,
            paymentDate: p.paymentDate,
            amount: allocAmount,
            totalPaymentAmount: p.amount,
            method: p.method,
            chequeNumber: p.chequeNumber,
            signatureNote: p.signatureNote,
            notes: p.notes,
            partyName: p.partyName,
            handledBy: p.receivedBy ? `${p.receivedBy.firstName || ''} ${p.receivedBy.lastName || ''}`.trim() : 'System Administrator',
        };
    });

    res.json({
        success: true,
        documentId,
        totalPaidSoFar: +totalPaidSoFar.toFixed(2),
        formattedTotalPaid: `LKR ${totalPaidSoFar.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`,
        summaryText: `Total amount settled so far via vouchers/receipts for this document: LKR ${totalPaidSoFar.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`,
        count: auditLogs.length,
        payments: auditLogs,
    });
});

/**
 * GET /api/payments/:id/receipt
 * Download official PDF receipt/voucher
 */
export const downloadPaymentReceipt = asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id)
        .populate('customerId', 'displayName companyName primaryContact billingAddress customerCode')
        .populate('supplierId', 'displayName companyName primaryContact address')
        .populate('employeeId', 'firstName lastName callingName')
        .populate('bankAccountId', 'bankName accountNumber accountName branch')
        .populate('receivedBy', 'firstName lastName signature jobTitle')
        .populate('createdBy', 'firstName lastName signature jobTitle')
        .lean();

    if (!payment) {
        res.status(404);
        throw new Error('Payment record not found');
    }

    // Enrich allocations with linked invoice/quotation totals & remaining balance due
    await enrichPaymentWithDocumentDetails(payment);

    const Settings = (await import('../models/Settings.js')).default;
    const settings = await Settings.findOne().lean();
    const { generatePaymentReceiptPDF } = await import('../services/documentPdfService.js');
    const pdfBuffer = await generatePaymentReceiptPDF({ payment, settings });

    const isVoucher = payment.direction === 'paid' || !!payment.voucherType;
    const docType = isVoucher ? 'voucher' : 'receipt';
    const filename = buildDocumentFileName(docType, payment.paymentNumber || payment._id, getDocumentPartyName(payment));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', pdfContentDisposition(filename));
    res.send(pdfBuffer);
});

/**
 * POST /api/payments/:id/send-sms
 * Manually or re-dispatch payment receipt SMS
 */
export const sendPaymentSms = asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id)
        .populate('customerId', 'displayName customerCode primaryContact whatsappNumber phone billingAddress')
        .populate('receivedBy', 'firstName lastName fullName signature');
    if (!payment) {
        res.status(404); throw new Error('Payment not found');
    }
    let hostOrigin = req.get('origin') || `${req.protocol}://${req.get('host')}`;
    if (!hostOrigin || hostOrigin.includes('localhost:5000') || hostOrigin.includes(':5000')) {
        hostOrigin = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',')[0].trim() : 'https://manage.glxgroup.lk';
    }
    if (hostOrigin.includes(',')) hostOrigin = hostOrigin.split(',')[0].trim();

    if (req.body.phone && typeof req.body.phone === 'string' && req.body.phone.trim()) {
        payment.customerPhone = req.body.phone.trim();
        await Payment.updateOne({ _id: payment._id }, { $set: { customerPhone: payment.customerPhone } });
    } else if (!payment.customerPhone && payment.customerId) {
        const phone = payment.customerId.primaryContact?.mobile ||
                      payment.customerId.primaryContact?.phone ||
                      payment.customerId.whatsappNumber ||
                      payment.customerId.phone || '';
        if (phone) {
            payment.customerPhone = phone;
            await Payment.updateOne({ _id: payment._id }, { $set: { customerPhone: phone } });
        }
    }

    const { sendPaymentReceiptSms } = await import('../services/smsService.js');
    await sendPaymentReceiptSms(payment, hostOrigin);
    res.json({ success: true, message: 'Payment receipt SMS sent successfully' });
});
