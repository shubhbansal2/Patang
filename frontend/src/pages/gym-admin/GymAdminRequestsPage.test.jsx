import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GymAdminRequestsPage from './GymAdminRequestsPage';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('GymAdminRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the student requested slot and time on the request card', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: {
          subscriptions: [
            {
              _id: 'sub-1',
              facilityType: 'Gym',
              plan: 'Monthly',
              status: 'Pending',
              createdAt: '2026-04-22T10:00:00.000Z',
              paymentReceiptUrl: '/receipt.pdf',
              medicalCertUrl: '/medical.pdf',
              slotId: {
                _id: 'slot-1',
                startTime: '18:00',
                endTime: '19:00',
                capacity: 30,
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
        <GymAdminRequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/v2/admin/subscriptions?status=Pending&limit=5000');
    });

    expect(await screen.findByText(/requested slot: 18:00 - 19:00/i)).toBeInTheDocument();
    expect(screen.getByText(/capacity 30/i)).toBeInTheDocument();
  });
});
