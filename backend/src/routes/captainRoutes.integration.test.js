import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  facilityFindByIdMock,
  facilityFindOneMock,
  teamPracticeBlockFindOneMock,
  teamPracticeBlockCreateMock,
  teamPracticeBlockFindMock,
  teamPracticeBlockFindByIdMock,
  userFindOneMock,
} = vi.hoisted(() => ({
  facilityFindByIdMock: vi.fn(),
  facilityFindOneMock: vi.fn(),
  teamPracticeBlockFindOneMock: vi.fn(),
  teamPracticeBlockCreateMock: vi.fn(),
  teamPracticeBlockFindMock: vi.fn(),
  teamPracticeBlockFindByIdMock: vi.fn(),
  userFindOneMock: vi.fn(),
}));

vi.mock('../middlewares/authMiddleware.js', async () => {
  const actual = await vi.importActual('../middlewares/authMiddleware.js');
  return {
    ...actual,
    protectRoute: (req, res, next) => {
      const rawUser = req.headers['x-test-user'];
      if (!rawUser) {
        return res.status(401).json({ message: 'No authorization token provided' });
      }
      req.user = JSON.parse(rawUser);
      next();
    },
  };
});

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
    find: teamPracticeBlockFindMock,
    findById: teamPracticeBlockFindByIdMock,
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

import captainRoutes from './captainRoutes.js';

const createChain = (value) => {
  const chain = {
    populate: () => chain,
    sort: () => chain,
    maxTimeMS: () => chain,
    lean: async () => value,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
    catch: (reject) => Promise.resolve(value).catch(reject),
  };
  return chain;
};

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/captain', captainRoutes);
  return app;
};

const captainHeader = {
  'x-test-user': JSON.stringify({
    _id: 'captain-1',
    roles: ['captain'],
    captainOf: 'Badminton',
    name: 'Badminton Captain',
    email: 'captain@iitk.ac.in',
  }),
};

describe('captainRoutes integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rejects unauthenticated practice block creation', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/captain/practice-blocks')
      .send({
        facilityId: 'facility-1',
        practiceDate: '2026-04-10',
        startTime: '18:30',
        endTime: '20:30',
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('No authorization token provided');
  });

  it('approves same-sport captain blocks immediately through the route stack', async () => {
    facilityFindByIdMock.mockReturnValueOnce(createChain({
      _id: 'facility-1',
      name: 'Badminton Court 1',
      sportType: 'Badminton',
      facilityType: 'sports',
      isOperational: true,
    }));
    teamPracticeBlockFindOneMock.mockReturnValueOnce(createChain(null));
    teamPracticeBlockCreateMock.mockResolvedValueOnce({
      _id: 'block-1',
      sport: 'Badminton',
      practiceDate: new Date('2026-03-30T00:00:00.000Z'),
      startTime: '18:30',
      endTime: '20:30',
      daysOfWeek: [1],
      status: 'approved',
    });

    const app = createApp();

    const response = await request(app)
      .post('/api/captain/practice-blocks')
      .set(captainHeader)
      .send({
        facilityId: 'facility-1',
        practiceDate: '2026-04-10',
        startTime: '18:30',
        endTime: '20:30',
        notes: 'Self-approved court block',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('approved');
  });

  it('routes cross-sport captain requests to the facility sport captain through the route stack', async () => {
    facilityFindByIdMock.mockReturnValueOnce(createChain({
      _id: 'facility-2',
      name: 'Basketball Court 1',
      sportType: 'Basketball',
      facilityType: 'sports',
      isOperational: true,
    }));
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
      practiceDate: new Date('2026-03-31T00:00:00.000Z'),
      startTime: '18:30',
      endTime: '20:30',
      daysOfWeek: [2],
      status: 'pending',
      targetCaptain: 'captain-2',
    });

    const app = createApp();

    const response = await request(app)
      .post('/api/captain/practice-blocks')
      .set(captainHeader)
      .send({
        facilityId: 'facility-2',
        practiceDate: '2026-04-11',
        startTime: '18:30',
        endTime: '20:30',
        notes: 'Needs approval',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('pending');
    expect(response.body.data.pendingWith).toEqual(expect.objectContaining({
      _id: 'captain-2',
      captainOf: 'Basketball',
    }));
  });

  it('returns the captain block list through the route stack', async () => {
    teamPracticeBlockFindMock.mockReturnValueOnce(createChain([
      {
        _id: 'block-1',
        facility: { _id: 'facility-1', name: 'Badminton Court 1', sportType: 'Badminton', location: 'Sports Complex Hall A' },
        sport: 'Badminton',
        practiceDate: new Date('2026-03-30T00:00:00.000Z'),
        startTime: '18:30',
        endTime: '20:30',
        daysOfWeek: [1],
        status: 'approved',
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
        notes: 'Evening session',
        createdAt: new Date('2026-03-27T00:00:00.000Z'),
      },
    ]));

    const app = createApp();

    const response = await request(app)
      .get('/api/captain/practice-blocks')
      .set(captainHeader);

    expect(response.status).toBe(200);
    expect(response.body.data.blocks).toHaveLength(1);
    expect(response.body.data.blocks[0]).toEqual(expect.objectContaining({
      sport: 'Badminton',
      status: 'approved',
    }));
  });

  it('lists incoming practice block approvals for the assigned target captain', async () => {
    teamPracticeBlockFindMock.mockReturnValueOnce(createChain([
      {
        _id: 'block-incoming-1',
        captain: {
          _id: 'captain-1',
          name: 'Badminton Captain',
          email: 'captain@iitk.ac.in',
          captainOf: 'Badminton',
          profileDetails: { rollNumber: '230010' },
        },
        facility: { _id: 'facility-2', name: 'Basketball Court 1', sportType: 'Basketball', location: 'Sports Complex' },
        sport: 'Badminton',
        practiceDate: new Date('2026-03-31T00:00:00.000Z'),
        startTime: '18:30',
        endTime: '20:30',
        daysOfWeek: [2],
        notes: 'Inter-sport request',
        createdAt: new Date('2026-03-27T00:00:00.000Z'),
      },
    ]));

    const app = createApp();

    const response = await request(app)
      .get('/api/captain/practice-blocks/incoming')
      .set('x-test-user', JSON.stringify({
        _id: 'captain-2',
        roles: ['captain'],
        captainOf: 'Basketball',
        name: 'Basketball Captain',
      }));

    expect(response.status).toBe(200);
    expect(response.body.data.incomingBlocks).toHaveLength(1);
    expect(response.body.data.incomingBlocks[0]).toEqual(expect.objectContaining({
      sport: 'Badminton',
      facility: expect.objectContaining({ sportType: 'Basketball' }),
    }));
  });

  it('lets the target captain approve an incoming cross-sport request', async () => {
    const saveMock = vi.fn();
    teamPracticeBlockFindByIdMock.mockReturnValueOnce(createChain({
      _id: 'block-incoming-1',
      targetCaptain: 'captain-2',
      status: 'pending',
      facility: { name: 'Basketball Court 1', sportType: 'Basketball' },
      captain: { name: 'Badminton Captain', captainOf: 'Badminton' },
      save: saveMock,
    }));

    const app = createApp();

    const response = await request(app)
      .patch('/api/captain/practice-blocks/block-incoming-1/review')
      .set('x-test-user', JSON.stringify({
        _id: 'captain-2',
        roles: ['captain'],
        captainOf: 'Basketball',
        name: 'Basketball Captain',
      }))
      .send({ action: 'approve' });

    expect(response.status).toBe(200);
    expect(saveMock).toHaveBeenCalled();
    expect(response.body.data.status).toBe('approved');
  });
});
