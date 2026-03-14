import TimeSlot from '../models/TimeSlot.js';
import Facility from '../models/Facility.js';
import { generateSlotTimes, dayjs } from '../utils/dateUtils.js';

/**
 * Generate time slots for a specific facility and date.
 * Skips creation if slots already exist for that facility+date.
 */
export const generateSlotsForFacilityDate = async (facility, date) => {
  const dateStart = dayjs.utc(date).startOf('day').toDate();

  // Check if slots already exist
  const existing = await TimeSlot.countDocuments({ facilityId: facility._id, date: dateStart });
  if (existing > 0) return [];

  const slotTimes = generateSlotTimes(
    dateStart,
    facility.operatingHours.start,
    facility.operatingHours.end,
    facility.slotDuration
  );

  const slots = slotTimes.map((st) => ({
    facilityId: facility._id,
    date: dateStart,
    startTime: st.startTime,
    endTime: st.endTime,
    status: 'Available',
  }));

  if (slots.length > 0) {
    return await TimeSlot.insertMany(slots);
  }
  return [];
};

/**
 * Generate slots for all bookable facilities for the next N days.
 */
export const generateSlotsForNextDays = async (days = 3) => {
  const facilities = await Facility.find({ isActive: true, isBookable: true });
  const results = [];

  for (let i = 0; i < days; i++) {
    const date = dayjs.utc().add(i, 'day').startOf('day');
    for (const facility of facilities) {
      const created = await generateSlotsForFacilityDate(facility, date);
      if (created.length > 0) {
        results.push({ facility: facility.name, date: date.format('YYYY-MM-DD'), slots: created.length });
      }
    }
  }

  return results;
};
