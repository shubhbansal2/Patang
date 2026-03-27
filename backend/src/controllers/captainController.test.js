import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChain, createMockRes } from '../test/helpers.js';

const {
  facilityFindByIdMock,
  facilityFindOneMock,
  teamPracticeBlockFindOneMock,
  teamPracticeBlockCreateMock,
} = vi.hoisted(() => ({
  facilityFindByIdMock: vi.fn(),
  facilityFindOneMock: vi.fn(),
  teamPracticeBlockFindOneMock: vi.fn(),
  teamPracticeBlockCreateMock: vi.fn(),
}));

vi.mock('../models/Facility.js', () => ({
  default: {
    findById: facilityFindByIdMock,
    findOne: facilityFindOneMock,
  },
}));

vi.mock('../models/TeamPracticeBlock.js', () => ({
  default: {
    findOne: teamPracticeBlockFindOneMock,
    create: teamPracticeBlockCreateMock,
  },
}));

vi.mock('../models/SportsBooking.js', () => ({
  default: {},
}));

import { createTeamPracticeBlock } from './captainController.js';

describe('captainController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('self-approves practice blocks on the captain’s own sport facility', async () => {
    facilityFindByIdMock.mockReturnValueOnce(createChain({
      _id: 'facility-1',
      name: 'Badminton Court 1',
      sportType: 'Badminton',
    }));
    facilityFindOneMock.mockReturnValueOnce(createChain(null));
    teamPracticeBlockFindOneMock.mockReturnValueOnce(createChain(null));
    teamPracticeBlockCreateMock.mockResolvedValueOnce({
      _id: 'block-1',
      sport: 'Badminton',
      practiceDate: new Date('2026-03-29T00:00:00.000Z'),
      startTime: '18:30',
      endTime: '20:30',
      daysOfWeek: [0],
      status: 'approved',
    });

    const req = {
      body: {
        facilityId: 'facility-1',
        practiceDate: '2026-03-29',
        startTime: '18:30',
        endTime: '20:30',
        notes: 'Team session',
      },
      user: {
        _id: 'captain-1',
        roles: ['captain'],
        captainOf: 'Badminton',
      },
    };
    const res = createMockRes();

    await createTeamPracticeBlock(req, res);

    expect(teamPracticeBlockCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
      })
    );
    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('approved');
  });

  it('keeps cross-sport practice blocks pending for executive approval', async () => {
    facilityFindByIdMock.mockReturnValueOnce(createChain({
      _id: 'facility-2',
      name: 'Tennis Court 1',
      sportType: 'Tennis',
    }));
    facilityFindOneMock.mockReturnValueOnce(createChain(null));
    teamPracticeBlockFindOneMock.mockReturnValueOnce(createChain(null));
    teamPracticeBlockCreateMock.mockResolvedValueOnce({
      _id: 'block-2',
      sport: 'Badminton',
      practiceDate: new Date('2026-03-29T00:00:00.000Z'),
      startTime: '18:30',
      endTime: '20:30',
      daysOfWeek: [0],
      status: 'pending',
    });

    const req = {
      body: {
        facilityId: 'facility-2',
        practiceDate: '2026-03-29',
        startTime: '18:30',
        endTime: '20:30',
        notes: 'Cross-sport request',
      },
      user: {
        _id: 'captain-1',
        roles: ['captain'],
        captainOf: 'Badminton',
      },
    };
    const res = createMockRes();

    await createTeamPracticeBlock(req, res);

    expect(teamPracticeBlockCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
      })
    );
    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('pending');
  });
});
