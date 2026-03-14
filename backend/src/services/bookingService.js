import Booking from '../models/Booking.js';
import TimeSlot from '../models/TimeSlot.js';
import { daysAgo } from '../utils/dateUtils.js';

/**
 * Check fair-use quota: max 2 active bookings per user in a rolling 72-hour window.
 * @returns {{ allowed: boolean, activeCount: number }}
 */
export const checkFairUseQuota = async (userId) => {
  const seventyTwoHoursAgo = daysAgo(3); // 72 hours = 3 days

  const activeCount = await Booking.countDocuments({
    userId,
    status: { $in: ['Confirmed', 'Provisioned'] },
    bookingDate: { $gte: seventyTwoHoursAgo },
  });

  return { allowed: activeCount < 2, activeCount };
};

/**
 * Check if user has an overlapping booking on the same date.
 * @returns {{ hasOverlap: boolean, overlappingBooking: object|null }}
 */
export const checkOverlappingBooking = async (userId, slotId) => {
  const slot = await TimeSlot.findById(slotId);
  if (!slot) return { hasOverlap: false, overlappingBooking: null };

  // Find user bookings on the same date that are still active
  const userBookings = await Booking.find({
    userId,
    status: { $in: ['Confirmed', 'Provisioned'] },
    slotDate: slot.date,
  }).populate('slotId');

  for (const booking of userBookings) {
    if (!booking.slotId) continue;
    const existingStart = new Date(booking.slotId.startTime);
    const existingEnd = new Date(booking.slotId.endTime);
    const newStart = new Date(slot.startTime);
    const newEnd = new Date(slot.endTime);

    // Check for time overlap
    if (newStart < existingEnd && newEnd > existingStart) {
      return { hasOverlap: true, overlappingBooking: booking };
    }
  }

  return { hasOverlap: false, overlappingBooking: null };
};

/**
 * Atomically reserve a slot using optimistic concurrency.
 * @param {string} slotId - The slot to reserve
 * @param {'Booked'|'Reserved'} newStatus - Target status
 * @returns {object|null} Updated slot or null if already taken
 */
export const reserveSlot = async (slotId, newStatus = 'Booked') => {
  return await TimeSlot.findOneAndUpdate(
    { _id: slotId, status: 'Available' },
    { status: newStatus },
    { new: true }
  );
};

/**
 * Release a slot back to Available.
 */
export const releaseSlot = async (slotId) => {
  return await TimeSlot.findByIdAndUpdate(
    slotId,
    { status: 'Available' },
    { new: true }
  );
};
