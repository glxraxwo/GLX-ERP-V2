import express from 'express';
import {
    createVehicleModel,
    getVehicleModels,
    updateVehicleModel,
    deleteVehicleModel,
} from '../controllers/vehicleModelController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(getVehicleModels)
    .post(createVehicleModel);

router
    .route('/:id')
    .put(updateVehicleModel)
    .delete(deleteVehicleModel);

export default router;
