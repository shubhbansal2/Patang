import express from 'express';
import { listFacilities, getAvailability } from '../controllers/facilityController.js';
import { protectRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET /api/facilities
router.get('/', protectRoute, listFacilities);

// GET /api/facilities/:facilityId/availability
router.get('/:facilityId/availability', protectRoute, getAvailability);

export default router;
