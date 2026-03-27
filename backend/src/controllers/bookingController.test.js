import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChain, createMockRes } from '../test/helpers.js';

const {
  sportsBookingFindByIdMock,
  sportsBookingFindMock,
  sportsBookingFindOneMock,
  sportsBookingCountDocumentsMock,
  sportsSlotFindByIdMock,
  facilityBlockFindOneMock,
  userFindOneMock,
} = vi.hoisted(() => ({
  sportsBookingFindByIdMock: vi.fn(),
  sportsBookingFindMock: vi.fn(),
  sportsBookingFindOneMock: vi.fn(),
  sportsBookingCountDocumentsMock: vi.fn(),
  sportsSlotFindByIdMock: vi.fn(),
  facilityBlockFindOneMock: vi.fn(),
  userFindOneMock: vi.fn(),
}));

vi.mock('../models/Facility.js', () => ({
  default: {},
}));

vi.mock('../models/User.js', () => ({
  default: {
    findOne: userFindOneMock,
  },
}));

vi.mock('../models/SportsSlot.js', () => ({
  default: {
    findById: sportsSlotFindByIdMock,
  },
}));

vi.mock('../models/FacilityBlock.js', () => ({
  default: {
    findOne: facilityBlockFindOneMock,
  },
}));

vi.mock('../models/SportsBooking.js', () => ({
  default: {
    findById: sportsBookingFindByIdMock,
    find: sportsBookingFindMock,
    findOne: sportsBookingFindOneMock,
    countDocuments: sportsBookingCountDocumentsMock,
  },
}));

import { checkAvailability, listBookingsForCaretaker, updateBooking, verifyAttendeeForCaretaker } from './bookingController.js';

describe('bookingController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates participant count for an active booking', async () => {
    const saveMock = vi.fn();
    sportsBookingFindByIdMock.mockReturnValueOnce(createChain({
      _id: 'booking-1',
      user: 'user-1',
      status: 'confirmed',
      isGroupBooking: false,
      bookingDate: new Date('2026-03-27T00:00:00.000Z'),
      participantCount: 1,
      slot: { _id: 'slot-1', capacity: 4, minPlayersRequired: 2 },
      facility: { capacity: 4 },
      save: saveMock,
    }));
    sportsBookingFindMock.mockReturnValueOnce(createChain([]));

    const req = {
      params: { id: 'booking-1' },
      body: { participantCount: 3 },
      user: { _id: 'user-1', roles: ['student'] },
    };
    const res = createMockRes();

    await updateBooking(req, res);

    expect(saveMock).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body.participantCount).toBe(3);
    expect(res.body.minPlayersRequired).toBe(3);
  });

  it('rejects updates that exceed remaining slot capacity', async () => {
    sportsBookingFindByIdMock.mockReturnValueOnce(createChain({
      _id: 'booking-1',
      user: 'user-1',
      status: 'confirmed',
      isGroupBooking: false,
      bookingDate: new Date('2026-03-27T00:00:00.000Z'),
      participantCount: 1,
      slot: { _id: 'slot-1', capacity: 4, minPlayersRequired: 2 },
      facility: { capacity: 4 },
      save: vi.fn(),
    }));
    sportsBookingFindMock.mockReturnValueOnce(createChain([
      { participantCount: 3, participants: ['user-2', 'user-3', 'user-4'] },
    ]));

    const req = {
      params: { id: 'booking-1' },
      body: { participantCount: 2 },
      user: { _id: 'user-1', roles: ['student'] },
    };
    const res = createMockRes();

    await updateBooking(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Not enough capacity left for that many players');
  });

  it('rejects booking updates from a different non-admin user', async () => {
    sportsBookingFindByIdMock.mockReturnValueOnce(createChain({
      _id: 'booking-1',
      user: 'owner-1',
      status: 'confirmed',
      participantCount: 1,
      slot: { _id: 'slot-1', capacity: 4, minPlayersRequired: 1 },
      facility: { capacity: 4 },
      save: vi.fn(),
    }));

    const req = {
      params: { id: 'booking-1' },
      body: { participantCount: 2 },
      user: { _id: 'other-user', roles: ['student'] },
    };
    const res = createMockRes();

    await updateBooking(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('You are not allowed to modify this booking');
  });

  it('returns participant-aware remaining capacity for slot availability checks', async () => {
    sportsSlotFindByIdMock.mockReturnValueOnce(createChain({
      _id: 'slot-1',
      isActive: true,
      startTime: '07:00',
      endTime: '08:00',
      capacity: 6,
      facility: {
        _id: 'facility-1',
        name: 'Badminton Court 2',
      },
    }));
    sportsBookingFindMock.mockReturnValueOnce(createChain([
      { participantCount: 4 },
      { participants: ['user-2'] },
    ]));
    sportsBookingCountDocumentsMock.mockResolvedValueOnce(1);
    facilityBlockFindOneMock.mockResolvedValueOnce(null);

    const req = {
      query: { slotId: 'slot-1', bookingDate: '2026-03-27' },
      user: { _id: 'user-1' },
    };
    const res = createMockRes();

    await checkAvailability(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.activeBookings).toBe(5);
    expect(res.body.remainingCapacity).toBe(1);
    expect(res.body.userQuotaUsage).toBe(1);
  });

  it('marks slot availability as blocked when a facility block overlaps', async () => {
    sportsSlotFindByIdMock.mockReturnValueOnce(createChain({
      _id: 'slot-1',
      isActive: true,
      startTime: '07:00',
      endTime: '08:00',
      capacity: 4,
      facility: {
        _id: 'facility-1',
        name: 'Badminton Court 2',
      },
    }));
    sportsBookingFindMock.mockReturnValueOnce(createChain([]));
    sportsBookingCountDocumentsMock.mockResolvedValueOnce(0);
    facilityBlockFindOneMock.mockResolvedValueOnce({ reason: 'Maintenance' });

    const req = {
      query: { slotId: 'slot-1', bookingDate: '2026-03-27' },
      user: { _id: 'user-1' },
    };
    const res = createMockRes();

    await checkAvailability(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.isBlocked).toBe(true);
    expect(res.body.blockReason).toBe('Maintenance');
  });

  it('requires slotId and bookingDate for availability checks', async () => {
    const req = {
      query: { slotId: 'slot-1' },
      user: { _id: 'user-1' },
    };
    const res = createMockRes();

    await checkAvailability(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('slotId and bookingDate are required');
  });

  it('lists caretaker bookings scoped to assigned facilities', async () => {
    sportsBookingFindMock.mockReturnValueOnce(createChain([
      {
        _id: 'booking-1',
        status: 'confirmed',
        attendanceStatus: 'pending',
        slotStartAt: new Date('2026-03-27T01:30:00.000Z'),
        slotEndAt: new Date('2026-03-27T02:30:00.000Z'),
        participantCount: 2,
        isGroupBooking: false,
        facility: { _id: 'facility-1', name: 'Badminton Court 1', sportType: 'Badminton' },
        slot: { startTime: '07:00', endTime: '08:00' },
        user: { name: 'Patang Student', email: 'student@iitk.ac.in', profileDetails: { rollNumber: '230001' } },
      },
    ]));

    const req = {
      query: { date: '2026-03-27' },
      user: { roles: ['caretaker'], profileDetails: { assignedFacilities: ['facility-1'] } },
    };
    const res = createMockRes();

    await listBookingsForCaretaker(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.bookings).toHaveLength(1);
    expect(res.body.bookings[0]).toEqual(
      expect.objectContaining({
        status: 'confirmed',
        participantCount: 2,
      })
    );
  });

  it('verifies an attendee identifier against an active sports booking', async () => {
    userFindOneMock.mockReturnValueOnce(createChain({
      _id: 'user-1',
      name: 'Patang Student',
      email: 'student@iitk.ac.in',
      profileDetails: { rollNumber: '230001' },
    }));
    sportsBookingFindOneMock.mockReturnValueOnce(createChain({
      _id: 'booking-1',
      status: 'confirmed',
      attendanceStatus: 'pending',
      slotStartAt: new Date('2026-03-27T01:30:00.000Z'),
      slotEndAt: new Date('2026-03-27T02:30:00.000Z'),
      participantCount: 2,
      facility: { name: 'Badminton Court 1', sportType: 'Badminton' },
      slot: { startTime: '07:00', endTime: '08:00' },
      user: { name: 'Patang Student', email: 'student@iitk.ac.in', profileDetails: { rollNumber: '230001' } },
    }));

    const req = {
      body: { identifier: '230001', bookingId: 'booking-1' },
      user: { roles: ['caretaker'], profileDetails: { assignedFacilities: ['facility-1'] } },
    };
    const res = createMockRes();

    await verifyAttendeeForCaretaker(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.booking).toEqual(
      expect.objectContaining({
        status: 'confirmed',
        participantCount: 2,
      })
    );
  });

  it('returns an invalid verification payload when caretaker identifier does not match a user', async () => {
    userFindOneMock.mockReturnValueOnce(createChain(null));

    const req = {
      body: { identifier: 'missing-roll', bookingId: 'booking-1' },
      user: { roles: ['caretaker'], profileDetails: { assignedFacilities: ['facility-1'] } },
    };
    const res = createMockRes();

    await verifyAttendeeForCaretaker(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      valid: false,
      reason: 'No user found for the provided identifier',
    });
  });
});
