import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);

/**
 * Check if a date is within the next N days (inclusive of today).
 */
export const isWithinNextDays = (date, days = 3) => {
  const now = dayjs.utc().startOf('day');
  const target = dayjs.utc(date).startOf('day');
  const maxDate = now.add(days, 'day');
  return target.isSame(now) || (target.isAfter(now) && target.isBefore(maxDate.add(1, 'day')));
};

/**
 * Check if current time is within the cancellation grace period (>= 2 hours before slot start).
 */
export const isWithinCancellationGrace = (slotStartTime) => {
  const now = dayjs.utc();
  const cutoff = dayjs.utc(slotStartTime).subtract(2, 'hour');
  return now.isBefore(cutoff);
};

/**
 * Check if current time is within the check-in window (slot start to start + 15 min).
 */
export const isWithinCheckInWindow = (slotStartTime) => {
  const now = dayjs.utc();
  const start = dayjs.utc(slotStartTime);
  const end = start.add(15, 'minute');
  return (now.isSame(start) || now.isAfter(start)) && now.isBefore(end);
};

/**
 * Get date N hours from now.
 */
export const hoursFromNow = (hours) => {
  return dayjs.utc().add(hours, 'hour').toDate();
};

/**
 * Get date N days ago from now.
 */
export const daysAgo = (days) => {
  return dayjs.utc().subtract(days, 'day').toDate();
};

/**
 * Calculate subscription end date from plan.
 */
export const calculateEndDate = (startDate, plan) => {
  const start = dayjs.utc(startDate);
  switch (plan) {
    case 'Monthly':
      return start.add(30, 'day').toDate();
    case 'Semesterly':
      return start.add(180, 'day').toDate();
    case 'Yearly':
      return start.add(365, 'day').toDate();
    default:
      return start.add(30, 'day').toDate();
  }
};

/**
 * Generate time slots for a given date and operating hours.
 */
export const generateSlotTimes = (date, startHour, endHour, durationMinutes) => {
  const slots = [];
  const baseDate = dayjs.utc(date).startOf('day');
  const [startH, startM] = startHour.split(':').map(Number);
  const [endH, endM] = endHour.split(':').map(Number);

  let current = baseDate.hour(startH).minute(startM);
  const end = baseDate.hour(endH).minute(endM);

  while (current.add(durationMinutes, 'minute').isBefore(end) || 
         current.add(durationMinutes, 'minute').isSame(end)) {
    slots.push({
      startTime: current.toDate(),
      endTime: current.add(durationMinutes, 'minute').toDate(),
    });
    current = current.add(durationMinutes, 'minute');
  }

  return slots;
};

export { dayjs };
