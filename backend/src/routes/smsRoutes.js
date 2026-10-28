import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
    getTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate
} from '../controllers/smsTemplateController.js';
import { sendManualSms, getSmsLogs } from '../controllers/auditController.js';

const router = express.Router();

const SMS_ALLOWED_ROLES = [
    'admin', 'super_admin', 'manager', 'sales_manager', 'warehouse_manager',
    'hr_manager', 'accountant', 'sales_rep', 'cashier'
];

router.use(protect);

// SMS Templates CRUD
router.get('/templates', getTemplates);
router.post('/templates', authorize(...SMS_ALLOWED_ROLES), createTemplate);
router.put('/templates/:id', authorize(...SMS_ALLOWED_ROLES), updateTemplate);
router.delete('/templates/:id', authorize(...SMS_ALLOWED_ROLES), deleteTemplate);

// Manual SMS dispatch & logs
router.post('/send-manual', authorize(...SMS_ALLOWED_ROLES), sendManualSms);
router.get('/logs', authorize(...SMS_ALLOWED_ROLES), getSmsLogs);

export default router;
