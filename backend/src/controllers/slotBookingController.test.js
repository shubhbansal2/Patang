import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChain, createMockRes } from '../test/helpers.js';

const {
  facilityFindMock,
  sportsSlotFindMock,
  sportsBookingFindMock,
  bookingFindMock,
  teamPracticeBlockFindMock,
  checkFairUseQuotaMock,
  checkUserSuspensionMock,
} = vi.hoisted(() => ({
  facilityFindMock: vi.fn(),
  sportsSlotFindMock: vi.fn(),
  sportsBookingFindMock: vi.fn(),
  bookingFindMock: vi.fn(),
  teamPracticeBlockFindMock: vi.fn(),
  checkFairUseQuotaMock: vi.fn(),
  checkUserSuspensionMock: vi.fn(),
}));

vi.mock('../models/Facility.js', () => ({
  default: {
    find: facilityFindMock,
  },
}));

vi.mock('../models/SportsSlot.js', () => ({
  default: {
    find: sportsSlotFindMock,
  },
}));

vi.mock('../models/SportsBooking.js', () => ({
  default: {
    find: sportsBookingFindMock,
  },
}));

vi.mock('../models/TeamPracticeBlock.js', () => ({
  default: {
    find: teamPracticeBlockFindMock,
  },
}));

vi.mock('../models/Booking.js', () => ({
  default: {
    find: bookingFindMock,
  },
}));

vi.mock('../models/SubscriptionV2.js', () => ({
  default: {},
}));

vi.mock('../models/SubscriptionPlan.js', () => ({
  default: {},
}));

vi.mock('../models/Penalty.js', () => ({
  default: {},
}));

vi.mock('../services/bookingService.js', () => ({
  checkFairUseQuota: checkFairUseQuotaMock,
  checkUserSuspension: checkUserSuspensionMock,
}));

vi.mock('../services/accessService.js', () => ({
  getFacilityOccupancySummary: vi.fn(),
}));

import { getSportsBookingPage } from './slotBookingController.js';

describe('slotBookingController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkFairUseQuotaMock.mockResolvedValue({ count: 0, allowed: true });
    checkUserSuspensionMock.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('falls back to the current IST bookable date when a stale date is requested', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-27T01:00:00+05:30'));

    facilityFindMock.mockReturnValueOnce(createChain([
      { _id: 'facility-1', name: 'Badminton Court 1', sportType: 'Badminton', location: 'Main Sports Complex', capacity: 4, metadata: {} },
    ]));
    sportsSlotFindMock.mockReturnValueOnce(createChain([]));
    sportsBookingFindMock
      .mockReturnValueOnce(createChain([]))
      .mockReturnValueOnce(createChain([]))
      .mockReturnValueOnce(createChain([]));
    bookingFindMock
      .mockReturnValueOnce(createChain([]))
      .mockReturnValueOnce(createChain([]));
    teamPracticeBlockFindMock.mockReturnValueOnce(createChain([]));

    const req = {
      user: { _id: 'user-1' },
      query: { sportType: 'Badminton', date: '2026-03-26' },
    };
    const res = createMockRes();

    await getSportsBookingPage(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.selectedDate).toBe('2026-03-27');
    expect(res.body.data.bookableDates.map((entry) => entry.date)).toEqual([
      '2026-03-27',
      '2026-03-28',
      '2026-03-29',
    ]);
  });

  it('includes active upcoming sports bookings in the activity feed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-27T00:30:00+05:30'));

    facilityFindMock.mockReturnValueOnce(createChain([
      { _id: 'facility-1', name: 'Badminton Court 2', sportType: 'Badminton', location: 'Main Sports Complex', capacity: 4, metadata: {} },
    ]));
    sportsSlotFindMock.mockReturnValueOnce(createChain([]));
    sportsBookingFindMock
      .mockReturnValueOnce(createChain([]))
      .mockReturnValueOnce(createChain([
        {
          _id: 'booking-1',
          slotStartAt: new Date('2026-03-27T01:30:00.000Z'),
          slotEndAt: new Date('2026-03-27T02:30:00.000Z'),
          status: 'confirmed',
          facility: { name: 'Badminton Court 2', sportType: 'Badminton' },
        },
      ]))
      .mockReturnValueOnce(createChain([]));
    bookingFindMock
      .mockReturnValueOnce(createChain([]))
      .mockReturnValueOnce(createChain([]));
    teamPracticeBlockFindMock.mockReturnValueOnce(createChain([]));

    const req = {
      user: { _id: 'user-1' },
      query: { sportType: 'Badminton', date: '2026-03-27' },
    };
    const res = createMockRes();

    await getSportsBookingPage(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.recentActivity).toHaveLength(1);
    expect(res.body.data.recentActivity[0]).toEqual(
      expect.objectContaining({
        facility: 'Badminton Court 2',
        status: 'confirmed',
        source: 'v2',
      })
    );
  });
});
