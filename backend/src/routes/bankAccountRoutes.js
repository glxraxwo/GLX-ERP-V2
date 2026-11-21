import express from 'express';
import {
    getBankAccounts,
    getBankAccountById,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
    getBankAccountLedger
} from '../controllers/bankAccountController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(getBankAccounts)
    .post(createBankAccount);

router.route('/:id')
    .get(getBankAccountById)
    .put(requirePermission('payments.manage'), updateBankAccount)
    .delete(requirePermission('payments.manage'), deleteBankAccount);

router.route('/:id/ledger')
    .get(getBankAccountLedger);

export default router;
