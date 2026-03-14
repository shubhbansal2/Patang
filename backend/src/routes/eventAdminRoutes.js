import express from 'express';
import { getPendingEvents, reviewEvent } from '../controllers/eventController.js';
import { protectRoute, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET /api/admin/events/pending — View pending events
router.get('/pending', protectRoute, authorizeRoles('executive', 'admin'), getPendingEvents);

// PATCH /api/admin/events/:eventId — Approve/reject/request changes
router.patch('/:eventId', protectRoute, authorizeRoles('executive', 'admin'), reviewEvent);

export default router;
