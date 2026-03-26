import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  ChevronLeft, ChevronRight, Calendar, MapPin, Clock,
  Trophy, Music, Cpu, Megaphone, Star, ExternalLink,
  Dumbbell, Waves, Zap, Filter
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════ */

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const fmtTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
};

const fmtDateFull = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

/* ─── Category config ───────────────────────────────────────────────── */
const CATEGORY_CONFIG = {
  Sports:    { icon: Trophy,    color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-400' },
  Cultural:  { icon: Music,     color: 'bg-purple-500',  light: 'bg-purple-50 text-purple-600 border-purple-200',   dot: 'bg-purple-400'  },
  Technical: { icon: Cpu,       color: 'bg-blue-500',    light: 'bg-blue-50 text-blue-600 border-blue-200',         dot: 'bg-blue-400'    },
  Notice:    { icon: Megaphone, color: 'bg-amber-500',   light: 'bg-amber-50 text-amber-600 border-amber-200',     dot: 'bg-amber-400'   },
  Other:     { icon: Star,      color: 'bg-gray-500',    light: 'bg-gray-100 text-gray-600 border-gray-200',       dot: 'bg-gray-400'    },
};

const getCat = (cat) => CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.Other;

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════ */
const CalendarPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');

  /* ── Fetch calendar data ────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: currentMonth });
      if (categoryFilter) params.set('category', categoryFilter);
      const { data: res } = await api.get(`/calendar?${params.toString()}`);
      setData(res.data || res);
    } catch (err) {
      console.error('Calendar fetch error:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, categoryFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Month navigation ───────────────────────────────────────────── */
  const navigateMonth = (dir) => {
    const [y, m] = currentMonth.split('-').map(Number);
    const nd = new Date(y, m - 1 + dir, 1);
    setCurrentMonth(`${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}`);
    setSelectedDate(null);
    setSelectedEvent(null);
  };

  /* ── Build calendar grid ────────────────────────────────────────── */
  const buildGrid = () => {
    if (!data?.month) return [];
    const { daysInMonth, firstDayOfWeek } = data.month;
    const cells = [];
    // Empty leading cells
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  };

  const grid = buildGrid();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  /* ── Events for a given day ─────────────────────────────────────── */
  const getEventsForDay = (day) => {
    if (!day || !data?.eventsByDate) return [];
    const key = `${currentMonth}-${String(day).padStart(2, '0')}`;
    return data.eventsByDate[key] || [];
  };

  /* ── Personal bookings for a given day ──────────────────────────── */
  const getBookingsForDay = (day) => {
    if (!day || !data?.personalBookings) return [];
    const key = `${currentMonth}-${String(day).padStart(2, '0')}`;
    return data.personalBookings.filter(b => b.date === key);
  };

  /* ── Events for selected date ───────────────────────────────────── */
  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : [];
  const selectedDateBookings = selectedDate ? getBookingsForDay(selectedDate) : [];
  const selectedDateKey = selectedDate ? `${currentMonth}-${String(selectedDate).padStart(2, '0')}` : null;

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Home / <span className="text-gray-600 font-medium">Calendar</span></p>
          <h1 className="text-2xl font-bold text-gray-800">Events Calendar</h1>
        </div>
      </div>

      {/* Two-column Layout */}
      <div className="flex gap-6">
        {/* ─── Main: Calendar Grid ─────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Month Navigation + Category Filter */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <button onClick={() => navigateMonth(-1)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all">
                  <ChevronLeft size={18} />
                </button>
                <h2 className="text-lg font-bold text-gray-800 min-w-[180px] text-center">
                  {data?.month?.label || currentMonth}
                </h2>
                <button onClick={() => navigateMonth(1)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all">
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Category Filters */}
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-gray-400" />
                <button onClick={() => { setCategoryFilter(''); setSelectedDate(null); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    !categoryFilter ? 'bg-brand-50 text-brand-600 border-brand-200' : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}>All</button>
                {Object.keys(CATEGORY_CONFIG).map(cat => {
                  const cfg = getCat(cat);
                  const Icon = cfg.icon;
                  return (
                    <button key={cat} onClick={() => { setCategoryFilter(cat === categoryFilter ? '' : cat); setSelectedDate(null); }}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        categoryFilter === cat ? cfg.light : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                      }`}>
                      <Icon size={12} /> {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Calendar Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {DAY_NAMES.map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider py-2">{d}</div>
                  ))}
                </div>

                {/* Day Cells */}
                <div className="grid grid-cols-7 gap-1">
                  {grid.map((day, idx) => {
                    if (day === null) return <div key={`empty-${idx}`} className="aspect-square" />;

                    const dayKey = `${currentMonth}-${String(day).padStart(2, '0')}`;
                    const events = getEventsForDay(day);
                    const bookings = getBookingsForDay(day);
                    const isToday = dayKey === todayKey;
                    const isSelected = selectedDate === day;
                    const hasContent = events.length > 0 || bookings.length > 0;

                    return (
                      <button
                        key={day}
                        onClick={() => { setSelectedDate(day); setSelectedEvent(null); }}
                        className={`aspect-square rounded-xl p-1.5 flex flex-col items-center justify-start gap-1 text-sm font-medium transition-all relative
                          ${isSelected
                            ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 ring-2 ring-brand-500 ring-offset-1'
                            : isToday
                              ? 'bg-brand-50 text-brand-600 ring-1 ring-brand-200'
                              : hasContent
                                ? 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                : 'text-gray-500 hover:bg-gray-50'
                          }`}
                      >
                        <span className="text-[13px]">{day}</span>
                        {/* Event dots */}
                        {events.length > 0 && (
                          <div className="flex gap-0.5 flex-wrap justify-center">
                            {events.slice(0, 3).map((e, i) => (
                              <span key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : getCat(e.category).dot}`} />
                            ))}
                            {events.length > 3 && (
                              <span className={`text-[8px] font-bold ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>+{events.length - 3}</span>
                            )}
                          </div>
                        )}
                        {/* Personal booking indicator */}
                        {bookings.length > 0 && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/60' : 'bg-teal-400'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ── Selected Date Events ───────────────────────────────── */}
          {selectedDate && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4">
                {fmtDateFull(selectedDateKey)}
              </h3>

              {selectedDateEvents.length === 0 && selectedDateBookings.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Calendar size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No events on this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Events */}
                  {selectedDateEvents.map((event, i) => {
                    const cfg = getCat(event.category);
                    const Icon = cfg.icon;
                    return (
                      <button key={event._id || i} onClick={() => setSelectedEvent(event)}
                        className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-md ${
                          selectedEvent?._id === event._id ? 'border-brand-300 bg-brand-50/50 shadow-sm' : 'border-gray-100 hover:border-gray-200'
                        }`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl ${cfg.color} flex items-center justify-center flex-shrink-0`}>
                            <Icon size={18} className="text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-800">{event.title}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <Clock size={11} /> {fmtTime(event.startTime)} — {fmtTime(event.endTime)}
                              </span>
                              {event.venue && (
                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                  <MapPin size={11} /> {event.venue}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.light}`}>{event.category}</span>
                              <span className="text-[10px] text-gray-400">by {event.organizingClub}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* Personal Bookings */}
                  {selectedDateBookings.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 pt-2">
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Your Bookings</span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>
                      {selectedDateBookings.map((b, i) => (
                        <div key={b._id || i} className="flex items-center gap-3 p-3 bg-teal-50/50 rounded-xl border border-teal-100">
                          {b.sportType?.toLowerCase().includes('swim') ? <Waves size={16} className="text-blue-400" />
                            : b.sportType?.toLowerCase().includes('gym') ? <Dumbbell size={16} className="text-purple-400" />
                            : <Trophy size={16} className="text-teal-500" />}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-700">{b.title}</p>
                            <p className="text-xs text-gray-400">{fmtTime(b.startTime)} — {fmtTime(b.endTime)}</p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-600">
                            {(b.status || '').toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Sidebar ─────────────────────────────────────────────── */}
        <div className="w-80 flex-shrink-0 space-y-5">
          {/* Event Detail */}
          {selectedEvent && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {selectedEvent.posterUrl && (
                <img src={selectedEvent.posterUrl} alt={selectedEvent.title}
                  className="w-full h-40 object-cover" />
              )}
              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  {(() => { const cfg = getCat(selectedEvent.category); const Icon = cfg.icon; return (
                    <div className={`w-10 h-10 rounded-xl ${cfg.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={18} className="text-white" />
                    </div>
                  );})()}
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">{selectedEvent.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCat(selectedEvent.category).light}`}>
                      {selectedEvent.category}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">{selectedEvent.description}</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock size={13} className="text-gray-400" />
                    <span>{fmtTime(selectedEvent.startTime)} — {fmtTime(selectedEvent.endTime)}</span>
                  </div>
                  {selectedEvent.venue && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <MapPin size={13} className="text-gray-400" />
                      <span>{selectedEvent.venue}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-500">
                    <Megaphone size={13} className="text-gray-400" />
                    <span>{selectedEvent.organizingClub}</span>
                  </div>
                  {selectedEvent.createdBy && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Star size={13} className="text-gray-400" />
                      <span>Posted by {selectedEvent.createdBy}</span>
                    </div>
                  )}
                </div>
                {selectedEvent.registrationLink && (
                  <a href={selectedEvent.registrationLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 mt-4 px-4 py-2.5 text-sm font-semibold text-white bg-brand-500 rounded-xl hover:bg-brand-600 transition-colors shadow-sm">
                    <ExternalLink size={14} /> Register Now
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Upcoming Events */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-brand-500" />
              <h3 className="text-sm font-bold text-gray-800">Upcoming Events</h3>
            </div>
            {(data?.upcomingHighlights || []).length > 0 ? (
              <div className="space-y-3">
                {data.upcomingHighlights.map((e, i) => {
                  const cfg = getCat(e.category);
                  const Icon = cfg.icon;
                  return (
                    <div key={e._id || i} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg ${cfg.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon size={14} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{e.title}</p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(e.startTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} • {e.venue || e.organizingClub}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No upcoming events scheduled.</p>
            )}
          </div>

          {/* Category Legend */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Categories</h3>
            <div className="space-y-2">
              {Object.entries(data?.categories || {}).map(([cat, count]) => {
                const cfg = getCat(cat);
                return (
                  <div key={cat} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                      <span className="text-sm text-gray-600">{cat}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-400">{count}</span>
                  </div>
                );
              })}
              {Object.keys(data?.categories || {}).length === 0 && (
                <p className="text-xs text-gray-400">No events this month.</p>
              )}
            </div>
            {data?.totalEvents > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">Total Events</span>
                <span className="text-sm font-bold text-gray-800">{data.totalEvents}</span>
              </div>
            )}
          </div>

          {/* Calendar Legend */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Legend</h3>
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-400" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                <span>Your Bookings</span>
              </div>
              {Object.entries(CATEGORY_CONFIG).map(([cat, cfg]) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                  <span>{cat} Event</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
