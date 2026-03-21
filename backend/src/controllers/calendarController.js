import Event from '../models/Event.js';
import SportsBooking from '../models/SportsBooking.js';
import Booking from '../models/Booking.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

// ── Helper: group events by date key (YYYY-MM-DD) ───────────────────────────

const groupByDate = (events) => {
    const map = {};
    for (const e of events) {
        const key = new Date(e.startTime).toISOString().slice(0, 10);
        if (!map[key]) map[key] = [];
        map[key].push(e);
    }
    return map;
};

/**
 * GET /api/calendar?month=2026-03&category=&club=
 *
 * Aggregated calendar page endpoint.
 * Returns:
 *   - events grouped by date (for calendar grid rendering)
 *   - all events flat list for the selected month
 *   - category breakdown (counts per category)
 *   - user's own bookings for the month (to overlay personal schedule)
 *   - upcoming highlights (next 5 events from today)
 */
export const getCalendarPage = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const userId = req.user._id;
        const { month, category, club } = req.query;
        const now = new Date();

        // ── Determine month boundaries ───────────────────────────────
        let year, mon;
        if (month) {
            // Expected format: YYYY-MM
            const parts = month.split('-');
            year = parseInt(parts[0]);
            mon = parseInt(parts[1]) - 1; // 0-indexed
        } else {
            year = now.getFullYear();
            mon = now.getMonth();
        }

        const monthStart = new Date(year, mon, 1);
        const monthEnd = new Date(year, mon + 1, 0, 23, 59, 59, 999);

        // ── Build event query ────────────────────────────────────────
        const eventQuery = {
            status: 'Approved',
            startTime: { $gte: monthStart, $lte: monthEnd }
        };
        if (category) eventQuery.category = category;
        if (club) eventQuery.organizingClub = { $regex: club, $options: 'i' };

        // ── Run all queries in parallel ──────────────────────────────
        const [events, upcomingEvents, categoryAgg, userSportsBookings, userV1Bookings] = await Promise.all([
            // All approved events for the month
            Event.find(eventQuery)
                .populate('createdBy', 'name')
                .select('title description category startTime endTime venue organizingClub registrationLink posterUrl createdBy')
                .sort({ startTime: 1 })
                .maxTimeMS(5000)
                .lean(),

            // Next 5 upcoming events from today (regardless of month filter)
            Event.find({
                status: 'Approved',
                startTime: { $gte: now }
            })
                .select('title category startTime endTime venue organizingClub')
                .sort({ startTime: 1 })
                .limit(5)
                .maxTimeMS(5000)
                .lean(),

            // Category breakdown for the month
            Event.aggregate([
                {
                    $match: {
                        status: 'Approved',
                        startTime: { $gte: monthStart, $lte: monthEnd }
                    }
                },
                {
                    $group: {
                        _id: '$category',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]),

            // User's own sports bookings for the month (overlay on calendar)
            SportsBooking.find({
                user: userId,
                slotStartAt: { $gte: monthStart, $lte: monthEnd },
                status: { $in: ['confirmed', 'group_pending', 'completed'] }
            })
                .populate('facility', 'name sportType')
                .select('facility slotStartAt slotEndAt status')
                .sort({ slotStartAt: 1 })
                .maxTimeMS(5000)
                .lean(),

            // User's v1 bookings for the month
            Booking.find({
                userId,
                slotDate: { $gte: monthStart, $lte: monthEnd },
                status: { $in: ['Confirmed', 'Provisioned', 'Attended'] }
            })
                .populate('facilityId', 'name sportType')
                .populate('slotId', 'startTime endTime')
                .select('facilityId slotId slotDate status')
                .sort({ slotDate: 1 })
                .maxTimeMS(5000)
                .lean()
        ]);

        // ── Format events for calendar ───────────────────────────────
        const formattedEvents = events.map(e => ({
            _id: e._id,
            title: e.title,
            description: e.description,
            category: e.category,
            startTime: e.startTime,
            endTime: e.endTime,
            venue: e.venue,
            organizingClub: e.organizingClub,
            registrationLink: e.registrationLink,
            posterUrl: e.posterUrl,
            createdBy: e.createdBy?.name || null
        }));

        // ── Group events by date ─────────────────────────────────────
        const eventsByDate = groupByDate(formattedEvents);

        // ── Build personal schedule overlay ──────────────────────────
        const personalBookings = [
            ...userSportsBookings.map(b => ({
                _id: b._id,
                title: b.facility?.name || 'Booking',
                type: 'sports_booking',
                sportType: b.facility?.sportType || null,
                startTime: b.slotStartAt,
                endTime: b.slotEndAt,
                status: b.status,
                date: new Date(b.slotStartAt).toISOString().slice(0, 10)
            })),
            ...userV1Bookings.map(b => ({
                _id: b._id,
                title: b.facilityId?.name || 'Booking',
                type: 'sports_booking',
                sportType: b.facilityId?.sportType || null,
                startTime: b.slotId?.startTime || b.slotDate,
                endTime: b.slotId?.endTime || null,
                status: b.status,
                date: new Date(b.slotDate).toISOString().slice(0, 10)
            }))
        ];

        // ── Category breakdown ───────────────────────────────────────
        const categories = categoryAgg.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});
        const totalEvents = formattedEvents.length;

        // ── Available months for navigation (current ± 6 months) ─────
        const availableMonths = [];
        for (let i = -3; i <= 6; i++) {
            const d = new Date(year, mon + i, 1);
            availableMonths.push({
                value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
            });
        }

        // ── Calendar grid metadata ───────────────────────────────────
        const daysInMonth = new Date(year, mon + 1, 0).getDate();
        const firstDayOfWeek = monthStart.getDay(); // 0=Sun

        res.set('Cache-Control', 'private, max-age=60');
        return successResponse(res, 200, {
            month: {
                year,
                month: mon + 1,
                label: monthStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
                daysInMonth,
                firstDayOfWeek
            },
            availableMonths,
            totalEvents,
            categories,
            eventsByDate,
            events: formattedEvents,
            upcomingHighlights: upcomingEvents,
            personalBookings
        });
    } catch (error) {
        console.error('[Calendar] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};
