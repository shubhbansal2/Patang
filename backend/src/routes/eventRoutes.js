import express from 'express';
import { getPublicEvents, createEvent, getMyEvents, updateEvent, cancelEvent } from '../controllers/eventController.js';
import { protectRoute, authorizeRoles } from '../middlewares/authMiddleware.js';
import { uploadEventPoster } from '../middlewares/upload.js';

const router = express.Router();

// GET /api/events — Public calendar (all authenticated users)
router.get('/', protectRoute, getPublicEvents);

// GET /api/events/my — Coordinator's own events
router.get('/my', protectRoute, authorizeRoles('student', 'faculty', 'executive', 'admin'), getMyEvents);

// POST /api/events — Submit event proposal
router.post('/', protectRoute, authorizeRoles('student', 'faculty', 'executive', 'admin'), uploadEventPoster, createEvent);

// PUT /api/events/:eventId — Update event
router.put('/:eventId', protectRoute, authorizeRoles('student', 'faculty', 'executive', 'admin'), uploadEventPoster, updateEvent);

// DELETE /api/events/:eventId — Cancel event
router.delete('/:eventId', protectRoute, cancelEvent);

export default router;
