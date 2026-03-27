import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  subscriptionFindOneMock,
  subscriptionCreateMock,
  subscriptionFindMock,
  storeSubscriptionDocumentMock,
} = vi.hoisted(() => ({
  subscriptionFindOneMock: vi.fn(),
  subscriptionCreateMock: vi.fn(),
  subscriptionFindMock: vi.fn(),
  storeSubscriptionDocumentMock: vi.fn(),
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
    findOne: subscriptionFindOneMock,
    create: subscriptionCreateMock,
    find: subscriptionFindMock,
  },
}));

vi.mock('../services/fileStorageService.js', () => ({
  storeSubscriptionDocument: storeSubscriptionDocumentMock,
  streamSubscriptionDocument: vi.fn(),
}));

vi.mock('../services/accessService.js', () => ({
  createAccessLog: vi.fn(),
  getFacilityOccupancySummary: vi.fn(),
  getLatestAccessAction: vi.fn(),
  getScopedSubscriptionTypes: vi.fn(() => ['Gym']),
  normalizeSubscriptionType: vi.fn((value) => value),
  parseSubscriptionScanPayload: vi.fn(),
}));

import subscriptionRoutesV2 from './subscriptionRoutesV2.js';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v2/subscriptions', subscriptionRoutesV2);
  return app;
};

const studentHeader = {
  'x-test-user': JSON.stringify({
    _id: 'user-1',
    roles: ['student'],
    name: 'Patang Student',
    email: 'student@iitk.ac.in',
    profileDetails: { rollNumber: '230001' },
  }),
};

describe('subscriptionRoutesV2 integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    storeSubscriptionDocumentMock
      .mockResolvedValueOnce({ fileId: 'medical-file-id' })
      .mockResolvedValueOnce({ fileId: 'receipt-file-id' });
  });

  it('rejects unauthenticated subscription applications', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/v2/subscriptions/apply')
      .field('facilityType', 'Gym')
      .field('plan', 'Monthly');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('No authorization token provided');
  });

  it('validates required uploaded files on multipart subscription apply', async () => {
    subscriptionFindOneMock.mockResolvedValueOnce(null);
    const app = createApp();

    const response = await request(app)
      .post('/api/v2/subscriptions/apply')
      .set(studentHeader)
      .field('facilityType', 'Gym')
      .field('plan', 'Monthly')
      .attach('medicalCert', Buffer.from('medical'), { filename: 'medical.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('paymentReceipt file is required');
  });

  it('returns a conflict when an active subscription already exists', async () => {
    subscriptionFindOneMock.mockResolvedValueOnce({ _id: 'sub-1' });
    const app = createApp();

    const response = await request(app)
      .post('/api/v2/subscriptions/apply')
      .set(studentHeader)
      .field('facilityType', 'Gym')
      .field('plan', 'Monthly')
      .attach('medicalCert', Buffer.from('medical'), { filename: 'medical.pdf', contentType: 'application/pdf' })
      .attach('paymentReceipt', Buffer.from('receipt'), { filename: 'receipt.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ACTIVE_SUBSCRIPTION_EXISTS');
  });

  it('accepts a valid multipart subscription application', async () => {
    subscriptionFindOneMock.mockResolvedValueOnce(null);
    subscriptionCreateMock.mockResolvedValueOnce({
      _id: 'sub-2',
      facilityType: 'Gym',
      plan: 'Monthly',
      status: 'Pending',
    });
    const app = createApp();

    const response = await request(app)
      .post('/api/v2/subscriptions/apply')
      .set(studentHeader)
      .field('facilityType', 'Gym')
      .field('plan', 'Monthly')
      .attach('medicalCert', Buffer.from('medical'), { filename: 'medical.pdf', contentType: 'application/pdf' })
      .attach('paymentReceipt', Buffer.from('receipt'), { filename: 'receipt.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(expect.objectContaining({
      _id: 'sub-2',
      facilityType: 'Gym',
      plan: 'Monthly',
      status: 'Pending',
    }));
  });
});
