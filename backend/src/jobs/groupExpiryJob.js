import cron from 'node-cron';
import { expireUnfilledGroups } from '../services/groupBookingService.js';

/**
 * Auto-cancel unfilled group bookings.
 * Runs every hour.
 */
const groupExpiryJob = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const results = await expireUnfilledGroups();
      if (results.length > 0) {
        console.log(`[GroupExpiryJob] Auto-cancelled ${results.length} unfilled group bookings`);
      }
    } catch (error) {
      console.error('[GroupExpiryJob] Error:', error.message);
    }
  });
  console.log('[GroupExpiryJob] Scheduled: every hour');
};

export default groupExpiryJob;
