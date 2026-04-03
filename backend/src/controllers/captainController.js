import Facility from '../models/Facility.js';
import TeamPracticeBlock from '../models/TeamPracticeBlock.js';
import SportsBooking from '../models/SportsBooking.js';
import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const normalizeSport = (value) => String(value || '').trim().toLowerCase();

const canCaptainSelfApprove = (captainSport, facilitySport) => (
    normalizeSport(captainSport) &&
    normalizeSport(captainSport) === normalizeSport(facilitySport)
);

const resolveOperationalFacility = async (facilityId) => {
    const facility = await Facility.findById(facilityId).lean();
    if (!facility) {
        return null;
    }

    if (facility.facilityType === 'sports' && facility.isOperational !== false) {
        return facility;
    }

    const canonicalFacility = await Facility.findOne({
        facilityType: 'sports',
        isOperational: true,
        sportType: facility.sportType,
        name: facility.name
    }).lean();

    return canonicalFacility || facility;
};

const findTargetCaptain = async (requestingCaptainId, facilitySport) => {
    const normalizedFacilitySport = String(facilitySport || '').trim();
    if (!normalizedFacilitySport) {
        return null;
    }

    return User.findOne({
        roles: 'captain',
        captainOf: normalizedFacilitySport,
        status: 'active',
        _id: { $ne: requestingCaptainId }
    })
        .select('_id name email captainOf')
        .lean();
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. CREATE TEAM PRACTICE BLOCK
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/captain/practice-blocks
 *
 * Captain requests a practice block for a specific future date.
 * Same-sport facilities are approved immediately; other facilities go to executive.
 *
 * Body: { facilityId, practiceDate, startTime, endTime, notes }
 */
export const createTeamPracticeBlock = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        // Verify user is a captain with a sport assigned
        if (!req.user.roles.includes('captain')) {
            return errorResponse(res, 403, 'FORBIDDEN', 'Only captains can create practice blocks');
        }

        // Bypass NO_SPORT_ASSIGNED check since a captain might be allowed to book anyway.
        // if (!req.user.captainOf) {
        //     return errorResponse(res, 400, 'NO_SPORT_ASSIGNED', 'You have not been assigned a sport. Contact an executive.');
        // }

        const { facilityId, practiceDate, startTime, endTime, notes } = req.body;

        // Validation
        if (!facilityId) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Facility ID is required');
        }
        if (!practiceDate) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Practice date is required');
        }
        if (!startTime || !endTime) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Start time and end time are required (e.g. "06:00", "08:00")');
        }

        // Validate time format (HH:MM)
        const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Times must be in HH:MM format (e.g. "06:00")');
        }

        if (startTime >= endTime) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'End time must be after start time');
        }

        const normalizedPracticeDate = new Date(practiceDate);
        if (Number.isNaN(normalizedPracticeDate.getTime())) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Practice date must be a valid date');
        }

        const startOfRequestedDay = new Date(normalizedPracticeDate);
        startOfRequestedDay.setHours(0, 0, 0, 0);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        if (startOfRequestedDay < startOfToday) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Practice date must be today or in the future');
        }

        // Verify facility exists and matches captain's sport
        const facility = await resolveOperationalFacility(facilityId);
        if (!facility) {
            return errorResponse(res, 404, 'FACILITY_NOT_FOUND', 'Facility not found');
        }

        // Remove strict sport mismatch block so captains can book any allowed facility
        // if (facility.sportType !== req.user.captainOf) {
        //     return errorResponse(res, 403, 'SPORT_MISMATCH',
        //         `You are captain of ${req.user.captainOf} but this facility is for ${facility.sportType || 'unknown sport'}`
        //     );
        // }

        // Check if captain already has an active/pending block for this facility
        const existingBlock = await TeamPracticeBlock.findOne({
            captain: req.user._id,
            facility: facility._id,
            practiceDate: startOfRequestedDay,
            status: { $in: ['pending', 'approved'] }
        }).lean();

        if (existingBlock) {
            return errorResponse(res, 409, 'BLOCK_EXISTS',
                'You already have an active or pending practice block for this facility on the selected date. Edit or cancel it first.',
                { existingBlockId: existingBlock._id, existingStatus: existingBlock.status }
            );
        }

        const daysOfWeek = [startOfRequestedDay.getDay()];

        const selfApproved = canCaptainSelfApprove(req.user.captainOf, facility.sportType);
        const targetCaptain = selfApproved
            ? null
            : await findTargetCaptain(req.user._id, facility.sportType);

        const block = await TeamPracticeBlock.create({
            captain: req.user._id,
            facility: facility._id,
            sport: req.user.captainOf || facility.sportType || 'General',
            practiceDate: startOfRequestedDay,
            startTime,
            endTime,
            daysOfWeek,
            status: selfApproved ? 'approved' : 'pending',
            targetCaptain: targetCaptain?._id || null,
            notes: notes?.trim() || null
        });

        const responseMessage = selfApproved
            ? 'Practice block approved and reserved immediately.'
            : targetCaptain
                ? `Practice block request submitted for ${targetCaptain.captainOf || facility.sportType} captain approval.`
                : 'Practice block request submitted for executive approval.';

        return successResponse(res, 201, {
            _id: block._id,
            facility: facility.name,
            sport: block.sport,
            practiceDate: block.practiceDate,
            startTime: block.startTime,
            endTime: block.endTime,
            daysOfWeek: block.daysOfWeek,
            status: block.status,
            pendingWith: targetCaptain
                ? {
                    _id: targetCaptain._id,
                    name: targetCaptain.name,
                    email: targetCaptain.email,
                    captainOf: targetCaptain.captainOf
                }
                : null,
            message: responseMessage
        }, responseMessage.replace(/\.$/, ''));
    } catch (error) {
        console.error('[Captain/CreateBlock] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. GET MY PRACTICE BLOCKS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/captain/practice-blocks
 *
 * Returns all practice blocks belonging to the current captain.
 */
export const getMyPracticeBlocks = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const blocks = await TeamPracticeBlock.find({ captain: req.user._id })
            .populate('facility', 'name sportType location')
            .populate('reviewedBy', 'name')
            .populate('targetCaptain', 'name email captainOf')
            .sort({ createdAt: -1 })
            .maxTimeMS(5000)
            .lean();

        return successResponse(res, 200, {
            blocks: blocks.map(b => ({
                _id: b._id,
                facility: b.facility,
                sport: b.sport,
                practiceDate: b.practiceDate,
                startTime: b.startTime,
                endTime: b.endTime,
                daysOfWeek: b.daysOfWeek,
                status: b.status,
                reviewedBy: b.reviewedBy?.name || null,
                pendingWith: b.targetCaptain ? {
                    _id: b.targetCaptain._id,
                    name: b.targetCaptain.name,
                    email: b.targetCaptain.email,
                    captainOf: b.targetCaptain.captainOf
                } : null,
                reviewedAt: b.reviewedAt,
                rejectionReason: b.rejectionReason,
                notes: b.notes,
                createdAt: b.createdAt
            }))
        });
    } catch (error) {
        console.error('[Captain/GetBlocks] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. GET INCOMING PRACTICE BLOCK REVIEWS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/captain/practice-blocks/incoming
 *
 * Returns pending cross-sport blocks that require this captain's review.
 */
export const getIncomingPracticeBlockRequests = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const blocks = await TeamPracticeBlock.find({
            status: 'pending',
            targetCaptain: req.user._id
        })
            .populate('captain', 'name email captainOf profileDetails.rollNumber')
            .populate('facility', 'name sportType location')
            .sort({ createdAt: 1 })
            .maxTimeMS(5000)
            .lean();

        return successResponse(res, 200, {
            incomingBlocks: blocks.map((block) => ({
                _id: block._id,
                captain: {
                    _id: block.captain?._id,
                    name: block.captain?.name,
                    email: block.captain?.email,
                    captainOf: block.captain?.captainOf || null,
                    rollNumber: block.captain?.profileDetails?.rollNumber || null
                },
                facility: block.facility,
                sport: block.sport,
                practiceDate: block.practiceDate,
                startTime: block.startTime,
                endTime: block.endTime,
                daysOfWeek: block.daysOfWeek,
                notes: block.notes,
                createdAt: block.createdAt
            }))
        });
    } catch (error) {
        console.error('[Captain/GetIncomingBlocks] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. REVIEW INCOMING PRACTICE BLOCK
// ═════════════════════════════════════════════════════════════════════════════

/**
 * PATCH /api/captain/practice-blocks/:blockId/review
 *
 * Approve or reject a cross-sport request sent to this captain.
 */
export const reviewIncomingPracticeBlock = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const { blockId } = req.params;
        const { action, rejectionReason } = req.body;

        if (!['approve', 'reject'].includes(action)) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'action must be "approve" or "reject"');
        }

        const block = await TeamPracticeBlock.findById(blockId)
            .populate('facility', 'name sportType')
            .populate('captain', 'name captainOf');

        if (!block) {
            return errorResponse(res, 404, 'BLOCK_NOT_FOUND', 'Practice block not found');
        }

        if (String(block.targetCaptain || '') !== String(req.user._id)) {
            return errorResponse(res, 403, 'FORBIDDEN', 'This request is not assigned to you');
        }

        if (block.status !== 'pending') {
            return errorResponse(res, 400, 'NOT_PENDING', `Block is already ${block.status}, cannot review`);
        }

        block.reviewedBy = req.user._id;
        block.reviewedAt = new Date();
        block.rejectionReason = null;

        if (action === 'reject') {
            block.status = 'rejected';
            block.rejectionReason = rejectionReason?.trim() || null;
            await block.save();

            return successResponse(res, 200, {
                _id: block._id,
                status: block.status,
                rejectionReason: block.rejectionReason
            }, 'Practice block rejected');
        }

        block.status = 'approved';
        await block.save();

        return successResponse(res, 200, {
            _id: block._id,
            status: block.status,
            facility: block.facility?.name,
            captain: block.captain?.name
        }, 'Practice block approved');
    } catch (error) {
        console.error('[Captain/ReviewIncomingBlock] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 5. EDIT TEAM PRACTICE BLOCK
// ═════════════════════════════════════════════════════════════════════════════

/**
 * PATCH /api/captain/practice-blocks/:blockId
 *
 * Captain edits their practice block timings.
 * Resets status to 'pending' for executive re-approval.
 *
 * Body: { practiceDate, startTime, endTime, notes }
 */
export const editTeamPracticeBlock = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const { blockId } = req.params;
        const { practiceDate, startTime, endTime, notes } = req.body;

        const block = await TeamPracticeBlock.findById(blockId);
        if (!block) {
            return errorResponse(res, 404, 'BLOCK_NOT_FOUND', 'Practice block not found');
        }

        // Verify ownership
        if (String(block.captain) !== String(req.user._id)) {
            return errorResponse(res, 403, 'NOT_OWNER', 'You can only edit your own practice blocks');
        }

        if (block.status === 'cancelled') {
            return errorResponse(res, 400, 'BLOCK_CANCELLED', 'Cannot edit a cancelled block. Create a new one instead.');
        }

        // Validate times if provided
        const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

        if (startTime !== undefined) {
            if (!timePattern.test(startTime)) {
                return errorResponse(res, 400, 'VALIDATION_ERROR', 'Start time must be in HH:MM format');
            }
            block.startTime = startTime;
        }

        if (endTime !== undefined) {
            if (!timePattern.test(endTime)) {
                return errorResponse(res, 400, 'VALIDATION_ERROR', 'End time must be in HH:MM format');
            }
            block.endTime = endTime;
        }

        if (block.startTime >= block.endTime) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'End time must be after start time');
        }

        if (practiceDate !== undefined) {
            const normalizedPracticeDate = new Date(practiceDate);
            if (Number.isNaN(normalizedPracticeDate.getTime())) {
                return errorResponse(res, 400, 'VALIDATION_ERROR', 'Practice date must be a valid date');
            }

            const startOfRequestedDay = new Date(normalizedPracticeDate);
            startOfRequestedDay.setHours(0, 0, 0, 0);
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            if (startOfRequestedDay < startOfToday) {
                return errorResponse(res, 400, 'VALIDATION_ERROR', 'Practice date must be today or in the future');
            }

            block.practiceDate = startOfRequestedDay;
            block.daysOfWeek = [startOfRequestedDay.getDay()];
        }

        if (notes !== undefined) {
            block.notes = notes?.trim() || null;
        }

        const facility = await resolveOperationalFacility(block.facility);
        if (facility?._id && String(block.facility) !== String(facility._id)) {
            block.facility = facility._id;
        }
        const selfApproved = canCaptainSelfApprove(req.user.captainOf, facility?.sportType);

        block.status = selfApproved ? 'approved' : 'pending';
        block.reviewedBy = null;
        block.reviewedAt = null;
        block.rejectionReason = null;
        block.targetCaptain = selfApproved
            ? null
            : (await findTargetCaptain(req.user._id, facility?.sportType))?._id || null;

        await block.save();

        const updateMessage = selfApproved
            ? 'Practice block updated and remains reserved immediately.'
            : block.targetCaptain
                ? 'Practice block updated. Sent for the facility captain review.'
                : 'Practice block updated. Sent for executive re-approval.';

        return successResponse(res, 200, {
            _id: block._id,
            practiceDate: block.practiceDate,
            startTime: block.startTime,
            endTime: block.endTime,
            status: block.status,
            notes: block.notes
        }, updateMessage);
    } catch (error) {
        console.error('[Captain/EditBlock] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. CANCEL TEAM PRACTICE BLOCK
// ═════════════════════════════════════════════════════════════════════════════

/**
 * DELETE /api/captain/practice-blocks/:blockId
 *
 * Captain cancels their practice block.
 */
export const cancelTeamPracticeBlock = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const { blockId } = req.params;

        const block = await TeamPracticeBlock.findById(blockId);
        if (!block) {
            return errorResponse(res, 404, 'BLOCK_NOT_FOUND', 'Practice block not found');
        }

        // Verify ownership
        if (String(block.captain) !== String(req.user._id)) {
            return errorResponse(res, 403, 'NOT_OWNER', 'You can only cancel your own practice blocks');
        }

        if (block.status === 'cancelled') {
            return errorResponse(res, 400, 'ALREADY_CANCELLED', 'This block is already cancelled');
        }

        block.status = 'cancelled';
        await block.save();

        return successResponse(res, 200, {
            _id: block._id,
            status: 'cancelled'
        }, 'Practice block cancelled successfully');
    } catch (error) {
        console.error('[Captain/CancelBlock] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};
