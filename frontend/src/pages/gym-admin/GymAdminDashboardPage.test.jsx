import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GymAdminDashboardPage from './GymAdminDashboardPage';

const { getMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  putMock: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  default: {
    get: getMock,
    put: putMock,
  },
}));

describe('GymAdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pending requests and live occupancy using backend field names', async () => {
    getMock
      .mockResolvedValueOnce({
        data: {
          data: {
            subscriptions: [
              {
                _id: 'req-1',
                facilityType: 'Gym',
                plan: 'Monthly',
                status: 'Pending',
                userId: { name: 'Patang Student' },
              },
            ],
            occupancy: [
              { facilityType: 'Gym', occupiedSlots: 12, totalSlots: 30 },
            ],
            pagination: { total: 1 },
          },
        },
      })
      .mockResolvedValueOnce({ data: [{ _id: 'facility-1', facilityType: 'gym' }] })
      .mockResolvedValueOnce({
        data: [
          { _id: 'slot-1', startTime: '06:00', endTime: '07:00', capacity: 30 },
        ],
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            slotOccupancy: { 'slot-1': 8 },
            month: '2026-03',
          },
        },
      });

    render(
      <MemoryRouter>
        <GymAdminDashboardPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/gym overview/i)).toBeInTheDocument();
    expect(screen.getByText('12 / 30')).toBeInTheDocument();
    expect(screen.getByText(/patang student/i)).toBeInTheDocument();
    expect(await screen.findByText((content) => content.includes('06:00') && content.includes('07:00'))).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('shows an empty-state message when there are no pending requests', async () => {
    getMock
      .mockResolvedValueOnce({
        data: {
          data: {
            subscriptions: [],
            occupancy: [],
            pagination: { total: 0 },
          },
        },
      })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: {
          data: {
            slotOccupancy: {},
            month: '2026-03',
          },
        },
      });

    render(
      <MemoryRouter>
        <GymAdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no pending requests/i)).toBeInTheDocument();
    });
  });
});
