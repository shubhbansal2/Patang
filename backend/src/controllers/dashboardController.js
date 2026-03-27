import SportsBooking from '../models/SportsBooking.js';
import Booking from '../models/Booking.js';
import SubscriptionV2 from '../models/SubscriptionV2.js';
import Penalty from '../models/Penalty.js';
import AccessLog from '../models/AccessLog.js';
import Event from '../models/Event.js';

/**
 * GET /api/dashboard
 * Aggregated dashboard for the authenticated user.
 * Returns: user profile, active subscriptions (with QR pass), upcoming
 * facility bookings, fair-use score, penalty / suspension status,
 * recent gym/pool access logs, and upcoming campus events.
 */
export const getDashboard = async (req, res) => {
    try {
        // Guard: ensure auth middleware populated req.user
        if (!req.user || !req.user._id) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const userId = req.user._id;
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        // ── Rolling 72-hour window boundary (for fair-use calculation) ──
        const windowStart = new Date(now.getTime() - 72 * 60 * 60 * 1000);

        // ── Run all queries in parallel ──────────────────────────────────
        const [
            subscriptions,
            sportsBookings,
            v1Bookings,
            activeSportsCount,
            activeV1Count,
            penalties,
            recentAccessLogs,
            upcomingEvents
        ] = await Promise.all([
            // 1. Active / pending subscriptions (Gym & Swimming Pool)
            SubscriptionV2.find({
                userId,
                status: { $in: ['Pending', 'Approved'] }
            })
                .select('facilityType plan status startDate endDate qrCode passId createdAt slotId')
                .populate('slotId', 'startTime endTime')
                .sort({ createdAt: -1 })
                .maxTimeMS(5000)
                .lean(),

            // 2a. Upcoming sports-facility bookings (v2 model)
            SportsBooking.find({
                user: userId,
                bookingDate: { $gte: startOfToday },
                status: { $in: ['confirmed', 'group_pending'] }
            })
                .populate('facility', 'name location sportType facilityType capacity')
                .populate('slot', 'capacity minPlayersRequired')
                .sort({ slotStartAt: 1 })
                .maxTimeMS(5000)
                .limit(10)
                .lean(),

            // 2b. Upcoming bookings (v1 model)
            Booking.find({
                userId,
                slotDate: { $gte: startOfToday },
                status: { $in: ['Confirmed', 'Provisioned'] }
            })
                .populate('facilityId', 'name location sportType facilityType')
                .sort({ slotDate: 1 })
                .maxTimeMS(5000)
                .limit(10)
                .lean(),

            // 3a. Fair-use count — active v2 bookings in 72h window
            SportsBooking.countDocuments({
                user: userId,
                slotStartAt: { $gte: windowStart },
                slotEndAt: { $gte: now },
                status: { $in: ['confirmed', 'group_pending'] }
            }),

            // 3b. Fair-use count — active v1 bookings in 72h window
            Booking.countDocuments({
                userId,
                slotDate: { $gte: windowStart },
                status: { $in: ['Confirmed', 'Provisioned'] }
            }),

            // 4. Active penalties
            Penalty.find({ userId, isActive: true })
                .select('type description suspendedUntil createdAt')
                .sort({ createdAt: -1 })
                .maxTimeMS(5000)
                .lean(),

            // 5. Recent gym/pool access logs
            AccessLog.find({ user: userId })
                .select('facilityType action scannedAt')
                .sort({ scannedAt: -1 })
                .limit(5)
                .maxTimeMS(5000)
                .lean(),

            // 6. Upcoming approved campus events
            Event.find({
                status: 'Approved',
                startTime: { $gte: now }
            })
                .select('title category startTime endTime venue organizingClub registrationLink posterUrl')
                .sort({ startTime: 1 })
                .limit(5)
                .maxTimeMS(5000)
                .lean()
        ]);

        // ── Normalize upcoming bookings into a unified shape ─────────────
        const upcomingBookings = [
            ...sportsBookings.map(b => ({
                _id: b._id,
                facilityName: b.facility?.name ?? null,
                facilityLocation: b.facility?.location ?? null,
                sportType: b.facility?.sportType ?? null,
                slotStart: b.slotStartAt,
                slotEnd: b.slotEndAt,
                status: b.status,
                isGroupBooking: b.isGroupBooking,
                participantCount: typeof b.participantCount === 'number'
                    ? b.participantCount
                    : Math.max(1, b.participants?.length || 1),
                capacity: b.slot?.capacity ?? b.facility?.capacity ?? null,
                minPlayersRequired: b.slot?.minPlayersRequired ?? 1,
                source: 'v2'
            })),
            ...v1Bookings.map(b => ({
                _id: b._id,
                facilityName: b.facilityId?.name ?? null,
                facilityLocation: b.facilityId?.location ?? null,
                sportType: b.facilityId?.sportType ?? null,
                slotStart: b.slotDate,
                slotEnd: null, // v1 bookings don't store end time directly
                status: b.status,
                isGroupBooking: b.isGroupBooking,
                source: 'v1'
            }))
        ].sort((a, b) => new Date(a.slotStart) - new Date(b.slotStart));

        // ── Fair-use score derivation ────────────────────────────────────
        const activeBookingCount = activeSportsCount + activeV1Count;
        const activePenaltyCount = penalties.length;

        let score, message;
        if (activeBookingCount === 0 && activePenaltyCount === 0) {
            score = 'High';
            message = 'No active penalties. You have full access to all facilities booking. Keep it up!';
        } else if (activeBookingCount <= 1 && activePenaltyCount === 0) {
            score = 'High';
            message = `You have ${activeBookingCount} active booking and no penalties. Good standing.`;
        } else if (activeBookingCount >= 2 && activePenaltyCount === 0) {
            score = 'Medium';
            message = 'You have reached the maximum active bookings allowed in the 72-hour window.';
        } else if (activePenaltyCount >= 1 && activePenaltyCount <= 2) {
            score = 'Medium';
            message = `You have ${activePenaltyCount} active penalty${activePenaltyCount > 1 ? 'ies' : ''}. Continued violations may lead to suspension.`;
        } else {
            score = 'Low';
            message = 'Multiple active penalties detected. Your booking privileges may be restricted.';
        }

        // ── Suspension check ─────────────────────────────────────────────
        const suspensionPenalty = penalties.find(
            p => p.suspendedUntil && new Date(p.suspendedUntil) > now
        );

        // ── Build the user profile object (strip sensitive fields) ───────
        const userProfile = {
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            roles: req.user.roles,
            captainOf: req.user.captainOf,
            profileDetails: req.user.profileDetails ?? {}
        };

        // ── Assemble response ────────────────────────────────────────────
        res.set('Cache-Control', 'private, max-age=30');
        return res.status(200).json({
            success: true,
            data: {
                user: userProfile,

                subscriptions,

                upcomingBookings,

                fairUse: {
                    activeBookingCount,
                    maxAllowed: 2,
                    windowHours: 72,
                    score,
                    message
                },

                penalties: {
                    activePenalties: penalties,
                    totalActiveCount: activePenaltyCount,
                    isSuspended: !!suspensionPenalty,
                    suspendedUntil: suspensionPenalty?.suspendedUntil ?? null
                },

                recentAccessLogs,

                upcomingEvents
            }
        });
    } catch (error) {
        console.error('[Dashboard] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to load dashboard data',
            error: error.message
        });
    }
};
