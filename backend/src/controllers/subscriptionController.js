import Subscription from '../models/Subscription.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { approveSubscription, rejectSubscription } from '../services/subscriptionService.js';

/**
 * POST /api/subscriptions/apply
 * Submit a new subscription application.
 */
export const applySubscription = async (req, res) => {
  try {
    const userId = req.user._id;
    const { facilityType, plan } = req.body;

    // Validate files
    if (!req.files?.medicalCert?.[0]) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Medical certificate is required', 400);
    }
    if (!req.files?.paymentReceipt?.[0]) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Payment receipt is required', 400);
    }

    // Check no existing active subscription for same facility type
    const existing = await Subscription.findOne({
      userId,
      facilityType,
      status: { $in: ['Pending', 'Approved'] },
    });

    if (existing) {
      return errorResponse(res, 'ACTIVE_SUBSCRIPTION_EXISTS',
        'You already have an active or pending subscription for this facility', 409);
    }

    const medicalCertUrl = `/uploads/documents/${req.files.medicalCert[0].filename}`;
    const paymentReceiptUrl = `/uploads/documents/${req.files.paymentReceipt[0].filename}`;

    const subscription = await Subscription.create({
      userId,
      facilityType,
      plan,
      medicalCertUrl,
      paymentReceiptUrl,
    });

    return successResponse(res, {
      _id: subscription._id,
      facilityType: subscription.facilityType,
      plan: subscription.plan,
      status: subscription.status,
    }, 'Subscription application submitted', 201);
  } catch (error) {
    if (error.message === 'INVALID_FILE_TYPE') {
      return errorResponse(res, 'INVALID_FILE_TYPE', 'Only PDF, JPG, and PNG files are accepted', 400);
    }
    return errorResponse(res, 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * GET /api/subscriptions/my
 * View current user's subscriptions.
 */
export const getMySubscriptions = async (req, res) => {
  try {
    const userId = req.user._id;
    const subscriptions = await Subscription.find({ userId }).sort({ createdAt: -1 });
    return successResponse(res, subscriptions);
  } catch (error) {
    return errorResponse(res, 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * GET /api/admin/subscriptions
 * List subscription applications for admin review.
 */
export const listSubscriptions = async (req, res) => {
  try {
    const { status = 'Pending', facilityType, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (facilityType) filter.facilityType = facilityType;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Subscription.countDocuments(filter);

    const subscriptions = await Subscription.find(filter)
      .populate('userId', 'name email profileDetails')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return successResponse(res, {
      subscriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    return errorResponse(res, 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * PATCH /api/admin/subscriptions/:subscriptionId
 * Approve or reject a subscription application.
 */
export const reviewSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { action, rejectionReason } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return errorResponse(res, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found', 404);
    }

    if (subscription.status !== 'Pending') {
      return errorResponse(res, 'CANNOT_REVIEW', 'Only pending subscriptions can be reviewed', 400);
    }

    if (action === 'approve') {
      const updated = await approveSubscription(subscription, req.user._id);
      return successResponse(res, {
        status: updated.status,
        startDate: updated.startDate,
        endDate: updated.endDate,
        passId: updated.passId,
      }, 'Subscription approved');
    } else if (action === 'reject') {
      if (!rejectionReason) {
        return errorResponse(res, 'VALIDATION_ERROR', 'Rejection reason is required', 400);
      }
      const updated = await rejectSubscription(subscription, req.user._id, rejectionReason);
      return successResponse(res, {
        status: updated.status,
        rejectionReason: updated.rejectionReason,
      }, 'Subscription rejected');
    } else {
      return errorResponse(res, 'VALIDATION_ERROR', 'Action must be "approve" or "reject"', 400);
    }
  } catch (error) {
    return errorResponse(res, 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * POST /api/subscriptions/verify-entry
 * Caretaker scans QR to verify Gym/Pool entry.
 */
export const verifyEntry = async (req, res) => {
  try {
    const { passId } = req.body;

    if (!passId) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Pass ID is required', 400);
    }

    const subscription = await Subscription.findOne({ passId }).populate('userId', 'name email');
    if (!subscription) {
      return errorResponse(res, 'PASS_NOT_FOUND', 'Invalid pass ID', 404);
    }

    if (subscription.status !== 'Approved') {
      return errorResponse(res, 'SUBSCRIPTION_NOT_ACTIVE',
        'Subscription is not in active/approved status', 400);
    }

    const now = new Date();
    if (now > subscription.endDate) {
      return errorResponse(res, 'SUBSCRIPTION_EXPIRED', 'Subscription has expired', 400);
    }

    return successResponse(res, {
      userName: subscription.userId?.name || 'Unknown',
      facilityType: subscription.facilityType,
      validUntil: subscription.endDate,
    }, 'Entry verified');
  } catch (error) {
    return errorResponse(res, 'SERVER_ERROR', error.message, 500);
  }
};
