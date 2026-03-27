import express from 'express';
import { protectRoute } from '../middlewares/authMiddleware.js';
import { getMyNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protectRoute);

router.get('/', getMyNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

export default router;
