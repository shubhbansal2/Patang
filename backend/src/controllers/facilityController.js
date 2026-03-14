import Facility from '../models/Facility.js';
import TimeSlot from '../models/TimeSlot.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { isWithinNextDays, dayjs } from '../utils/dateUtils.js';
import { generateSlotsForFacilityDate } from '../services/slotGeneratorService.js';

/**
 * GET /api/facilities
 * List all active facilities with optional filters.
 */
export const listFacilities = async (req, res) => {
  try {
    const filter = { isActive: true };

    if (req.query.sportType) {
      filter.sportType = req.query.sportType;
    }
    if (req.query.isBookable !== undefined) {
      filter.isBookable = req.query.isBookable === 'true';
    }

    const facilities = await Facility.find(filter);
    return successResponse(res, facilities);
  } catch (error) {
    return errorResponse(res, 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * GET /api/facilities/:facilityId/availability
 * Get available time slots for a specific facility on a given date.
 */
export const getAvailability = async (req, res) => {
  try {
    const { facilityId } = req.params;
    const { date } = req.query;

    if (!date) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Date query parameter is required', 400);
    }

    // Validate date format and range
    const parsedDate = dayjs.utc(date, 'YYYY-MM-DD', true);
    if (!parsedDate.isValid()) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD', 400);
    }

    if (!isWithinNextDays(parsedDate, 3)) {
      return errorResponse(res, 'DATE_OUT_OF_RANGE', 'Date must be today or within the next 3 days', 400);
    }

    // Verify facility exists and is active
    const facility = await Facility.findOne({ _id: facilityId, isActive: true });
    if (!facility) {
      return errorResponse(res, 'FACILITY_NOT_FOUND', 'Facility not found', 404);
    }

    // Generate slots on-demand if they don't exist
    await generateSlotsForFacilityDate(facility, parsedDate.toDate());

    const dateStart = parsedDate.startOf('day').toDate();
    const slots = await TimeSlot.find({ facilityId, date: dateStart }).sort({ startTime: 1 });

    return successResponse(res, {
      facility: { _id: facility._id, name: facility.name },
      date: parsedDate.format('YYYY-MM-DD'),
      slots,
    });
  } catch (error) {
    return errorResponse(res, 'SERVER_ERROR', error.message, 500);
  }
};
