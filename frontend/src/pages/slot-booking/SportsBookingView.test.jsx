import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SportsBookingView from './SportsBookingView';

const baseData = {
  sportTypes: ['Badminton'],
  selectedSport: 'Badminton',
  selectedDate: '2026-03-26',
  bookableDates: [
    { date: '2026-03-26', label: 'Today' },
    { date: '2026-03-27', label: 'Tomorrow' },
  ],
  bookingRules: ['Please carry your IITK ID card.'],
  fairUse: {
    canBook: true,
    isSuspended: false,
    activeBookingCount: 0,
    maxAllowed: 2,
  },
  courtSlots: [
    {
      facilityId: 'court-1',
      courtName: 'Badminton Court 1',
      location: 'Main Sports Complex',
      capacity: 4,
      slots: [
        {
          _id: 'slot-1',
          status: 'Available',
          slotStart: '2026-03-26T10:00:00.000Z',
          slotEnd: '2026-03-26T11:00:00.000Z',
          spotsLeft: 3,
          capacity: 4,
          minPlayersRequired: 2,
        },
      ],
    },
  ],
  recentActivity: [],
};

const renderView = (overrides = {}) => {
  const props = {
    data: baseData,
    filters: { sportType: 'Badminton', date: '2026-03-26' },
    loading: false,
    refreshing: false,
    submission: { submitting: false, success: '', error: '' },
    onFiltersChange: vi.fn(),
    onRefresh: vi.fn(),
    onCreateBooking: vi.fn(),
    ...overrides,
  };

  render(<SportsBookingView {...props} />);
  return props;
};

describe('SportsBookingView', () => {
  it('submits a selected slot as a booking', async () => {
    const user = userEvent.setup();
    const props = renderView();

    await user.click(screen.getByRole('button', { name: /select slot badminton court 1/i }));
    await user.click(screen.getByRole('button', { name: /confirm booking/i }));

    expect(props.onCreateBooking).toHaveBeenCalledWith({
      slotId: 'slot-1',
      bookingDate: '2026-03-26',
      isGroupBooking: false,
      participantCount: 2,
    });
  });

  it('allows toggling group booking for eligible slots', async () => {
    const user = userEvent.setup();
    const props = renderView();

    await user.click(screen.getByRole('button', { name: /select slot badminton court 1/i }));
    await user.click(screen.getByRole('button', { name: /enable group booking/i }));
    await user.click(screen.getByRole('button', { name: /confirm booking/i }));

    expect(props.onCreateBooking).toHaveBeenCalledWith({
      slotId: 'slot-1',
      bookingDate: '2026-03-26',
      isGroupBooking: true,
      participantCount: 2,
    });
  });

  it('lets the user choose how many players they are bringing', async () => {
    const user = userEvent.setup();
    const props = renderView();

    await user.click(screen.getByRole('button', { name: /select slot badminton court 1/i }));
    await user.selectOptions(screen.getByLabelText(/players coming/i), '4');
    await user.click(screen.getByRole('button', { name: /confirm booking/i }));

    expect(props.onCreateBooking).toHaveBeenCalledWith({
      slotId: 'slot-1',
      bookingDate: '2026-03-26',
      isGroupBooking: false,
      participantCount: 4,
    });
  });

  it('blocks booking when the fair-use quota is reached', async () => {
    const user = userEvent.setup();
    renderView({
      data: {
        ...baseData,
        fairUse: {
          canBook: false,
          isSuspended: false,
          activeBookingCount: 2,
          maxAllowed: 2,
        },
      },
    });

    await user.click(screen.getByRole('button', { name: /select slot badminton court 1/i }));

    expect(screen.getByText(/booking quota reached/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm booking/i })).toBeDisabled();
  });

  it('treats expired slots as unavailable', async () => {
    const user = userEvent.setup();
    renderView({
      data: {
        ...baseData,
        courtSlots: [
          {
            facilityId: 'court-1',
            courtName: 'Badminton Court 1',
            location: 'Main Sports Complex',
            capacity: 4,
            slots: [
              {
                _id: 'slot-expired',
                status: 'Unavailable',
                slotStart: '2026-03-26T10:00:00.000Z',
                slotEnd: '2026-03-26T11:00:00.000Z',
                spotsLeft: 2,
                capacity: 4,
                minPlayersRequired: 2,
              },
            ],
          },
        ],
      },
    });

    await user.click(screen.getByRole('button', { name: /select slot badminton court 1/i }));

    expect(screen.getByText(/already ended for the selected day/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm booking/i })).toBeDisabled();
  });

  it('renders upcoming bookings inside the booking activity table', () => {
    renderView({
      data: {
        ...baseData,
        recentActivity: [
          {
            _id: 'activity-1',
            date: '2026-03-27T03:30:00.000Z',
            facility: 'Badminton Court 1',
            time: '09:00 am - 10:00 am',
            status: 'confirmed',
            source: 'v2',
          },
        ],
      },
    });

    expect(screen.getByText(/booking activity/i)).toBeInTheDocument();
    expect(screen.getAllByText(/badminton court 1/i)).toHaveLength(2);
    expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
  });
});
