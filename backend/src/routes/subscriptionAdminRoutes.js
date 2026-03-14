import express from 'express';
import { listSubscriptions, reviewSubscription } from '../controllers/subscriptionController.js';
import { protectRoute, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET /api/admin/subscriptions — List subscription applications
router.get('/', protectRoute, authorizeRoles('admin'), listSubscriptions);

// PATCH /api/admin/subscriptions/:subscriptionId — Approve/reject
router.patch('/:subscriptionId', protectRoute, authorizeRoles('admin'), reviewSubscription);

export default router;
