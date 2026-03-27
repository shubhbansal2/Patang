import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SportsCaretakerPage from './SportsCaretakerPage';

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  default: {
    get: getMock,
    post: postMock,
  },
}));

describe('SportsCaretakerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upcoming caretaker bookings with student details', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        bookings: [
          {
            _id: 'booking-1',
            status: 'confirmed',
            participantCount: 2,
            slotStartAt: '2026-03-27T01:30:00.000Z',
            slotEndAt: '2026-03-27T02:30:00.000Z',
            facility: { name: 'Badminton Court 1', sportType: 'Badminton', location: 'Sports Complex Hall A' },
            bookedBy: {
              name: 'Patang Student',
              email: 'student@iitk.ac.in',
              profileDetails: { rollNumber: '230001', department: 'CSE' },
            },
          },
        ],
      },
    });

    render(<SportsCaretakerPage />);

    expect(await screen.findByText(/sports caretaker console/i)).toBeInTheDocument();
    expect(screen.getAllByText(/badminton court 1/i)).toHaveLength(2);
    expect(screen.getByText(/patang student/i)).toBeInTheDocument();
    expect(screen.getByText(/230001/i)).toBeInTheDocument();
  });

  it('marks a booking present from the caretaker console', async () => {
    const user = userEvent.setup();

    getMock
      .mockResolvedValueOnce({
        data: {
          bookings: [
            {
              _id: 'booking-1',
              status: 'confirmed',
              participantCount: 1,
              slotStartAt: '2026-03-27T01:30:00.000Z',
              slotEndAt: '2026-03-27T02:30:00.000Z',
              facility: { name: 'Badminton Court 1', sportType: 'Badminton', location: 'Sports Complex Hall A' },
              bookedBy: {
                name: 'Patang Student',
                email: 'student@iitk.ac.in',
                profileDetails: { rollNumber: '230001', department: 'CSE' },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: { bookings: [] },
      });
    postMock.mockResolvedValueOnce({ data: {} });

    render(<SportsCaretakerPage />);

    await user.click(await screen.findByRole('button', { name: /mark present/i }));

    expect(postMock).toHaveBeenCalledWith('/bookings/booking-1/attendance', {
      attendanceStatus: 'present',
      note: 'Marked present by caretaker',
    });
    expect(await screen.findByText(/marked present/i)).toBeInTheDocument();
  });
});
