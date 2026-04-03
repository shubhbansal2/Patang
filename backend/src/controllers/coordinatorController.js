import Event from '../models/Event.js';
import Facility from '../models/Facility.js';
import FacilityBlock from '../models/FacilityBlock.js';
import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { createNotification } from '../services/notificationService.js';

// ── Available event categories & common organizing clubs ─────────────────────

const EVENT_CATEGORIES = ['Cultural', 'Technical', 'Sports', 'Notice', 'Other'];
const COMMON_CLUBS = [
    'Dramatics Club', 'Music Club', 'Dance Club', 'Film Club',
    'Literary Society', 'Quiz Club', 'Fine Arts Club', 'Photography Club',
    'Robotics Club', 'Programming Club', 'Electronics Club', 'Astronomy Club',
    'Adventure Club', 'NSS', 'NCC'
];

// ═════════════════════════════════════════════════════════════════════════════
// 1. EVENT MANAGEMENT — GET PAGE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/coordinator/events?status=&page=1&limit=10
 *
 * Returns coordinator's event management page data:
 * - own events list with status filtering & pagination
 * - stats: submitted, approved, rejected, pending counts
 * - dropdown options (categories, clubs)
 */
export const getEventManagementPage = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const userId = req.user._id;
        const { status, page = 1, limit = 10 } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));

        // Build query — always scoped to the coordinator's own events, and must not be completely in the past
        const eventQuery = { 
            createdBy: userId,
            endTime: { $gte: new Date() } // Do not show events that have already ended
        };
        if (status) eventQuery.status = status;

        const [events, total, statsCounts] = await Promise.all([
            Event.find(eventQuery)
                .select('title category status startTime endTime venue organizingClub rejectionReason changeRequestNote reviewedAt createdAt')
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .maxTimeMS(5000)
                .lean(),

            Event.countDocuments(eventQuery),

            // Aggregate status counts
            Event.aggregate([
                { $match: { createdBy: userId } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ])
        ]);

        // Build stats object
        const stats = { total: 0, Pending: 0, Approved: 0, Rejected: 0, ChangesRequested: 0, Cancelled: 0 };
        for (const s of statsCounts) {
            stats[s._id] = s.count;
            stats.total += s.count;
        }

        res.set('Cache-Control', 'private, max-age=15');
        return successResponse(res, 200, {
            events,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            },
            stats,
            formOptions: {
                categories: EVENT_CATEGORIES,
                clubs: COMMON_CLUBS
            }
        });
    } catch (error) {
        console.error('[Coordinator/Events/Get] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. EVENT MANAGEMENT — SUBMIT EVENT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/coordinator/events
 *
 * Submit a new event proposal for executive review.
 * Body: { title, description, category, startTime, endTime, venue, organizingClub, registrationLink }
 * File: poster (optional, via multer)
 */
export const submitEvent = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const { title, description, category, startTime, endTime, venue, organizingClub, registrationLink } = req.body;

        // Validation
        if (!title?.trim()) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Event title is required');
        }
        if (!category || !EVENT_CATEGORIES.includes(category)) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', `Category must be one of: ${EVENT_CATEGORIES.join(', ')}`);
        }
        if (!startTime || !endTime) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Start time and end time are required');
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid date format');
        }
        if (end <= start) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'End time must be after start time');
        }
        if (start <= new Date()) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Event must be scheduled in the future');
        }

        const eventData = {
            title: title.trim(),
            description: description?.trim() || '',
            category,
            startTime: start,
            endTime: end,
            venue: venue?.trim() || '',
            organizingClub: organizingClub?.trim() || '',
            registrationLink: registrationLink?.trim() || null,
            createdBy: req.user._id,
            status: 'Pending'  // All events go to executive for review
        };

        // Handle poster upload
        if (req.file) {
            eventData.posterUrl = req.file.path.replace(/\\/g, '/');
        }

        const event = await Event.create(eventData);

        // Notify Executives
        const executiveUsers = await User.find({ roles: 'executive' }).select('_id');
        for (const exec of executiveUsers) {
            await createNotification(exec._id, {
                title: 'New Event Request',
                message: `New event request "${event.title}" submitted by ${req.user.name}.`,
                type: 'event_update',
                relatedId: event._id,
                link: '/executive/approvals'
            });
        }

        return successResponse(res, 201, {
            _id: event._id,
            title: event.title,
            status: event.status,
            startTime: event.startTime,
            endTime: event.endTime
        }, 'Event submitted for executive review');
    } catch (error) {
        console.error('[Coordinator/Events/Submit] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. VENUE BOOKING — GET PAGE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/coordinator/venues?date=2026-03-21
 *
 * Returns venue booking page data:
 * - all bookable venues (Senate Hall, Auditorium, LitSoc room, etc.)
 * - existing bookings/blocks for the selected date (to show availability)
 * - coordinator's own booking requests with status
 */
export const getVenueBookingPage = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const userId = req.user._id;
        const { date } = req.query;

        // Get selected date bounds
        const selectedDate = date ? new Date(date) : new Date();
        if (Number.isNaN(selectedDate.getTime())) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid date');
        }
        const dayStart = new Date(selectedDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(selectedDate);
        dayEnd.setHours(23, 59, 59, 999);

        // Fetch all venue-type facilities (non-sports, non-gym, non-swimming)
        const venues = await Facility.find({
            facilityType: { $nin: ['sports', 'gym', 'swimming'] },
            isOperational: true
        })
            .select('name facilityType location capacity operatingHours metadata')
            .sort({ name: 1 })
            .maxTimeMS(5000)
            .lean();

        // If no dedicated venue facilities, also look for facilities with venue-like names
        let venueIds;
        if (venues.length === 0) {
            // Fallback: fetch all facilities and let frontend filter
            const allFacilities = await Facility.find({ isOperational: true })
                .select('name facilityType location capacity operatingHours metadata')
                .sort({ name: 1 })
                .maxTimeMS(5000)
                .lean();
            venueIds = allFacilities.map(v => v._id);
        } else {
            venueIds = venues.map(v => v._id);
        }

        // Get existing blocks/bookings for these venues on the selected date
        const [existingBlocks, myRequests] = await Promise.all([
            FacilityBlock.find({
                facility: { $in: venueIds },
                startTime: { $lte: dayEnd },
                endTime: { $gte: dayStart },
                status: { $in: ['pending', 'approved'] }
            })
                .populate('facility', 'name')
                .populate('requestedBy', 'name email')
                .select('facility startTime endTime reason status notes requestedBy')
                .sort({ startTime: 1 })
                .maxTimeMS(5000)
                .lean(),

            // Coordinator's own booking requests (all time, limited)
            FacilityBlock.find({ requestedBy: userId })
                .populate('facility', 'name location')
                .select('facility startTime endTime reason status notes approvedBy createdAt')
                .sort({ createdAt: -1 })
                .limit(20)
                .maxTimeMS(5000)
                .lean()
        ]);

        // Group blocks by venue for the availability view
        const availabilityByVenue = {};
        for (const block of existingBlocks) {
            const venueId = String(block.facility?._id);
            if (!availabilityByVenue[venueId]) {
                availabilityByVenue[venueId] = {
                    venueName: block.facility?.name || 'Unknown',
                    bookedSlots: []
                };
            }
            availabilityByVenue[venueId].bookedSlots.push({
                _id: block._id,
                startTime: block.startTime,
                endTime: block.endTime,
                reason: block.reason,
                status: block.status,
                requestedBy: block.requestedBy?.name || null
            });
        }

        // Next 5 bookable dates
        const bookableDates = [];
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            bookableDates.push({
                date: d.toISOString().slice(0, 10),
                label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
            });
        }

        // Stats for coordinator's requests
        const requestStats = { total: 0, pending: 0, approved: 0, rejected: 0 };
        for (const r of myRequests) {
            requestStats.total++;
            if (requestStats[r.status] !== undefined) requestStats[r.status]++;
        }

        res.set('Cache-Control', 'private, max-age=15');
        return successResponse(res, 200, {
            venues: (venues.length > 0 ? venues : []).map(v => ({
                _id: v._id,
                name: v.name,
                facilityType: v.facilityType,
                location: v.location,
                capacity: v.capacity,
                operatingHours: v.operatingHours || null
            })),
            selectedDate: dayStart.toISOString().slice(0, 10),
            bookableDates,
            availabilityByVenue,
            myRequests: myRequests.map(r => ({
                _id: r._id,
                venue: r.facility?.name || 'Unknown',
                location: r.facility?.location || null,
                startTime: r.startTime,
                endTime: r.endTime,
                reason: r.reason,
                status: r.status,
                notes: r.notes,
                createdAt: r.createdAt
            })),
            requestStats
        });
    } catch (error) {
        console.error('[Coordinator/Venues/Get] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. VENUE BOOKING — SUBMIT REQUEST
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/coordinator/venues
 *
 * Submit a venue reservation request for executive review.
 * Body: { venueId, startTime, endTime, reason, notes }
 */
export const requestVenueBooking = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const { venueId, startTime, endTime, reason, notes } = req.body;

        // Validation
        if (!venueId) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Venue ID is required');
        }
        if (!startTime || !endTime) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Start time and end time are required');
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid date format');
        }
        if (end <= start) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'End time must be after start time');
        }
        if (start <= new Date()) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Booking must be in the future');
        }

        // Verify venue exists
        const venue = await Facility.findById(venueId).lean();
        if (!venue) {
            return errorResponse(res, 404, 'VENUE_NOT_FOUND', 'Venue not found');
        }

        // Check for overlapping approved/pending bookings on this venue
        const overlap = await FacilityBlock.findOne({
            facility: venueId,
            status: { $in: ['pending', 'approved'] },
            startTime: { $lt: end },
            endTime: { $gt: start }
        }).lean();

        if (overlap) {
            return errorResponse(res, 409, 'SLOT_CONFLICT', 'This venue is already booked or has a pending request for the selected time slot', {
                conflictingBlock: {
                    startTime: overlap.startTime,
                    endTime: overlap.endTime,
                    status: overlap.status
                }
            });
        }

        // Validate reason
        const validReasons = ['team_practice', 'event', 'maintenance'];
        const bookingReason = reason && validReasons.includes(reason) ? reason : 'event';

        // Create the booking request — goes to executive for review
        const block = await FacilityBlock.create({
            facility: venueId,
            startTime: start,
            endTime: end,
            reason: bookingReason,
            status: 'pending',  // Executive must approve
            requestedBy: req.user._id,
            notes: notes?.trim() || null
        });

        // Notify Executives
        const executiveUsers = await User.find({ roles: 'executive' }).select('_id');
        for (const exec of executiveUsers) {
            await createNotification(exec._id, {
                title: 'New Venue Request',
                message: `New booking request received for ${venue.name} on ${start.toLocaleString()} by ${req.user.name}.`,
                type: 'venue_update',
                relatedId: block._id,
                link: '/executive/approvals'
            });
        }

        return successResponse(res, 201, {
            _id: block._id,
            venue: venue.name,
            startTime: block.startTime,
            endTime: block.endTime,
            reason: block.reason,
            status: block.status,
            message: 'Your venue booking request has been submitted for executive review.'
        }, 'Venue booking request submitted for executive review');
    } catch (error) {
        console.error('[Coordinator/Venues/Request] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};
