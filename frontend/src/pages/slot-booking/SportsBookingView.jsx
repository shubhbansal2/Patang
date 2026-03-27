import { useEffect, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Info,
  ShieldAlert,
  Users,
} from 'lucide-react';
import {
  EmptyState,
  InlineBanner,
  RulesCard,
  SectionHeading,
  StatusBadge,
} from './shared';
import {
  formatDate,
  formatSlotTimeRange,
  getSlotTone,
  getSubscriptionStatusTone,
  isSlotBookable,
} from './utils';

const legendItems = [
  { label: 'Available', tone: 'success' },
  { label: 'Group Open', tone: 'warning' },
  { label: 'Fully Booked', tone: 'danger' },
  { label: 'Team Practice', tone: 'neutral' },
  { label: 'Unavailable', tone: 'info' },
];

const slotToneClasses = {
  success: 'border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:border-emerald-300',
  warning: 'border-amber-200 bg-amber-50/70 text-amber-700 hover:border-amber-300',
  danger: 'border-red-200 bg-red-50/70 text-red-700 hover:border-red-300',
  neutral: 'border-slate-200 bg-slate-100/80 text-slate-700 hover:border-slate-300',
  info: 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300',
};

const SportsBookingView = ({
  data,
  filters,
  loading,
  refreshing,
  submission,
  onFiltersChange,
  onRefresh,
  onCreateBooking,
}) => {
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [selectedCourtId, setSelectedCourtId] = useState('');
  const [isGroupBooking, setIsGroupBooking] = useState(false);
  const [playerCount, setPlayerCount] = useState(1);
  const hasSports = (data?.sportTypes?.length || 0) > 0;

  useEffect(() => {
    if (!data?.courtSlots?.length) {
      setSelectedSlotId('');
      setSelectedCourtId('');
      setIsGroupBooking(false);
      setPlayerCount(1);
      return;
    }

    const exists = data.courtSlots.some((court) =>
      court.slots.some((slot) => slot._id === selectedSlotId && court.facilityId === selectedCourtId)
    );

    if (!exists) {
      setSelectedSlotId('');
      setSelectedCourtId('');
      setIsGroupBooking(false);
      setPlayerCount(1);
    }
  }, [data, selectedCourtId, selectedSlotId]);

  const selectedCourt = data?.courtSlots?.find((court) => court.facilityId === selectedCourtId) || null;
  const selectedSlot = selectedCourt?.slots?.find((slot) => slot._id === selectedSlotId) || null;
  const reminderRule = data?.bookingRules?.find((rule) => rule.toLowerCase().includes('id card'));
  const canCreateGroupBooking = Boolean(
    selectedSlot &&
      selectedSlot.status === 'Available' &&
      selectedSlot.capacity > 1
  );
  const maxPlayerCount = selectedSlot?.capacity || 1;
  const bookable = isSlotBookable(selectedSlot?.status);

  useEffect(() => {
    if (!selectedSlot) {
      setPlayerCount(1);
      return;
    }

    setPlayerCount(Math.min(selectedSlot.minPlayersRequired || 1, selectedSlot.capacity || 1));
  }, [selectedSlotId, selectedCourtId, selectedSlot]);

  useEffect(() => {
    if (!canCreateGroupBooking && isGroupBooking) {
      setIsGroupBooking(false);
    }
  }, [canCreateGroupBooking, isGroupBooking]);

  const bookingBlockedReason = (() => {
    if (!selectedSlot) return 'Select a slot to continue.';
    if (selectedSlot.status === 'Unavailable') return 'This slot has already ended for the selected day.';
    if (!bookable) return 'This slot is not available for booking.';
    if (data?.fairUse?.isSuspended) return 'Your account is currently suspended from booking.';
    if (data?.fairUse && !data.fairUse.canBook) return 'You have reached the active booking limit for the rolling window.';
    return '';
  })();

  const handleBook = () => {
    if (!selectedSlot || bookingBlockedReason) return;

    onCreateBooking({
      slotId: selectedSlot._id,
      bookingDate: filters.date || data?.selectedDate,
      isGroupBooking,
      participantCount: playerCount,
    });
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Facilities / Sports"
        title="Book a sports slot"
        description="Browse active sports courts for the next three days, review recent activity, and confirm an individual or group booking."
        actions={
          <div className="rounded-2xl border border-gray-100 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.95fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <label htmlFor="sportType" className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                  Sport
                </label>
                <div className="relative lg:min-w-[240px]">
                  <select
                    id="sportType"
                    value={filters.sportType || data?.selectedSport || ''}
                    onChange={(event) => onFiltersChange({ sportType: event.target.value })}
                    disabled={!hasSports || refreshing}
                    className="w-full appearance-none rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-12 text-sm font-medium text-gray-700 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    {!hasSports ? (
                      <option value="">No sports configured yet</option>
                    ) : null}
                    {(data?.sportTypes || []).map((sportType) => (
                      <option key={sportType} value={sportType}>
                        {sportType}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {(data?.bookableDates || []).map((bookableDate) => {
                  const isActive = (filters.date || data?.selectedDate) === bookableDate.date;

                  return (
                    <button
                      key={bookableDate.date}
                      type="button"
                      onClick={() => onFiltersChange({ date: bookableDate.date })}
                      className={`min-w-[104px] rounded-2xl border px-4 py-3 text-left transition-all ${
                        isActive
                          ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700'
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">{bookableDate.label}</p>
                      <p className="mt-1 text-base font-bold">{formatDate(bookableDate.date, { day: 'numeric', month: 'short', year: undefined })}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {data?.fairUse?.isSuspended ? (
            <InlineBanner
              tone="danger"
              icon={ShieldAlert}
              title="Booking is suspended"
              description={`Your access is suspended until ${formatDate(data.fairUse.suspendedUntil)}. You can still review slots and history here.`}
            />
          ) : data?.fairUse && !data.fairUse.canBook ? (
            <InlineBanner
              tone="warning"
              icon={ShieldAlert}
              title="Booking quota reached"
              description={`You already have ${data.fairUse.activeBookingCount} active booking(s). The current limit is ${data.fairUse.maxAllowed}.`}
            />
          ) : reminderRule ? (
            <InlineBanner
              tone="info"
              icon={Info}
              title="Reminder"
              description={reminderRule}
            />
          ) : !hasSports ? (
            <InlineBanner
              tone="warning"
              icon={Info}
              title="No sports configured"
              description="The backend returned no active sports facilities, so the selector has no options yet. I can seed local sample facilities if you want more booking scenarios to test."
            />
          ) : null}

          {submission.success && (
            <InlineBanner
              tone="success"
              icon={CheckCircle2}
              title="Booking confirmed"
              description={submission.success}
            />
          )}

          {submission.error && (
            <InlineBanner
              tone="danger"
              icon={ShieldAlert}
              title="Booking failed"
              description={submission.error}
            />
          )}

          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Available courts</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {data?.selectedSport ? `${data.selectedSport} slots for ${formatDate(filters.date || data.selectedDate)}` : 'Choose a sport to start browsing slots.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {legendItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs font-medium text-gray-500">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        item.tone === 'success'
                          ? 'bg-emerald-400'
                          : item.tone === 'warning'
                            ? 'bg-amber-400'
                            : item.tone === 'danger'
                              ? 'bg-red-400'
                              : 'bg-slate-400'
                      }`}
                    />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            {loading && !data?.courtSlots?.length ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-28 animate-pulse rounded-2xl bg-gray-100" />
                ))}
              </div>
            ) : data?.courtSlots?.length ? (
              <div className="mt-6 space-y-6">
                {data.courtSlots.map((court) => (
                  <section key={court.facilityId}>
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-base font-bold text-gray-800">{court.courtName}</h3>
                        <p className="text-sm text-gray-500">
                          {court.location || 'Main Sports Complex'} • Capacity {court.capacity || 1}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                      {court.slots.map((slot) => {
                        const tone = getSlotTone(slot.status);
                        const isSelected = slot._id === selectedSlotId && court.facilityId === selectedCourtId;
                        const actionable = isSlotBookable(slot.status);

                        return (
                          <button
                            key={slot._id}
                            type="button"
                            aria-label={`Select slot ${court.courtName} ${formatSlotTimeRange(slot)}`}
                            onClick={() => {
                              setSelectedSlotId(slot._id);
                              setSelectedCourtId(court.facilityId);
                            }}
                            className={`rounded-2xl border p-4 text-left transition-all ${slotToneClasses[tone] || slotToneClasses.info} ${
                              isSelected ? 'ring-2 ring-brand-400 ring-offset-2' : ''
                            } ${actionable ? 'cursor-pointer' : 'cursor-default'} focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">Slot</p>
                                <p className="mt-2 text-sm font-bold">{formatSlotTimeRange(slot)}</p>
                              </div>
                              <StatusBadge status={slot.status} tone={tone} />
                            </div>

                            <div className="mt-4 space-y-2 text-xs font-medium">
                              <div className="flex items-center justify-between">
                                <span className="opacity-75">Spots left</span>
                                <span>{slot.spotsLeft}</span>
                              </div>
                              {slot.status === 'Unavailable' && (
                                <div className="rounded-xl bg-white/70 px-3 py-2 text-xs text-gray-600">
                                  This slot has already ended and cannot be booked now.
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="opacity-75">Min players</span>
                                <span>{slot.minPlayersRequired || 1}</span>
                              </div>
                              {slot.practiceBlock && (
                                <div className="rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-700">
                                  Reserved for {slot.practiceBlock.sport} practice under {slot.practiceBlock.captain}.
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="mt-6">
                <EmptyState
                  title="No courts available"
                  description="There are no active bookable courts for the selected sport and date."
                />
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Booking activity</h2>
                <p className="mt-1 text-sm text-gray-500">Upcoming bookings first, followed by your latest sports outcomes.</p>
              </div>
            </div>

            {data?.recentActivity?.length ? (
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-gray-100 text-xs uppercase tracking-[0.2em] text-gray-400">
                    <tr>
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold">Facility</th>
                      <th className="pb-3 font-semibold">Time</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentActivity.map((activity) => (
                      <tr key={activity._id} className="border-b border-gray-100 last:border-b-0">
                        <td className="py-4 text-gray-600">{formatDate(activity.date)}</td>
                        <td className="py-4 font-medium text-gray-800">{activity.facility}</td>
                        <td className="py-4 text-gray-600">{activity.time || '—'}</td>
                        <td className="py-4">
                          <StatusBadge status={activity.status} tone={getSubscriptionStatusTone(activity.status)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState
                  title="No booking activity yet"
                  description="Your upcoming and completed sports bookings will appear here once activity is recorded."
                />
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Booking details</h2>
                <p className="mt-1 text-sm text-gray-500">Review the selected slot before confirming.</p>
              </div>
              {selectedSlot && <StatusBadge status={selectedSlot.status} tone={getSlotTone(selectedSlot.status)} />}
            </div>

            {selectedSlot && selectedCourt ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="flex items-start gap-3">
                    <CalendarDays size={18} className="mt-0.5 text-brand-500" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Date & time</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800">{formatDate(filters.date || data?.selectedDate)}</p>
                      <p className="mt-1 text-sm text-gray-500">{formatSlotTimeRange(selectedSlot)}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Court</p>
                    <p className="mt-2 text-sm font-bold text-gray-800">{selectedCourt.courtName}</p>
                    <p className="mt-1 text-sm text-gray-500">{selectedCourt.location || 'Main Sports Complex'}</p>
                  </div>

                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Capacity snapshot</p>
                    <p className="mt-2 text-sm font-bold text-gray-800">{selectedSlot.spotsLeft} spot(s) left</p>
                    <p className="mt-1 text-sm text-gray-500">Slot capacity {selectedSlot.capacity}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 p-4">
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Create as group booking</p>
                      <p className="mt-1 text-sm text-gray-500">
                        Use this when you want the booking to remain pending until the minimum player count is met.
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">Group mode</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {canCreateGroupBooking ? 'Turn this on for shared bookings.' : 'Unavailable for this slot.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={isGroupBooking ? 'Disable group booking' : 'Enable group booking'}
                        onClick={() => canCreateGroupBooking && setIsGroupBooking((current) => !current)}
                        disabled={!canCreateGroupBooking}
                        className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${
                          isGroupBooking ? 'bg-brand-500' : 'bg-gray-300'
                        } ${canCreateGroupBooking ? '' : 'cursor-not-allowed opacity-50'} focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300`}
                      >
                        <span
                          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            isGroupBooking ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-2 xl:grid-cols-1">
                    <div>
                      <label htmlFor="playerCount" className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                        Players coming
                      </label>
                      <div className="relative">
                        <select
                          id="playerCount"
                          value={playerCount}
                          onChange={(event) => setPlayerCount(Number(event.target.value))}
                          disabled={!selectedSlot}
                          className="w-full appearance-none rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-12 text-sm font-medium text-gray-700 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                        >
                          {Array.from({ length: maxPlayerCount }, (_, index) => index + 1).map((count) => (
                            <option key={count} value={count}>
                              {count} player{count > 1 ? 's' : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-gray-400" />
                      Minimum players: {selectedSlot.minPlayersRequired || 1}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock3 size={16} className="text-gray-400" />
                      Fair-use usage: {data?.fairUse?.activeBookingCount || 0}/{data?.fairUse?.maxAllowed || 2}
                    </div>
                  </div>
                </div>

                {bookingBlockedReason && (
                  <InlineBanner
                    tone={data?.fairUse?.isSuspended ? 'danger' : 'warning'}
                    icon={ShieldAlert}
                    title="Action unavailable"
                    description={bookingBlockedReason}
                  />
                )}

                <button
                  type="button"
                  onClick={handleBook}
                  disabled={Boolean(bookingBlockedReason) || submission.submitting}
                  className="w-full rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submission.submitting ? 'Confirming booking...' : 'Confirm booking'}
                </button>
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState
                  title="Select a slot"
                  description="Choose any card from the slot grid to review its details and confirm the booking."
                />
              </div>
            )}
          </div>

          <RulesCard title="Booking rules" rules={data?.bookingRules || []} accent="warning" />
        </aside>
      </div>
    </div>
  );
};

export default SportsBookingView;
