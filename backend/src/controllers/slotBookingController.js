import Facility from '../models/Facility.js';
import SportsSlot from '../models/SportsSlot.js';
import SportsBooking from '../models/SportsBooking.js';
import TeamPracticeBlock from '../models/TeamPracticeBlock.js';
import Booking from '../models/Booking.js';
import SubscriptionV2 from '../models/SubscriptionV2.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import Penalty from '../models/Penalty.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { checkUserSuspension, checkFairUseQuota } from '../services/bookingService.js';
import { getFacilityOccupancySummary } from '../services/accessService.js';

// ── Static config objects ────────────────────────────────────────────────────

const SPORTS_BOOKING_RULES = [
    'Max booking duration is 2 hours per person per day.',
    'No-show leads to a 7-day facility ban.',
    'Proper non-marking shoes are mandatory.',
    'Cancellations allowed up to 2 hours before slot.',
    'Please carry your IITK ID card. Roll number verification is mandatory at the facility entrance.',
    'Maximum 2 active bookings allowed in a rolling 72-hour window.'
];

const GYM_QUICK_RULES = [
    'Clean sports shoes mandatory.',
    'Carry a personal towel.',
    'Re-rack weights after use.',
    'Produce ID Card on demand.',
    'Gym Timings: 6 AM – 10 PM.'
];

const SWIMMING_QUICK_RULES = [
    'Swimming cap is mandatory.',
    'Shower before entering the pool.',
    'No diving in shallow end.',
    'Produce ID Card on demand.',
    'Pool Timings: 6 AM – 8 AM, 4 PM – 6 PM.'
];

const PLAN_PRICING_FALLBACK = {
    Gym: {
        Monthly: { price: 300, label: 'Short term', durationMonths: 1 },
        Semesterly: { price: 1200, label: 'Popular', tag: 'POPULAR', durationMonths: 4 },
        Yearly: { price: 2500, label: 'Best value', durationMonths: 12 }
    },
    SwimmingPool: {
        Monthly: { price: 400, label: 'Short term', durationMonths: 1 },
        Semesterly: { price: 1500, label: 'Popular', tag: 'POPULAR', durationMonths: 4 },
        Yearly: { price: 3000, label: 'Best value', durationMonths: 12 }
    }
};

const IST_TIME_ZONE = 'Asia/Kolkata';
const IST_OFFSET_MINUTES = 330;

const getIstParts = (date = new Date()) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: IST_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'long'
    });

    const parts = formatter.formatToParts(date);
    const valueOf = (type) => parts.find((part) => part.type === type)?.value;

    return {
        year: Number(valueOf('year')),
        month: Number(valueOf('month')),
        day: Number(valueOf('day')),
        weekday: valueOf('weekday')
    };
};

const getIstDateString = (date = new Date()) => {
    const { year, month, day } = getIstParts(date);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const getUtcDateForIstMidnight = (year, month, day) => {
    return new Date(Date.UTC(year, month - 1, day, 0, -IST_OFFSET_MINUTES, 0, 0));
};

// ── Helper: build date boundaries for a given date string ────────────────────

const getDateBounds = (dateStr) => {
    if (!dateStr) return null;

    const [year, month, day] = String(dateStr).split('-').map(Number);
    if (!year || !month || !day) return null;

    const start = getUtcDateForIstMidnight(year, month, day);
    const end = new Date(start.getTime() + (24 * 60 * 60 * 1000) - 1);
    const dateObj = new Date(Date.UTC(year, month - 1, day));

    return { start, end, dateObj };
};

// ── Helper: get next 3 bookable dates ────────────────────────────────────────

const getBookableDates = () => {
    const dates = [];
    const todayIst = getIstParts();

    for (let i = 0; i < 3; i++) {
        const calendarDate = new Date(Date.UTC(todayIst.year, todayIst.month - 1, todayIst.day + i));
        const istParts = getIstParts(calendarDate);

        dates.push({
            date: getIstDateString(calendarDate),
            label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : istParts.weekday,
            dayOfWeek: calendarDate.getUTCDay()
        });
    }
    return dates;
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. SPORTS BOOKING PAGE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/slot-booking/sports?sportType=Badminton&date=2026-03-21
 *
 * Returns everything the sports booking sub-page needs:
 * - list of sport types (for dropdown)
 * - facilities matching the selected sport
 * - slots for the selected date, grouped by court
 * - user's fair-use status & suspension check
 * - recent booking activity
 * - booking rules
 */
export const getSportsBookingPage = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const userId = req.user._id;
        const { sportType, date } = req.query;
        const currentTime = new Date();

        // ── 1. All active sports facilities (for dropdown) ───────────
        const allSportsFacilities = await Facility.find({
            facilityType: 'sports',
            isOperational: true
        })
            .select('name sportType location capacity metadata')
            .sort({ sportType: 1, name: 1 })
            .maxTimeMS(5000)
            .lean();

        // Distinct sport types for the dropdown
        const sportTypes = [...new Set(allSportsFacilities.map(f => f.sportType).filter(Boolean))].sort();

        // ── 2. Facilities matching the selected sport ────────────────
        const selectedSport = sportType || sportTypes[0] || null;
        const matchingFacilities = selectedSport
            ? allSportsFacilities.filter(f => f.sportType === selectedSport)
            : [];

        // ── 3. Bookable dates ────────────────────────────────────────
        const bookableDates = getBookableDates();
        const allowedDates = new Set(bookableDates.map((entry) => entry.date));
        const selectedDate = date && allowedDates.has(date) ? date : bookableDates[0]?.date;
        const dateBounds = getDateBounds(selectedDate);

        // ── 4. Slots grouped by court/facility for the selected date ─
        let courtSlots = [];
        if (matchingFacilities.length > 0 && dateBounds) {
            const facilityIds = matchingFacilities.map(f => f._id);
            const dayOfWeek = dateBounds.dateObj.getDay();

            // Get slot templates for these facilities
            const slotTemplates = await SportsSlot.find({
                facility: { $in: facilityIds },
                isActive: true,
                $or: [
                    { daysOfWeek: { $size: 0 } },   // applies to all days
                    { daysOfWeek: dayOfWeek }
                ]
            })
                .populate('facility', 'name location sportType capacity')
                .sort({ startTime: 1 })
                .maxTimeMS(5000)
                .lean();

            // Get existing bookings for these facilities on this date
            const existingBookings = await SportsBooking.find({
                facility: { $in: facilityIds },
                slotStartAt: { $gte: dateBounds.start, $lte: dateBounds.end },
                status: { $in: ['confirmed', 'group_pending', 'completed'] }
            })
                .select('facility slot slotStartAt slotEndAt status isGroupBooking participantCount participants')
                .maxTimeMS(5000)
                .lean();

            // Build a lookup: facilityId + startTime -> booking info
            const bookingMap = new Map();
            for (const b of existingBookings) {
                const key = `${b.facility}_${b.slotStartAt?.toISOString()}`;
                if (!bookingMap.has(key)) bookingMap.set(key, []);
                bookingMap.get(key).push(b);
            }

            // Group slots by facility (court)
            const courtMap = new Map();
            for (const slot of slotTemplates) {
                const courtId = String(slot.facility?._id);
                if (!courtMap.has(courtId)) {
                    courtMap.set(courtId, {
                        facilityId: courtId,
                        courtName: slot.facility?.name || 'Unknown',
                        location: slot.facility?.location || null,
                        capacity: slot.facility?.capacity || slot.capacity,
                        slots: []
                    });
                }

                // Build the datetime for this slot on the selected date
                const [startH, startM] = (slot.startTime || '06:00').split(':').map(Number);
                const [endH, endM] = (slot.endTime || '07:00').split(':').map(Number);
                const slotStart = new Date(dateBounds.start);
                slotStart.setHours(startH, startM, 0, 0);
                const slotEnd = new Date(dateBounds.start);
                slotEnd.setHours(endH, endM, 0, 0);

                const key = `${courtId}_${slotStart.toISOString()}`;
                const bookings = bookingMap.get(key) || [];

                // Calculate how many spots are taken
                const totalBooked = bookings.reduce((sum, b) => {
                    const bookingCount = typeof b.participantCount === 'number'
                        ? b.participantCount
                        : Math.max(1, b.participants?.length || 1);

                    return sum + bookingCount;
                }, 0);
                const slotCapacity = slot.capacity || slot.facility?.capacity || 1;
                const spotsLeft = Math.max(slotCapacity - totalBooked, 0);

                let slotStatus = 'Available';
                if (spotsLeft === 0) {
                    slotStatus = 'Fully Booked';
                } else if (bookings.some(b => b.status === 'group_pending')) {
                    slotStatus = 'Group Open';
                }

                if (slotEnd <= currentTime) {
                    slotStatus = 'Unavailable';
                }

                courtMap.get(courtId).slots.push({
                    _id: slot._id,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    slotStart,
                    slotEnd,
                    capacity: slotCapacity,
                    spotsLeft,
                    status: slotStatus,
                    minPlayersRequired: slot.minPlayersRequired || 1,
                    existingBookings: bookings.map(b => ({
                        _id: b._id,
                        status: b.status,
                        isGroupBooking: b.isGroupBooking,
                        participantCount: typeof b.participantCount === 'number'
                            ? b.participantCount
                            : Math.max(1, b.participants?.length || 1)
                    }))
                });
            }

            courtSlots = Array.from(courtMap.values());

            // ── Check for approved team practice blocks ──────────────
            const practiceBlocks = await TeamPracticeBlock.find({
                facility: { $in: facilityIds },
                status: 'approved',
                daysOfWeek: dayOfWeek
            })
                .populate('captain', 'name')
                .select('facility startTime endTime captain sport')
                .maxTimeMS(5000)
                .lean();

            // Mark overlapping slots as 'Team Practice'
            if (practiceBlocks.length > 0) {
                for (const court of courtSlots) {
                    for (const slot of court.slots) {
                        for (const pb of practiceBlocks) {
                            if (String(court.facilityId) !== String(pb.facility)) continue;

                            // Check time overlap
                            if (slot.startTime < pb.endTime && slot.endTime > pb.startTime) {
                                slot.status = 'Team Practice';
                                slot.practiceBlock = {
                                    captain: pb.captain?.name || 'Captain',
                                    sport: pb.sport,
                                    startTime: pb.startTime,
                                    endTime: pb.endTime
                                };
                                slot.spotsLeft = 0;
                            }
                        }
                    }
                }
            }
        }

        // ── 5. Fair-use & suspension status ──────────────────────────
        const [fairUse, suspension] = await Promise.all([
            checkFairUseQuota(userId),
            checkUserSuspension(userId)
        ]);

        // ── 6. Booking activity (upcoming + recent history) ─────────
        const now = new Date();
        const [activeSports, recentSports, activeV1, recentV1] = await Promise.all([
            SportsBooking.find({
                user: userId,
                slotEndAt: { $gte: now },
                status: { $in: ['confirmed', 'group_pending'] }
            })
                .populate('facility', 'name sportType')
                .sort({ slotStartAt: 1 })
                .limit(10)
                .maxTimeMS(5000)
                .lean(),
            SportsBooking.find({
                user: userId,
                slotStartAt: { $lt: now },
                status: { $in: ['completed', 'no_show', 'cancelled'] }
            })
                .populate('facility', 'name sportType')
                .sort({ slotStartAt: -1 })
                .limit(10)
                .maxTimeMS(5000)
                .lean(),
            Booking.find({
                userId,
                slotDate: { $gte: now },
                status: { $in: ['Confirmed', 'Provisioned'] }
            })
                .populate('facilityId', 'name sportType')
                .populate('slotId', 'startTime endTime')
                .sort({ slotDate: 1 })
                .limit(10)
                .maxTimeMS(5000)
                .lean(),
            Booking.find({
                userId,
                slotDate: { $lt: now },
                status: { $in: ['Attended', 'NoShow', 'Cancelled', 'LateCancelled'] }
            })
                .populate('facilityId', 'name sportType')
                .populate('slotId', 'startTime endTime')
                .sort({ slotDate: -1 })
                .limit(10)
                .maxTimeMS(5000)
                .lean()
        ]);

        const recentActivity = [
            ...activeSports.map(b => ({
                _id: b._id,
                date: b.slotStartAt,
                facility: b.facility?.name || 'Unknown',
                time: `${new Date(b.slotStartAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(b.slotEndAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
                status: b.status,
                source: 'v2'
            })),
            ...recentSports.map(b => ({
                _id: b._id,
                date: b.slotStartAt,
                facility: b.facility?.name || 'Unknown',
                time: `${new Date(b.slotStartAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(b.slotEndAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
                status: b.status,
                source: 'v2'
            })),
            ...activeV1.map(b => ({
                _id: b._id,
                date: b.slotDate,
                facility: b.facilityId?.name || 'Unknown',
                time: b.slotId
                    ? `${new Date(b.slotId.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(b.slotId.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                    : null,
                status: b.status,
                source: 'v1'
            })),
            ...recentV1.map(b => ({
                _id: b._id,
                date: b.slotDate,
                facility: b.facilityId?.name || 'Unknown',
                time: b.slotId
                    ? `${new Date(b.slotId.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(b.slotId.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                    : null,
                status: b.status,
                source: 'v1'
            }))
        ]
            .sort((a, b) => {
                const aDate = new Date(a.date);
                const bDate = new Date(b.date);
                const aIsUpcoming = aDate >= now;
                const bIsUpcoming = bDate >= now;

                if (aIsUpcoming !== bIsUpcoming) {
                    return aIsUpcoming ? -1 : 1;
                }

                return aIsUpcoming ? aDate - bDate : bDate - aDate;
            })
            .slice(0, 10);

        // ── 7. Assemble response ─────────────────────────────────────
        res.set('Cache-Control', 'private, max-age=15');
        return successResponse(res, 200, {
            sportTypes,
            selectedSport,
            bookableDates,
            selectedDate,
            facilities: matchingFacilities.map(f => ({
                _id: f._id,
                name: f.name,
                sportType: f.sportType,
                location: f.location,
                maxPlayers: f.capacity || 2,
                minGroupSize: f.metadata?.minGroupSize || 2,
                slotDuration: f.metadata?.slotDuration || 60
            })),
            courtSlots,
            fairUse: {
                activeBookingCount: fairUse.count,
                maxAllowed: 2,
                canBook: fairUse.allowed,
                isSuspended: !!suspension,
                suspendedUntil: suspension?.suspendedUntil || null
            },
            recentActivity,
            bookingRules: SPORTS_BOOKING_RULES
        });
    } catch (error) {
        console.error('[SlotBooking/Sports] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. GYM REGISTRATION PAGE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/slot-booking/gym
 *
 * Returns everything the gym subscription sub-page needs:
 * - user's personal details (pre-filled)
 * - available plans with pricing
 * - user's current gym subscription (if any)
 * - real-time slot availability / occupancy
 * - quick rules
 */
export const getGymRegistrationPage = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const userId = req.user._id;

        const [plans, currentSubscription, occupancy, slots] = await Promise.all([
            // Active gym plans from DB
            SubscriptionPlan.find({ type: 'gym', isActive: true })
                .sort({ price: 1 })
                .maxTimeMS(5000)
                .lean(),

            // User's current gym subscription (pending or approved)
            SubscriptionV2.findOne({
                userId,
                facilityType: 'Gym',
                status: { $in: ['Pending', 'Approved'] }
            })
                .select('facilityType plan status startDate endDate qrCode passId createdAt slotId')
                .populate('slotId', 'startTime endTime')
                .maxTimeMS(5000)
                .lean(),

            // Real-time occupancy
            getFacilityOccupancySummary('Gym'),

            // Fetch slots and their current subscription counts
            (async () => {
                const gymFac = await Facility.findOne({ facilityType: 'gym' }).lean();
                if (!gymFac) return [];
                const slots = await SportsSlot.find({ facility: gymFac._id, isActive: true }).sort({ startTime: 1 }).lean();
                const slotsWithCapacity = await Promise.all(slots.map(async (slot) => {
                    const activeCount = await SubscriptionV2.countDocuments({
                        slotId: slot._id,
                        status: { $in: ['Pending', 'Approved'] }
                    });
                    const cap = slot.capacity || gymFac.capacity || 1;
                    return {
                        _id: slot._id,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        capacity: cap,
                        spotsLeft: Math.max(cap - activeCount, 0),
                        activeCount
                    };
                }));
                return slotsWithCapacity;
            })()
        ]);

        // Build plan list — use DB records if available, otherwise use fallback pricing
        let planList;
        if (plans.length > 0) {
            planList = plans.map(p => ({
                _id: p._id,
                name: p.name,
                planDuration: p.planDuration,
                price: p.price,
                validityDays: p.validityDays,
                capacity: p.capacity || null,
                label: p.metadata?.label || null,
                tag: p.metadata?.tag || null
            }));
        } else {
            // Fallback to static pricing
            const fallback = PLAN_PRICING_FALLBACK.Gym;
            planList = Object.entries(fallback).map(([key, val]) => ({
                _id: null,
                name: `${key} Plan`,
                planDuration: key.toLowerCase(),
                price: val.price,
                validityDays: val.durationMonths * 30,
                capacity: null,
                label: val.label,
                tag: val.tag || null
            }));
        }

        // Pre-filled user details
        const userDetails = {
            name: req.user.name,
            email: req.user.email,
            roles: req.user.roles,
            rollNumber: req.user.profileDetails?.rollNumber || null,
            department: req.user.profileDetails?.department || null,
            program: req.user.profileDetails?.program || null
        };

        // Payment instructions
        const paymentInstructions = 'Pay via SBI Collect selecting "IIT Kanpur" > "Student Gymkhana" > "Gym Subscription".';

        res.set('Cache-Control', 'private, max-age=30');
        return successResponse(res, 200, {
            user: userDetails,
            plans: planList,
            currentSubscription,
            hasActiveSubscription: !!currentSubscription,
            slotAvailability: {
                totalSlots: occupancy.totalSlots,
                registered: occupancy.occupiedSlots,
                available: occupancy.availableSlots,
                status: occupancy.availableSlots > 0 ? 'AVAILABLE' : 'FULL'
            },
            slots,
            paymentInstructions,
            quickRules: GYM_QUICK_RULES
        });
    } catch (error) {
        console.error('[SlotBooking/Gym] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. SWIMMING REGISTRATION PAGE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/slot-booking/swimming
 *
 * Returns everything the swimming pool subscription sub-page needs.
 * Same structure as gym, filtered for SwimmingPool.
 */
export const getSwimmingRegistrationPage = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const userId = req.user._id;

        const [plans, currentSubscription, occupancy, slots] = await Promise.all([
            SubscriptionPlan.find({ type: 'swimming', isActive: true })
                .sort({ price: 1 })
                .maxTimeMS(5000)
                .lean(),

            SubscriptionV2.findOne({
                userId,
                facilityType: 'SwimmingPool',
                status: { $in: ['Pending', 'Approved'] }
            })
                .select('facilityType plan status startDate endDate qrCode passId createdAt slotId')
                .populate('slotId', 'startTime endTime')
                .maxTimeMS(5000)
                .lean(),

            getFacilityOccupancySummary('SwimmingPool'),

            // Fetch slots and their current subscription counts
            (async () => {
                const swimFac = await Facility.findOne({ facilityType: 'swimming' }).lean();
                if (!swimFac) return [];
                const facSlots = await SportsSlot.find({ facility: swimFac._id, isActive: true }).sort({ startTime: 1 }).lean();
                const slotsWithCapacity = await Promise.all(facSlots.map(async (slot) => {
                    const activeCount = await SubscriptionV2.countDocuments({
                        slotId: slot._id,
                        status: { $in: ['Pending', 'Approved'] }
                    });
                    const cap = slot.capacity || swimFac.capacity || 1;
                    return {
                        _id: slot._id,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        capacity: cap,
                        spotsLeft: Math.max(cap - activeCount, 0),
                        activeCount
                    };
                }));
                return slotsWithCapacity;
            })()
        ]);

        // Build plan list
        let planList;
        if (plans.length > 0) {
            planList = plans.map(p => ({
                _id: p._id,
                name: p.name,
                planDuration: p.planDuration,
                price: p.price,
                validityDays: p.validityDays,
                capacity: p.capacity || null,
                label: p.metadata?.label || null,
                tag: p.metadata?.tag || null
            }));
        } else {
            const fallback = PLAN_PRICING_FALLBACK.SwimmingPool;
            planList = Object.entries(fallback).map(([key, val]) => ({
                _id: null,
                name: `${key} Plan`,
                planDuration: key.toLowerCase(),
                price: val.price,
                validityDays: val.durationMonths * 30,
                capacity: null,
                label: val.label,
                tag: val.tag || null
            }));
        }

        const userDetails = {
            name: req.user.name,
            email: req.user.email,
            roles: req.user.roles,
            rollNumber: req.user.profileDetails?.rollNumber || null,
            department: req.user.profileDetails?.department || null,
            program: req.user.profileDetails?.program || null
        };

        const paymentInstructions = 'Pay via SBI Collect selecting "IIT Kanpur" > "Student Gymkhana" > "Swimming Pool Subscription".';

        res.set('Cache-Control', 'private, max-age=30');
        return successResponse(res, 200, {
            user: userDetails,
            plans: planList,
            currentSubscription,
            hasActiveSubscription: !!currentSubscription,
            slotAvailability: {
                totalSlots: occupancy.totalSlots,
                registered: occupancy.occupiedSlots,
                available: occupancy.availableSlots,
                status: occupancy.availableSlots > 0 ? 'AVAILABLE' : 'FULL'
            },
            slots,
            paymentInstructions,
            quickRules: SWIMMING_QUICK_RULES
        });
    } catch (error) {
        console.error('[SlotBooking/Swimming] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};
