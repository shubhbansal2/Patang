import { v4 as uuidv4 } from 'uuid';
import { generateQRCode } from './qrService.js';
import { calculateEndDate } from '../utils/dateUtils.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);

/**
 * Generate a unique pass ID for a subscription.
 * Format: {FACILITY_TYPE}-{YEAR}-{SHORT_UUID}
 */
export const generatePassId = (facilityType) => {
  const year = dayjs.utc().year();
  const shortId = uuidv4().split('-')[0].toUpperCase();
  return `${facilityType.toUpperCase().replace('SWIMMINGPOOL', 'POOL')}-${year}-${shortId}`;
};

/**
 * Approve a subscription: set dates, generate pass ID and QR code.
 */
export const approveSubscription = async (subscription, reviewedBy) => {
  const startDate = new Date();
  const endDate = calculateEndDate(startDate, subscription.plan);
  const passId = generatePassId(subscription.facilityType);
  const qrCode = await generateQRCode({
    passId,
    userId: subscription.userId.toString(),
    facilityType: subscription.facilityType,
  });

  subscription.status = 'Approved';
  subscription.startDate = startDate;
  subscription.endDate = endDate;
  subscription.passId = passId;
  subscription.qrCode = qrCode;
  subscription.reviewedBy = reviewedBy;
  subscription.reviewedAt = new Date();

  await subscription.save();
  return subscription;
};

/**
 * Reject a subscription.
 */
export const rejectSubscription = async (subscription, reviewedBy, reason) => {
  subscription.status = 'Rejected';
  subscription.rejectionReason = reason;
  subscription.reviewedBy = reviewedBy;
  subscription.reviewedAt = new Date();

  await subscription.save();
  return subscription;
};
