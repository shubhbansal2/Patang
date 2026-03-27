import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import {
  createSportsBooking,
  fetchGymRegistrationPage,
  fetchSportsBookingPage,
  fetchSwimmingRegistrationPage,
  getApiErrorMessage,
  normalizePlanValue,
  submitFacilityRegistration,
  unwrapApiResponse,
} from './api';

describe('slot-booking api helpers', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it('unwraps nested api data', () => {
    expect(unwrapApiResponse({ data: { data: { ok: true } } })).toEqual({ ok: true });
    expect(unwrapApiResponse({ data: { ok: true } })).toEqual({ ok: true });
    expect(unwrapApiResponse(null)).toBeNull();
  });

  it('normalizes plan names and error messages', () => {
    expect(normalizePlanValue('monthly access')).toBe('Monthly');
    expect(normalizePlanValue({ planDuration: 'semester pass' })).toBe('Semesterly');
    expect(normalizePlanValue({ name: 'year plan' })).toBe('Yearly');
    expect(normalizePlanValue('unknown')).toBe('Monthly');

    expect(
      getApiErrorMessage({ response: { data: { error: { message: 'Deep error' } } } }, 'fallback')
    ).toBe('Deep error');
    expect(getApiErrorMessage({ response: { data: { message: 'Top error' } } }, 'fallback')).toBe('Top error');
    expect(getApiErrorMessage({ message: 'Native error' }, 'fallback')).toBe('Native error');
    expect(getApiErrorMessage({}, 'fallback')).toBe('fallback');
  });

  it('fetches sports booking data with optional filters', async () => {
    getMock.mockResolvedValueOnce({ data: { data: { sportTypes: ['Badminton'] } } });

    await expect(fetchSportsBookingPage({ sportType: 'Badminton', date: '2026-03-26' })).resolves.toEqual({
      sportTypes: ['Badminton'],
    });

    expect(getMock).toHaveBeenCalledWith('/slot-booking/sports', {
      params: { sportType: 'Badminton', date: '2026-03-26' },
    });
  });

  it('posts booking and registration payloads to the expected endpoints', async () => {
    postMock.mockResolvedValueOnce({ data: { data: { bookingId: 'b1' } } });
    await expect(
      createSportsBooking({ slotId: 'slot-1', bookingDate: '2026-03-26', isGroupBooking: true, participantCount: 3 })
    ).resolves.toEqual({ bookingId: 'b1' });
    expect(postMock).toHaveBeenCalledWith('/bookings', {
      slotId: 'slot-1',
      bookingDate: '2026-03-26',
      isGroupBooking: true,
      participantCount: 3,
    });

    const medicalCert = new File(['medical'], 'medical.pdf', { type: 'application/pdf' });
    const paymentReceipt = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' });
    postMock.mockResolvedValueOnce({ data: { data: { status: 'Pending' } } });

    await expect(
      submitFacilityRegistration({
        facilityType: 'Gym',
        plan: { name: 'semester pass' },
        medicalCert,
        paymentReceipt,
      })
    ).resolves.toEqual({ status: 'Pending' });

    const [url, formData] = postMock.mock.calls[1];
    expect(url).toBe('/v2/subscriptions/apply');
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('facilityType')).toBe('Gym');
    expect(formData.get('plan')).toBe('Semesterly');
    expect(formData.get('medicalCert')).toBe(medicalCert);
    expect(formData.get('paymentReceipt')).toBe(paymentReceipt);
  });

  it('fetches gym and swimming registration pages', async () => {
    getMock.mockResolvedValueOnce({ data: { data: { facilityType: 'Gym' } } });
    getMock.mockResolvedValueOnce({ data: { data: { facilityType: 'SwimmingPool' } } });

    await expect(fetchGymRegistrationPage()).resolves.toEqual({ facilityType: 'Gym' });
    await expect(fetchSwimmingRegistrationPage()).resolves.toEqual({ facilityType: 'SwimmingPool' });

    expect(getMock).toHaveBeenNthCalledWith(1, '/slot-booking/gym');
    expect(getMock).toHaveBeenNthCalledWith(2, '/slot-booking/swimming');
  });
});
