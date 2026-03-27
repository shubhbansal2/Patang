import api from './api';

// ── Dashboard ──────────────────────────────────────────────────────
export const fetchDashboard = () =>
    api.get('/executive/dashboard').then(r => r.data.data);

// ── Venue Approvals ────────────────────────────────────────────────
export const fetchPendingVenues = (page = 1, limit = 20) =>
    api.get('/executive/venues/pending', { params: { page, limit } }).then(r => r.data.data);

export const reviewVenue = (blockId, payload) =>
    api.patch(`/executive/venues/${blockId}`, payload).then(r => r.data);

// ── Event Approvals ────────────────────────────────────────────────
export const fetchPendingEvents = () =>
    api.get('/v2/admin/events/pending').then(r => r.data.data);

export const reviewEvent = (eventId, payload) =>
    api.patch(`/v2/admin/events/${eventId}`, payload).then(r => r.data);

// ── User Management ────────────────────────────────────────────────
export const fetchUsers = (params = {}) =>
    api.get('/executive/users', { params }).then(r => r.data.data);

export const fetchUserDetail = (userId) =>
    api.get(`/executive/users/${userId}`).then(r => r.data.data);

export const updateUserRoles = (userId, payload) =>
    api.patch(`/executive/users/${userId}/roles`, payload).then(r => r.data);

// ── Facility Management ────────────────────────────────────────────
export const fetchFacilities = (params = {}) =>
    api.get('/executive/facilities', { params }).then(r => r.data.data);

export const updateFacility = (facilityId, payload) =>
    api.patch(`/executive/facilities/${facilityId}`, payload).then(r => r.data);

// ── Penalty Management ─────────────────────────────────────────────
export const fetchPenalties = (params = {}) =>
    api.get('/executive/penalties', { params }).then(r => r.data.data);

export const clearPenalty = (penaltyId, reason) =>
    api.patch(`/executive/penalties/${penaltyId}`, { action: 'clear', reason }).then(r => r.data);

// ── Feedback ───────────────────────────────────────────────────────
export const fetchFeedbackInbox = (params = {}) =>
    api.get('/feedback/inbox', { params }).then(r => r.data.data);

export const replyToFeedback = (feedbackId, payload) =>
    api.patch(`/feedback/${feedbackId}/reply`, payload).then(r => r.data);

// ── Analytics ──────────────────────────────────────────────────────
export const fetchAnalyticsOverview = (period = '30d') =>
    api.get('/executive/analytics/overview', { params: { period } }).then(r => r.data.data);

// ── Audit Log ──────────────────────────────────────────────────────
export const fetchAuditLog = (params = {}) =>
    api.get('/executive/audit-log', { params }).then(r => r.data.data);
