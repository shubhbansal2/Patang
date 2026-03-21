import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        targetRole: {
            type: String,
            enum: ['coordinator', 'caretaker', 'executive', 'admin', 'gym_admin', 'swim_admin', 'general'],
            required: true
        },
        category: {
            type: String,
            enum: ['complaint', 'suggestion', 'appreciation', 'bug_report', 'other'],
            default: 'suggestion'
        },
        subject: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000
        },
        status: {
            type: String,
            enum: ['submitted', 'acknowledged', 'in_progress', 'resolved', 'dismissed'],
            default: 'submitted'
        },
        adminReply: {
            type: String,
            trim: true,
            maxlength: 2000
        },
        repliedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        repliedAt: {
            type: Date
        },
        isAnonymous: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

feedbackSchema.index({ user: 1, createdAt: -1 });
feedbackSchema.index({ targetRole: 1, status: 1, createdAt: -1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;
