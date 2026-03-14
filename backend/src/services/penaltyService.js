import Penalty from '../models/Penalty.js';
import { daysAgo } from '../utils/dateUtils.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);

/**
 * Check if a user is currently suspended.
 * @returns {{ isSuspended: boolean, suspendedUntil: Date|null }}
 */
export const checkUserSuspension = async (userId) => {
  const suspension = await Penalty.findOne({
    userId,
    isActive: true,
    suspendedUntil: { $gt: new Date() },
  }).sort({ suspendedUntil: -1 });

  if (suspension) {
    return { isSuspended: true, suspendedUntil: suspension.suspendedUntil };
  }
  return { isSuspended: false, suspendedUntil: null };
};

/**
 * Create a penalty record for a user.
 */
export const createPenalty = async (userId, type, bookingId = null, description = null) => {
  const penalty = await Penalty.create({
    userId,
    type,
    bookingId,
    isActive: true,
    description,
  });

  // Check if suspension threshold is met
  await checkAndApplySuspension(userId);

  return penalty;
};

/**
 * Check penalty counts and apply suspension if threshold is met.
 * - 3 NoShows in 30 days → 7-day suspension
 * - 2 LateCancellations in 30 days → 7-day suspension
 */
export const checkAndApplySuspension = async (userId) => {
  const thirtyDaysAgo = daysAgo(30);

  const [noShowCount, lateCancelCount] = await Promise.all([
    Penalty.countDocuments({
      userId,
      type: 'NoShow',
      createdAt: { $gte: thirtyDaysAgo },
    }),
    Penalty.countDocuments({
      userId,
      type: 'LateCancellation',
      createdAt: { $gte: thirtyDaysAgo },
    }),
  ]);

  if (noShowCount >= 3 || lateCancelCount >= 2) {
    // Check if already suspended
    const existingSuspension = await Penalty.findOne({
      userId,
      isActive: true,
      suspendedUntil: { $gt: new Date() },
    });

    if (!existingSuspension) {
      const suspendedUntil = dayjs.utc().add(7, 'day').toDate();
      await Penalty.create({
        userId,
        type: noShowCount >= 3 ? 'NoShow' : 'LateCancellation',
        isActive: true,
        suspendedUntil,
        description: `Automatic 7-day suspension: ${noShowCount} no-shows, ${lateCancelCount} late cancellations in last 30 days`,
      });
      return { suspended: true, suspendedUntil };
    }
  }

  return { suspended: false };
};

/**
 * Get penalty summary for a user.
 */
export const getUserPenaltySummary = async (userId) => {
  const thirtyDaysAgo = daysAgo(30);

  const [penalties, noShowCount, lateCancelCount, activeSuspension] = await Promise.all([
    Penalty.find({ userId }).sort({ createdAt: -1 }),
    Penalty.countDocuments({ userId, type: 'NoShow', createdAt: { $gte: thirtyDaysAgo } }),
    Penalty.countDocuments({ userId, type: 'LateCancellation', createdAt: { $gte: thirtyDaysAgo } }),
    Penalty.findOne({ userId, isActive: true, suspendedUntil: { $gt: new Date() } }),
  ]);

  return {
    penalties,
    activeSuspension: activeSuspension
      ? { suspendedUntil: activeSuspension.suspendedUntil }
      : null,
    noShowCount,
    lateCancelCount,
  };
};
