import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SwimAdminDashboardPage from './SwimAdminDashboardPage';

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

describe('SwimAdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('counts SwimmingPool requests and shows live occupancy correctly', async () => {
    getMock
      .mockResolvedValueOnce({
        data: {
          data: {
            subscriptions: [
              {
                _id: 'req-1',
                facilityType: 'SwimmingPool',
                plan: 'Monthly',
                status: 'Pending',
                userId: { name: 'Pool Student' },
              },
              {
                _id: 'req-2',
                facilityType: 'Gym',
                plan: 'Monthly',
                status: 'Pending',
                userId: { name: 'Gym Student' },
              },
            ],
            occupancy: [
              { facilityType: 'SwimmingPool', occupiedSlots: 7, totalSlots: 30 },
            ],
            pagination: { total: 2 },
          },
        },
      })
      .mockResolvedValueOnce({ data: [{ _id: 'facility-1', facilityType: 'swimming' }] })
      .mockResolvedValueOnce({
        data: [
          { _id: 'slot-1', startTime: '06:00', endTime: '07:00', capacity: 30 },
        ],
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            slotOccupancy: { 'slot-1': 5 },
            month: '2026-03',
          },
        },
      });

    render(
      <MemoryRouter>
        <SwimAdminDashboardPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/recent pending requests/i)).toBeInTheDocument();
    expect(screen.getByText(/pool student/i)).toBeInTheDocument();
    expect(screen.queryByText(/gym student/i)).not.toBeInTheDocument();
    expect(await screen.findByText((content) => content.includes('06:00') && content.includes('07:00'))).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('renders a loading failure message when the dashboard request errors', async () => {
    getMock.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Failed to load swimming dashboard',
        },
      },
    });

    render(
      <MemoryRouter>
        <SwimAdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load swimming dashboard/i)).toBeInTheDocument();
    });
  });
});
