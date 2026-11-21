import asyncHandler from 'express-async-handler';
import BankAccount from '../models/BankAccount.js';
import Payment from '../models/Payment.js';
import { createAuditLog } from '../utils/auditLogger.js';


/**
 * @desc    Get all active bank accounts
 * @route   GET /api/bank-accounts
 * @access  Private
 */
export const getBankAccounts = asyncHandler(async (req, res) => {
    // Payment dropdowns get active accounts only. The Bank Accounts page asks for inactive ones too.
    const includeInactive = req.query.includeInactive === 'true' || req.query.includeInactive === '1';
    const filter = { deletedAt: null };
    if (!includeInactive) filter.isActive = { $ne: false };
    const accounts = await BankAccount.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: accounts });
});

/**
 * @desc    Get a single bank account details
 * @route   GET /api/bank-accounts/:id
 * @access  Private
 */
export const getBankAccountById = asyncHandler(async (req, res) => {
    const account = await BankAccount.findById(req.params.id);
    if (!account) {
        res.status(404);
        throw new Error('Bank account not found');
    }
    res.json({ success: true, data: account });
});

/**
 * @desc    Create a new bank account
 * @route   POST /api/bank-accounts
 * @access  Private
 */
export const createBankAccount = asyncHandler(async (req, res) => {
    const { bankName, accountName, accountNumber, branchName, accountType, balance } = req.body;

    const cleanNumber = String(accountNumber || '').trim();
    const existing = await BankAccount.findOne({ accountNumber: cleanNumber, deletedAt: null });
    if (existing) {
        res.status(400);
        throw new Error(existing.isActive === false
            ? 'This account number already exists as an inactive account. Open Bank Accounts and turn it back on instead.'
            : 'Bank account number already exists');
    }

    const account = await BankAccount.create({
        bankName,
        accountName,
        accountNumber,
        branchName,
        accountType,
        balance: balance || 0,
    });

    createAuditLog({
        action: 'create',
        module: 'finance',
        documentId: account._id,
        documentCode: account.accountNumber,
        description: `Bank account added: ${account.bankName} - ${account.accountNumber}`,
        req,
    });

    res.status(201).json({ success: true, data: account });
});

/**
 * @desc    Update a bank account's details
 * @route   PUT /api/bank-accounts/:id
 * @access  Private (payments.manage)
 *
 * The balance is not edited here, because it is built from payments.
 */
export const updateBankAccount = asyncHandler(async (req, res) => {
    const account = await BankAccount.findById(req.params.id);
    if (!account) {
        res.status(404);
        throw new Error('Bank account not found');
    }

    const before = {
        bankName: account.bankName,
        accountName: account.accountName,
        accountNumber: account.accountNumber,
        branchName: account.branchName || '',
        accountType: account.accountType,
        isActive: account.isActive,
    };

    const { bankName, accountName, accountNumber, branchName, accountType, isActive } = req.body;

    if (accountNumber !== undefined) {
        const cleanNumber = String(accountNumber).trim();
        if (!cleanNumber) {
            res.status(400);
            throw new Error('Account number is required');
        }
        if (cleanNumber !== account.accountNumber) {
            const clash = await BankAccount.findOne({ accountNumber: cleanNumber, _id: { $ne: account._id } });
            if (clash) {
                res.status(400);
                throw new Error('Another bank account already uses this account number');
            }
            account.accountNumber = cleanNumber;
        }
    }
    if (bankName !== undefined && String(bankName).trim()) account.bankName = String(bankName).trim();
    if (accountName !== undefined && String(accountName).trim()) account.accountName = String(accountName).trim();
    if (branchName !== undefined) account.branchName = String(branchName || '').trim();
    if (accountType) account.accountType = accountType;
    if (isActive !== undefined) account.isActive = isActive === true || isActive === 'true';

    await account.save();

    const changes = {};
    const previousData = {};
    Object.keys(before).forEach((k) => {
        if (String(before[k] ?? '') !== String(account[k] ?? '')) {
            changes[k] = account[k];
            previousData[k] = before[k];
        }
    });
    if (Object.keys(changes).length) {
        createAuditLog({
            action: 'update',
            module: 'finance',
            documentId: account._id,
            documentCode: account.accountNumber,
            description: `Bank account edited: ${account.bankName} - ${account.accountNumber}`,
            changes,
            previousData,
            req,
        });
    }

    res.json({ success: true, data: account });
});

/**
 * @desc    Delete a bank account
 * @route   DELETE /api/bank-accounts/:id
 * @access  Private (payments.manage)
 *
 * To keep old receipts, vouchers and the ledger correct, an account that has any
 * payments, or a balance that is not zero, is NOT deleted. It is made "Inactive"
 * instead, which hides it from payment dropdowns but keeps its history.
 * Only an unused account with a zero balance is really removed.
 */
export const deleteBankAccount = asyncHandler(async (req, res) => {
    const account = await BankAccount.findById(req.params.id);
    if (!account) {
        res.status(404);
        throw new Error('Bank account not found');
    }

    const linkedPayments = await Payment.countDocuments({ bankAccountId: account._id });
    const hasBalance = Math.abs(Number(account.balance || 0)) > 0.009;

    if (linkedPayments > 0 || hasBalance) {
        const wasActive = account.isActive !== false;
        account.isActive = false;
        await account.save();

        const why = linkedPayments > 0
            ? `it has ${linkedPayments} payment record(s)`
            : `its balance is not zero (LKR ${Number(account.balance || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })})`;

        if (wasActive) {
            createAuditLog({
                action: 'update',
                module: 'finance',
                documentId: account._id,
                documentCode: account.accountNumber,
                description: `Bank account deactivated instead of deleted (${why}): ${account.bankName} - ${account.accountNumber}`,
                changes: { isActive: false },
                previousData: { isActive: true },
                req,
            });
        }

        return res.json({
            success: true,
            deactivated: true,
            message: `This account was not deleted because ${why}. It is now Inactive and hidden from payment dropdowns. Its history is kept.`,
            data: account,
        });
    }

    const originalNumber = account.accountNumber;
    account.deletedAt = new Date();
    account.isActive = false;
    // Free the account number so it can be added again later (the number is unique in the database)
    account.accountNumber = `${originalNumber}__deleted_${Date.now()}`;
    await account.save();

    createAuditLog({
        action: 'delete',
        module: 'finance',
        documentId: account._id,
        documentCode: originalNumber,
        description: `Bank account deleted: ${account.bankName} - ${originalNumber}`,
        previousData: { bankName: account.bankName, accountName: account.accountName, accountNumber: originalNumber, branchName: account.branchName },
        req,
    });

    res.json({ success: true, deactivated: false, message: 'Bank account deleted' });
});

/**
 * @desc    Get chronological ledger statement for a bank account
 * @route   GET /api/bank-accounts/:id/ledger
 * @access  Private
 */
export const getBankAccountLedger = asyncHandler(async (req, res) => {
    const account = await BankAccount.findById(req.params.id);
    if (!account) {
        res.status(404);
        throw new Error('Bank account not found');
    }

    // Query all non-deleted payments linked to this bank account sorted chronologically
    const payments = await Payment.find({
        bankAccountId: account._id,
        status: 'confirmed',
        deletedAt: null
    })
    .populate('customerId', 'displayName customerCode')
    .populate('supplierId', 'displayName supplierCode')
    .sort({ paymentDate: 1, createdAt: 1 });

    // Build the ledger entries with running balance
    let currentBalance = 0; // Starts from 0, or we can consider initial balance as starting point
    const ledger = payments.map((p) => {
        const isDeposit = p.direction === 'received';
        const amount = p.amount || 0;

        if (isDeposit) {
            currentBalance = +(currentBalance + amount).toFixed(2);
        } else {
            currentBalance = +(currentBalance - amount).toFixed(2);
        }

        return {
            _id: p._id,
            paymentNumber: p.paymentNumber,
            date: p.paymentDate,
            partyName: p.partyName,
            method: p.method,
            type: isDeposit ? 'deposit' : 'withdrawal',
            amount: amount,
            runningBalance: currentBalance,
            chequeNumber: p.chequeNumber,
            chequeStatus: p.chequeStatus,
            transactionReference: p.transactionReference,
        };
    });

    res.json({
        success: true,
        account: {
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            accountName: account.accountName,
            currentBalance: account.balance,
        },
        ledger: ledger.reverse(), // Reverse to show latest first in view
    });
});
