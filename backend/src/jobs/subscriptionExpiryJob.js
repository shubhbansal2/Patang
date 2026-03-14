import cron from 'node-cron';
import Subscription from '../models/Subscription.js';

/**
 * Mark expired subscriptions.
 * Runs daily at midnight.
 */
const subscriptionExpiryJob = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      const result = await Subscription.updateMany(
        {
          status: 'Approved',
          endDate: { $lt: new Date() },
        },
        { status: 'Expired' }
      );

      if (result.modifiedCount > 0) {
        console.log(`[SubscriptionExpiryJob] Expired ${result.modifiedCount} subscriptions`);
      }
    } catch (error) {
      console.error('[SubscriptionExpiryJob] Error:', error.message);
    }
  });
  console.log('[SubscriptionExpiryJob] Scheduled: daily at midnight');
};

export default subscriptionExpiryJob;
