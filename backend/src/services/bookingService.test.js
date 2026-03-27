import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  penaltyFindOneMock,
  bookingCountDocumentsMock,
  sportsBookingCountDocumentsMock,
  timeSlotFindByIdMock,
  bookingFindOneMock,
  timeSlotFindOneAndUpdateMock,
} = vi.hoisted(() => ({
  penaltyFindOneMock: vi.fn(),
  bookingCountDocumentsMock: vi.fn(),
  sportsBookingCountDocumentsMock: vi.fn(),
  timeSlotFindByIdMock: vi.fn(),
  bookingFindOneMock: vi.fn(),
  timeSlotFindOneAndUpdateMock: vi.fn(),
}));

vi.mock('../models/Penalty.js', () => ({
  default: {
    findOne: penaltyFindOneMock,
  },
}));

vi.mock('../models/Booking.js', () => ({
  default: {
    countDocuments: bookingCountDocumentsMock,
    findOne: bookingFindOneMock,
  },
}));

vi.mock('../models/SportsBooking.js', () => ({
  default: {
    countDocuments: sportsBookingCountDocumentsMock,
  },
}));

vi.mock('../models/TimeSlot.js', () => ({
  default: {
    findById: timeSlotFindByIdMock,
    findOneAndUpdate: timeSlotFindOneAndUpdateMock,
  },
}));

import { checkFairUseQuota } from './bookingService.js';

describe('bookingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('counts both legacy and sports bookings for the fair-use quota', async () => {
    bookingCountDocumentsMock.mockResolvedValueOnce(1);
    sportsBookingCountDocumentsMock.mockResolvedValueOnce(1);

    const result = await checkFairUseQuota('user-1');

    expect(result).toEqual({ count: 2, allowed: false });
    expect(bookingCountDocumentsMock).toHaveBeenCalledTimes(1);
    expect(sportsBookingCountDocumentsMock).toHaveBeenCalledTimes(1);
  });
});
