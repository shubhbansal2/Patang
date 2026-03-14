import cron from 'node-cron';
import { generateSlotsForNextDays } from '../services/slotGeneratorService.js';

/**
 * Generate time slots for the next 3 days.
 * Runs daily at midnight.
 */
const slotGenerationJob = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      const results = await generateSlotsForNextDays(3);
      if (results.length > 0) {
        console.log(`[SlotGenerationJob] Generated slots:`, results);
      }
    } catch (error) {
      console.error('[SlotGenerationJob] Error:', error.message);
    }
  });
  console.log('[SlotGenerationJob] Scheduled: daily at midnight');
};

export default slotGenerationJob;
