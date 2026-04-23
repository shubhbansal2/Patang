import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SwimAdminRequestsPage from './SwimAdminRequestsPage';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('SwimAdminRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the student requested slot and time on the request card', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: {
          subscriptions: [
            {
              _id: 'sub-2',
              facilityType: 'SwimmingPool',
              plan: 'Monthly',
              status: 'Pending',
              createdAt: '2026-04-22T10:00:00.000Z',
              paymentReceiptUrl: '/receipt.pdf',
              medicalCertUrl: '/medical.pdf',
              slotId: {
                _id: 'slot-2',
                startTime: '07:00',
                endTime: '08:00',
                capacity: 20,
              },
              userId: {
                name: 'Patang Student',
                email: 'student@iitk.ac.in',
                profileDetails: {
                  rollNumber: '230001',
                },
              },
            },
          ],
        },
      },
    });

    render(
      <MemoryRouter>
        <SwimAdminRequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/v2/admin/subscriptions?status=Pending&limit=5000');
    });

    expect(await screen.findByText(/requested slot: 07:00 - 08:00/i)).toBeInTheDocument();
    expect(screen.getByText(/capacity 20/i)).toBeInTheDocument();
  });
});
