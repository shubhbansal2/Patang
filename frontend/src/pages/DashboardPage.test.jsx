import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import DashboardPage from './DashboardPage';

const { getMock, postMock, patchMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
}));

vi.mock('../services/api', () => ({
  default: {
    get: getMock,
    post: postMock,
    patch: patchMock,
    delete: vi.fn(),
  },
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders multiple subscription requests and upcoming bookings from the dashboard payload', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        data: {
          subscriptions: [
            {
              _id: 'sub-gym',
              facilityType: 'Gym',
              plan: 'Monthly Gym Plan',
              status: 'Pending',
            },
            {
              _id: 'sub-swim',
              facilityType: 'Swimming Pool',
              plan: 'Monthly Pool Plan',
              status: 'Pending',
            },
          ],
          upcomingBookings: [
            {
              _id: 'booking-1',
              facilityName: 'Badminton Court 1',
              slotStart: '2026-03-26T10:00:00.000Z',
              status: 'confirmed',
              participantCount: 3,
              source: 'v2',
            },
          ],
          fairUse: {
            score: 'High',
            message: 'Good standing',
          },
          penalties: {
            totalActiveCount: 0,
            activePenalties: [],
          },
          upcomingEvents: [
            {
              _id: 'event-1',
              title: 'Udghosh Practice Session',
              category: 'Sports',
              venue: 'Main Sports Complex',
              startTime: '2026-03-28T12:30:00.000Z',
            },
          ],
        },
      },
    });

    render(<DashboardPage />);

    expect(await screen.findByText(/facility subscriptions/i)).toBeInTheDocument();
    expect(screen.getByText(/pending gym subscription/i)).toBeInTheDocument();
    expect(screen.getByText(/pending swimming pool subscription/i)).toBeInTheDocument();
    expect(screen.getByText(/badminton court 1/i)).toBeInTheDocument();
    expect(screen.getByText(/players attending: 3/i)).toBeInTheDocument();
    expect(screen.getByText(/udghosh practice session/i)).toBeInTheDocument();
    expect(screen.getByText(/qr becomes available after approval/i)).toBeInTheDocument();
  });

  it('shows the empty state when there are no subscriptions or bookings', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        data: {
          subscriptions: [],
          upcomingBookings: [],
          fairUse: {
            score: 'High',
            message: 'Good standing',
          },
          penalties: {
            totalActiveCount: 0,
            activePenalties: [],
          },
          upcomingEvents: [],
        },
      },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/no active subscriptions/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/no upcoming bookings/i)).toBeInTheDocument();
  });

  it('shows a confirmation after cancelling a booking', async () => {
    const user = userEvent.setup();
    const promptMock = vi.spyOn(window, 'prompt').mockReturnValue('Schedule conflict');

    getMock
      .mockResolvedValueOnce({
        data: {
          data: {
            subscriptions: [],
            upcomingBookings: [
              {
                _id: 'booking-1',
                facilityName: 'Badminton Court 1',
                slotStart: '2026-03-26T10:00:00.000Z',
                status: 'confirmed',
                participantCount: 2,
                source: 'v2',
              },
            ],
            fairUse: { score: 'High', message: 'Good standing' },
            penalties: { totalActiveCount: 0, activePenalties: [] },
            upcomingEvents: [],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            subscriptions: [],
            upcomingBookings: [],
            fairUse: { score: 'High', message: 'Good standing' },
            penalties: { totalActiveCount: 0, activePenalties: [] },
            upcomingEvents: [],
          },
        },
      });
    postMock.mockResolvedValueOnce({ data: {} });

    render(<DashboardPage />);

    await user.click(await screen.findByRole('button', { name: /cancel booking for badminton court 1/i }));

    expect(postMock).toHaveBeenCalledWith('/bookings/booking-1/cancel', { reason: 'Schedule conflict' });
    expect(await screen.findByText(/was cancelled successfully/i)).toBeInTheDocument();

    promptMock.mockRestore();
  });

  it('updates the player count through the modify booking action', async () => {
    const user = userEvent.setup();
    const promptMock = vi.spyOn(window, 'prompt').mockReturnValue('4');

    getMock
      .mockResolvedValueOnce({
        data: {
          data: {
            subscriptions: [],
            upcomingBookings: [
              {
                _id: 'booking-1',
                facilityName: 'Badminton Court 2',
                slotStart: '2026-03-27T03:30:00.000Z',
                status: 'confirmed',
                participantCount: 1,
                source: 'v2',
              },
            ],
            fairUse: { score: 'High', message: 'Good standing' },
            penalties: { totalActiveCount: 0, activePenalties: [] },
            upcomingEvents: [],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            subscriptions: [],
            upcomingBookings: [
              {
                _id: 'booking-1',
                facilityName: 'Badminton Court 2',
                slotStart: '2026-03-27T03:30:00.000Z',
                status: 'confirmed',
                participantCount: 4,
                source: 'v2',
              },
            ],
            fairUse: { score: 'High', message: 'Good standing' },
            penalties: { totalActiveCount: 0, activePenalties: [] },
            upcomingEvents: [],
          },
        },
      });
    patchMock.mockResolvedValueOnce({ data: {} });

    render(<DashboardPage />);

    await user.click(await screen.findByRole('button', { name: /modify/i }));

    expect(patchMock).toHaveBeenCalledWith('/bookings/booking-1', { participantCount: 4 });
    expect(await screen.findByText(/was updated to 4 players/i)).toBeInTheDocument();

    promptMock.mockRestore();
  });
});
