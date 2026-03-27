import Booking from '../models/Booking.js';
import TimeSlot from '../models/TimeSlot.js';
import Facility from '../models/Facility.js';
import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { isWithinNextDays, hoursUntil } from '../utils/dateUtils.js';
import { checkUserSuspension, checkFairUseQuota, updateSlotStatus } from '../services/bookingService.js';
import { createPenalty } from '../services/penaltyService.js';
import { decodeBookingQR, generateBookingQR } from '../services/qrService.js';
import { createNotification } from '../services/notificationService.js';
import mongoose from 'mongoose';

const ACTIVE_BOOKING_STATUSES = ['Confirmed', 'Provisioned', 'Attended'];
const CANCELLABLE_BOOKING_STATUSES = ['Confirmed', 'Provisioned'];

const getDateRange = (dateInput) => {
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

const findUserByIdentifier = async (identifier) => {
    if (!identifier) {
        return null;
    }

    const orConditions = [
        { email: identifier },
        { 'profileDetails.rollNumber': identifier }
    ];

    if (mongoose.Types.ObjectId.isValid(identifier)) {
        orConditions.unshift({ _id: identifier });
    }

    return User.findOne({ $or: orConditions }).select('name email profileDetails');
};

const releaseSlotForBooking = async (booking) => {
    const slotId = booking.slotId?._id || booking.slotId;
    if (slotId) {
        await TimeSlot.findByIdAndUpdate(slotId, { status: 'Available' });
    }
};

const markBookingAttendance = async ({ booking, attendanceStatus, markedBy, note = null }) => {
    if (attendanceStatus === 'present') {
        booking.status = 'Attended';
        booking.checkedInAt = new Date();
        booking.checkedInBy = markedBy;
        booking.cancellationReason = note || booking.cancellationReason;
        await booking.save();

        return {
            status: booking.status,
            penaltyApplied: false
        };
    }

    booking.status = 'NoShow';
    booking.checkedInBy = markedBy;
    booking.cancellationReason = note || booking.cancellationReason;
    await booking.save();

    await createPenalty(
        booking.userId,
        'NoShow',
        booking._id,
        note || 'Marked absent by caretaker/admin'
    );

    await releaseSlotForBooking(booking);

    return {
        status: booking.status,
        penaltyApplied: true
    };
};

/**
 * POST /api/v2/bookings
 * Create a new booking (individual or group).
 */
export const createBooking = async (req, res) => {
    try {
        const { facilityId, slotId, isGroupBooking = false } = req.body;
        const userId = req.user._id;

        // 1. Check suspension
        const suspension = await checkUserSuspension(userId);
        if (suspension) {
            return errorResponse(res, 403, 'USER_SUSPENDED', `You are suspended until ${suspension.suspendedUntil.toISOString()}`);
        }

        // 2. Check fair-use quota
        const quota = await checkFairUseQuota(userId);
        if (!quota.allowed) {
            return errorResponse(res, 400, 'QUOTA_EXCEEDED', 'You have reached the maximum of 2 active bookings in a 72-hour window');
        }

        // 3. Validate facility
        const facility = await Facility.findById(facilityId);
        if (!facility || !facility.isOperational) {
            return errorResponse(res, 404, 'FACILITY_NOT_FOUND', 'Facility not found');
        }

        // 4. Validate slot
        const slot = await TimeSlot.findById(slotId);
        if (!slot) {
            return errorResponse(res, 404, 'SLOT_NOT_FOUND', 'Time slot not found');
        }

        if (slot.status !== 'Available') {
            return errorResponse(res, 400, 'SLOT_UNAVAILABLE', 'This slot is not available');
        }

        // 5. Check slot is within 3-day window
        if (!isWithinNextDays(slot.date, 3)) {
            return errorResponse(res, 400, 'DATE_OUT_OF_RANGE', 'Slot date is beyond the 3-day advance booking window');
        }

        // 6. Check overlapping bookings
        const existingBooking = await Booking.findOne({
            userId,
            status: { $in: ['Confirmed', 'Provisioned'] },
            slotId
        });
        if (existingBooking) {
            return errorResponse(res, 409, 'OVERLAPPING_BOOKING', 'You already have a booking for this slot');
        }

        // 7. Determine status and update slot (optimistic concurrency)
        const bookingStatus = isGroupBooking ? 'Provisioned' : 'Confirmed';
        const newSlotStatus = isGroupBooking ? 'Reserved' : 'Booked';

        const updatedSlot = await updateSlotStatus(slotId, 'Available', newSlotStatus);
        if (!updatedSlot) {
            return errorResponse(res, 400, 'SLOT_UNAVAILABLE', 'Slot was just taken by another user');
        }

        // 8. Create booking
        const groupRequiredCount = isGroupBooking ? (facility.metadata?.minGroupSize || facility.capacity || 2) : 2;

        const booking = await Booking.create({
            userId,
            facilityId,
            slotId,
            bookingDate: new Date(),
            slotDate: slot.date,
            status: bookingStatus,
            isGroupBooking,
            groupRequiredCount,
            joinedUsers: []
        });

        // Generate QR token for check-in
        const qrToken = generateBookingQR(booking._id, userId);

        if (bookingStatus === 'Confirmed') {
            await createNotification(userId, {
                title: 'Slot Confirmed',
                message: `Your booking for ${facility.name} on ${new Date(slot.date).toLocaleDateString()} has been confirmed.`,
                type: 'booking_confirmed',
                relatedId: booking._id,
                link: '/history'
            });
        }

        return successResponse(res, 201, {
            _id: booking._id,
            userId: booking.userId,
            facilityId: booking.facilityId,
            slotId: booking.slotId,
            status: booking.status,
            isGroupBooking: booking.isGroupBooking,
            bookingDate: booking.bookingDate,
            slotDate: booking.slotDate,
            qrToken
        }, 'Booking created successfully');
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * PATCH /api/v2/bookings/:bookingId/join
 * Join an existing group booking.
 */
export const joinGroupBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user._id;

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return errorResponse(res, 404, 'BOOKING_NOT_FOUND', 'Booking not found');
        }

        if (!booking.isGroupBooking) {
            return errorResponse(res, 400, 'NOT_GROUP_BOOKING', 'This is not a group booking');
        }

        if (booking.status !== 'Provisioned') {
            return errorResponse(res, 400, 'GROUP_FULL', 'Group booking is no longer accepting members');
        }

        // Check if user is the creator
        if (String(booking.userId) === String(userId)) {
            return errorResponse(res, 400, 'ALREADY_JOINED', 'You are the creator of this booking');
        }

        // Check if already joined
        if (booking.joinedUsers.map(String).includes(String(userId))) {
            return errorResponse(res, 400, 'ALREADY_JOINED', 'You have already joined this group');
        }

        // Check fair-use quota
        const quota = await checkFairUseQuota(userId);
        if (!quota.allowed) {
            return errorResponse(res, 400, 'QUOTA_EXCEEDED', 'Your fair-use quota is exceeded');
        }

        // Add user
        booking.joinedUsers.push(userId);

        // Check if group is now full (joinedUsers + creator >= required)
        const totalMembers = booking.joinedUsers.length + 1;
        if (totalMembers >= booking.groupRequiredCount) {
            booking.status = 'Confirmed';
            // Update slot status from Reserved to Booked
            await updateSlotStatus(booking.slotId, 'Reserved', 'Booked');
            
            // Notify creator and all members
            const allUsers = [booking.userId, ...booking.joinedUsers];
            for (const uid of allUsers) {
                await createNotification(uid, {
                    title: 'Group Slot Confirmed',
                    message: `Your group booking is now confirmed as all required members have joined!`,
                    type: 'booking_confirmed',
                    relatedId: booking._id,
                    link: '/history'
                });
            }
        }

        await booking.save();

        return successResponse(res, 200, {
            _id: booking._id,
            status: booking.status,
            joinedUsers: booking.joinedUsers,
            groupRequiredCount: booking.groupRequiredCount
        }, 'Successfully joined group booking');
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * DELETE /api/v2/bookings/:bookingId
 * Cancel a booking.
 */
export const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user._id;

        const booking = await Booking.findById(bookingId).populate('slotId');
        if (!booking) {
            return errorResponse(res, 404, 'BOOKING_NOT_FOUND', 'Booking not found');
        }

        if (String(booking.userId) !== String(userId)) {
            return errorResponse(res, 403, 'NOT_OWNER', 'You can only cancel your own bookings');
        }

        if (!req.body?.reason?.trim()) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'A cancellation reason is required');
        }

        if (!CANCELLABLE_BOOKING_STATUSES.includes(booking.status)) {
            return errorResponse(res, 400, 'CANNOT_CANCEL', 'This booking cannot be cancelled');
        }

        // Calculate time until slot start
        const slotStartTime = booking.slotId?.startTime;
        const hrsUntilSlot = slotStartTime ? hoursUntil(slotStartTime) : Infinity;

        let penaltyApplied = false;

        if (hrsUntilSlot >= 2) {
            booking.status = 'Cancelled';
        } else {
            booking.status = 'LateCancelled';
            await createPenalty(userId, 'LateCancellation', booking._id, 'Late cancellation within 2 hours of slot start');
            penaltyApplied = true;
        }

        booking.cancelledAt = new Date();
        booking.cancellationReason = req.body.reason.trim();
        await booking.save();

        // Release the slot
        await releaseSlotForBooking(booking);

        return successResponse(res, 200, {
            status: booking.status,
            penaltyApplied
        }, 'Booking cancelled successfully');
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * POST /api/v2/bookings/:bookingId/check-in
 * Caretaker scans QR to mark attendance.
 */
export const checkIn = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { qrToken } = req.body;

        if (!qrToken) {
            return errorResponse(res, 400, 'INVALID_QR', 'qrToken is required');
        }

        // Decode QR
        const decoded = decodeBookingQR(qrToken);
        if (!decoded) {
            return errorResponse(res, 400, 'INVALID_QR', 'QR token is invalid or expired');
        }

        if (decoded.bookingId !== bookingId) {
            return errorResponse(res, 400, 'INVALID_QR', 'QR token does not match this booking');
        }

        const booking = await Booking.findById(bookingId).populate('slotId');
        if (!booking) {
            return errorResponse(res, 404, 'BOOKING_NOT_FOUND', 'Booking not found');
        }

        if (String(decoded.userId) !== String(booking.userId)) {
            return errorResponse(res, 400, 'INVALID_QR', 'QR token does not belong to this booking owner');
        }

        if (booking.status === 'Attended') {
            return errorResponse(res, 400, 'ALREADY_CHECKED_IN', 'User has already checked in');
        }

        if (booking.status !== 'Confirmed') {
            return errorResponse(res, 400, 'INVALID_QR', 'Booking is not in a confirmed state');
        }

        // Check check-in window from slot start to 15 minutes after.
        const slotStart = booking.slotId?.startTime;
        if (slotStart) {
            const now = new Date();
            const windowEnd = new Date(slotStart.getTime() + 15 * 60 * 1000);
            if (now < slotStart) {
                return errorResponse(res, 400, 'CHECK_IN_WINDOW_NOT_OPEN', 'Check-in opens at the slot start time');
            }
            if (now > windowEnd) {
                return errorResponse(res, 400, 'CHECK_IN_WINDOW_CLOSED', 'Check-in window has closed (more than 15 minutes past slot start)');
            }
        }

        booking.status = 'Attended';
        booking.checkedInAt = new Date();
        booking.checkedInBy = req.user._id;
        await booking.save();

        return successResponse(res, 200, {
            bookingId: booking._id,
            status: 'Attended',
            checkedInAt: booking.checkedInAt
        }, 'Check-in successful');
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * GET /api/v2/bookings/caretaker
 * List bookings for caretaker/admin review.
 */
export const listBookingsForCaretaker = async (req, res) => {
    try {
        const { facilityId, status, date } = req.query;
        const query = {};

        if (facilityId) {
            query.facilityId = facilityId;
        }

        if (status) {
            query.status = status;
        }

        if (date) {
            const range = getDateRange(date);
            if (!range) {
                return errorResponse(res, 400, 'VALIDATION_ERROR', 'date must be a valid ISO date');
            }

            query.slotDate = {
                $gte: range.start,
                $lte: range.end
            };
        }

        const bookings = await Booking.find(query)
            .populate('userId', 'name email profileDetails.rollNumber')
            .populate('facilityId', 'name facilityType sportType location')
            .populate('slotId', 'date startTime endTime status')
            .sort({ slotDate: 1, createdAt: 1 });

        return successResponse(res, 200, { bookings });
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * POST /api/v2/bookings/verify-attendee
 * Cross-reference a student identifier against a valid booking.
 */
export const verifyAttendeeByIdentifier = async (req, res) => {
    try {
        const { identifier, bookingId, slotId, facilityId } = req.body;

        if (!identifier) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'identifier is required');
        }

        if (!bookingId && !slotId && !facilityId) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'bookingId, slotId, or facilityId is required');
        }

        const user = await findUserByIdentifier(identifier);
        if (!user) {
            return successResponse(res, 200, {
                valid: false,
                reason: 'No user found for the provided identifier'
            });
        }

        const query = {
            status: { $in: ACTIVE_BOOKING_STATUSES },
            $or: [
                { userId: user._id },
                { joinedUsers: user._id }
            ]
        };

        if (bookingId) {
            query._id = bookingId;
        }

        if (slotId) {
            query.slotId = slotId;
        }

        if (facilityId) {
            query.facilityId = facilityId;
        }

        const booking = await Booking.findOne(query)
            .populate('facilityId', 'name facilityType sportType')
            .populate('slotId', 'date startTime endTime')
            .populate('userId', 'name email profileDetails.rollNumber');

        if (!booking) {
            return successResponse(res, 200, {
                valid: false,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    rollNumber: user.profileDetails?.rollNumber || null
                },
                reason: 'No valid active booking matched the provided identifier'
            });
        }

        return successResponse(res, 200, {
            valid: true,
            booking: {
                _id: booking._id,
                status: booking.status,
                slotDate: booking.slotDate,
                isGroupBooking: booking.isGroupBooking,
                facility: booking.facilityId,
                slot: booking.slotId,
                bookedBy: booking.userId
            }
        }, 'Valid booking found');
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * PATCH /api/v2/bookings/:bookingId/attendance
 * Caretaker/admin manually marks attendance.
 */
export const updateAttendanceStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { attendanceStatus, note } = req.body;

        if (!['present', 'absent'].includes(attendanceStatus)) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'attendanceStatus must be present or absent');
        }

        const booking = await Booking.findById(bookingId).populate('slotId');
        if (!booking) {
            return errorResponse(res, 404, 'BOOKING_NOT_FOUND', 'Booking not found');
        }

        if (!['Confirmed', 'Provisioned'].includes(booking.status)) {
            return errorResponse(res, 400, 'INVALID_STATUS', 'Attendance can only be updated for confirmed or provisioned bookings');
        }

        const result = await markBookingAttendance({
            booking,
            attendanceStatus,
            markedBy: req.user._id,
            note
        });

        return successResponse(res, 200, {
            bookingId: booking._id,
            status: result.status,
            penaltyApplied: result.penaltyApplied
        }, `Booking marked ${attendanceStatus}`);
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * PATCH /api/v2/bookings/:bookingId/release
 * Caretaker/admin releases a slot after a cancellation or facility-side override.
 */
export const releaseBookingSlot = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { reason } = req.body;

        if (!reason?.trim()) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'A release reason is required');
        }

        const booking = await Booking.findById(bookingId).populate('slotId');
        if (!booking) {
            return errorResponse(res, 404, 'BOOKING_NOT_FOUND', 'Booking not found');
        }

        if (!CANCELLABLE_BOOKING_STATUSES.includes(booking.status)) {
            return errorResponse(res, 400, 'INVALID_STATUS', 'Only active bookings can be released');
        }

        booking.status = 'Cancelled';
        booking.cancelledAt = new Date();
        booking.cancellationReason = reason.trim();
        await booking.save();

        await releaseSlotForBooking(booking);

        return successResponse(res, 200, {
            bookingId: booking._id,
            status: booking.status
        }, 'Slot released successfully');
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};
