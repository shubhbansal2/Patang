import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import SubscriptionV2 from '../models/SubscriptionV2.js';
import { addDays } from '../utils/dateUtils.js';

const PLAN_DURATIONS = {
    Monthly: 30,
    Semesterly: 180,
    Yearly: 365
};

/**
 * Generate a unique pass ID for a subscription.
 * Format: GYM-YYYY-NNN or POOL-YYYY-NNN
 */
export const generatePassId = async (facilityType) => {
    const prefix = facilityType === 'Gym' ? 'GYM' : 'POOL';
    const year = new Date().getFullYear();
    
    // Count existing passes for this year and type as a baseline
    const count = await SubscriptionV2.countDocuments({
        facilityType,
        passId: { $regex: `^${prefix}-${year}-` }
    });

    let seqBase = count + 1;
    let passId = '';
    let isUnique = false;

    // Loop to ensure the generated passId genuinely doesn't exist yet
    while (!isUnique) {
        const seq = String(seqBase).padStart(3, '0');
        passId = `${prefix}-${year}-${seq}`;
        
        const existing = await SubscriptionV2.findOne({ passId });
        if (!existing) {
            isUnique = true;
        } else {
            seqBase++;
        }
    }

    return passId;
};

/**
 * Calculate end date based on plan duration.
 */
export const calculateEndDate = (startDate, plan) => {
    const days = PLAN_DURATIONS[plan];
    if (!days) throw new Error(`Invalid plan: ${plan}`);
    return addDays(startDate, days);
};

/**
 * Generate a QR code image (data URL) containing passId and userId.
 */
export const generateQRCode = async (passId, userId) => {
    const payload = JSON.stringify({ passId, userId: String(userId) });
    const qrDataUrl = await QRCode.toDataURL(payload, {
        color: { dark: '#000000', light: '#FFFFFF' }
    });
    return qrDataUrl;
};
