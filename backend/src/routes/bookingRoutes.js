import express from 'express';
import { createBooking, joinGroupBooking, cancelBooking, checkIn } from '../controllers/bookingController.js';
import { protectRoute, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// POST /api/bookings — Create booking
router.post('/', protectRoute, authorizeRoles('student', 'faculty'), createBooking);

// PATCH /api/bookings/:bookingId/join — Join group booking
router.patch('/:bookingId/join', protectRoute, authorizeRoles('student', 'faculty'), joinGroupBooking);

// DELETE /api/bookings/:bookingId — Cancel booking
router.delete('/:bookingId', protectRoute, authorizeRoles('student', 'faculty'), cancelBooking);

// POST /api/bookings/:bookingId/check-in — Caretaker check-in
router.post('/:bookingId/check-in', protectRoute, authorizeRoles('caretaker'), checkIn);

export default router;
