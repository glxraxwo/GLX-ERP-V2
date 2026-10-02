import express from 'express';
import {
    createBrand,
    getBrands,
    getBrandById,
    updateBrand,
    deleteBrand,
} from '../controllers/brandController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission, requireAnyPermission } from '../middleware/permissionMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createBrandSchema, updateBrandSchema } from '../validators/productValidator.js';

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(requirePermission('products.view'), getBrands)
    .post(requireAnyPermission('brands.manage', 'products.create', 'products.edit', 'products.view', 'inventory.view'), validate(createBrandSchema), createBrand);

router
    .route('/:id')
    .get(requirePermission('products.view'), getBrandById)
    .put(requireAnyPermission('brands.manage', 'products.create', 'products.edit'), validate(updateBrandSchema), updateBrand)
    .delete(requireAnyPermission('brands.manage', 'products.create', 'products.edit'), deleteBrand);

export default router;