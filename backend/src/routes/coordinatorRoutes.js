import express from 'express';
import { protectRoute, authorizeRoles } from '../middlewares/authMiddleware.js';
import { posterUpload, handleUploadError } from '../middlewares/upload.js';
import {
    getEventManagementPage,
    submitEvent,
    getVenueBookingPage,
    requestVenueBooking
} from '../controllers/coordinatorController.js';

const router = express.Router();

// All routes require coordinator, executive, or admin role
const coordinatorAuth = [protectRoute, authorizeRoles('coordinator', 'executive', 'admin')];

// ── Event Management ─────────────────────────────────────────────────────────
// GET  /api/coordinator/events — event management page data
router.get('/events', ...coordinatorAuth, getEventManagementPage);

// POST /api/coordinator/events — submit new event (with optional poster upload)
router.post('/events', ...coordinatorAuth, posterUpload, handleUploadError, submitEvent);

// ── Venue Booking ────────────────────────────────────────────────────────────
// GET  /api/coordinator/venues?date= — venue booking page data
router.get('/venues', ...coordinatorAuth, getVenueBookingPage);

// POST /api/coordinator/venues — submit venue booking request (goes to executive)
router.post('/venues', ...coordinatorAuth, requestVenueBooking);

export default router;
