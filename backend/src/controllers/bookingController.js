import Facility from '../models/Facility.js';
import SportsSlot from '../models/SportsSlot.js';
import FacilityBlock from '../models/FacilityBlock.js';
import SportsBooking from '../models/SportsBooking.js';
import TeamPracticeBlock from '../models/TeamPracticeBlock.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

const ACTIVE_BOOKING_STATUSES = ['confirmed', 'group_pending', 'waitlisted'];
const CANCELLABLE_STATUSES = ['confirmed', 'group_pending', 'waitlisted'];
const FAIR_USE_WINDOW_IN_MS = 3 * 24 * 60 * 60 * 1000;

const buildSlotDateTime = (bookingDate, timeString) => {
    const date = new Date(bookingDate);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const [hours, minutes] = timeString.split(':').map(Number);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
    }

    date.setHours(hours, minutes, 0, 0);
    return date;
};

const getQuotaWindow = (slotStartAt) => ({
    $gte: new Date(slotStartAt.getTime() - FAIR_USE_WINDOW_IN_MS),
    $lte: new Date(slotStartAt.getTime() + FAIR_USE_WINDOW_IN_MS)
});

const canUserAccessFacility = (facility, userRoles) => {
    if (!facility.allowedRoles?.length) {
        return true;
    }

    return userRoles.some((role) => facility.allowedRoles.includes(role));
};

const getBookingParticipantCount = (booking) => {
    if (typeof booking?.participantCount === 'number' && booking.participantCount > 0) {
        return booking.participantCount;
    }

    if (Array.isArray(booking?.participants) && booking.participants.length > 0) {
        return booking.participants.length;
    }

    return 1;
};

const getDateRange = (dateInput) => {
    const date = dateInput ? new Date(dateInput) : new Date();

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

const getStartOfDay = (dateInput) => {
    const date = dateInput ? new Date(dateInput) : new Date();

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    date.setHours(0, 0, 0, 0);
    return date;
};

const findCaptainPracticeBlock = ({ facilityId, slotStartAt, slotEndAt, practiceDate }) => (
    TeamPracticeBlock.findOne({
        facility: facilityId,
        status: 'approved',
        ...(practiceDate ? { practiceDate } : {}),
        startTime: { $lt: slotEndAt.toTimeString().slice(0, 5) },
        endTime: { $gt: slotStartAt.toTimeString().slice(0, 5) }
    })
        .populate('captain', 'name email profileDetails.rollNumber profileDetails.department')
        .populate('facility', 'name location sportType capacity')
);

const getCaretakerFacilityFilter = (req) => {
    if (req.user.roles?.some((role) => ['admin', 'executive'].includes(role))) {
        return null;
    }

    const assignedFacilities = req.user.profileDetails?.assignedFacilities || [];
    // If specific facilities are assigned, restrict to them. 
    // Otherwise, grant global access (null).
    return assignedFacilities.length ? assignedFacilities : null;
};

const findUserByIdentifier = async (identifier) => {
    if (!identifier) {
        return null;
    }

    const orConditions = [
        { email: identifier },
        { 'profileDetails.rollNumber': identifier }
    ];

    if (mongoose.Types.ObjectId.isValid(identifier)) {
        orConditions.unshift({ _id: identifier });
    }

    return User.findOne({ $or: orConditions }).select('name email profileDetails');
};

export const checkAvailability = async (req, res) => {
    try {
        const { slotId, bookingDate } = req.query;

        if (!slotId || !bookingDate) {
            return res.status(400).json({ message: 'slotId and bookingDate are required' });
        }

        const slot = await SportsSlot.findById(slotId).populate('facility');

        if (!slot || !slot.isActive) {
            return res.status(404).json({ message: 'Slot not found' });
        }

        const slotStartAt = buildSlotDateTime(bookingDate, slot.startTime);
        const slotEndAt = buildSlotDateTime(bookingDate, slot.endTime);

        if (!slotStartAt || !slotEndAt || slotEndAt <= slotStartAt) {
            return res.status(400).json({ message: 'Invalid slot date/time combination' });
        }

        const practiceDate = getStartOfDay(bookingDate);

        const [existingBookings, quotaUsage, activeBlock, activePracticeBlock] = await Promise.all([
            SportsBooking.find({
                slot: slot._id,
                bookingDate: {
                    $gte: new Date(new Date(bookingDate).setHours(0, 0, 0, 0)),
                    $lte: new Date(new Date(bookingDate).setHours(23, 59, 59, 999))
                },
                status: { $in: ACTIVE_BOOKING_STATUSES }
            }).select('participantCount participants'),
            SportsBooking.countDocuments({
                user: req.user._id,
                slotStartAt: getQuotaWindow(slotStartAt),
                status: { $in: ACTIVE_BOOKING_STATUSES }
            }),
            FacilityBlock.findOne({
                facility: slot.facility._id,
                status: 'approved',
                startTime: { $lt: slotEndAt },
                endTime: { $gt: slotStartAt }
            }),
            findCaptainPracticeBlock({
                facilityId: slot.facility._id,
                slotStartAt,
                slotEndAt,
                practiceDate
            })
        ]);

        const activeBookings = existingBookings.reduce((sum, booking) => sum + getBookingParticipantCount(booking), 0);

        res.json({
            facility: slot.facility,
            slot,
            bookingDate,
            capacity: slot.capacity,
            activeBookings,
            remainingCapacity: Math.max(slot.capacity - activeBookings, 0),
            userQuotaUsage: quotaUsage,
            quotaLimit: 2,
            isBlocked: Boolean(activeBlock || activePracticeBlock),
            blockReason: activePracticeBlock
                ? `team practice booked by ${activePracticeBlock.captain?.name || 'captain'}`
                : activeBlock?.reason ?? null
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createBooking = async (req, res) => {
    try {
        const { slotId, bookingDate, isGroupBooking = false, participantIds = [], participantCount: rawParticipantCount } = req.body;

        if (!slotId || !bookingDate) {
            return res.status(400).json({ message: 'slotId and bookingDate are required' });
        }

        if (req.user.status !== 'active') {
            return res.status(403).json({ message: 'Only active users can create bookings' });
        }

        const slot = await SportsSlot.findById(slotId).populate('facility');

        if (!slot || !slot.isActive) {
            return res.status(404).json({ message: 'Slot not found' });
        }

        if (slot.facility.facilityType !== 'sports') {
            return res.status(400).json({ message: 'Only sports facilities can be booked through this endpoint' });
        }

        if (!slot.facility.isOperational) {
            return res.status(400).json({ message: 'Selected facility is not operational' });
        }

        if (!canUserAccessFacility(slot.facility, req.user.roles)) {
            return res.status(403).json({ message: 'You are not allowed to book this facility' });
        }

        const slotStartAt = buildSlotDateTime(bookingDate, slot.startTime);
        const slotEndAt = buildSlotDateTime(bookingDate, slot.endTime);

        if (!slotStartAt || !slotEndAt || slotEndAt <= slotStartAt) {
            return res.status(400).json({ message: 'Invalid slot date/time combination' });
        }

        const normalizedParticipantCount = Number.parseInt(rawParticipantCount, 10);
        const participantCount = Number.isFinite(normalizedParticipantCount) ? normalizedParticipantCount : 1;

        if (participantCount < 1) {
            return res.status(400).json({ message: 'participantCount must be at least 1' });
        }

        if (participantCount > slot.capacity) {
            return res.status(400).json({ message: 'participantCount cannot exceed the slot capacity' });
        }

        const practiceDate = getStartOfDay(bookingDate);

        const [quotaUsage, activeBlock, activePracticeBlock, existingBookings, existingBooking] = await Promise.all([
            SportsBooking.countDocuments({
                user: req.user._id,
                slotStartAt: getQuotaWindow(slotStartAt),
                status: { $in: ACTIVE_BOOKING_STATUSES }
            }),
            FacilityBlock.findOne({
                facility: slot.facility._id,
                status: 'approved',
                startTime: { $lt: slotEndAt },
                endTime: { $gt: slotStartAt }
            }),
            findCaptainPracticeBlock({
                facilityId: slot.facility._id,
                slotStartAt,
                slotEndAt,
                practiceDate
            }),
            SportsBooking.find({
                slot: slot._id,
                bookingDate: {
                    $gte: new Date(new Date(bookingDate).setHours(0, 0, 0, 0)),
                    $lte: new Date(new Date(bookingDate).setHours(23, 59, 59, 999))
                },
                status: { $in: ACTIVE_BOOKING_STATUSES }
            }).select('participantCount participants'),
            SportsBooking.findOne({
                user: req.user._id,
                slot: slot._id,
                bookingDate: {
                    $gte: new Date(new Date(bookingDate).setHours(0, 0, 0, 0)),
                    $lte: new Date(new Date(bookingDate).setHours(23, 59, 59, 999))
                },
                status: { $in: ACTIVE_BOOKING_STATUSES }
            })
        ]);

        if (quotaUsage >= 2) {
            return res.status(400).json({ message: 'Booking quota exceeded for the rolling 3-day window' });
        }

        if (activeBlock) {
            return res.status(400).json({ message: `Slot unavailable due to ${activeBlock.reason}` });
        }

        if (activePracticeBlock) {
            return res.status(400).json({
                message: `Slot unavailable due to team practice booked by ${activePracticeBlock.captain?.name || 'captain'}`
            });
        }

        const activeBookings = existingBookings.reduce((sum, booking) => sum + getBookingParticipantCount(booking), 0);
        const remainingCapacity = Math.max(slot.capacity - activeBookings, 0);

        if (participantCount > remainingCapacity) {
            if (remainingCapacity === 0) {
                return res.status(400).json({ message: 'Selected slot is already full' });
            } else {
                return res.status(400).json({ message: `Not enough capacity left. Only ${remainingCapacity} ${remainingCapacity === 1 ? 'place is' : 'places are'} available` });
            }
        }

        if (existingBooking) {
            return res.status(400).json({ message: 'You already hold an active booking for this slot/date' });
        }

        const participants = [...new Set([String(req.user._id), ...participantIds.map(String)])];
        const minPlayersRequired = isGroupBooking ? Math.max(slot.minPlayersRequired, participantCount) : participantCount;

        const booking = await SportsBooking.create({
            user: req.user._id,
            facility: slot.facility._id,
            slot: slot._id,
            bookingDate: new Date(bookingDate),
            slotStartAt,
            slotEndAt,
            status: isGroupBooking ? 'group_pending' : 'confirmed',
            isGroupBooking,
            minPlayersRequired,
            participantCount,
            participants
        });

        const populatedBooking = await SportsBooking.findById(booking._id)
            .populate('facility')
            .populate('slot')
            .populate('user', 'name email roles');

        res.status(201).json(populatedBooking);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const listMyBookings = async (req, res) => {
    try {
        const bookings = await SportsBooking.find({ user: req.user._id })
            .populate('facility')
            .populate('slot')
            .sort({ slotStartAt: 1 });

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const listBookingsForCaretaker = async (req, res) => {
    try {
        const { facilityId, status, date, sportType } = req.query;
        const facilityScope = getCaretakerFacilityFilter(req);
        const dateRange = getDateRange(date);

        if (!dateRange) {
            return res.status(400).json({ message: 'date must be a valid ISO date' });
        }

        const query = {
            slotStartAt: { $gte: dateRange.start, $lte: dateRange.end },
            status: status || { $in: ['confirmed', 'group_pending'] }
        };

        if (facilityId) {
            query.facility = facilityId;
        } else if (facilityScope) {
            query.facility = { $in: facilityScope };
        }

        const practiceBlockQuery = {
            status: 'approved',
            practiceDate: dateRange.start
        };

        if (facilityId) {
            practiceBlockQuery.facility = facilityId;
        } else if (facilityScope) {
            practiceBlockQuery.facility = { $in: facilityScope };
        }

        const [bookings, practiceBlocks] = await Promise.all([
            SportsBooking.find(query)
            .populate('facility', 'name location sportType capacity')
            .populate('slot', 'startTime endTime capacity minPlayersRequired')
            .populate('user', 'name email profileDetails.rollNumber profileDetails.department')
            .sort({ slotStartAt: 1 }),
            TeamPracticeBlock.find(practiceBlockQuery)
                .populate('facility', 'name location sportType capacity')
                .populate('captain', 'name email profileDetails.rollNumber profileDetails.department')
                .sort({ startTime: 1 })
        ]);

        const normalizedBookings = bookings
            .filter((booking) => !sportType || booking.facility?.sportType === sportType)
            .map((booking) => ({
                _id: booking._id,
                status: booking.status,
                attendanceStatus: booking.attendanceStatus,
                slotStartAt: booking.slotStartAt,
                slotEndAt: booking.slotEndAt,
                participantCount: getBookingParticipantCount(booking),
                isGroupBooking: booking.isGroupBooking,
                facility: booking.facility,
                slot: booking.slot,
                bookedBy: booking.user,
            }));

        const normalizedPracticeBlocks = practiceBlocks
            .filter((block) => !sportType || block.facility?.sportType === sportType || block.sport === sportType)
            .map((block) => {
                const slotStartAt = new Date(dateRange.start);
                const [startHours, startMinutes] = (block.startTime || '00:00').split(':').map(Number);
                slotStartAt.setHours(startHours, startMinutes, 0, 0);

                const slotEndAt = new Date(dateRange.start);
                const [endHours, endMinutes] = (block.endTime || '00:00').split(':').map(Number);
                slotEndAt.setHours(endHours, endMinutes, 0, 0);

                return {
                    _id: block._id,
                    kind: 'practice_block',
                    status: 'team_practice',
                    attendanceStatus: null,
                    slotStartAt,
                    slotEndAt,
                    participantCount: null,
                    isGroupBooking: false,
                    facility: block.facility,
                    slot: {
                        startTime: block.startTime,
                        endTime: block.endTime,
                        capacity: block.facility?.capacity || null,
                        minPlayersRequired: null
                    },
                    bookedBy: block.captain,
                    sport: block.sport
                };
            });

        const combinedBookings = [...normalizedBookings, ...normalizedPracticeBlocks].sort(
            (left, right) => new Date(left.slotStartAt) - new Date(right.slotStartAt)
        );

        return res.json({ bookings: combinedBookings });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const verifyAttendeeForCaretaker = async (req, res) => {
    try {
        const { identifier, bookingId } = req.body;

        if (!identifier) {
            return res.status(400).json({ message: 'identifier is required' });
        }

        const user = await findUserByIdentifier(identifier);
        if (!user) {
            return res.json({
                valid: false,
                reason: 'No user found for the provided identifier'
            });
        }

        const query = {
            status: { $in: ['confirmed', 'group_pending'] },
            user: user._id
        };

        if (bookingId) {
            query._id = bookingId;
        }

        const facilityScope = getCaretakerFacilityFilter(req);
        if (facilityScope) {
            query.facility = { $in: facilityScope };
        }

        const booking = await SportsBooking.findOne(query)
            .populate('facility', 'name sportType location')
            .populate('slot', 'startTime endTime')
            .populate('user', 'name email profileDetails.rollNumber');

        if (!booking) {
            return res.json({
                valid: false,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    rollNumber: user.profileDetails?.rollNumber || null
                },
                reason: 'No active sports booking matched the provided identifier'
            });
        }

        return res.json({
            valid: true,
            booking: {
                _id: booking._id,
                status: booking.status,
                attendanceStatus: booking.attendanceStatus,
                slotStartAt: booking.slotStartAt,
                slotEndAt: booking.slotEndAt,
                participantCount: getBookingParticipantCount(booking),
                facility: booking.facility,
                slot: booking.slot,
                bookedBy: booking.user,
            }
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const updateBooking = async (req, res) => {
    try {
        const booking = await SportsBooking.findById(req.params.id)
            .populate('slot')
            .populate('facility');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const isOwner = String(booking.user) === String(req.user._id);
        const isPrivileged = req.user.roles.some((role) => ['caretaker', 'admin', 'executive'].includes(role));

        if (!isOwner && !isPrivileged) {
            return res.status(403).json({ message: 'You are not allowed to modify this booking' });
        }

        if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
            return res.status(400).json({ message: 'This booking can no longer be modified' });
        }

        const normalizedParticipantCount = Number.parseInt(req.body.participantCount, 10);
        const participantCount = Number.isFinite(normalizedParticipantCount)
            ? normalizedParticipantCount
            : getBookingParticipantCount(booking);

        if (participantCount < 1) {
            return res.status(400).json({ message: 'participantCount must be at least 1' });
        }

        const slotCapacity = booking.slot?.capacity || booking.facility?.capacity || 1;
        if (participantCount > slotCapacity) {
            return res.status(400).json({ message: 'participantCount cannot exceed the slot capacity' });
        }

        const existingBookings = await SportsBooking.find({
            slot: booking.slot._id,
            bookingDate: {
                $gte: new Date(new Date(booking.bookingDate).setHours(0, 0, 0, 0)),
                $lte: new Date(new Date(booking.bookingDate).setHours(23, 59, 59, 999))
            },
            status: { $in: ACTIVE_BOOKING_STATUSES },
            _id: { $ne: booking._id }
        }).select('participantCount participants');

        const otherParticipants = existingBookings.reduce((sum, existingBooking) => sum + getBookingParticipantCount(existingBooking), 0);

        if (otherParticipants + participantCount > slotCapacity) {
            return res.status(400).json({ message: 'Not enough capacity left for that many players' });
        }

        booking.participantCount = participantCount;
        booking.minPlayersRequired = booking.isGroupBooking
            ? Math.max(booking.slot?.minPlayersRequired || 1, participantCount)
            : participantCount;

        await booking.save();

        return res.json(booking);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const cancelBooking = async (req, res) => {
    try {
        const booking = await SportsBooking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const isOwner = String(booking.user) === String(req.user._id);
        const isPrivileged = req.user.roles.some((role) => ['caretaker', 'admin', 'executive'].includes(role));

        if (!isOwner && !isPrivileged) {
            return res.status(403).json({ message: 'You are not allowed to cancel this booking' });
        }

        if (!CANCELLABLE_STATUSES.includes(booking.status)) {
            return res.status(400).json({ message: 'This booking can no longer be cancelled' });
        }

        booking.status = 'cancelled';
        booking.cancellationReason = req.body.reason;
        await booking.save();

        res.json(booking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const markAttendance = async (req, res) => {
    try {
        const { attendanceStatus } = req.body;
        const booking = await SportsBooking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (!['present', 'absent'].includes(attendanceStatus)) {
            return res.status(400).json({ message: 'attendanceStatus must be present or absent' });
        }

        booking.attendanceStatus = attendanceStatus;
        booking.status = attendanceStatus === 'present' ? 'completed' : 'no_show';
        await booking.save();

        res.json(booking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
