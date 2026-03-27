import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: [
            'penalty',
            'role_update',
            'booking_confirmed',
            'subscription_approved',
            'gym_subscription_confirmed',
            'swimming_registration_confirmed',
            'feedback_update',
            'feedback_received',
            'fair_use_score',
            'venue_approved',
            'venue_update',
            'event_approved',
            'event_update',
            'system',
            'other'
        ],
        default: 'other'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        // E.g., Event ID, Booking ID, Penalty ID
        default: null
    },
    link: {
        type: String,
        // e.g. /dashboard, /history
        default: null
    }
}, { timestamps: true });

// Auto-delete notifications older than 90 days if we want, or keep them.
// Let's just index for fast query.
notificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
