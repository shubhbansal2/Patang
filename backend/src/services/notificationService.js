import Notification from '../models/Notification.js';

/**
 * Creates a notification for a user.
 * 
 * @param {String|ObjectId} userId - The user to notify
 * @param {Object} options - Notification options
 * @param {String} options.title - Notification title
 * @param {String} options.message - Notification message body
 * @param {String} options.type - Type of notification (penalty, booking_confirmed, etc.)
 * @param {String|ObjectId} [options.relatedId] - Associated entity ID
 * @param {String} [options.link] - Frontend route path for the notification
 * @returns {Promise<Object>} Created notification document
 */
export const createNotification = async (userId, { title, message, type, relatedId, link }) => {
    try {
        if (!userId) return null;

        const notification = await Notification.create({
            userId,
            title,
            message,
            type: type || 'other',
            relatedId: relatedId || null,
            link: link || null
        });

        // If we integrated Socket.io, we would emit the notification here
        // io.to(userId.toString()).emit('new_notification', notification);

        return notification;
    } catch (error) {
        console.error('[NotificationService] Error creating notification:', error);
        return null;
    }
};

/**
 * Creates notifications for multiple users simultaneously.
 * @param {Array<String|ObjectId>} userIds - Array of user IDs
 * @param {Object} options - Notification options
 */
export const createBulkNotifications = async (userIds, options) => {
    try {
        if (!userIds || userIds.length === 0) return;

        const notifications = userIds.map(userId => ({
            userId,
            title: options.title,
            message: options.message,
            type: options.type || 'other',
            relatedId: options.relatedId || null,
            link: options.link || null
        }));

        await Notification.insertMany(notifications);
    } catch (error) {
        console.error('[NotificationService] Error in bulk notifications:', error);
    }
};
