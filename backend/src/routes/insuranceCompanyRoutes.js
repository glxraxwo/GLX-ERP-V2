import express from 'express';
import {
    createInsuranceCompany,
    getInsuranceCompanies,
    updateInsuranceCompany,
    deleteInsuranceCompany,
} from '../controllers/insuranceCompanyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(getInsuranceCompanies)
    .post(createInsuranceCompany);

router
    .route('/:id')
    .put(updateInsuranceCompany)
    .delete(deleteInsuranceCompany);

export default router;
