import SportsBooking from '../models/SportsBooking.js';
import Booking from '../models/Booking.js';
import SubscriptionV2 from '../models/SubscriptionV2.js';
import AccessLog from '../models/AccessLog.js';
import Penalty from '../models/Penalty.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

// ═════════════════════════════════════════════════════════════════════════════
// 1. SPORTS FACILITIES HISTORY
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/history/sports?facility=&status=&startDate=&endDate=&page=1&limit=5
 *
 * Paginated sports booking history with sidebar data:
 * - records: booking history table (Date, Activity Details, Slot Time, Status)
 * - recentPenalties: last 5 active penalties
 * - monthlyStats: attended vs missed count for the current month
 * - fairUseScore: current standing
 * - pagination: page, limit, total, pages
 */
export const getSportsHistory = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const userId = req.user._id;
        const { facility, status, startDate, endDate, page = 1, limit = 5 } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 5));
        const now = new Date();

        // ── Build query for v2 sports bookings ───────────────────────
        const sportsQuery = { user: userId };
        if (facility) sportsQuery.facility = facility;
        if (status) {
            sportsQuery.status = status.toLowerCase();
        }
        if (startDate || endDate) {
            sportsQuery.slotStartAt = {};
            if (startDate) sportsQuery.slotStartAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                sportsQuery.slotStartAt.$lte = end;
            }
        }

        // ── Build query for v1 bookings ──────────────────────────────
        const v1Query = { userId };
        if (facility) v1Query.facilityId = facility;
        if (status) {
            // Map frontend status labels to v1 enum values
            const statusMap = {
                attended: 'Attended',
                confirmed: 'Confirmed',
                cancelled: 'Cancelled',
                no_show: 'NoShow',
                noshow: 'NoShow',
                latecancelled: 'LateCancelled'
            };
            v1Query.status = statusMap[status.toLowerCase()] || status;
        }
        if (startDate || endDate) {
            v1Query.slotDate = {};
            if (startDate) v1Query.slotDate.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                v1Query.slotDate.$lte = end;
            }
        }

        // ── Month boundaries for monthly stats ───────────────────────
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // ── Run all queries in parallel ──────────────────────────────
        const [
            sportsBookings,
            sportsTotal,
            v1Bookings,
            v1Total,
            recentPenalties,
            monthAttended,
            monthMissed,
            totalActivePenalties
        ] = await Promise.all([
            SportsBooking.find(sportsQuery)
                .populate('facility', 'name sportType location')
                .sort({ slotStartAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .maxTimeMS(5000)
                .lean(),

            SportsBooking.countDocuments(sportsQuery),

            Booking.find(v1Query)
                .populate('facilityId', 'name sportType location')
                .populate('slotId', 'startTime endTime')
                .sort({ slotDate: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .maxTimeMS(5000)
                .lean(),

            Booking.countDocuments(v1Query),

            // Recent penalties (sidebar)
            Penalty.find({ userId, isActive: true })
                .select('type description suspendedUntil bookingId createdAt')
                .populate('bookingId', 'facilityId slotDate')
                .sort({ createdAt: -1 })
                .limit(5)
                .maxTimeMS(5000)
                .lean(),

            // Monthly attended count (v2 + v1)
            Promise.all([
                SportsBooking.countDocuments({
                    user: userId,
                    status: 'completed',
                    slotStartAt: { $gte: monthStart, $lte: monthEnd }
                }),
                Booking.countDocuments({
                    userId,
                    status: 'Attended',
                    slotDate: { $gte: monthStart, $lte: monthEnd }
                })
            ]).then(([a, b]) => a + b),

            // Monthly missed count (no-show + late cancel)
            Promise.all([
                SportsBooking.countDocuments({
                    user: userId,
                    status: { $in: ['no_show', 'cancelled'] },
                    slotStartAt: { $gte: monthStart, $lte: monthEnd }
                }),
                Booking.countDocuments({
                    userId,
                    status: { $in: ['NoShow', 'LateCancelled'] },
                    slotDate: { $gte: monthStart, $lte: monthEnd }
                })
            ]).then(([a, b]) => a + b),

            // Total active penalty count for fair-use score
            Penalty.countDocuments({ userId, isActive: true })
        ]);

        // ── Merge and normalize records ──────────────────────────────
        const records = [
            ...sportsBookings.map(b => ({
                _id: b._id,
                date: b.slotStartAt,
                activityDetails: {
                    facilityName: b.facility?.name || 'Unknown',
                    sportType: b.facility?.sportType || null,
                    location: b.facility?.location || null
                },
                slotTime: {
                    start: b.slotStartAt,
                    end: b.slotEndAt,
                    type: 'Slot Booking'
                },
                status: b.status,
                attendanceStatus: b.attendanceStatus,
                isGroupBooking: b.isGroupBooking,
                source: 'v2'
            })),
            ...v1Bookings.map(b => ({
                _id: b._id,
                date: b.slotDate,
                activityDetails: {
                    facilityName: b.facilityId?.name || 'Unknown',
                    sportType: b.facilityId?.sportType || null,
                    location: b.facilityId?.location || null
                },
                slotTime: {
                    start: b.slotId?.startTime || b.slotDate,
                    end: b.slotId?.endTime || null,
                    type: 'Slot Booking'
                },
                status: b.status,
                isGroupBooking: b.isGroupBooking,
                source: 'v1'
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        // ── Fair-use score derivation ────────────────────────────────
        let fairUseScore, fairUseLabel;
        if (totalActivePenalties === 0) {
            fairUseScore = 'Good';
            fairUseLabel = 'No active penalties. Full access.';
        } else if (totalActivePenalties <= 2) {
            fairUseScore = 'Moderate';
            fairUseLabel = `${totalActivePenalties} active penalt${totalActivePenalties > 1 ? 'ies' : 'y'}. Be cautious.`;
        } else {
            fairUseScore = 'Poor';
            fairUseLabel = 'Multiple penalties. Booking privileges may be restricted.';
        }

        const totalRecords = sportsTotal + v1Total;

        res.set('Cache-Control', 'private, max-age=15');
        return successResponse(res, 200, {
            tab: 'sports',
            records,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalRecords,
                pages: Math.ceil(totalRecords / limitNum),
                showing: `${(pageNum - 1) * limitNum + 1}-${Math.min(pageNum * limitNum, totalRecords)} of ${totalRecords} records`
            },
            recentPenalties: recentPenalties.map(p => ({
                _id: p._id,
                type: p.type,
                description: p.description,
                createdAt: p.createdAt,
                suspendedUntil: p.suspendedUntil,
                consequence: p.suspendedUntil ? `${Math.ceil((new Date(p.suspendedUntil) - now) / (1000 * 60 * 60 * 24))} Day Ban` : p.type === 'LateCancellation' ? '50 INR Fine' : null
            })),
            monthlyStats: {
                attended: monthAttended,
                missed: monthMissed
            },
            fairUse: {
                score: fairUseScore,
                label: fairUseLabel
            }
        });
    } catch (error) {
        console.error('[History/Sports] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. GYM & SWIMMING HISTORY
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/history/gym-swimming?facilityType=&startDate=&endDate=&page=1&limit=5
 *
 * Paginated gym/swimming access history plus subscription timeline.
 */
export const getGymSwimmingHistory = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const userId = req.user._id;
        const { facilityType, startDate, endDate, page = 1, limit = 5 } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 5));

        // ── Access log query ─────────────────────────────────────────
        const logQuery = { user: userId };
        if (facilityType) {
            // Accept both enum formats
            logQuery.facilityType = { $in: [facilityType, facilityType === 'Gym' ? 'gym' : facilityType === 'SwimmingPool' ? 'swimming' : facilityType] };
        }
        if (startDate || endDate) {
            logQuery.scannedAt = {};
            if (startDate) logQuery.scannedAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                logQuery.scannedAt.$lte = end;
            }
        }

        const [accessLogs, logTotal, subscriptions] = await Promise.all([
            AccessLog.find(logQuery)
                .select('facilityType action scannedAt')
                .sort({ scannedAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .maxTimeMS(5000)
                .lean(),

            AccessLog.countDocuments(logQuery),

            // All subscriptions (current and past)
            SubscriptionV2.find({ userId })
                .select('facilityType plan status startDate endDate passId createdAt')
                .sort({ createdAt: -1 })
                .maxTimeMS(5000)
                .lean()
        ]);

        // Normalize records
        const records = accessLogs.map(log => ({
            _id: log._id,
            date: log.scannedAt,
            activityDetails: {
                facilityName: log.facilityType === 'gym' || log.facilityType === 'Gym' ? 'Weight Training' : 'Swimming',
                location: log.facilityType === 'gym' || log.facilityType === 'Gym' ? 'Main Sports Complex' : 'Olympic Pool',
                type: log.facilityType
            },
            slotTime: {
                checkIn: log.scannedAt,
                type: `Daily Check-${log.action === 'entry' ? 'In' : 'Out'}`
            },
            status: 'Recorded',
            action: log.action
        }));

        res.set('Cache-Control', 'private, max-age=15');
        return successResponse(res, 200, {
            tab: 'gym-swimming',
            records,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: logTotal,
                pages: Math.ceil(logTotal / limitNum),
                showing: logTotal > 0
                    ? `${(pageNum - 1) * limitNum + 1}-${Math.min(pageNum * limitNum, logTotal)} of ${logTotal} records`
                    : '0 records'
            },
            subscriptions: subscriptions.map(s => ({
                _id: s._id,
                facilityType: s.facilityType,
                plan: s.plan,
                status: s.status,
                startDate: s.startDate,
                endDate: s.endDate,
                passId: s.passId
            }))
        });
    } catch (error) {
        console.error('[History/GymSwimming] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. PENALTIES HISTORY
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/history/penalties?type=&isActive=&page=1&limit=5
 *
 * Paginated penalty history with filtering.
 */
export const getPenaltiesHistory = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const userId = req.user._id;
        const { type, isActive, page = 1, limit = 5 } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 5));
        const now = new Date();

        // ── Build penalty query ──────────────────────────────────────
        const penaltyQuery = { userId };
        if (type) penaltyQuery.type = type;
        if (isActive !== undefined) penaltyQuery.isActive = isActive === 'true';

        const [penalties, penaltyTotal, activePenaltyCount] = await Promise.all([
            Penalty.find(penaltyQuery)
                .populate({
                    path: 'bookingId',
                    select: 'facilityId slotDate slotId',
                    populate: [
                        { path: 'facilityId', select: 'name sportType location' },
                        { path: 'slotId', select: 'startTime endTime' }
                    ]
                })
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .maxTimeMS(5000)
                .lean(),

            Penalty.countDocuments(penaltyQuery),

            Penalty.countDocuments({ userId, isActive: true })
        ]);

        const records = penalties.map(p => ({
            _id: p._id,
            type: p.type,
            description: p.description,
            isActive: p.isActive,
            createdAt: p.createdAt,
            suspendedUntil: p.suspendedUntil,
            isSuspensionActive: p.suspendedUntil ? new Date(p.suspendedUntil) > now : false,
            consequence: p.suspendedUntil
                ? `${Math.max(0, Math.ceil((new Date(p.suspendedUntil) - now) / (1000 * 60 * 60 * 24)))} Day Ban`
                : p.type === 'LateCancellation' ? '50 INR Fine' : null,
            relatedBooking: p.bookingId ? {
                _id: p.bookingId._id,
                facilityName: p.bookingId.facilityId?.name || null,
                sportType: p.bookingId.facilityId?.sportType || null,
                location: p.bookingId.facilityId?.location || null,
                slotDate: p.bookingId.slotDate,
                slotTime: p.bookingId.slotId ? {
                    start: p.bookingId.slotId.startTime,
                    end: p.bookingId.slotId.endTime
                } : null
            } : null
        }));

        // Summary counts by type
        const [noShowCount, lateCancelCount, misuseCount] = await Promise.all([
            Penalty.countDocuments({ userId, type: 'NoShow' }),
            Penalty.countDocuments({ userId, type: 'LateCancellation' }),
            Penalty.countDocuments({ userId, type: 'Misuse' })
        ]);

        res.set('Cache-Control', 'private, max-age=15');
        return successResponse(res, 200, {
            tab: 'penalties',
            records,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: penaltyTotal,
                pages: Math.ceil(penaltyTotal / limitNum),
                showing: penaltyTotal > 0
                    ? `${(pageNum - 1) * limitNum + 1}-${Math.min(pageNum * limitNum, penaltyTotal)} of ${penaltyTotal} records`
                    : '0 records'
            },
            summary: {
                totalActive: activePenaltyCount,
                byType: {
                    noShow: noShowCount,
                    lateCancellation: lateCancelCount,
                    misuse: misuseCount
                }
            },
            disputeInfo: {
                canDispute: true,
                windowHours: 48,
                message: 'If you believe a penalty was applied in error, you can raise a dispute request within 48 hours.'
            }
        });
    } catch (error) {
        console.error('[History/Penalties] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};
