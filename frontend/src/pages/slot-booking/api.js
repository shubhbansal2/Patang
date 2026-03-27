import api from '../../services/api';

export const unwrapApiResponse = (response) => response?.data?.data ?? response?.data ?? null;

export const getApiErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

export const normalizePlanValue = (plan) => {
  const rawValue = plan?.planDuration || plan?.plan || plan?.name || plan || '';
  const normalized = String(rawValue).toLowerCase();

  if (normalized.includes('month')) return 'Monthly';
  if (normalized.includes('semester')) return 'Semesterly';
  if (normalized.includes('year')) return 'Yearly';

  return 'Monthly';
};

export const fetchSportsBookingPage = async ({ sportType, date } = {}) => {
  const params = {};

  if (sportType) params.sportType = sportType;
  if (date) params.date = date;

  const response = await api.get('/slot-booking/sports', { params });
  return unwrapApiResponse(response);
};

export const createSportsBooking = async ({ slotId, bookingDate, isGroupBooking }) => {
  const response = await api.post('/bookings', {
    slotId,
    bookingDate,
    isGroupBooking,
  });

  return unwrapApiResponse(response);
};

export const fetchGymRegistrationPage = async () => {
  const response = await api.get('/slot-booking/gym');
  return unwrapApiResponse(response);
};

export const fetchSwimmingRegistrationPage = async () => {
  const response = await api.get('/slot-booking/swimming');
  return unwrapApiResponse(response);
};

export const submitFacilityRegistration = async ({ facilityType, plan, slotId, medicalCert, paymentReceipt }) => {
  const formData = new FormData();
  formData.append('facilityType', facilityType);
  formData.append('plan', normalizePlanValue(plan));
  if (slotId) formData.append('slotId', slotId);
  formData.append('medicalCert', medicalCert);
  formData.append('paymentReceipt', paymentReceipt);

  const response = await api.post('/v2/subscriptions/apply', formData);
  return unwrapApiResponse(response);
};
