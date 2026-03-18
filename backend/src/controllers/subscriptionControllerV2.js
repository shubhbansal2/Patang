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
    try {
        const { facilityType, plan } = req.body;
        const userId = req.user._id;

        // Check for existing active subscription
        const existing = await SubscriptionV2.findOne({
            userId,
            facilityType,
            status: { $in: ['Pending', 'Approved'] }
        });

        if (existing) {
            return errorResponse(res, 409, 'ACTIVE_SUBSCRIPTION_EXISTS', 'You already have an active or pending subscription for this facility');
        }

        // Build file URLs from multer
        const medicalCertUrl = req.files.medicalCert[0].path.replace(/\\/g, '/');
        const paymentReceiptUrl = req.files.paymentReceipt[0].path.replace(/\\/g, '/');

        const subscription = await SubscriptionV2.create({
            userId,
            facilityType,
            plan,
            medicalCertUrl,
            paymentReceiptUrl
        });

        return successResponse(res, 201, {
            _id: subscription._id,
            facilityType: subscription.facilityType,
            plan: subscription.plan,
            status: subscription.status
        }, 'Subscription application submitted');
    } catch (error) {
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
                .populate('userId', 'name email')
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

        if (subscription.status !== 'Pending') {
            return errorResponse(res, 400, 'ALREADY_REVIEWED', 'This subscription has already been reviewed');
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
        } else if (action === 'reject') {
            subscription.status = 'Rejected';
            subscription.rejectionReason = rejectionReason || comments;
            subscription.reviewedBy = req.user._id;
            subscription.reviewedAt = new Date();
            subscription.reviewComments = comments || rejectionReason || null;
            await subscription.save();

            return successResponse(res, 200, {
                status: 'Rejected',
                rejectionReason: subscription.rejectionReason,
                comments: subscription.reviewComments
            }, 'Subscription rejected');
        }

        return errorResponse(res, 400, 'VALIDATION_ERROR', 'action must be approve or reject');
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
