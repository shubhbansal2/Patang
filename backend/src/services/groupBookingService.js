import Booking from '../models/Booking.js';
import { releaseSlot } from './bookingService.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);

/**
 * Auto-cancel group bookings that haven't met minimum player count
 * 4 hours before slot start time.
 */
export const expireUnfilledGroups = async () => {
  const fourHoursFromNow = dayjs.utc().add(4, 'hour').toDate();

  const unfilledGroups = await Booking.find({
    isGroupBooking: true,
    status: 'Provisioned',
    slotDate: { $lte: fourHoursFromNow },
  });

  const results = [];

  for (const booking of unfilledGroups) {
    const memberCount = (booking.joinedUsers?.length || 0) + 1; // +1 for creator
    if (memberCount < booking.groupRequiredCount) {
      booking.status = 'AutoCancelled';
      booking.cancelledAt = new Date();
      booking.cancellationReason = 'Minimum group size not met within deadline';
      await booking.save();

      // Release the slot
      await releaseSlot(booking.slotId);

      results.push({
        bookingId: booking._id,
        memberCount,
        required: booking.groupRequiredCount,
      });
    }
  }

  return results;
};
