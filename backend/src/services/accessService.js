import mongoose from 'mongoose';
import AccessLog from '../models/AccessLog.js';
import Facility from '../models/Facility.js';

const SUBSCRIPTION_TO_FACILITY = {
    Gym: 'gym',
    SwimmingPool: 'swimming'
};

const FACILITY_TO_SUBSCRIPTION = {
    gym: 'Gym',
    swimming: 'SwimmingPool'
};

export const normalizeFacilityType = (facilityType) => {
    if (!facilityType) return null;
    return SUBSCRIPTION_TO_FACILITY[facilityType] || facilityType;
};

export const normalizeSubscriptionType = (facilityType) => {
    if (!facilityType) return null;
    return FACILITY_TO_SUBSCRIPTION[facilityType] || facilityType;
};

export const getScopedSubscriptionTypes = (roles = [], requestedType = null) => {
    const requestedTypes = requestedType ? [requestedType] : ['Gym', 'SwimmingPool'];

    if (roles.includes('admin') || roles.includes('executive') || roles.includes('caretaker')) {
        return requestedTypes;
    }

    const allowedTypes = [];

    if (roles.includes('gym_admin')) {
        allowedTypes.push('Gym');
    }

    if (roles.includes('swim_admin')) {
        allowedTypes.push('SwimmingPool');
    }

    return requestedType
        ? allowedTypes.filter((type) => type === requestedType)
        : allowedTypes;
};

export const parseSubscriptionScanPayload = ({ passId, qrPayload }) => {
    if (passId) {
        return { passId };
    }

    if (!qrPayload) {
        return null;
    }

    if (typeof qrPayload === 'object' && qrPayload.passId) {
        return { passId: qrPayload.passId, userId: qrPayload.userId || null };
    }

    if (typeof qrPayload === 'string') {
        try {
            const parsed = JSON.parse(qrPayload);
            if (parsed.passId) {
                return { passId: parsed.passId, userId: parsed.userId || null };
            }
        } catch {
            return { passId: qrPayload };
        }
    }

    return null;
};

export const getLatestAccessAction = async (userId, facilityType) => {
    return AccessLog.findOne({
        user: userId,
        facilityType
    }).sort({ scannedAt: -1 });
};

export const getFacilityOccupancySummary = async (facilityType) => {
    const subscriptionType = normalizeSubscriptionType(facilityType);
    const normalizedFacilityType = normalizeFacilityType(subscriptionType);

    const [facility] = await Promise.all([
        Facility.findOne({ facilityType: normalizedFacilityType }).sort({ createdAt: 1 })
    ]);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const occupancy = await AccessLog.aggregate([
        {
            $match: {
                facilityType: { $in: [subscriptionType, normalizedFacilityType] },
                scannedAt: { $gte: startOfDay }
            }
        },
        {
            $sort: {
                user: 1,
                scannedAt: -1
            }
        },
        {
            $group: {
                _id: '$user',
                lastAction: { $first: '$action' }
            }
        },
        {
            $match: {
                lastAction: 'entry'
            }
        },
        {
            $count: 'occupied'
        }
    ]);

    const occupiedSlots = occupancy[0]?.occupied || 0;
    const totalSlots = facility?.capacity || facility?.metadata?.capacity || null;

    return {
        facilityType: subscriptionType,
        totalSlots,
        occupiedSlots,
        availableSlots: typeof totalSlots === 'number' ? Math.max(totalSlots - occupiedSlots, 0) : null
    };
};

export const createAccessLog = async ({ userId, subscriptionId, facilityType, action, scannedBy }) => {
    return AccessLog.create({
        user: new mongoose.Types.ObjectId(userId),
        subscription: new mongoose.Types.ObjectId(subscriptionId),
        facilityType,
        action,
        scannedBy: new mongoose.Types.ObjectId(scannedBy)
    });
};
