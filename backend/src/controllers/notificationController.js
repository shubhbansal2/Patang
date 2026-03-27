import Notification from '../models/Notification.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Fetch all recent notifications
 */
export const getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        const unreadCount = await Notification.countDocuments({ 
            userId: req.user._id, 
            isRead: false 
        });

        return successResponse(res, 200, {
            notifications,
            unreadCount
        });
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a specific notification as read
 */
export const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return errorResponse(res, 404, 'NOT_FOUND', 'Notification not found');
        }

        return successResponse(res, 200, notification);
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for current user
 */
export const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user._id, isRead: false },
            { isRead: true }
        );

        return successResponse(res, 200, null, 'All notifications marked as read');
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};
