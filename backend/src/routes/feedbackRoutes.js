import express from 'express';
import { protectRoute, authorizeRoles } from '../middlewares/authMiddleware.js';
import {
    getFeedbackPage,
    submitFeedback,
    getFeedbackInbox,
    replyToFeedback
} from '../controllers/feedbackController.js';

const router = express.Router();

// ── User-facing (any authenticated user) ─────────────────────────────────────
// GET  /api/feedback — feedback page + own submissions
router.get('/', protectRoute, getFeedbackPage);

// POST /api/feedback — submit new feedback
router.post('/', protectRoute, submitFeedback);

// ── Staff-facing (coordinators, caretakers, executives, admins) ──────────────
// GET  /api/feedback/inbox — view feedback addressed to your role
router.get('/inbox', protectRoute, authorizeRoles('coordinator', 'caretaker', 'executive', 'admin', 'gym_admin', 'swim_admin'), getFeedbackInbox);

// PATCH /api/feedback/:feedbackId/reply — reply to / update feedback status
router.patch('/:feedbackId/reply', protectRoute, authorizeRoles('coordinator', 'caretaker', 'executive', 'admin', 'gym_admin', 'swim_admin'), replyToFeedback);

export default router;
