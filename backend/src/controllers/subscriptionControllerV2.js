import mongoose from 'mongoose';
import SubscriptionV2 from '../models/SubscriptionV2.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { generatePassId, calculateEndDate, generateQRCode } from '../services/subscriptionService.js';
import { storeSubscriptionDocument, streamSubscriptionDocument } from '../services/fileStorageService.js';
import Facility from '../models/Facility.js';
import SportsSlot from '../models/SportsSlot.js';
import {
    createAccessLog,
    getFacilityOccupancySummary,
    getLatestAccessAction,
    getScopedSubscriptionTypes,
    normalizeSubscriptionType,
    parseSubscriptionScanPayload
} from '../services/accessService.js';
import { createNotification } from '../services/notificationService.js';

const getIstMinutes = (date = new Date()) => {
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const parts = formatter.formatToParts(date);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
    return (hour * 60) + minute;
};

const parseSlotMinutes = (value) => {
    if (!value || typeof value !== 'string') return null;
    const [hour, minute] = value.split(':').map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return (hour * 60) + minute;
};

const isWithinFacilitySlotWindow = async (facilityType, date = new Date()) => {
    const normalizedFacilityType = facilityType === 'Gym' ? 'gym' : facilityType === 'SwimmingPool' ? 'swimming' : facilityType;
    const facility = await Facility.findOne({ facilityType: normalizedFacilityType, isOperational: true }).select('_id');
    if (!facility) return false;

    const slots = await SportsSlot.find({ facility: facility._id, isActive: true }).select('startTime endTime').lean();
    if (!slots.length) return false;

    const nowMinutes = getIstMinutes(date);
    return slots.some((slot) => {
        const startMinutes = parseSlotMinutes(slot.startTime);
        const endMinutes = parseSlotMinutes(slot.endTime);
        return startMinutes !== null && endMinutes !== null && nowMinutes >= startMinutes && nowMinutes < endMinutes;
    });
};

/**
 * POST /api/v2/subscriptions/apply
 * Submit a new subscription application (multipart/form-data).
 */
export const apply = async (req, res) => {
    try {
        const { facilityType, plan } = req.body;
        const userId = req.user._id;

        const existing = await SubscriptionV2.findOne({
            userId,
            facilityType,
            status: { $in: ['Pending', 'Approved'] }
        });

        if (existing) {
            return errorResponse(res, 409, 'ACTIVE_SUBSCRIPTION_EXISTS', 'You already have an active or pending subscription for this facility');
        }

        const medicalCertUpload = await storeSubscriptionDocument({
            buffer: req.files.medicalCert[0].buffer,
            filename: req.files.medicalCert[0].originalname,
            mimeType: req.files.medicalCert[0].mimetype,
            ownerId: userId,
            facilityType,
            documentType: 'medicalCert',
        });
        const paymentReceiptUpload = await storeSubscriptionDocument({
            buffer: req.files.paymentReceipt[0].buffer,
            filename: req.files.paymentReceipt[0].originalname,
            mimeType: req.files.paymentReceipt[0].mimetype,
            ownerId: userId,
            facilityType,
            documentType: 'paymentReceipt',
        });

        const subscriptionId = new mongoose.Types.ObjectId();

        const subscription = await SubscriptionV2.create({
            _id: subscriptionId,
            userId,
            facilityType,
            plan,
            medicalCertUrl: `/api/v2/subscriptions/${subscriptionId}/documents/medicalCert`,
            medicalCertFileId: medicalCertUpload.fileId,
            paymentReceiptUrl: `/api/v2/subscriptions/${subscriptionId}/documents/paymentReceipt`,
            paymentReceiptFileId: paymentReceiptUpload.fileId
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
            .populate('slotId', 'startTime endTime')
            .sort({ createdAt: -1 });

        return successResponse(res, 200, subscriptions);
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * GET /api/v2/subscriptions/:subscriptionId/documents/:documentType
 * Stream a protected subscription document for the owner or scoped admins.
 */
export const getSubscriptionDocument = async (req, res) => {
    try {
        const { subscriptionId, documentType } = req.params;

        if (!['medicalCert', 'paymentReceipt'].includes(documentType)) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'documentType must be medicalCert or paymentReceipt');
        }

        const subscription = await SubscriptionV2.findById(subscriptionId);
        if (!subscription) {
            return errorResponse(res, 404, 'NOT_FOUND', 'Subscription not found');
        }

        const isOwner = String(subscription.userId) === String(req.user._id);
        if (!isOwner) {
            const scopedTypes = getScopedSubscriptionTypes(req.user.roles, subscription.facilityType);
            if (!scopedTypes.length && !req.user.roles?.includes('admin') && !req.user.roles?.includes('executive')) {
                return errorResponse(res, 403, 'FORBIDDEN', 'You are not allowed to view this document');
            }
        }

        const fileId = documentType === 'medicalCert'
            ? subscription.medicalCertFileId
            : subscription.paymentReceiptFileId;

        if (!fileId) {
            return errorResponse(res, 404, 'DOCUMENT_NOT_FOUND', 'Document file is missing');
        }

        const stream = await streamSubscriptionDocument({ fileId, res });
        if (!stream) {
            return errorResponse(res, 404, 'DOCUMENT_NOT_FOUND', 'Document file is missing');
        }

        stream.on('error', () => {
            if (!res.headersSent) {
                return errorResponse(res, 500, 'SERVER_ERROR', 'Failed to read document');
            }
            res.destroy();
        });

        stream.pipe(res);
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

            const isGym = subscription.facilityType.toLowerCase() === 'gym';
            const notifType = isGym ? 'gym_subscription_confirmed' : 'swimming_registration_confirmed';
            await createNotification(subscription.userId, {
                title: `${isGym ? 'Gym' : 'Swimming'} Subscription Approved`,
                message: `Your ${subscription.facilityType} subscription for the ${subscription.plan} plan has been approved. Valid until ${endDate.toDateString()}.`,
                type: notifType,
                relatedId: subscription._id,
                link: '/history'
            });

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
            .populate('userId', 'name email')
            .populate('slotId', 'startTime endTime');

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

        const withinFacilityWindow = await isWithinFacilitySlotWindow(subscription.facilityType);
        if (!withinFacilityWindow) {
            return errorResponse(
                res,
                400,
                'OUTSIDE_SLOT_WINDOW',
                `Pass can only be scanned during active ${subscription.facilityType} slot hours`
            );
        }

        const requestedAction = req.body.action;
        let action = requestedAction;

        if (action && !['entry', 'exit'].includes(action)) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'action must be entry or exit');
        }

        const lastAccess = await getLatestAccessAction(subscription.userId._id, subscription.facilityType);

        if (lastAccess) {
            const msSinceLastScan = new Date() - new Date(lastAccess.scannedAt);
            if (msSinceLastScan < 60000) {
                return errorResponse(res, 429, 'TOO_MANY_REQUESTS', 'Please wait 1 minute between scans.');
            }
        }

        if (!action) {
            action = lastAccess?.action === 'entry' ? 'exit' : 'entry';
        } else if (action === lastAccess?.action) {
            return errorResponse(res, 400, 'INVALID_STATE', `User is already marked as ${action === 'entry' ? 'Inside' : 'Outside'}.`);
        }

        if (action === 'entry' && subscription.slotId) {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            const [startHour, startMin] = subscription.slotId.startTime.split(':').map(Number);
            const [endHour, endMin] = subscription.slotId.endTime.split(':').map(Number);

            const slotStartMinutes = startHour * 60 + startMin;
            const slotEndMinutes = endHour * 60 + endMin;

            if (currentMinutes < slotStartMinutes - 15 || currentMinutes > slotEndMinutes) {
                return errorResponse(res, 403, 'OUTSIDE_SLOT_HOURS', `Invalid entry time. Your slot is from ${subscription.slotId.startTime} to ${subscription.slotId.endTime}.`);
            }
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
