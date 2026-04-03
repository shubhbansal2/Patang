import express from 'express';
import { protectRoute, authorizeRoles } from '../middlewares/authMiddleware.js';
import {
    createTeamPracticeBlock,
    getMyPracticeBlocks,
    getIncomingPracticeBlockRequests,
    reviewIncomingPracticeBlock,
    editTeamPracticeBlock,
    cancelTeamPracticeBlock
} from '../controllers/captainController.js';

const router = express.Router();

// All routes require captain or admin role
const captainAuth = [protectRoute, authorizeRoles('captain', 'admin')];

// POST   /api/captain/practice-blocks       — request a new practice block
router.post('/practice-blocks', ...captainAuth, createTeamPracticeBlock);

// GET    /api/captain/practice-blocks       — view my practice blocks
router.get('/practice-blocks', ...captainAuth, getMyPracticeBlocks);

// GET    /api/captain/practice-blocks/incoming — review requests routed to this captain
router.get('/practice-blocks/incoming', ...captainAuth, getIncomingPracticeBlockRequests);

// PATCH  /api/captain/practice-blocks/:blockId/review — approve/reject an incoming request
router.patch('/practice-blocks/:blockId/review', ...captainAuth, reviewIncomingPracticeBlock);

// PATCH  /api/captain/practice-blocks/:blockId — edit practice timings (resets to pending)
router.patch('/practice-blocks/:blockId', ...captainAuth, editTeamPracticeBlock);

// DELETE /api/captain/practice-blocks/:blockId — cancel a practice block
router.delete('/practice-blocks/:blockId', ...captainAuth, cancelTeamPracticeBlock);

export default router;
