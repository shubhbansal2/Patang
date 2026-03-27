import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  accessLogFindOneMock,
  accessLogAggregateMock,
  accessLogCreateMock,
  facilityFindOneMock,
} = vi.hoisted(() => ({
  accessLogFindOneMock: vi.fn(),
  accessLogAggregateMock: vi.fn(),
  accessLogCreateMock: vi.fn(),
  facilityFindOneMock: vi.fn(),
}));

vi.mock('../models/AccessLog.js', () => ({
  default: {
    findOne: accessLogFindOneMock,
    aggregate: accessLogAggregateMock,
    create: accessLogCreateMock,
  },
}));

vi.mock('../models/Facility.js', () => ({
  default: {
    findOne: facilityFindOneMock,
  },
}));

import {
  createAccessLog,
  getFacilityOccupancySummary,
  getLatestAccessAction,
  getScopedSubscriptionTypes,
  normalizeFacilityType,
  normalizeSubscriptionType,
  parseSubscriptionScanPayload,
} from './accessService.js';

describe('accessService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes gym and swimming facility names both ways', () => {
    expect(normalizeFacilityType('Gym')).toBe('gym');
    expect(normalizeFacilityType('SwimmingPool')).toBe('swimming');
    expect(normalizeSubscriptionType('gym')).toBe('Gym');
    expect(normalizeSubscriptionType('swimming')).toBe('SwimmingPool');
  });

  it('scopes allowed subscription types by role and requested type', () => {
    expect(getScopedSubscriptionTypes(['admin'])).toEqual(['Gym', 'SwimmingPool']);
    expect(getScopedSubscriptionTypes(['gym_admin'])).toEqual(['Gym']);
    expect(getScopedSubscriptionTypes(['swim_admin'])).toEqual(['SwimmingPool']);
    expect(getScopedSubscriptionTypes(['gym_admin'], 'SwimmingPool')).toEqual([]);
    expect(getScopedSubscriptionTypes(['gym_admin', 'swim_admin'], 'Gym')).toEqual(['Gym']);
  });

  it('parses scan payloads from passId, JSON qr payload, and raw strings', () => {
    expect(parseSubscriptionScanPayload({ passId: 'GYM-1' })).toEqual({ passId: 'GYM-1' });
    expect(parseSubscriptionScanPayload({ qrPayload: { passId: 'GYM-2', userId: 'user-1' } })).toEqual({
      passId: 'GYM-2',
      userId: 'user-1',
    });
    expect(parseSubscriptionScanPayload({ qrPayload: '{"passId":"GYM-3","userId":"user-2"}' })).toEqual({
      passId: 'GYM-3',
      userId: 'user-2',
    });
    expect(parseSubscriptionScanPayload({ qrPayload: 'GYM-RAW' })).toEqual({ passId: 'GYM-RAW' });
    expect(parseSubscriptionScanPayload({})).toBeNull();
  });

  it('returns occupancy with available slots when facility capacity exists', async () => {
    facilityFindOneMock.mockReturnValueOnce({
      sort: vi.fn().mockResolvedValue({ capacity: 30 }),
    });
    accessLogAggregateMock.mockResolvedValueOnce([{ occupied: 12 }]);

    const result = await getFacilityOccupancySummary('Gym');

    expect(result).toEqual({
      facilityType: 'Gym',
      totalSlots: 30,
      occupiedSlots: 12,
      availableSlots: 18,
    });
  });

  it('returns null available slots when facility capacity is missing', async () => {
    facilityFindOneMock.mockReturnValueOnce({
      sort: vi.fn().mockResolvedValue(null),
    });
    accessLogAggregateMock.mockResolvedValueOnce([]);

    const result = await getFacilityOccupancySummary('SwimmingPool');

    expect(result).toEqual({
      facilityType: 'SwimmingPool',
      totalSlots: null,
      occupiedSlots: 0,
      availableSlots: null,
    });
  });

  it('fetches latest access action and creates access logs with object ids', async () => {
    const sortMock = vi.fn().mockResolvedValue({ action: 'entry' });
    accessLogFindOneMock.mockReturnValueOnce({ sort: sortMock });
    accessLogCreateMock.mockResolvedValueOnce({ _id: 'log-1' });

    const latest = await getLatestAccessAction('user-1', 'Gym');
    const created = await createAccessLog({
      userId: '507f191e810c19729de860ea',
      subscriptionId: '507f191e810c19729de860eb',
      facilityType: 'Gym',
      action: 'entry',
      scannedBy: '507f191e810c19729de860ec',
    });

    expect(latest).toEqual({ action: 'entry' });
    expect(created).toEqual({ _id: 'log-1' });
    expect(accessLogCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      facilityType: 'Gym',
      action: 'entry',
      user: expect.anything(),
      subscription: expect.anything(),
      scannedBy: expect.anything(),
    }));
  });
});
