import Event from '../models/Event.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * GET /api/events
 * Fetch approved events for the public calendar.
 */
export const getPublicEvents = async (req, res) => {
  try {
    const { category, startDate, endDate, club, page = 1, limit = 20 } = req.query;
    const filter = { status: 'Approved' };

    if (category) filter.category = category;
    if (club) filter.organizingClub = { $regex: club, $options: 'i' };

    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) filter.startTime.$gte = new Date(startDate);
      if (endDate) filter.startTime.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Event.countDocuments(filter);

    const events = await Event.find(filter)
      .populate('createdBy', 'name email')
      .sort({ startTime: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    return successResponse(res, {
      events,
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
 * POST /api/events
 * Submit a new event proposal for executive review.
 */
export const createEvent = async (req, res) => {
  try {
    const { title, description, category, startTime, endTime, venue, organizingClub, registrationLink } = req.body;
    const createdBy = req.user._id;

    // Validation
    if (!title || title.length > 200) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Title is required and must be under 200 characters', 400);
    }
    if (!description || description.length > 2000) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Description is required and must be under 2000 characters', 400);
    }
    if (!category) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Category is required', 400);
    }
    if (!startTime || new Date(startTime) <= new Date()) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Start time must be in the future', 400);
    }
    if (!endTime || new Date(endTime) <= new Date(startTime)) {
      return errorResponse(res, 'VALIDATION_ERROR', 'End time must be after start time', 400);
    }
    if (!organizingClub) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Organizing club is required', 400);
    }

    const eventData = {
      title,
      description,
      category,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      venue: venue || null,
      organizingClub,
      registrationLink: registrationLink || null,
      createdBy,
    };

    // Handle poster upload
    if (req.file) {
      eventData.posterUrl = `/uploads/posters/${req.file.filename}`;
    }

    const event = await Event.create(eventData);

    return successResponse(res, {
      _id: event._id,
      title: event.title,
      status: event.status,
    }, 'Event proposal submitted for review', 201);
  } catch (error) {
    return errorResponse(res, 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * GET /api/events/my
 * Fetch events created by the authenticated coordinator.
 */
export const getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    return successResponse(res, events);
  } catch (error) {
    return errorResponse(res, 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * PUT /api/events/:eventId
 * Update an existing event (only owner, only if Pending or ChangesRequested).
 */
export const updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;

    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(res, 'EVENT_NOT_FOUND', 'Event not found', 404);
    }

    if (event.createdBy.toString() !== userId.toString()) {
      return errorResponse(res, 'NOT_OWNER', 'You can only edit your own events', 403);
    }

    if (!['Pending', 'ChangesRequested'].includes(event.status)) {
      return errorResponse(res, 'CANNOT_EDIT', 'Event cannot be edited in its current status', 400);
    }

    const allowedFields = ['title', 'description', 'category', 'startTime', 'endTime',
                           'venue', 'organizingClub', 'registrationLink'];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        event[field] = field.includes('Time') ? new Date(req.body[field]) : req.body[field];
      }
    }

    // Handle poster upload
    if (req.file) {
      event.posterUrl = `/uploads/posters/${req.file.filename}`;
    }

    // Reset status to Pending if it was ChangesRequested
    if (event.status === 'ChangesRequested') {
      event.status = 'Pending';
    }

    await event.save();

    return successResponse(res, event, 'Event updated successfully');
  } catch (error) {
    return errorResponse(res, 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * DELETE /api/events/:eventId
 * Cancel an event (creator, executive, or admin).
 */
export const cancelEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;
    const userRoles = req.user.roles;

    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(res, 'EVENT_NOT_FOUND', 'Event not found', 404);
    }

    const isOwner = event.createdBy.toString() === userId.toString();
    const isAdmin = userRoles.some(r => ['admin', 'executive'].includes(r));

    if (!isOwner && !isAdmin) {
      return errorResponse(res, 'NOT_AUTHORIZED', 'You are not authorized to cancel this event', 403);
    }

    event.status = 'Cancelled';
    await event.save();

    return successResponse(res, { status: 'Cancelled' }, 'Event cancelled');
  } catch (error) {
    return errorResponse(res, 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * GET /api/admin/events/pending
 * Get all events pending executive review.
 */
export const getPendingEvents = async (req, res) => {
  try {
    const events = await Event.find({ status: 'Pending' })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return successResponse(res, events);
  } catch (error) {
    return errorResponse(res, 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * PATCH /api/admin/events/:eventId
 * Approve, reject, or request changes for an event.
 */
export const reviewEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { action, rejectionReason, changeRequestNote } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(res, 'EVENT_NOT_FOUND', 'Event not found', 404);
    }

    if (event.status !== 'Pending') {
      return errorResponse(res, 'CANNOT_REVIEW', 'Only pending events can be reviewed', 400);
    }

    switch (action) {
      case 'approve':
        event.status = 'Approved';
        event.reviewedBy = req.user._id;
        event.reviewedAt = new Date();
        await event.save();
        return successResponse(res, {
          status: 'Approved',
          reviewedAt: event.reviewedAt,
        }, 'Event approved');

      case 'reject':
        if (!rejectionReason) {
          return errorResponse(res, 'VALIDATION_ERROR', 'Rejection reason is required', 400);
        }
        event.status = 'Rejected';
        event.rejectionReason = rejectionReason;
        event.reviewedBy = req.user._id;
        event.reviewedAt = new Date();
        await event.save();
        return successResponse(res, {
          status: 'Rejected',
          rejectionReason,
        }, 'Event rejected');

      case 'requestChanges':
        if (!changeRequestNote) {
          return errorResponse(res, 'VALIDATION_ERROR', 'Change request note is required', 400);
        }
        event.status = 'ChangesRequested';
        event.changeRequestNote = changeRequestNote;
        event.reviewedBy = req.user._id;
        event.reviewedAt = new Date();
        await event.save();
        return successResponse(res, {
          status: 'ChangesRequested',
          changeRequestNote,
        }, 'Changes requested');

      default:
        return errorResponse(res, 'VALIDATION_ERROR',
          'Action must be "approve", "reject", or "requestChanges"', 400);
    }
  } catch (error) {
    return errorResponse(res, 'SERVER_ERROR', error.message, 500);
  }
};
