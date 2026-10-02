import express from 'express';
import {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
} from '../controllers/categoryController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission, requireAnyPermission } from '../middleware/permissionMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
    createCategorySchema,
    updateCategorySchema,
} from '../validators/productValidator.js';

const router = express.Router();

router.use(protect); // all routes require auth

router
    .route('/')
    .get(requirePermission('products.view'), getCategories)
    .post(requireAnyPermission('categories.manage', 'products.create', 'products.edit', 'products.view', 'inventory.view'), validate(createCategorySchema), createCategory);

router
    .route('/:id')
    .get(requirePermission('products.view'), getCategoryById)
    .put(requireAnyPermission('categories.manage', 'products.create', 'products.edit'), validate(updateCategorySchema), updateCategory)
    .delete(requireAnyPermission('categories.manage', 'products.create', 'products.edit'), deleteCategory);

export default router;