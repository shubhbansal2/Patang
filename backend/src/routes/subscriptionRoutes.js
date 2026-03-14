import express from 'express';
import { applySubscription, getMySubscriptions, verifyEntry } from '../controllers/subscriptionController.js';
import { protectRoute, authorizeRoles } from '../middlewares/authMiddleware.js';
import { uploadSubscriptionDocs } from '../middlewares/upload.js';

const router = express.Router();

// POST /api/subscriptions/apply — Submit subscription application
router.post('/apply', protectRoute, authorizeRoles('student', 'faculty'), uploadSubscriptionDocs, applySubscription);

// GET /api/subscriptions/my — View user's subscriptions
router.get('/my', protectRoute, getMySubscriptions);

// POST /api/subscriptions/verify-entry — Caretaker verify entry
router.post('/verify-entry', protectRoute, authorizeRoles('caretaker'), verifyEntry);

export default router;
