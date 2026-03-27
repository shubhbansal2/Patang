import express from 'express';
import { listForAdmin, adminReview, getOccupancySummary, getSlotOccupancy } from '../controllers/subscriptionControllerV2.js';
import { protectRoute, authorizeRoles } from '../middlewares/authMiddleware.js';
import { validateSubscriptionAction } from '../middlewares/validate.js';

const router = express.Router();

router.get('/', protectRoute, authorizeRoles('admin', 'executive', 'gym_admin', 'swim_admin'), listForAdmin);
router.get('/occupancy', protectRoute, authorizeRoles('admin', 'executive', 'gym_admin', 'swim_admin', 'caretaker'), getOccupancySummary);
router.get('/slot-occupancy', protectRoute, authorizeRoles('admin', 'executive', 'gym_admin', 'swim_admin'), getSlotOccupancy);
router.patch('/:subscriptionId', protectRoute, authorizeRoles('admin', 'executive', 'gym_admin', 'swim_admin'), validateSubscriptionAction, adminReview);

export default router;

