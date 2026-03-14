import cron from 'node-cron';
import Booking from '../models/Booking.js';
import TimeSlot from '../models/TimeSlot.js';
import { createPenalty } from '../services/penaltyService.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);

/**
 * Mark unattended bookings as NoShow.
 * Runs every 15 minutes.
 * Checks for Confirmed bookings whose slot started more than 15 minutes ago.
 */
const noShowJob = () => {
  cron.schedule('*/15 * * * *', async () => {
    try {
      const fifteenMinAgo = dayjs.utc().subtract(15, 'minute').toDate();

      // Find confirmed bookings with slots that started > 15 min ago
      const slots = await TimeSlot.find({
        startTime: { $lte: fifteenMinAgo },
      }).select('_id');

      const slotIds = slots.map(s => s._id);

      if (slotIds.length === 0) return;

      const noShowBookings = await Booking.find({
        status: 'Confirmed',
        slotId: { $in: slotIds },
      });

      for (const booking of noShowBookings) {
        booking.status = 'NoShow';
        await booking.save();

        // Create penalty
        await createPenalty(booking.userId, 'NoShow', booking._id, 'No-show: did not check in within 15 minutes');
      }

      if (noShowBookings.length > 0) {
        console.log(`[NoShowJob] Marked ${noShowBookings.length} bookings as NoShow`);
      }
    } catch (error) {
      console.error('[NoShowJob] Error:', error.message);
    }
  });
  console.log('[NoShowJob] Scheduled: every 15 minutes');
};

export default noShowJob;
