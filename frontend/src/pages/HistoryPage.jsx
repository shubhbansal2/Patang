import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  Trophy, Dumbbell, Waves, AlertTriangle, Download, Search,
  Calendar, Info, ChevronLeft, ChevronRight, ShieldCheck,
  CircleDot, XCircle, Clock, BarChart3, HelpCircle
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════ */

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  const now = new Date();
  const diff = (now - dt) / 86400000;
  if (diff < 1 && dt.getDate() === now.getDate()) return 'Today, ' + dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (diff < 2 && dt.getDate() === new Date(now - 86400000).getDate()) return 'Yesterday, ' + dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
};

/* ─── Status Badge ──────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const map = {
    completed: { color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: '●', label: 'Attended' },
    Attended: { color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: '●', label: 'Attended' },
    confirmed: { color: 'bg-teal-50 text-teal-600 border-teal-200', icon: '●', label: 'Confirmed' },
    Confirmed: { color: 'bg-teal-50 text-teal-600 border-teal-200', icon: '●', label: 'Confirmed' },
    Recorded: { color: 'bg-blue-50 text-blue-600 border-blue-200', icon: '●', label: 'Recorded' },
    cancelled: { color: 'bg-gray-100 text-gray-500 border-gray-200', icon: '●', label: 'Cancelled' },
    Cancelled: { color: 'bg-gray-100 text-gray-500 border-gray-200', icon: '●', label: 'Cancelled' },
    no_show: { color: 'bg-red-50 text-red-500 border-red-200', icon: '●', label: 'No-Show' },
    NoShow: { color: 'bg-red-50 text-red-500 border-red-200', icon: '●', label: 'No-Show' },
    group_pending: { color: 'bg-amber-50 text-amber-600 border-amber-200', icon: '●', label: 'Pending' },
    Pending: { color: 'bg-amber-50 text-amber-600 border-amber-200', icon: '●', label: 'Pending' },
    Approved: { color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: '●', label: 'Approved' },
    Rejected: { color: 'bg-red-50 text-red-500 border-red-200', icon: '●', label: 'Rejected' },
    Expired: { color: 'bg-gray-100 text-gray-500 border-gray-200', icon: '●', label: 'Expired' },
  };
  const s = map[status] || { color: 'bg-gray-100 text-gray-500 border-gray-200', icon: '●', label: status || 'Unknown' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${s.color}`}>
      <span className="text-[8px]">{s.icon}</span> {s.label}
    </span>
  );
};

/* ─── Sport Icon ────────────────────────────────────────────────────── */
const SportIcon = ({ type }) => {
  const t = (type || '').toLowerCase();
  if (t.includes('swim')) return <Waves size={18} className="text-blue-500" />;
  if (t.includes('gym') || t.includes('weight')) return <Dumbbell size={18} className="text-purple-500" />;
  return <Trophy size={18} className="text-brand-500" />;
};

/* ─── Penalty Icon ──────────────────────────────────────────────────── */
const PenaltyIcon = ({ type }) => {
  if (type === 'NoShow') return <XCircle size={20} className="text-red-500" />;
  if (type === 'LateCancellation') return <AlertTriangle size={20} className="text-amber-500" />;
  return <AlertTriangle size={20} className="text-gray-500" />;
};

/* ═══════════════════════════════════════════════════════════════════════
   TAB DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════ */
const tabs = [
  { key: 'sports', label: 'Sports Facilities', icon: Trophy },
  { key: 'gym-swimming', label: 'Gym & Swimming', icon: Dumbbell },
  { key: 'penalties', label: 'Penalties History', icon: AlertTriangle },
];

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════ */
const HistoryPage = () => {
  const [activeTab, setActiveTab] = useState('sports');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  /* ── Fetch data ─────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 5 });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const { data: res } = await api.get(`/history/${activeTab}?${params.toString()}`);
      setData(res.data || res);
    } catch (err) {
      console.error('History fetch error:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(1);
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setShowDatePicker(false);
  };

  /* ── CSV Export ──────────────────────────────────────────────────── */
  const handleExport = () => {
    if (!data?.records?.length) return;
    const rows = data.records.map(r => {
      if (activeTab === 'sports') {
        return [fmtDate(r.date), r.activityDetails?.facilityName, r.activityDetails?.sportType, fmtTime(r.slotTime?.start) + ' - ' + fmtTime(r.slotTime?.end), r.status].join(',');
      }
      if (activeTab === 'gym-swimming') {
        return [fmtDate(r.date), r.activityDetails?.facilityName, r.activityDetails?.location, r.slotTime?.type, r.status].join(',');
      }
      return [fmtDate(r.createdAt), r.type, r.description, r.isActive ? 'Active' : 'Resolved', r.consequence].join(',');
    });
    const csv = 'data:text/csv;charset=utf-8,' + encodeURIComponent(['Date,Details,Type,Time,Status', ...rows].join('\n'));
    const link = document.createElement('a');
    link.href = csv;
    link.download = `history_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  /* ── Filter records by search ───────────────────────────────────── */
  const filteredRecords = (data?.records || []).filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const name = (r.activityDetails?.facilityName || r.type || r.description || '').toLowerCase();
    const sport = (r.activityDetails?.sportType || '').toLowerCase();
    return name.includes(term) || sport.includes(term);
  });

  const pagination = data?.pagination;

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Home / <span className="text-gray-600 font-medium">History</span></p>
          <h1 className="text-2xl font-bold text-gray-800">Activity History</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 w-52 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6 mt-5">
        {/* ─── Main Content ────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Tab Bar + Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-5 overflow-x-auto pb-1">
            {/* Tabs */}
            <div className="flex bg-gray-50 rounded-xl p-1 border border-gray-100">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => handleTabChange(key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === key
                      ? 'bg-white text-brand-600 shadow-sm border border-gray-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {/* Spacing */}
            <div className="flex-1" />

            {/* Date Range */}
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                  startDate || endDate
                    ? 'bg-brand-50 text-brand-600 border-brand-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Calendar size={14} />
                Date Range
              </button>
              {showDatePicker && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl border border-gray-200 shadow-lg p-4 z-20 w-72">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                      <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                      <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">Clear</button>
                      <button onClick={() => setShowDatePicker(false)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors">Apply</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Export */}
            <button onClick={handleExport} title="Export CSV"
              className="p-2 text-gray-400 hover:text-brand-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
              <Download size={16} />
            </button>
          </div>

          {/* ── Data Table ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !filteredRecords.length ? (
              <div className="text-center py-20 text-gray-400">
                <Clock size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No records found</p>
                <p className="text-sm mt-1">Try adjusting your filters or date range.</p>
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div className="grid grid-cols-[160px_1fr_150px_130px_60px] gap-4 px-6 py-3 bg-gray-50/80 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[700px]">
                  <span>Date</span>
                  <span>Activity Details</span>
                  <span>Slot Time / Type</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>

                {/* Table Rows */}
                {filteredRecords.map((record, idx) => (
                  <div key={record._id || idx}
                    className={`grid grid-cols-[160px_1fr_150px_130px_60px] gap-4 px-6 py-4 items-center border-b border-gray-50 hover:bg-gray-50/50 transition-colors min-w-[700px] ${
                      idx % 2 === 0 ? '' : 'bg-gray-50/30'
                    }`}>

                    {/* Date */}
                    <span className="text-sm font-medium text-gray-700">
                      {activeTab === 'penalties' ? fmtDate(record.createdAt) : fmtDate(record.date)}
                    </span>

                    {/* Activity Details */}
                    <div className="flex items-center gap-3 min-w-0">
                      {activeTab === 'penalties' ? (
                        <PenaltyIcon type={record.type} />
                      ) : (
                        <SportIcon type={record.activityDetails?.sportType || record.activityDetails?.type} />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {activeTab === 'penalties' ? record.type?.replace(/([A-Z])/g, ' $1').trim() : record.activityDetails?.facilityName}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {activeTab === 'penalties'
                            ? record.description
                            : [record.activityDetails?.sportType, record.activityDetails?.location].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                    </div>

                    {/* Time / Type */}
                    <div>
                      {activeTab === 'penalties' ? (
                        <div className="text-xs text-gray-500">
                          {record.relatedBooking ? (
                            <>
                              <p className="font-medium text-gray-600">{record.relatedBooking.facilityName}</p>
                              <p>{fmtDate(record.relatedBooking.slotDate)}</p>
                            </>
                          ) : '—'}
                        </div>
                      ) : activeTab === 'gym-swimming' ? (
                        <div className="text-xs text-gray-500">
                          <p className="font-medium text-gray-600">{record.slotTime?.type}</p>
                          <p>{fmtTime(record.slotTime?.checkIn || record.date)}</p>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">
                          <p className="font-semibold text-gray-700">
                            {fmtTime(record.slotTime?.start)}
                          </p>
                          <p>- {fmtTime(record.slotTime?.end)}</p>
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      {activeTab === 'penalties' ? (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${
                          record.isActive
                            ? 'bg-red-50 text-red-500 border-red-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}>
                          ● {record.isActive ? 'Active' : 'Resolved'}
                        </span>
                      ) : (
                        <StatusBadge status={record.status} />
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-center">
                      <button className="p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-all"
                        title="View details">
                        <Info size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Pagination */}
            {pagination && pagination.total > 0 && (
              <div className="flex items-center justify-between px-6 py-3 bg-gray-50/50 border-t border-gray-100">
                <span className="text-xs text-gray-400">{pagination.showing}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                    disabled={page >= pagination.pages}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Sidebar ─────────────────────────────────────────────── */}
        <div className="w-full lg:w-72 lg:flex-shrink-0 space-y-5">
          {/* Recent Penalties */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800">Recent Penalties</h3>
              <button onClick={() => handleTabChange('penalties')}
                className="text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors">
                View All
              </button>
            </div>
            {(data?.recentPenalties || []).length > 0 ? (
              <div className="space-y-4">
                {(data.recentPenalties || []).slice(0, 3).map((p, i) => (
                  <div key={p._id || i} className="flex items-start gap-3">
                    <PenaltyIcon type={p.type} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800">
                        {(p.type || '').replace(/([A-Z])/g, ' $1').replace('No Show', 'Slot No-Show').trim()}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDate(p.createdAt)}</p>
                      {p.consequence && (
                        <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.consequence.includes('Ban')
                            ? 'bg-red-100 text-red-600'
                            : 'bg-amber-100 text-amber-600'
                        }`}>
                          {p.consequence}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No active penalties. Great job! 🎉</p>
            )}
          </div>

          {/* Monthly Stats */}
          {data?.monthlyStats && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={16} className="text-brand-500" />
                <h3 className="text-sm font-bold text-gray-800">Monthly Stats</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">Attended</p>
                  <p className="text-2xl font-bold text-gray-800">{data.monthlyStats.attended}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">Missed</p>
                  <p className="text-2xl font-bold text-red-500">{data.monthlyStats.missed}</p>
                </div>
              </div>
              {/* Fair Use */}
              {data?.fairUse && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Fair Use Score</span>
                    <span className={`text-xs font-bold ${
                      data.fairUse.score === 'Good' ? 'text-emerald-500'
                        : data.fairUse.score === 'Moderate' ? 'text-amber-500'
                        : 'text-red-500'
                    }`}>
                      {data.fairUse.score}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      data.fairUse.score === 'Good' ? 'bg-emerald-400 w-full'
                        : data.fairUse.score === 'Moderate' ? 'bg-amber-400 w-1/2'
                        : 'bg-red-400 w-1/4'
                    }`} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Penalty Summary (penalties tab only) */}
          {activeTab === 'penalties' && data?.summary && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck size={16} className="text-brand-500" />
                <h3 className="text-sm font-bold text-gray-800">Penalty Summary</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Active Penalties</span>
                  <span className="font-bold text-gray-800">{data.summary.totalActive}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">No-Shows</span>
                  <span className="font-bold text-gray-800">{data.summary.byType?.noShow || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Late Cancellations</span>
                  <span className="font-bold text-gray-800">{data.summary.byType?.lateCancellation || 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Subscription Timeline (gym-swimming only) */}
          {activeTab === 'gym-swimming' && data?.subscriptions?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <CircleDot size={16} className="text-brand-500" />
                <h3 className="text-sm font-bold text-gray-800">Subscriptions</h3>
              </div>
              <div className="space-y-3">
                {data.subscriptions.slice(0, 4).map((sub, i) => (
                  <div key={sub._id || i} className="flex items-center gap-3">
                    {sub.facilityType === 'Gym' ? <Dumbbell size={16} className="text-purple-400" /> : <Waves size={16} className="text-blue-400" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-700">{sub.facilityType} — {sub.plan}</p>
                      <p className="text-[10px] text-gray-400">
                        {sub.startDate ? fmtDate(sub.startDate) : '—'} → {sub.endDate ? fmtDate(sub.endDate) : '—'}
                      </p>
                    </div>
                    <StatusBadge status={sub.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dispute Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle size={16} className="text-brand-500" />
              <h3 className="text-sm font-bold text-gray-800">Dispute a Penalty?</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              If you believe a penalty was applied in error, you can raise a dispute request within 48 hours.
            </p>
            <button className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:text-gray-800 transition-all">
              Raise Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
