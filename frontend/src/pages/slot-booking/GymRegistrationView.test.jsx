import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import GymRegistrationView from './GymRegistrationView';

const baseData = {
  user: {
    name: 'Aarya',
    email: 'aarya@iitk.ac.in',
    rollNumber: '230001',
    department: 'CSE',
  },
  plans: [
    { _id: 'plan-monthly', name: 'Monthly', planDuration: 'Monthly', price: 300, label: 'Short term' },
    { _id: 'plan-semester', name: 'Semesterly', planDuration: 'Semesterly', price: 1200, label: 'Popular' },
  ],
  currentSubscription: null,
  slotAvailability: {
    totalSlots: 100,
    registered: 40,
    available: 60,
    status: 'Available',
  },
  slots: [
    { _id: 'slot-1', startTime: '06:00', endTime: '07:00', capacity: 30, activeCount: 10 },
  ],
  paymentInstructions: 'Pay through SBI Collect.',
  quickRules: ['Carry your ID card.'],
};

const renderView = (overrides = {}) => {
  const props = {
    data: baseData,
    loading: false,
    refreshing: false,
    submission: { submitting: false, success: '', error: '' },
    onRefresh: vi.fn(),
    onSubmit: vi.fn(),
    facilityType: 'Gym',
    ...overrides,
  };

  render(<GymRegistrationView {...props} />);
  return props;
};

describe('GymRegistrationView', () => {
  it('validates required files before submission', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('button', { name: /submit registration/i }));

    expect(screen.getByText(/upload your medical certificate before submitting/i)).toBeInTheDocument();
  });

  it('submits the selected plan with uploaded files', async () => {
    const user = userEvent.setup();
    const props = renderView();
    const medicalCert = new File(['medical'], 'medical.pdf', { type: 'application/pdf' });
    const paymentReceipt = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' });

    await user.click(screen.getByRole('button', { name: /semesterly/i }));
    await user.upload(screen.getByLabelText(/medical certificate/i), medicalCert);
    await user.upload(screen.getByLabelText(/payment receipt/i), paymentReceipt);
    await user.click(screen.getByRole('button', { name: /submit registration/i }));

    expect(props.onSubmit).toHaveBeenCalledWith({
      facilityType: 'Gym',
      plan: expect.objectContaining({ _id: 'plan-semester', name: 'Semesterly' }),
      slotId: 'slot-1',
      medicalCert,
      paymentReceipt,
    });
  });

  it('locks the form when a subscription already exists', () => {
    renderView({
      data: {
        ...baseData,
        currentSubscription: {
          status: 'Approved',
          plan: 'Semesterly',
          startDate: '2026-03-01T00:00:00.000Z',
          endDate: '2026-06-30T00:00:00.000Z',
          passId: 'PASS-101',
        },
      },
    });

    expect(screen.getByText(/gym subscription approved/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registration unavailable/i })).toBeDisabled();
    expect(within(screen.getByText(/pass id/i).closest('div')).getByText('PASS-101')).toBeInTheDocument();
  });
});
