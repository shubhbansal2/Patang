import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SubscriptionRegistrationView from './GymRegistrationView';

const baseData = {
  user: {
    name: 'Patang Student',
    email: 'student@iitk.ac.in',
    rollNumber: '230001',
    department: 'CSE',
  },
  plans: [
    { _id: 'plan-monthly', name: 'Monthly Pool Plan', planDuration: 'Monthly', price: 400, label: 'Short term' },
    { _id: 'plan-yearly', name: 'Yearly Pool Plan', planDuration: 'Yearly', price: 3000, label: 'Best value' },
  ],
  currentSubscription: null,
  slotAvailability: {
    totalSlots: 80,
    registered: 24,
    available: 56,
    status: 'Available',
  },
  paymentInstructions: 'Pay swimming fees through SBI Collect.',
  quickRules: ['Swimming cap is mandatory.'],
};

const renderView = (overrides = {}) => {
  const props = {
    data: baseData,
    loading: false,
    refreshing: false,
    submission: { submitting: false, success: '', error: '' },
    onRefresh: vi.fn(),
    onSubmit: vi.fn(),
    facilityType: 'SwimmingPool',
    ...overrides,
  };

  render(<SubscriptionRegistrationView {...props} />);
  return props;
};

describe('SwimmingRegistrationView', () => {
  it('renders the swimming-specific copy and occupancy snapshot', () => {
    renderView();

    expect(screen.getByText(/swimming registration/i)).toBeInTheDocument();
    expect(screen.getByText(/24 registered/i)).toBeInTheDocument();
    expect(screen.getByText(/56 of 80 slots currently available/i)).toBeInTheDocument();
  });

  it('submits the selected swimming plan with uploaded documents', async () => {
    const user = userEvent.setup();
    const props = renderView();
    const medicalCert = new File(['medical'], 'swim-medical.pdf', { type: 'application/pdf' });
    const paymentReceipt = new File(['receipt'], 'swim-receipt.pdf', { type: 'application/pdf' });

    await user.click(screen.getByRole('button', { name: /yearly pool plan/i }));
    await user.upload(screen.getByLabelText(/medical certificate/i), medicalCert);
    await user.upload(screen.getByLabelText(/payment receipt/i), paymentReceipt);
    await user.click(screen.getByRole('button', { name: /submit registration/i }));

    expect(props.onSubmit).toHaveBeenCalledWith({
      facilityType: 'SwimmingPool',
      plan: expect.objectContaining({ _id: 'plan-yearly', name: 'Yearly Pool Plan' }),
      medicalCert,
      paymentReceipt,
    });
  });
});
