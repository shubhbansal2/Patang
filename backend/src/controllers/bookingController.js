import Booking from '../models/Booking.js';
import Facility from '../models/Facility.js';
import TimeSlot from '../models/TimeSlot.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { isWithinNextDays, isWithinCancellationGrace, isWithinCheckInWindow } from '../utils/dateUtils.js';
import { checkFairUseQuota, checkOverlappingBooking, reserveSlot, releaseSlot } from '../services/bookingService.js';
import { checkUserSuspension, createPenalty } from '../services/penaltyService.js';
import { decodeQRToken } from '../services/qrService.js';

/**
 * POST /api/bookings
 * Create a new booking (individual or group).
 */
export const createBooking = async (req, res) => {
  try {
    const { facilityId, slotId, isGroupBooking } = req.body;
    const userId = req.user._id;

    // 1. Check suspension
    const { isSuspended, suspendedUntil } = await checkUserSuspension(userId);
    if (isSuspended) {
      return errorResponse(res, 'USER_SUSPENDED',
        `You are suspended from booking until ${suspendedUntil.toISOString()}`, 403);
    }

    // 2. Check fair-use quota
    const { allowed, activeCount } = await checkFairUseQuota(userId);
    if (!allowed) {
      return errorResponse(res, 'QUOTA_EXCEEDED',
        'You have reached the maximum of 2 active bookings in a 72-hour window', 400);
    }

    // 3. Validate facility
    const facility = await Facility.findOne({ _id: facilityId, isActive: true, isBookable: true });
    if (!facility) {
      return errorResponse(res, 'FACILITY_NOT_FOUND', 'Facility not found or not bookable', 404);
    }

    // 4. Validate slot
    const slot = await TimeSlot.findById(slotId);
    if (!slot) {
      return errorResponse(res, 'SLOT_NOT_FOUND', 'Time slot not found', 404);
    }

    if (slot.facilityId.toString() !== facilityId) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Slot does not belong to the specified facility', 400);
    }

    // 5. Check slot is available
    if (slot.status !== 'Available') {
      return errorResponse(res, 'SLOT_UNAVAILABLE', 'Slot is not available for booking', 400);
    }

    // 6. Check date is within 3-day range
    if (!isWithinNextDays(slot.date, 3)) {
      return errorResponse(res, 'DATE_OUT_OF_RANGE',
        'Slot date is beyond the 3-day advance booking window', 400);
    }

    // 7. Check overlapping booking
    const { hasOverlap } = await checkOverlappingBooking(userId, slotId);
    if (hasOverlap) {
      return errorResponse(res, 'OVERLAPPING_BOOKING',
        'You already have a booking at this time', 409);
    }

    // 8. Reserve slot atomically
    const slotStatus = isGroupBooking ? 'Reserved' : 'Booked';
    const updatedSlot = await reserveSlot(slotId, slotStatus);
    if (!updatedSlot) {
      return errorResponse(res, 'SLOT_UNAVAILABLE',
        'Slot was just taken by another user', 400);
    }

    // 9. Create booking
    const bookingData = {
      userId,
      facilityId,
      slotId,
      bookingDate: new Date(),
      slotDate: slot.date,
      status: isGroupBooking ? 'Provisioned' : 'Confirmed',
      isGroupBooking: !!isGroupBooking,
    };

    if (isGroupBooking) {
      bookingData.groupRequiredCount = facility.minGroupSize;
      bookingData.joinedUsers = [];
    }

    const booking = await Booking.create(bookingData);

    return successResponse(res, booking, 'Booking created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * PATCH /api/bookings/:bookingId/join
 * Join an existing group booking.
 */
export const joinGroupBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    // 1. Find booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return errorResponse(res, 'BOOKING_NOT_FOUND', 'Booking not found', 404);
    }

    // 2. Validate group booking
    if (!booking.isGroupBooking) {
      return errorResponse(res, 'NOT_GROUP_BOOKING', 'This is not a group booking', 400);
    }

    if (booking.status !== 'Provisioned') {
      return errorResponse(res, 'CANNOT_JOIN', 'This group booking is no longer accepting members', 400);
    }

    // 3. Check not creator
    if (booking.userId.toString() === userId.toString()) {
      return errorResponse(res, 'ALREADY_JOINED', 'You are the creator of this booking', 400);
    }

    // 4. Check not already joined
    if (booking.joinedUsers.some(u => u.toString() === userId.toString())) {
      return errorResponse(res, 'ALREADY_JOINED', 'You have already joined this group', 400);
    }

    // 5. Check group is not full
    const currentCount = (booking.joinedUsers?.length || 0) + 1; // +1 for creator
    if (currentCount >= booking.groupRequiredCount) {
      return errorResponse(res, 'GROUP_FULL', 'This group already has enough members', 400);
    }

    // 6. Check user's fair-use quota
    const { allowed } = await checkFairUseQuota(userId);
    if (!allowed) {
      return errorResponse(res, 'QUOTA_EXCEEDED',
        'You have reached the maximum of 2 active bookings in a 72-hour window', 400);
    }

    // 7. Check suspension
    const { isSuspended } = await checkUserSuspension(userId);
    if (isSuspended) {
      return errorResponse(res, 'USER_SUSPENDED', 'You are currently suspended from booking', 403);
    }

    // 8. Add user to group
    booking.joinedUsers.push(userId);

    // 9. Check if group is now complete
    const newCount = booking.joinedUsers.length + 1; // +1 for creator
    if (newCount >= booking.groupRequiredCount) {
      booking.status = 'Confirmed';
      // Update slot to Booked
      await TimeSlot.findByIdAndUpdate(booking.slotId, { status: 'Booked' });
    }

    await booking.save();

    return successResponse(res, {
      _id: booking._id,
      status: booking.status,
      joinedUsers: booking.joinedUsers,
      groupRequiredCount: booking.groupRequiredCount,
    }, 'Successfully joined group booking');
  } catch (error) {
    return errorResponse(res, 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * DELETE /api/bookings/:bookingId
 * Cancel a booking.
 */
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    const booking = await Booking.findById(bookingId).populate('slotId');
    if (!booking) {
      return errorResponse(res, 'BOOKING_NOT_FOUND', 'Booking not found', 404);
    }

    // Check ownership
    if (booking.userId.toString() !== userId.toString()) {
      return errorResponse(res, 'NOT_OWNER', 'You can only cancel your own bookings', 403);
    }

    // Check cancellable state
    if (!['Confirmed', 'Provisioned'].includes(booking.status)) {
      return errorResponse(res, 'CANNOT_CANCEL', 'Booking is not in a cancellable state', 400);
    }

    // Determine if late cancellation
    const slot = booking.slotId;
    const isGracePeriod = isWithinCancellationGrace(slot.startTime);
    let penaltyApplied = false;

    if (isGracePeriod) {
      booking.status = 'Cancelled';
    } else {
      booking.status = 'LateCancelled';
      // Create late cancellation penalty
      await createPenalty(userId, 'LateCancellation', booking._id,
        'Late cancellation (within 2 hours of slot start)');
      penaltyApplied = true;
    }

    booking.cancelledAt = new Date();
    await booking.save();

    // Release the slot
    await releaseSlot(slot._id);

    return successResponse(res, {
      status: booking.status,
      penaltyApplied,
    }, 'Booking cancelled successfully');
  } catch (error) {
    return errorResponse(res, 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * POST /api/bookings/:bookingId/check-in
 * Caretaker scans QR to mark user as present.
 */
export const checkIn = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { qrToken } = req.body;
    const caretakerId = req.user._id;

    // 1. Decode QR token
    const decoded = decodeQRToken(qrToken);
    if (!decoded || !decoded.bookingId || !decoded.userId) {
      return errorResponse(res, 'INVALID_QR', 'QR token is invalid or expired', 400);
    }

    // 2. Verify token matches the booking
    if (decoded.bookingId !== bookingId) {
      return errorResponse(res, 'INVALID_QR', 'QR token does not match this booking', 400);
    }

    // 3. Find booking
    const booking = await Booking.findById(bookingId).populate('slotId');
    if (!booking) {
      return errorResponse(res, 'BOOKING_NOT_FOUND', 'Booking not found', 404);
    }

    // 4. Check booking is confirmed
    if (booking.status === 'Attended') {
      return errorResponse(res, 'ALREADY_CHECKED_IN', 'User has already checked in', 400);
    }

    if (booking.status !== 'Confirmed') {
      return errorResponse(res, 'CANNOT_CHECK_IN', 'Booking is not in Confirmed status', 400);
    }

    // 5. Check check-in window
    if (!isWithinCheckInWindow(booking.slotId.startTime)) {
      return errorResponse(res, 'CHECK_IN_WINDOW_CLOSED',
        'Check-in is only allowed within 15 minutes of slot start time', 400);
    }

    // 6. Update booking
    booking.status = 'Attended';
    booking.checkedInAt = new Date();
    booking.checkedInBy = caretakerId;
    await booking.save();

    return successResponse(res, {
      bookingId: booking._id,
      status: 'Attended',
      checkedInAt: booking.checkedInAt,
    }, 'Check-in successful');
  } catch (error) {
    return errorResponse(res, 'SERVER_ERROR', error.message, 500);
  }
};
