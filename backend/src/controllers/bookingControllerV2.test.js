import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockRes } from '../test/helpers.js';

const {
  bookingCreateMock,
  bookingFindOneMock,
  bookingFindByIdMock,
  timeSlotFindByIdMock,
  timeSlotFindByIdAndUpdateMock,
  facilityFindByIdMock,
  userFindOneMock,
  checkUserSuspensionMock,
  checkFairUseQuotaMock,
  updateSlotStatusMock,
  createPenaltyMock,
  decodeBookingQRMock,
  generateBookingQRMock,
  createNotificationMock,
} = vi.hoisted(() => ({
  bookingCreateMock: vi.fn(),
  bookingFindOneMock: vi.fn(),
  bookingFindByIdMock: vi.fn(),
  timeSlotFindByIdMock: vi.fn(),
  timeSlotFindByIdAndUpdateMock: vi.fn(),
  facilityFindByIdMock: vi.fn(),
  userFindOneMock: vi.fn(),
  checkUserSuspensionMock: vi.fn(),
  checkFairUseQuotaMock: vi.fn(),
  updateSlotStatusMock: vi.fn(),
  createPenaltyMock: vi.fn(),
  decodeBookingQRMock: vi.fn(),
  generateBookingQRMock: vi.fn(() => 'qr-token'),
  createNotificationMock: vi.fn(),
}));

vi.mock('../models/Booking.js', () => ({
  default: {
    create: bookingCreateMock,
    findOne: bookingFindOneMock,
    findById: bookingFindByIdMock,
  },
}));

vi.mock('../models/TimeSlot.js', () => ({
  default: {
    findById: timeSlotFindByIdMock,
    findByIdAndUpdate: timeSlotFindByIdAndUpdateMock,
  },
}));

vi.mock('../models/Facility.js', () => ({
  default: {
    findById: facilityFindByIdMock,
  },
}));

vi.mock('../models/User.js', () => ({
  default: {
    findOne: userFindOneMock,
  },
}));

vi.mock('../services/bookingService.js', () => ({
  checkUserSuspension: checkUserSuspensionMock,
  checkFairUseQuota: checkFairUseQuotaMock,
  updateSlotStatus: updateSlotStatusMock,
}));

vi.mock('../services/penaltyService.js', () => ({
  createPenalty: createPenaltyMock,
}));

vi.mock('../services/qrService.js', () => ({
  decodeBookingQR: decodeBookingQRMock,
  generateBookingQR: generateBookingQRMock,
}));

vi.mock('../services/notificationService.js', () => ({
  createNotification: createNotificationMock,
}));

vi.mock('mongoose', () => ({
  default: {
    Types: {
      ObjectId: {
        isValid: vi.fn(() => true),
      },
    },
  },
}));

import {
  cancelBooking,
  checkIn,
  createBooking,
  joinGroupBooking,
} from './bookingControllerV2.js';

describe('bookingControllerV2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a confirmed booking when the user is eligible', async () => {
    checkUserSuspensionMock.mockResolvedValueOnce(null);
    checkFairUseQuotaMock.mockResolvedValueOnce({ allowed: true });
    facilityFindByIdMock.mockResolvedValueOnce({
      _id: 'facility-1',
      isOperational: true,
      capacity: 4,
      metadata: { minGroupSize: 3 },
    });
    timeSlotFindByIdMock.mockResolvedValueOnce({
      _id: 'slot-1',
      status: 'Available',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    bookingFindOneMock.mockResolvedValueOnce(null);
    updateSlotStatusMock.mockResolvedValueOnce({ _id: 'slot-1', status: 'Booked' });
    bookingCreateMock.mockResolvedValueOnce({
      _id: 'booking-1',
      userId: 'user-1',
      facilityId: 'facility-1',
      slotId: 'slot-1',
      status: 'Confirmed',
      isGroupBooking: false,
      bookingDate: new Date('2026-03-26T00:00:00.000Z'),
      slotDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const req = {
      body: { facilityId: 'facility-1', slotId: 'slot-1', isGroupBooking: false },
      user: { _id: 'user-1' },
    };
    const res = createMockRes();

    await createBooking(req, res);

    expect(updateSlotStatusMock).toHaveBeenCalledWith('slot-1', 'Available', 'Booked');
    expect(bookingCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        facilityId: 'facility-1',
        slotId: 'slot-1',
        status: 'Confirmed',
      })
    );
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.qrToken).toBe('qr-token');
  });

  it('blocks booking creation when the fair-use quota is exceeded', async () => {
    checkUserSuspensionMock.mockResolvedValueOnce(null);
    checkFairUseQuotaMock.mockResolvedValueOnce({ allowed: false });

    const req = {
      body: { facilityId: 'facility-1', slotId: 'slot-1' },
      user: { _id: 'user-1' },
    };
    const res = createMockRes();

    await createBooking(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('QUOTA_EXCEEDED');
    expect(facilityFindByIdMock).not.toHaveBeenCalled();
  });

  it('joins a group booking and confirms it when the group becomes full', async () => {
    const saveMock = vi.fn();
    bookingFindByIdMock.mockResolvedValueOnce({
      _id: 'booking-1',
      isGroupBooking: true,
      status: 'Provisioned',
      userId: 'owner-1',
      joinedUsers: ['member-1'],
      groupRequiredCount: 3,
      slotId: 'slot-1',
      save: saveMock,
    });
    checkFairUseQuotaMock.mockResolvedValueOnce({ allowed: true });
    updateSlotStatusMock.mockResolvedValueOnce({ _id: 'slot-1', status: 'Booked' });

    const req = { params: { bookingId: 'booking-1' }, user: { _id: 'member-2' } };
    const res = createMockRes();

    await joinGroupBooking(req, res);

    expect(updateSlotStatusMock).toHaveBeenCalledWith('slot-1', 'Reserved', 'Booked');
    expect(saveMock).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('Confirmed');
  });

  it('applies a late-cancellation penalty when the slot starts within two hours', async () => {
    const saveMock = vi.fn();
    bookingFindByIdMock.mockReturnValueOnce({
      populate: vi.fn().mockResolvedValue({
        _id: 'booking-1',
        userId: 'user-1',
        status: 'Confirmed',
        slotId: {
          _id: 'slot-1',
          startTime: new Date(Date.now() + 30 * 60 * 1000),
        },
        save: saveMock,
      }),
    });

    const req = {
      params: { bookingId: 'booking-1' },
      user: { _id: 'user-1' },
      body: { reason: 'Emergency' },
    };
    const res = createMockRes();

    await cancelBooking(req, res);

    expect(createPenaltyMock).toHaveBeenCalledWith(
      'user-1',
      'LateCancellation',
      'booking-1',
      'Late cancellation within 2 hours of slot start'
    );
    expect(timeSlotFindByIdAndUpdateMock).toHaveBeenCalledWith('slot-1', { status: 'Available' });
    expect(saveMock).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body.data.penaltyApplied).toBe(true);
  });

  it('checks in a user with a valid QR token inside the window', async () => {
    const saveMock = vi.fn();
    decodeBookingQRMock.mockReturnValueOnce({ bookingId: 'booking-1', userId: 'user-1' });
    bookingFindByIdMock.mockReturnValueOnce({
      populate: vi.fn().mockResolvedValue({
        _id: 'booking-1',
        userId: 'user-1',
        status: 'Confirmed',
        slotId: {
          startTime: new Date(Date.now() - 5 * 60 * 1000),
        },
        save: saveMock,
      }),
    });

    const req = {
      params: { bookingId: 'booking-1' },
      body: { qrToken: 'valid-token' },
      user: { _id: 'caretaker-1' },
    };
    const res = createMockRes();

    await checkIn(req, res);

    expect(saveMock).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Attended');
  });
});
