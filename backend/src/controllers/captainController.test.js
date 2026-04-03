import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChain, createMockRes } from '../test/helpers.js';

const {
  facilityFindByIdMock,
  facilityFindOneMock,
  teamPracticeBlockFindOneMock,
  teamPracticeBlockCreateMock,
  userFindOneMock,
} = vi.hoisted(() => ({
  facilityFindByIdMock: vi.fn(),
  facilityFindOneMock: vi.fn(),
  teamPracticeBlockFindOneMock: vi.fn(),
  teamPracticeBlockCreateMock: vi.fn(),
  userFindOneMock: vi.fn(),
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

vi.mock('../models/User.js', () => ({
  default: {
    findOne: userFindOneMock,
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
        practiceDate: '2026-04-10',
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

  it('routes cross-sport practice blocks to the facility sport captain when one exists', async () => {
    facilityFindByIdMock.mockReturnValueOnce(createChain({
      _id: 'facility-2',
      name: 'Basketball Court 1',
      sportType: 'Basketball',
    }));
    facilityFindOneMock.mockReturnValueOnce(createChain(null));
    teamPracticeBlockFindOneMock.mockReturnValueOnce(createChain(null));
    userFindOneMock.mockReturnValueOnce(createChain({
      _id: 'captain-2',
      name: 'Basketball Captain',
      email: 'basketballcap@iitk.ac.in',
      captainOf: 'Basketball',
    }));
    teamPracticeBlockCreateMock.mockResolvedValueOnce({
      _id: 'block-2',
      sport: 'Badminton',
      practiceDate: new Date('2026-03-29T00:00:00.000Z'),
      startTime: '18:30',
      endTime: '20:30',
      daysOfWeek: [0],
      status: 'pending',
      targetCaptain: 'captain-2',
    });

    const req = {
      body: {
        facilityId: 'facility-2',
        practiceDate: '2026-04-11',
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
        targetCaptain: 'captain-2',
      })
    );
    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.pendingWith).toEqual(expect.objectContaining({
      _id: 'captain-2',
      captainOf: 'Basketball',
    }));
  });

  it('falls back to executive approval when no target sport captain exists', async () => {
    facilityFindByIdMock.mockReturnValueOnce(createChain({
      _id: 'facility-3',
      name: 'Tennis Court 1',
      sportType: 'Tennis',
    }));
    facilityFindOneMock.mockReturnValueOnce(createChain(null));
    teamPracticeBlockFindOneMock.mockReturnValueOnce(createChain(null));
    userFindOneMock.mockReturnValueOnce(createChain(null));
    teamPracticeBlockCreateMock.mockResolvedValueOnce({
      _id: 'block-3',
      sport: 'Badminton',
      practiceDate: new Date('2026-03-29T00:00:00.000Z'),
      startTime: '18:30',
      endTime: '20:30',
      daysOfWeek: [0],
      status: 'pending',
      targetCaptain: null,
    });

    const req = {
      body: {
        facilityId: 'facility-3',
        practiceDate: '2026-04-12',
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
        targetCaptain: null,
      })
    );
    expect(res.statusCode).toBe(201);
    expect(res.body.data.pendingWith).toBeNull();
  });
});
