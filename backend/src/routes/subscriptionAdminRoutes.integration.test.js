import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  subscriptionFindMock,
  subscriptionCountDocumentsMock,
  subscriptionFindByIdMock,
  getFacilityOccupancySummaryMock,
  getScopedSubscriptionTypesMock,
  calculateEndDateMock,
  generatePassIdMock,
  generateQRCodeMock,
  createNotificationMock,
} = vi.hoisted(() => ({
  subscriptionFindMock: vi.fn(),
  subscriptionCountDocumentsMock: vi.fn(),
  subscriptionFindByIdMock: vi.fn(),
  getFacilityOccupancySummaryMock: vi.fn(),
  getScopedSubscriptionTypesMock: vi.fn(),
  calculateEndDateMock: vi.fn(),
  generatePassIdMock: vi.fn(),
  generateQRCodeMock: vi.fn(),
  createNotificationMock: vi.fn(),
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

vi.mock('../models/SubscriptionV2.js', () => ({
  default: {
    find: subscriptionFindMock,
    countDocuments: subscriptionCountDocumentsMock,
    findById: subscriptionFindByIdMock,
  },
}));

vi.mock('../services/accessService.js', () => ({
  createAccessLog: vi.fn(),
  getFacilityOccupancySummary: getFacilityOccupancySummaryMock,
  getLatestAccessAction: vi.fn(),
  getScopedSubscriptionTypes: getScopedSubscriptionTypesMock,
  normalizeSubscriptionType: vi.fn((value) => value),
  parseSubscriptionScanPayload: vi.fn(),
}));

vi.mock('../services/subscriptionService.js', () => ({
  calculateEndDate: calculateEndDateMock,
  generatePassId: generatePassIdMock,
  generateQRCode: generateQRCodeMock,
}));

vi.mock('../services/notificationService.js', () => ({
  createNotification: createNotificationMock,
}));

import subscriptionAdminRoutes from './subscriptionAdminRoutes.js';

const createChain = (value) => {
  const chain = {
    populate: () => chain,
    sort: () => chain,
    skip: () => chain,
    limit: () => chain,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
    catch: (reject) => Promise.resolve(value).catch(reject),
  };
  return chain;
};

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v2/admin/subscriptions', subscriptionAdminRoutes);
  return app;
};

describe('subscriptionAdminRoutes integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('forbids a student from accessing admin subscription review routes', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/api/v2/admin/subscriptions')
      .set('x-test-user', JSON.stringify({ _id: 'user-1', roles: ['student'] }));

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Access forbidden: insufficient permissions');
  });

  it('validates rejection requests before they reach the controller', async () => {
    const app = createApp();

    const response = await request(app)
      .patch('/api/v2/admin/subscriptions/sub-1')
      .set('x-test-user', JSON.stringify({ _id: 'gym-admin-1', roles: ['gym_admin'] }))
      .send({ action: 'reject' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lists pending subscriptions and occupancy for a scoped gym admin', async () => {
    getScopedSubscriptionTypesMock.mockReturnValueOnce(['Gym']);
    subscriptionFindMock.mockReturnValueOnce(createChain([
      {
        _id: 'sub-1',
        facilityType: 'Gym',
        plan: 'Monthly',
        status: 'Pending',
      },
    ]));
    subscriptionCountDocumentsMock.mockResolvedValueOnce(1);
    getFacilityOccupancySummaryMock.mockResolvedValueOnce({ facilityType: 'Gym', totalSlots: 30, occupiedSlots: 10, availableSlots: 20 });
    const app = createApp();

    const response = await request(app)
      .get('/api/v2/admin/subscriptions?status=Pending')
      .set('x-test-user', JSON.stringify({ _id: 'gym-admin-1', roles: ['gym_admin'] }));

    expect(response.status).toBe(200);
    expect(response.body.data.subscriptions).toHaveLength(1);
    expect(response.body.data.occupancy).toEqual([
      { facilityType: 'Gym', totalSlots: 30, occupiedSlots: 10, availableSlots: 20 },
    ]);
  });

  it('approves a pending subscription through the admin route', async () => {
    const saveMock = vi.fn();
    getScopedSubscriptionTypesMock.mockReturnValueOnce(['Gym']);
    subscriptionFindByIdMock.mockResolvedValueOnce({
      _id: 'sub-1',
      userId: 'user-1',
      facilityType: 'Gym',
      plan: 'Monthly',
      status: 'Pending',
      save: saveMock,
    });
    calculateEndDateMock.mockReturnValueOnce(new Date('2026-04-25T00:00:00.000Z'));
    generatePassIdMock.mockResolvedValueOnce('GYM-2026-099');
    generateQRCodeMock.mockResolvedValueOnce('qr-data-url');
    const app = createApp();

    const response = await request(app)
      .patch('/api/v2/admin/subscriptions/sub-1')
      .set('x-test-user', JSON.stringify({ _id: 'gym-admin-1', roles: ['gym_admin'] }))
      .send({ action: 'approve', comments: 'Approved for entry' });

    expect(response.status).toBe(200);
    expect(saveMock).toHaveBeenCalled();
    expect(response.body.data.passId).toBe('GYM-2026-099');
  });
});
