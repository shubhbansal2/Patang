import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  LoaderCircle,
  Search,
  ShieldAlert,
  UserRound,
  XCircle,
} from 'lucide-react';
import api from '../../services/api';

const getTodayValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const statusTone = {
  confirmed: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  group_pending: 'bg-amber-50 border-amber-200 text-amber-700',
  completed: 'bg-blue-50 border-blue-200 text-blue-700',
  no_show: 'bg-red-50 border-red-200 text-red-700',
  cancelled: 'bg-gray-50 border-gray-200 text-gray-700',
  team_practice: 'bg-slate-100 border-slate-200 text-slate-700',
};

const SportsCaretakerPage = () => {
  const [filters, setFilters] = useState({
    date: getTodayValue(),
    status: '',
    sportType: '',
  });
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ tone: '', message: '' });
  const [actionBookingId, setActionBookingId] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const loadBookings = async ({ background = false } = {}) => {
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const params = {
        date: filters.date,
      };

      if (filters.status) params.status = filters.status;
      if (filters.sportType) params.sportType = filters.sportType;

      const response = await api.get('/bookings/caretaker', { params });
      setBookings(response.data.bookings || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load caretaker bookings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [filters.date, filters.status, filters.sportType]);

  const sportTypes = useMemo(() => {
    return [...new Set(bookings.map((booking) => booking.facility?.sportType).filter(Boolean))].sort();
  }, [bookings]);

  const handleAttendance = async (booking, attendanceStatus) => {
    const note = attendanceStatus === 'absent'
      ? window.prompt('Optional note for the absence record:', 'Marked absent by caretaker')
      : 'Marked present by caretaker';

    setActionBookingId(booking._id);
    setFeedback({ tone: '', message: '' });

    try {
      await api.post(`/bookings/${booking._id}/attendance`, {
        attendanceStatus,
        note: note || undefined,
      });

      await loadBookings({ background: true });
      setFeedback({
        tone: 'success',
        message: attendanceStatus === 'present'
          ? `${booking.bookedBy?.name || 'Booking'} marked present.`
          : `${booking.bookedBy?.name || 'Booking'} marked absent and the slot is available again.`,
      });
    } catch (err) {
      setFeedback({
        tone: 'danger',
        message: err.response?.data?.message || 'Could not update attendance.',
      });
    } finally {
      setActionBookingId('');
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!identifier.trim()) return;

    setVerifying(true);
    setVerificationResult(null);

    try {
      const response = await api.post('/bookings/verify-attendee', {
        identifier: identifier.trim(),
        bookingId: selectedBookingId || undefined,
      });
      setVerificationResult(response.data);
    } catch (err) {
      setVerificationResult({
        valid: false,
        reason: err.response?.data?.message || 'Could not verify this attendee.',
      });
    } finally {
      setVerifying(false);
    }
  };

  const summary = {
    total: bookings.length,
    confirmed: bookings.filter((booking) => booking.status === 'confirmed').length,
    pending: bookings.filter((booking) => booking.status === 'group_pending').length,
    practice: bookings.filter((booking) => booking.kind === 'practice_block').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500">Caretaker / Sports</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-800">Sports caretaker console</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-500">
            Review upcoming sports bookings, verify attendee identity by roll number or email, and mark attendees present or absent at the facility desk.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadBookings({ background: true })}
          className="rounded-2xl border border-gray-100 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-800"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Bookings on screen</p>
          <p className="mt-2 text-3xl font-bold text-gray-800">{summary.total}</p>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Confirmed</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{summary.confirmed}</p>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Group pending</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{summary.pending}</p>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Captain blocks</p>
          <p className="mt-2 text-3xl font-bold text-slate-700">{summary.practice}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.95fr)]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Date</label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Status</label>
                <select
                  value={filters.status}
                  onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">All active</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="group_pending">Group pending</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Sport</label>
                <select
                  value={filters.sportType}
                  onChange={(event) => setFilters((current) => ({ ...current, sportType: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">All assigned sports</option>
                  {sportTypes.map((sportType) => (
                    <option key={sportType} value={sportType}>{sportType}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {feedback.message ? (
            <div className={`rounded-2xl border px-4 py-3 text-sm ${
              feedback.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}>
              {feedback.message}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-brand-500" />
              <div>
                <h2 className="text-lg font-bold text-gray-800">Upcoming bookings</h2>
                <p className="mt-1 text-sm text-gray-500">Caretaker-facing view of students arriving for the selected date.</p>
              </div>
            </div>

            {loading ? (
              <div className="mt-6 flex items-center justify-center py-12">
                <LoaderCircle size={24} className="animate-spin text-brand-500" />
              </div>
            ) : bookings.length ? (
              <div className="mt-6 space-y-4">
                {bookings.map((booking) => {
                  const isPracticeBlock = booking.kind === 'practice_block';

                  return (
                  <article key={booking._id} className="rounded-3xl border border-gray-100 bg-gray-50/60 p-5">
                    {isPracticeBlock ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-bold text-gray-800">{booking.facility?.name || 'Facility booking'}</h3>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusTone[booking.status] || 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                            team practice
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {booking.facility?.sportType || 'Sport'} • {booking.facility?.location || 'Sports Complex'}
                        </p>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-gray-100 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Captain</p>
                              <p className="mt-2 break-words text-sm font-semibold text-gray-800">{booking.bookedBy?.email || '—'}</p>
                              <p className="mt-1 text-xs text-gray-500">{booking.bookedBy?.name || 'Unknown'}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Reserved for</p>
                              <p className="mt-2 text-sm font-semibold text-gray-800">{booking.sport || booking.facility?.sportType || 'Sports'} team session</p>
                              <p className="mt-1 text-xs text-gray-500">{booking.bookedBy?.profileDetails?.department || 'Reserved for the team session'}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Slot time</p>
                              <p className="mt-2 text-sm font-semibold text-gray-800">{formatDate(booking.slotStartAt)}</p>
                              <p className="mt-1 text-xs text-gray-500">{formatTime(booking.slotStartAt)} - {formatTime(booking.slotEndAt)}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Availability effect</p>
                              <p className="mt-2 text-sm font-semibold text-gray-800">Blocks this slot for all users</p>
                              <p className="mt-1 text-xs text-gray-500">Regular bookings are disabled for this court and time.</p>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                            <p className="font-semibold text-slate-800">Caretaker note</p>
                            <p className="mt-2 leading-6">
                              Captain-reserved slot. Keep the court supervised for the team session. Attendance actions are disabled here because this is a block, not a student booking.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-800">{booking.facility?.name || 'Facility booking'}</h3>
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusTone[booking.status] || 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                              {booking.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {booking.facility?.sportType || 'Sport'} • {booking.facility?.location || 'Sports Complex'}
                          </p>
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl border border-gray-100 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Attendee</p>
                              <p className="mt-2 text-sm font-semibold text-gray-800">{booking.bookedBy?.email || '—'}</p>
                              <p className="mt-1 text-xs text-gray-500">{booking.bookedBy?.name || 'Unknown'}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                                {booking.bookedBy?.roles?.includes('faculty') ? 'Role' : 'Roll number'}
                              </p>
                              <p className="mt-2 text-sm font-semibold text-gray-800">
                                {booking.bookedBy?.roles?.includes('faculty')
                                  ? 'Faculty'
                                  : (booking.bookedBy?.profileDetails?.rollNumber || '—')}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">{booking.bookedBy?.profileDetails?.department || 'Department unavailable'}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Slot time</p>
                              <p className="mt-2 text-sm font-semibold text-gray-800">{formatDate(booking.slotStartAt)}</p>
                              <p className="mt-1 text-xs text-gray-500">{formatTime(booking.slotStartAt)} - {formatTime(booking.slotEndAt)}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Group details</p>
                              <p className="mt-2 text-sm font-semibold text-gray-800">{booking.participantCount || 1} participant(s)</p>
                              <p className="mt-1 text-xs text-gray-500">{booking.isGroupBooking ? 'Group booking' : 'Individual booking'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 lg:min-w-[220px]">
                          <button
                            type="button"
                            onClick={() => handleAttendance(booking, 'present')}
                            disabled={actionBookingId === booking._id}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionBookingId === booking._id ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            Mark present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAttendance(booking, 'absent')}
                            disabled={actionBookingId === booking._id}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionBookingId === booking._id ? <LoaderCircle size={16} className="animate-spin" /> : <XCircle size={16} />}
                            Mark absent
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                )})}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center">
                <h3 className="text-base font-bold text-gray-800">No bookings found</h3>
                <p className="mt-2 text-sm text-gray-500">There are no upcoming bookings matching the selected filters for this caretaker scope.</p>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Search size={18} className="text-brand-500" />
              <div>
                <h2 className="text-lg font-bold text-gray-800">Verify attendee</h2>
                <p className="mt-1 text-sm text-gray-500">Check a roll number or email against an active sports booking.</p>
              </div>
            </div>

            <form onSubmit={handleVerify} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Booking</label>
                <select
                  value={selectedBookingId}
                  onChange={(event) => setSelectedBookingId(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">Any active booking in scope</option>
                  {bookings.map((booking) => (
                    <option key={booking._id} value={booking._id}>
                      {booking.facility?.name} • {formatTime(booking.slotStartAt)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Roll number or email</label>
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="230001 or student@iitk.ac.in"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <button
                type="submit"
                disabled={verifying || !identifier.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verifying ? <LoaderCircle size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
                Verify attendee
              </button>
            </form>

            {verificationResult ? (
              <div className={`mt-5 rounded-2xl border px-4 py-4 ${
                verificationResult.valid
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-amber-200 bg-amber-50'
              }`}>
                {verificationResult.valid ? (
                  <div className="space-y-2 text-sm text-emerald-800">
                    <p className="font-semibold">Valid booking found</p>
                    <p>{verificationResult.booking?.bookedBy?.name || verificationResult.booking?.bookedBy?.email || 'Student verified'}</p>
                    <p>{verificationResult.booking?.facility?.name} • {formatTime(verificationResult.booking?.slotStartAt)}</p>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-amber-900">
                    <p className="font-semibold">No active match</p>
                    <p>{verificationResult.reason}</p>
                    {verificationResult.user ? (
                      <div className="rounded-2xl bg-white/70 p-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <UserRound size={14} />
                          {verificationResult.user.name}
                        </div>
                        <p className="mt-1 text-xs">{verificationResult.user.email}</p>
                        <p className="mt-1 text-xs">{verificationResult.user.rollNumber || 'No roll number found'}</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-brand-500" />
              <div>
                <h2 className="text-lg font-bold text-gray-800">Caretaker notes</h2>
                <p className="mt-1 text-sm text-gray-500">Log entries or search recent facility activity.</p>
              </div>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-gray-600">
              <li>Marking an attendee absent converts the booking to no-show and frees the slot capacity again.</li>
              <li>Use identifier verification when a student arrives without opening the booking card first.</li>
              <li>Per-sport caretakers only see bookings for their assigned facilities.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default SportsCaretakerPage;
