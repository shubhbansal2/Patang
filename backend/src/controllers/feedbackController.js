import Feedback from '../models/Feedback.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

// ── Recipient options for the dropdown ────────────────────────────────────────

const RECIPIENT_OPTIONS = [
    { value: 'coordinator', label: 'Coordinator' },
    { value: 'caretaker', label: 'Caretaker' },
    { value: 'executive', label: 'Executive (Gymkhana)' },
    { value: 'gym_admin', label: 'Gym Admin' },
    { value: 'swim_admin', label: 'Swimming Pool Admin' },
    { value: 'admin', label: 'System Admin' },
    { value: 'general', label: 'General Feedback' }
];

const CATEGORY_OPTIONS = [
    { value: 'complaint', label: 'Complaint' },
    { value: 'suggestion', label: 'Suggestion' },
    { value: 'appreciation', label: 'Appreciation' },
    { value: 'bug_report', label: 'Bug Report' },
    { value: 'other', label: 'Other' }
];

/**
 * GET /api/feedback
 *
 * Returns feedback page data:
 * - user's own submitted feedback with status tracking
 * - form options (recipient roles, categories)
 * - stats
 */
export const getFeedbackPage = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const userId = req.user._id;
        const { status, page = 1, limit = 10 } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));

        const query = { user: userId };
        if (status) query.status = status;

        const [feedbacks, total, statsCounts] = await Promise.all([
            Feedback.find(query)
                .select('targetRole category subject message status adminReply repliedAt isAnonymous createdAt')
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .maxTimeMS(5000)
                .lean(),

            Feedback.countDocuments(query),

            Feedback.aggregate([
                { $match: { user: userId } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ])
        ]);

        const stats = { total: 0, submitted: 0, acknowledged: 0, in_progress: 0, resolved: 0, dismissed: 0 };
        for (const s of statsCounts) {
            stats[s._id] = s.count;
            stats.total += s.count;
        }

        res.set('Cache-Control', 'private, max-age=15');
        return successResponse(res, 200, {
            feedbacks,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            },
            stats,
            formOptions: {
                recipients: RECIPIENT_OPTIONS,
                categories: CATEGORY_OPTIONS
            }
        });
    } catch (error) {
        console.error('[Feedback/Get] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * POST /api/feedback
 *
 * Submit new feedback.
 * Body: { targetRole, category, subject, message, isAnonymous }
 */
export const submitFeedback = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const { targetRole, category, subject, message, isAnonymous } = req.body;

        // Validation
        if (!targetRole) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Please select a recipient');
        }
        const validRoles = RECIPIENT_OPTIONS.map(r => r.value);
        if (!validRoles.includes(targetRole)) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', `Recipient must be one of: ${validRoles.join(', ')}`);
        }
        if (!subject?.trim()) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Subject is required');
        }
        if (!message?.trim()) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Message is required');
        }
        if (subject.trim().length > 200) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Subject cannot exceed 200 characters');
        }
        if (message.trim().length > 2000) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Message cannot exceed 2000 characters');
        }

        const feedback = await Feedback.create({
            user: req.user._id,
            targetRole,
            category: category || 'suggestion',
            subject: subject.trim(),
            message: message.trim(),
            isAnonymous: !!isAnonymous,
            status: 'submitted'
        });

        return successResponse(res, 201, {
            _id: feedback._id,
            targetRole: feedback.targetRole,
            subject: feedback.subject,
            status: feedback.status,
            isAnonymous: feedback.isAnonymous
        }, 'Feedback submitted successfully');
    } catch (error) {
        console.error('[Feedback/Submit] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * GET /api/feedback/inbox
 *
 * For coordinators/caretakers/executives/admins —
 * view feedback addressed TO their role.
 */
export const getFeedbackInbox = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const userRoles = req.user.roles || [];
        const { status, page = 1, limit = 10 } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));

        // Determine which feedback this user can see based on their roles
        const targetRoles = [];
        if (userRoles.includes('coordinator')) targetRoles.push('coordinator');
        if (userRoles.includes('caretaker')) targetRoles.push('caretaker');
        if (userRoles.includes('executive')) targetRoles.push('executive', 'general');
        if (userRoles.includes('admin')) targetRoles.push('admin', 'general', 'coordinator', 'caretaker', 'executive', 'gym_admin', 'swim_admin');
        if (userRoles.includes('gym_admin')) targetRoles.push('gym_admin');
        if (userRoles.includes('swim_admin')) targetRoles.push('swim_admin');

        if (targetRoles.length === 0) {
            return errorResponse(res, 403, 'FORBIDDEN', 'You do not have permission to view feedback inbox');
        }

        const query = { targetRole: { $in: [...new Set(targetRoles)] } };
        if (status) query.status = status;

        const [feedbacks, total] = await Promise.all([
            Feedback.find(query)
                .populate({
                    path: 'user',
                    select: 'name email profileDetails.rollNumber',
                    // If anonymous, we'll strip user details in the response
                })
                .select('user targetRole category subject message status adminReply repliedBy repliedAt isAnonymous createdAt')
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .maxTimeMS(5000)
                .lean(),

            Feedback.countDocuments(query)
        ]);

        // Strip user details for anonymous feedback
        const sanitized = feedbacks.map(f => ({
            ...f,
            user: f.isAnonymous ? { _id: null, name: 'Anonymous', email: null } : f.user
        }));

        res.set('Cache-Control', 'private, max-age=15');
        return successResponse(res, 200, {
            feedbacks: sanitized,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('[Feedback/Inbox] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * PATCH /api/feedback/:feedbackId/reply
 *
 * For admins/executives/coordinators/caretakers —
 * reply to and update status of a feedback.
 * Body: { status, adminReply }
 */
export const replyToFeedback = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const { feedbackId } = req.params;
        const { status, adminReply } = req.body;

        const feedback = await Feedback.findById(feedbackId);
        if (!feedback) {
            return errorResponse(res, 404, 'NOT_FOUND', 'Feedback not found');
        }

        // Verify user's role matches the target role of the feedback
        const userRoles = req.user.roles || [];
        const isAdmin = userRoles.includes('admin');
        const canReply = isAdmin || userRoles.includes(feedback.targetRole) || (feedback.targetRole === 'general' && userRoles.includes('executive'));

        if (!canReply) {
            return errorResponse(res, 403, 'FORBIDDEN', 'You do not have permission to reply to this feedback');
        }

        // Update fields
        const validStatuses = ['acknowledged', 'in_progress', 'resolved', 'dismissed'];
        if (status && validStatuses.includes(status)) {
            feedback.status = status;
        }
        if (adminReply?.trim()) {
            feedback.adminReply = adminReply.trim();
            feedback.repliedBy = req.user._id;
            feedback.repliedAt = new Date();
        }

        await feedback.save();

        return successResponse(res, 200, {
            _id: feedback._id,
            status: feedback.status,
            adminReply: feedback.adminReply,
            repliedAt: feedback.repliedAt
        }, 'Feedback updated successfully');
    } catch (error) {
        console.error('[Feedback/Reply] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};
