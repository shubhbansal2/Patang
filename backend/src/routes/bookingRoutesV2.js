import express from 'express';
import {
    createBooking,
    joinGroupBooking,
    cancelBooking,
    checkIn,
    listBookingsForCaretaker,
    verifyAttendeeByIdentifier,
    updateAttendanceStatus,
    releaseBookingSlot
} from '../controllers/bookingControllerV2.js';
import { protectRoute, authorizeRoles } from '../middlewares/authMiddleware.js';
import { validateBooking } from '../middlewares/validate.js';

const router = express.Router();

router.post('/', protectRoute, authorizeRoles('student', 'faculty', 'admin', 'executive'), validateBooking, createBooking);
router.get('/caretaker', protectRoute, authorizeRoles('caretaker', 'admin'), listBookingsForCaretaker);
router.post('/verify-attendee', protectRoute, authorizeRoles('caretaker', 'admin'), verifyAttendeeByIdentifier);
router.patch('/:bookingId/join', protectRoute, authorizeRoles('student', 'faculty'), joinGroupBooking);
router.delete('/:bookingId', protectRoute, cancelBooking);
router.patch('/:bookingId/attendance', protectRoute, authorizeRoles('caretaker', 'admin'), updateAttendanceStatus);
router.patch('/:bookingId/release', protectRoute, authorizeRoles('caretaker', 'admin'), releaseBookingSlot);
router.post('/:bookingId/check-in', protectRoute, authorizeRoles('caretaker', 'admin'), checkIn);

export default router;
