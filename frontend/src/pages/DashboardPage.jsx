import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Dumbbell,
  Waves,
  Calendar,
  QrCode,
  X,
  Pencil,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  LoaderCircle
} from 'lucide-react';

/* ──────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────── */
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const StatusBadge = ({ status }) => {
  const colors = {
    confirmed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    Confirmed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    Approved: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    Pending: 'bg-amber-50 text-amber-600 border-amber-200',
    group_pending: 'bg-amber-50 text-amber-600 border-amber-200',
    Provisioned: 'bg-blue-50 text-blue-600 border-blue-200',
    Active: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  };
  const cls = colors[status] || 'bg-gray-50 text-gray-600 border-gray-200';
  const label = status === 'group_pending' ? 'PENDING' : (status || 'UNKNOWN').toUpperCase();
  return (
    <span className={`text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full border ${cls}`}>
      {label}
    </span>
  );
};

const FacilityIcon = ({ name }) => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('pool') || lower.includes('swim')) return <Waves size={20} className="text-blue-500" />;
  if (lower.includes('gym') || lower.includes('weight')) return <Dumbbell size={20} className="text-brand-500" />;
  return <Calendar size={20} className="text-brand-500" />;
};

const getSubscriptionPalette = (facilityType) => {
  const lower = (facilityType || '').toLowerCase();
  if (lower.includes('swim')) {
    return {
      icon: <Waves size={20} className="text-blue-500" />,
      iconWrap: 'bg-blue-50',
      facilityLabel: 'Swimming Pool',
    };
  }

  return {
    icon: <Dumbbell size={20} className="text-brand-500" />,
    iconWrap: 'bg-brand-50',
    facilityLabel: 'Gym',
  };
};

/* ──────────────────────────────────────────────────────────────────────
   Dashboard Page
   ────────────────────────────────────────────────────────────────────── */
const DashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingCancellationId, setBookingCancellationId] = useState('');
  const [bookingUpdateId, setBookingUpdateId] = useState('');
  const [bookingFeedback, setBookingFeedback] = useState({ tone: '', message: '' });
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false);

  const fetchDashboard = async ({ preserveLoading = false } = {}) => {
    if (!preserveLoading) {
      setLoading(true);
    }

    try {
      const { data } = await api.get('/dashboard');
      setDashboard(data.data);
      setError('');
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      if (!preserveLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-red-600 text-sm max-w-md text-center">
          <AlertTriangle size={24} className="mx-auto mb-2" />
          {error}
        </div>
      </div>
    );
  }

  const { subscriptions = [], upcomingBookings = [], fairUse = {}, penalties = {}, upcomingEvents = [] } = dashboard || {};
  const approvedSubscription = subscriptions.find((subscription) => subscription.status === 'Approved') || null;

  const handleCancelBooking = async (booking) => {
    const reason = window.prompt('Enter a cancellation reason for this booking:', 'Schedule conflict');
    if (reason == null) return;

    const trimmedReason = reason.trim();
    if (!trimmedReason) return;

    setBookingCancellationId(booking._id);
    setBookingFeedback({ tone: '', message: '' });

    try {
      if (booking.source === 'v2') {
        await api.post(`/bookings/${booking._id}/cancel`, { reason: trimmedReason });
      } else {
        await api.delete(`/v2/bookings/${booking._id}`, {
          data: { reason: trimmedReason },
        });
      }

      await fetchDashboard({ preserveLoading: true });
      setBookingFeedback({
        tone: 'success',
        message: `${booking.facilityName || 'Your facility booking'} was cancelled successfully.`,
      });
    } catch (err) {
      window.alert(err.response?.data?.error?.message || err.response?.data?.message || 'Could not cancel the booking.');
    } finally {
      setBookingCancellationId('');
    }
  };

  const handleModifyBooking = async (booking) => {
    const defaultCount = String(booking.participantCount || 1);
    const nextCount = window.prompt('Update the number of players attending:', defaultCount);
    if (nextCount == null) return;

    const participantCount = Number.parseInt(nextCount, 10);
    if (!Number.isFinite(participantCount) || participantCount < 1) {
      window.alert('Please enter a valid number of players.');
      return;
    }

    setBookingUpdateId(booking._id);
    setBookingFeedback({ tone: '', message: '' });

    try {
      await api.patch(`/bookings/${booking._id}`, { participantCount });
      await fetchDashboard({ preserveLoading: true });
      setBookingFeedback({
        tone: 'success',
        message: `${booking.facilityName || 'Your booking'} was updated to ${participantCount} player${participantCount > 1 ? 's' : ''}.`,
      });
    } catch (err) {
      window.alert(err.response?.data?.message || 'Could not update the booking.');
    } finally {
      setBookingUpdateId('');
    }
  };

  const openQrPreview = () => {
    if (!approvedSubscription?.qrCode) return;
    setQrPreviewOpen(true);
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ═══════════════════════════════════════════════
          LEFT COLUMN (2/3)
          ═══════════════════════════════════════════════ */}
      <div className="lg:col-span-2 space-y-6">

        {/* ── Active Subscription Card ─────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {subscriptions.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-gray-800">Facility Subscriptions</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Track all gym and swimming requests from one place.</p>
                </div>
                <span className="text-xs font-semibold text-gray-400">{subscriptions.length} total</span>
              </div>

              <div className="space-y-4">
                {subscriptions.map((subscription) => {
                  const palette = getSubscriptionPalette(subscription.facilityType);
                  const isApproved = subscription.status === 'Approved';

                  return (
                    <div key={subscription._id} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                      <div className="flex items-start justify-between mb-4 gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl ${palette.iconWrap} flex items-center justify-center flex-shrink-0`}>
                            {palette.icon}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-800">
                              {isApproved ? 'Active' : 'Pending'} {subscription.facilityType || palette.facilityLabel} Subscription
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Main Sports Complex • {subscription.facilityType || palette.facilityLabel}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={subscription.status} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Subscription Type</p>
                          <p className="text-sm font-bold text-gray-800 mt-1">{subscription.plan || 'Standard'}</p>
                        </div>
                        <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                            {isApproved ? 'Assigned Slot' : 'Application Status'}
                          </p>
                          <p className="text-sm font-bold text-gray-800 mt-1">
                            {isApproved
                              ? (subscription.slotId ? `${subscription.slotId.startTime} - ${subscription.slotId.endTime}` : '—')
                              : 'Awaiting approval'}
                          </p>
                        </div>
                        <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Validity Period</p>
                          <p className="text-sm font-bold text-gray-800 mt-1">
                            {isApproved
                              ? `Till ${subscription.endDate ? formatDate(subscription.endDate) : 'N/A'}`
                              : 'Starts after approval'}
                          </p>
                        </div>
                      </div>

                      {isApproved ? (
                        <div className="mt-4 flex items-center gap-4">
                          <button
                            type="button"
                            onClick={openQrPreview}
                            className="flex items-center gap-2 bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-600 transition-colors shadow-sm"
                          >
                            <QrCode size={16} />
                            View Entry QR
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          Your subscription request is pending review. Entry QR and validity dates will appear after approval.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Dumbbell size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No active subscriptions</p>
              <p className="text-xs text-gray-400 mt-1">Subscribe to Gym or Swimming Pool to get started</p>
            </div>
          )}
        </div>

        {/* ── Upcoming Facility Bookings ───────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800">Upcoming Facility Bookings</h2>
            <button className="text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors">
              View History
            </button>
          </div>

          {bookingFeedback.message ? (
            <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              bookingFeedback.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 bg-gray-50 text-gray-700'
            }`}>
              {bookingFeedback.message}
            </div>
          ) : null}

          {upcomingBookings.length > 0 ? (
            <div className="space-y-3">
              {upcomingBookings.slice(0, 5).map((booking) => (
                <div key={booking._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <FacilityIcon name={booking.facilityName || booking.sportType} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-800">{booking.facilityName || 'Facility'}</h4>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Calendar size={12} />
                        {formatDate(booking.slotStart)} • {formatTime(booking.slotStart)}
                      </p>
                      {booking.source === 'v2' ? (
                        <p className="mt-1 text-xs text-gray-500">
                          Players attending: {booking.participantCount || 1}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={booking.status} />
                    {booking.source === 'v2' ? (
                      <button
                        type="button"
                        onClick={() => handleModifyBooking(booking)}
                        disabled={bookingUpdateId === booking._id}
                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {bookingUpdateId === booking._id ? <LoaderCircle size={12} className="animate-spin" /> : <Pencil size={12} />}
                        Modify
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleCancelBooking(booking)}
                      disabled={bookingCancellationId === booking._id || bookingUpdateId === booking._id}
                      className="w-7 h-7 rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center transition-colors"
                      aria-label={`Cancel booking for ${booking.facilityName || 'facility'}`}
                    >
                      {bookingCancellationId === booking._id ? <LoaderCircle size={14} className="animate-spin" /> : <X size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <Calendar size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No upcoming bookings</p>
              <p className="text-xs text-gray-400 mt-1">Book a facility slot to get started</p>
            </div>
          )}
        </div>

      </div>

      {/* ═══════════════════════════════════════════════
          RIGHT COLUMN (1/3)
          ═══════════════════════════════════════════════ */}
      <div className="space-y-6">

        {/* ── Digital Entry Pass ────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Digital Entry Pass</h3>
          <button
            type="button"
            onClick={openQrPreview}
            disabled={!approvedSubscription?.qrCode}
            className="mx-auto mb-3 block rounded-xl disabled:cursor-not-allowed"
            aria-label={approvedSubscription?.qrCode ? 'Open enlarged QR code' : 'No active QR code available'}
          >
          <div className="w-32 h-32 mx-auto bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center">
            {approvedSubscription?.qrCode ? (
              <img src={approvedSubscription.qrCode} alt="QR Code" className="w-28 h-28 object-contain" />
            ) : (
              <QrCode size={48} className="text-gray-300" />
            )}
          </div>
          </button>
          <p className="text-xs text-gray-400">
            {approvedSubscription ? 'Click to expand for scanning' : (subscriptions.length > 0 ? 'QR becomes available after approval' : 'No active pass yet')}
          </p>
        </div>

        {/* ── Upcoming Events ─────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={16} className="text-brand-500" />
            <h3 className="text-sm font-bold text-gray-800">Upcoming Events</h3>
          </div>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.slice(0, 3).map((event) => (
                <div key={event._id} className="border-l-2 border-brand-400 pl-3 py-1">
                  <h4 className="text-xs font-bold text-gray-800">{event.title}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">{event.category} • {event.venue}</p>
                  <p className="text-[10px] text-brand-500 font-medium mt-0.5">
                    {formatDate(event.startTime)} • {formatTime(event.startTime)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <CalendarDays size={24} className="text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No upcoming events</p>
            </div>
          )}
        </div>

        {/* ── Fair Use Score ───────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800">Fair Use Score</h3>
            <CheckCircle2 size={18} className={
              fairUse.score === 'High' ? 'text-emerald-500' :
              fairUse.score === 'Medium' ? 'text-amber-500' : 'text-red-500'
            } />
          </div>
          <div className="text-center mb-4">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full border-4 ${
              fairUse.score === 'High' ? 'border-emerald-200 bg-emerald-50' :
              fairUse.score === 'Medium' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'
            }`}>
              <span className={`text-lg font-extrabold ${
                fairUse.score === 'High' ? 'text-emerald-600' :
                fairUse.score === 'Medium' ? 'text-amber-600' : 'text-red-600'
              }`}>{fairUse.score || 'High'}</span>
            </div>
            <p className={`text-xs font-semibold mt-2 ${
              fairUse.score === 'High' ? 'text-emerald-600' :
              fairUse.score === 'Medium' ? 'text-amber-600' : 'text-red-600'
            }`}>
              {fairUse.score === 'High' ? 'Good Standing' : fairUse.score === 'Medium' ? 'Fair Standing' : 'Restricted'}
            </p>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mr-1.5 -translate-y-px"></span>
            {fairUse.message || 'No active penalties. You have full access to all facilities booking. Keep it up!'}
          </p>
        </div>

        {/* ── Penalties (if any) ────────────────────────── */}
        {penalties.totalActiveCount > 0 && (
          <div className="bg-red-50 rounded-2xl border border-red-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-red-500" />
              <h3 className="text-sm font-bold text-red-700">Active Penalties</h3>
            </div>
            {penalties.activePenalties?.map((p, i) => (
              <div key={i} className="text-xs text-red-600 mb-1">
                • {p.description || p.type} {p.suspendedUntil ? `(until ${formatDate(p.suspendedUntil)})` : ''}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    {qrPreviewOpen && approvedSubscription?.qrCode ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/75 px-4" role="dialog" aria-modal="true" aria-label="Entry QR preview">
        <button
          type="button"
          className="absolute inset-0 cursor-default"
          aria-label="Close QR preview backdrop"
          onClick={() => setQrPreviewOpen(false)}
        />
        <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Digital Entry Pass</h3>
              <p className="mt-1 text-sm text-gray-500">
                Present this QR at the facility entrance for scanning.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setQrPreviewOpen(false)}
              className="rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
              aria-label="Close QR preview"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mt-6 rounded-3xl border border-gray-100 bg-gray-50 p-4">
            <img src={approvedSubscription.qrCode} alt="Enlarged QR Code" className="mx-auto h-auto w-full max-w-xs object-contain" />
          </div>
          <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Pass ID</p>
            <p className="mt-1 text-sm font-semibold text-gray-800">{approvedSubscription.passId || 'Will be assigned shortly'}</p>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
};

export default DashboardPage;
