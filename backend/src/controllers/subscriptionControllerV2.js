import mongoose from 'mongoose';
import SubscriptionV2 from '../models/SubscriptionV2.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { generatePassId, calculateEndDate, generateQRCode } from '../services/subscriptionService.js';
import {
    createAccessLog,
    getFacilityOccupancySummary,
    getLatestAccessAction,
    getScopedSubscriptionTypes,
    normalizeSubscriptionType,
    parseSubscriptionScanPayload
} from '../services/accessService.js';

/**
 * POST /api/v2/subscriptions/apply
 * Submit a new subscription application (multipart/form-data).
 */
export const apply = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { facilityType, plan, slotId } = req.body;
        const userId = req.user._id;

        // Check for existing active subscription
        const existing = await SubscriptionV2.findOne({
            userId,
            facilityType,
            status: { $in: ['Pending', 'Approved'] }
        }).session(session);

        if (existing) {
            await session.abortTransaction();
            session.endSession();
            return errorResponse(res, 409, 'ACTIVE_SUBSCRIPTION_EXISTS', 'You already have an active or pending subscription for this facility');
        }

        // Import SportsSlot (inline to avoid circular dependencies if any)
        const SportsSlot = (await import('../models/SportsSlot.js')).default;
        
        // 1. Get the slot
        const slot = await SportsSlot.findById(slotId).session(session);
        if (!slot) {
            await session.abortTransaction();
            session.endSession();
            return errorResponse(res, 404, 'NOT_FOUND', 'Selected slot not found');
        }

        // 2. Count active and pending subscriptions in this specific slot
        const activeInSlot = await SubscriptionV2.countDocuments({
            slotId,
            status: { $in: ['Pending', 'Approved'] }
        }).session(session);

        // 3. Atomicity check
        if (activeInSlot >= (slot.capacity || 1)) {
            await session.abortTransaction();
            session.endSession();
            return errorResponse(res, 400, 'SLOT_FULL', 'This time slot is full. No more subscriptions allowed.');
        }

        // Build file URLs from multer
        const medicalCertUrl = req.files.medicalCert[0].path.replace(/\\/g, '/');
        const paymentReceiptUrl = req.files.paymentReceipt[0].path.replace(/\\/g, '/');

        // Create the subscription within the transaction
        const [subscription] = await SubscriptionV2.create([{
            userId,
            facilityType,
            plan,
            slotId,
            medicalCertUrl,
            paymentReceiptUrl
        }], { session });

        await session.commitTransaction();
        session.endSession();

        return successResponse(res, 201, {
            _id: subscription._id,
            facilityType: subscription.facilityType,
            plan: subscription.plan,
            status: subscription.status
        }, 'Subscription application submitted');
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * GET /api/v2/subscriptions/my
 * View current user's subscriptions.
 */
export const getMySubscriptions = async (req, res) => {
    try {
        const subscriptions = await SubscriptionV2.find({ userId: req.user._id })
            .sort({ createdAt: -1 });

        return successResponse(res, 200, subscriptions);
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * GET /api/v2/admin/subscriptions
 * List subscription applications for admin review (paginated).
 */
export const listForAdmin = async (req, res) => {
    try {
        const { status = 'Pending', facilityType, page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const scopedTypes = getScopedSubscriptionTypes(req.user.roles, facilityType);

        if (!scopedTypes.length) {
            return errorResponse(res, 403, 'FORBIDDEN', 'You are not allowed to view subscriptions for this facility');
        }

        const query = {};
        if (status) query.status = status;
        query.facilityType = scopedTypes.length === 1 ? scopedTypes[0] : { $in: scopedTypes };

        const [subscriptions, total, occupancy] = await Promise.all([
            SubscriptionV2.find(query)
                .populate('userId', 'name email profileDetails')
                .populate('slotId', 'startTime endTime capacity')
                .sort({ createdAt: 1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum),
            SubscriptionV2.countDocuments(query),
            Promise.all(scopedTypes.map((type) => getFacilityOccupancySummary(type)))
        ]);

        return successResponse(res, 200, {
            subscriptions,
            occupancy,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * PATCH /api/v2/admin/subscriptions/:subscriptionId
 * Approve or reject a subscription.
 */
export const adminReview = async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        const { action, rejectionReason, comments } = req.body;

        const subscription = await SubscriptionV2.findById(subscriptionId);
        if (!subscription) {
            return errorResponse(res, 404, 'NOT_FOUND', 'Subscription not found');
        }

        const scopedTypes = getScopedSubscriptionTypes(req.user.roles, subscription.facilityType);
        if (!scopedTypes.length) {
            return errorResponse(res, 403, 'FORBIDDEN', 'You are not allowed to review this subscription');
        }

        if (subscription.status !== 'Pending' && action !== 'revoke') {
            return errorResponse(res, 400, 'INVALID_STATE', 'This subscription is not in a valid state for this action');
        }

        if (action === 'approve') {
            const startDate = new Date();
            const endDate = calculateEndDate(startDate, subscription.plan);
            const passId = await generatePassId(subscription.facilityType);
            const qrCode = await generateQRCode(passId, subscription.userId);

            subscription.status = 'Approved';
            subscription.startDate = startDate;
            subscription.endDate = endDate;
            subscription.passId = passId;
            subscription.qrCode = qrCode;
            subscription.reviewedBy = req.user._id;
            subscription.reviewedAt = new Date();
            subscription.reviewComments = comments || null;
            await subscription.save();

            return successResponse(res, 200, {
                status: 'Approved',
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                passId: subscription.passId,
                comments: subscription.reviewComments
            }, 'Subscription approved');
        } else if (action === 'reject' || action === 'revoke') {
            subscription.status = action === 'revoke' ? 'Revoked' : 'Rejected';
            subscription.rejectionReason = rejectionReason || comments;
            subscription.reviewedBy = req.user._id;
            subscription.reviewedAt = new Date();
            subscription.reviewComments = comments || rejectionReason || null;
            await subscription.save();

            return successResponse(res, 200, {
                status: subscription.status,
                rejectionReason: subscription.rejectionReason,
                comments: subscription.reviewComments
            }, `Subscription ${action === 'revoke' ? 'revoked' : 'rejected'}`);
        }

        return errorResponse(res, 400, 'VALIDATION_ERROR', 'action must be approve, reject, or revoke');
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * POST /api/v2/subscriptions/verify-entry
 * Caretaker scans QR to verify Gym/Pool entry.
 */
export const verifyEntry = async (req, res) => {
    try {
        const payload = parseSubscriptionScanPayload(req.body);
        if (!payload?.passId) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'passId or qrPayload is required');
        }

        const subscription = await SubscriptionV2.findOne({ passId: payload.passId })
            .populate('userId', 'name email');

        if (!subscription) {
            return errorResponse(res, 404, 'PASS_NOT_FOUND', 'Invalid pass ID');
        }

        const scopedTypes = getScopedSubscriptionTypes(req.user.roles, subscription.facilityType);
        if (!scopedTypes.length) {
            return errorResponse(res, 403, 'FORBIDDEN', 'You are not allowed to verify this facility access');
        }

        if (subscription.status !== 'Approved') {
            return errorResponse(res, 400, 'SUBSCRIPTION_NOT_ACTIVE', 'Subscription is not active');
        }

        if (subscription.startDate && new Date() < subscription.startDate) {
            return errorResponse(res, 400, 'SUBSCRIPTION_NOT_ACTIVE', 'Subscription has not started yet');
        }

        if (subscription.endDate && new Date() > subscription.endDate) {
            return errorResponse(res, 400, 'SUBSCRIPTION_EXPIRED', 'Subscription has expired');
        }

        const requestedAction = req.body.action;
        let action = requestedAction;

        if (action && !['entry', 'exit'].includes(action)) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'action must be entry or exit');
        }

        if (!action) {
            const lastAccess = await getLatestAccessAction(subscription.userId._id, subscription.facilityType);
            action = lastAccess?.action === 'entry' ? 'exit' : 'entry';
        }

        const accessLog = await createAccessLog({
            userId: subscription.userId._id,
            subscriptionId: subscription._id,
            facilityType: normalizeSubscriptionType(subscription.facilityType),
            action,
            scannedBy: req.user._id
        });

        const occupancy = await getFacilityOccupancySummary(subscription.facilityType);

        return successResponse(res, 200, {
            userName: subscription.userId?.name,
            userEmail: subscription.userId?.email,
            facilityType: subscription.facilityType,
            validUntil: subscription.endDate,
            action,
            scannedAt: accessLog.scannedAt,
            occupancy
        }, `${action === 'entry' ? 'Entry' : 'Exit'} verified`);
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

export const getOccupancySummary = async (req, res) => {
    try {
        const { facilityType } = req.query;
        const scopedTypes = getScopedSubscriptionTypes(req.user.roles, facilityType);

        if (!scopedTypes.length) {
            return errorResponse(res, 403, 'FORBIDDEN', 'You are not allowed to view occupancy for this facility');
        }

        const occupancy = await Promise.all(scopedTypes.map((type) => getFacilityOccupancySummary(type)));

        return successResponse(res, 200, { occupancy });
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * GET /api/v2/admin/subscriptions/slot-occupancy?facilityType=Gym
 * Returns per-slot subscription counts for the current month.
 */
export const getSlotOccupancy = async (req, res) => {
    try {
        const { facilityType } = req.query;
        const scopedTypes = getScopedSubscriptionTypes(req.user.roles, facilityType);

        if (!scopedTypes.length) {
            return errorResponse(res, 403, 'FORBIDDEN', 'Not authorized for this facility');
        }

        // Current month boundaries
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // Count active/pending subscriptions per slot for each scoped facility type
        const results = await SubscriptionV2.aggregate([
            {
                $match: {
                    facilityType: { $in: scopedTypes },
                    slotId: { $ne: null },
                    status: { $in: ['Pending', 'Approved'] },
                    createdAt: { $lte: monthEnd },
                    $or: [
                        { endDate: null },
                        { endDate: { $gte: monthStart } }
                    ]
                }
            },
            {
                $group: {
                    _id: '$slotId',
                    activeCount: { $sum: 1 }
                }
            }
        ]);

        // Convert to a map: slotId -> count
        const occupancyMap = {};
        for (const row of results) {
            occupancyMap[row._id.toString()] = row.activeCount;
        }

        return successResponse(res, 200, {
            month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
            slotOccupancy: occupancyMap
        });
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

