import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Dumbbell,
  Waves,
  Calendar,
  QrCode,
  ShieldCheck,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CalendarDays
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

/* ──────────────────────────────────────────────────────────────────────
   Dashboard Page
   ────────────────────────────────────────────────────────────────────── */
const DashboardPage = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await api.get('/dashboard');
        setDashboard(data.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
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

  const activeSubscription = subscriptions[0]; // Show the first active subscription

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ═══════════════════════════════════════════════
          LEFT COLUMN (2/3)
          ═══════════════════════════════════════════════ */}
      <div className="lg:col-span-2 space-y-6">

        {/* ── Active Subscription Card ─────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {activeSubscription ? (
            <>
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                    {activeSubscription.facilityType?.toLowerCase().includes('swim')
                      ? <Waves size={20} className="text-blue-500" />
                      : <Dumbbell size={20} className="text-brand-500" />
                    }
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-800">
                      Active {activeSubscription.facilityType || 'Gym'} Subscription
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Main Sports Complex • {activeSubscription.facilityType || 'Fitness Zone'}
                    </p>
                  </div>
                </div>
                <StatusBadge status={activeSubscription.status} />
              </div>

              {/* Details row */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Subscription Type</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">{activeSubscription.plan || 'Standard'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Assigned Slot</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">
                    {activeSubscription.startDate ? formatTime(activeSubscription.startDate) : '05:00 - 06:00 PM'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Validity Period</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">
                    Till {activeSubscription.endDate ? formatDate(activeSubscription.endDate) : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-2 bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-600 transition-colors shadow-sm">
                  <QrCode size={16} />
                  View Entry QR
                </button>
                <button className="text-sm font-semibold text-red-500 hover:text-red-600 transition-colors">
                  Cancel Subscription
                </button>
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

          {upcomingBookings.length > 0 ? (
            <div className="space-y-3">
              {upcomingBookings.slice(0, 5).map((booking) => (
                <div key={booking._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
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
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={booking.status} />
                    <button className="w-7 h-7 rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors">
                      <X size={14} />
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
          <div className="w-32 h-32 mx-auto bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center mb-3">
            {activeSubscription?.qrCode ? (
              <img src={activeSubscription.qrCode} alt="QR Code" className="w-28 h-28 object-contain" />
            ) : (
              <QrCode size={48} className="text-gray-300" />
            )}
          </div>
          <p className="text-xs text-gray-400">Click to expand for scanning</p>
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
  );
};

export default DashboardPage;
