import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Users,
  ClipboardList,
  ScanLine,
  Activity,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

const MetricTile = ({ title, value, icon: Icon, colorClass, linkTo }) => (
  <Link to={linkTo} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-brand-200 transition-colors block group">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
        <p className={`text-2xl font-bold mt-2 ${colorClass || 'text-gray-800'}`}>{value}</p>
      </div>
      <div className={`p-2 rounded-xl bg-gray-50 group-hover:bg-brand-50 transition-colors`}>
        <Icon size={20} className="text-gray-400 group-hover:text-brand-500" />
      </div>
    </div>
  </Link>
);

const SlotManager = ({ facilityType }) => {
  const [slots, setSlots] = useState([]);
  const [occupancy, setOccupancy] = useState({});
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingSlot, setEditingSlot] = useState(null);
  const [newCapacity, setNewCapacity] = useState('');

  const fetchData = async () => {
    try {
      // Fetch slots
      const facRes = await api.get(`/facilities?facilityType=${facilityType}`);
      const facility = facRes.data?.[0];
      if (facility) {
        const slotsRes = await api.get(`/facilities/${facility._id}/slots`);
        setSlots(slotsRes.data || []);
      }
      // Fetch per-slot monthly occupancy
      const subType = facilityType === 'gym' ? 'Gym' : 'SwimmingPool';
      const occRes = await api.get(`/v2/admin/subscriptions/slot-occupancy?facilityType=${subType}`);
      setOccupancy(occRes.data?.data?.slotOccupancy || {});
      setMonth(occRes.data?.data?.month || '');
    } catch (err) {
      console.error('Failed to fetch slot data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [facilityType]);

  const handleUpdateCapacity = async (e) => {
    e.preventDefault();
    if (!editingSlot || !newCapacity) return;
    try {
      await api.put(`/facilities/slots/${editingSlot._id}`, { capacity: Number(newCapacity) });
      setSlots(slots.map(s => s._id === editingSlot._id ? { ...s, capacity: Number(newCapacity) } : s));
      setEditingSlot(null);
      setNewCapacity('');
    } catch (err) {
      alert('Failed to update capacity.');
      console.error(err);
    }
  };

  if (loading) return null;

  // Format month label
  const monthLabel = month ? new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'This Month';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800">Slot Occupancy</h3>
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{monthLabel}</span>
      </div>
      <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
        {slots.length === 0 ? <p className="text-xs text-gray-500">No slots configured.</p> : null}
        {slots.map(slot => {
          const current = occupancy[slot._id] || 0;
          const max = slot.capacity || 0;
          const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
          const isFull = max > 0 && current >= max;
          const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-500';

          return (
            <div key={slot._id} className="p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-800">{slot.startTime} – {slot.endTime}</p>
                {editingSlot?._id === slot._id ? (
                  <form onSubmit={handleUpdateCapacity} className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={newCapacity}
                      onChange={e => setNewCapacity(e.target.value)}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-lg bg-white outline-none focus:border-brand-500"
                      autoFocus
                    />
                    <button type="submit" className="text-xs font-semibold text-white bg-brand-500 px-3 py-1.5 rounded-lg hover:bg-brand-600 transition-colors shadow-sm">Save</button>
                    <button type="button" onClick={() => setEditingSlot(null)} className="text-xs font-medium text-gray-500 hover:text-gray-700 p-1">Cancel</button>
                  </form>
                ) : (
                  <button
                    onClick={() => { setEditingSlot(slot); setNewCapacity(slot.capacity || ''); }}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                  >
                    Edit Cap
                  </button>
                )}
              </div>

              {/* Occupancy bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-xs font-bold ${isFull ? 'text-red-600' : 'text-gray-700'}`}>{current}</span>
                  <span className="text-xs text-gray-400">/</span>
                  <span className="text-xs font-medium text-gray-500">{max || '∞'}</span>
                </div>
              </div>

              {/* Status label */}
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[10px] text-gray-400">Subscriptions this month</p>
                {isFull && (
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">FULL</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const GymAdminDashboardPage = () => {
  const [data, setData] = useState({ requests: [], occupancy: [], totalPending: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/v2/admin/subscriptions?status=Pending&limit=5');
        const resData = res.data?.data || {};
        setData({
          requests: resData.subscriptions || [],
          occupancy: resData.occupancy || [],
          totalPending: resData.pagination?.total || 0,
        });
      } catch (err) {
        console.error('Gym Admin dashboard fetch error:', err);
        setError(err.response?.data?.message || 'Failed to load gym dashboard');
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

  const gymOccupancy = data.occupancy?.find(o => o.facilityType?.toLowerCase() === 'gym') || { currentOccupancy: 0, totalCapacity: 0 };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT COLUMN (2/3) */}
      <div className="lg:col-span-2 space-y-6">

        {/* Key Metrics — gym only */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800">Gym Overview</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricTile
              title="Pending Requests"
              value={data.totalPending}
              icon={ClipboardList}
              colorClass={data.totalPending > 0 ? "text-amber-500" : "text-gray-800"}
              linkTo="/gym-admin/requests"
            />
            <MetricTile
              title="Live Occupancy"
              value={`${gymOccupancy.currentOccupancy} / ${gymOccupancy.totalCapacity || '--'}`}
              icon={Users}
              colorClass="text-brand-600"
              linkTo="/gym-admin/scanner"
            />
          </div>
        </div>

        {/* Recent Pending Requests */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800">Recent Pending Requests</h2>
            <Link to="/gym-admin/requests" className="text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors">
              View All
            </Link>
          </div>

          {data.requests.length > 0 ? (
            <div className="space-y-4">
              {data.requests.map((req, i) => (
                <div key={req._id || i} className="flex items-start gap-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <ClipboardList size={18} className="text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {req.userId?.name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">
                      {req.facilityType} • {req.plan}
                    </p>
                  </div>
                  <div className="text-xs font-medium text-amber-500 bg-amber-50 px-2.5 py-1 rounded-lg">
                    {req.status}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 flex-1 flex flex-col justify-center">
              <ClipboardList size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No pending requests</p>
              <p className="text-xs text-gray-400 mt-1">All subscription requests have been handled</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN (1/3) */}
      <div className="space-y-6">

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link to="/gym-admin/requests" className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-colors group">
              <div className="flex items-center gap-3">
                <ClipboardList size={16} className="text-brand-500" />
                <span className="text-sm font-semibold text-gray-700 group-hover:text-brand-700">Review Requests</span>
              </div>
              <ChevronRight size={16} className="text-gray-400 group-hover:text-brand-500" />
            </Link>
            <Link to="/gym-admin/scanner" className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-colors group">
              <div className="flex items-center gap-3">
                <ScanLine size={16} className="text-brand-500" />
                <span className="text-sm font-semibold text-gray-700 group-hover:text-brand-700">Scan QR Passes</span>
              </div>
              <ChevronRight size={16} className="text-gray-400 group-hover:text-brand-500" />
            </Link>
          </div>
        </div>

        <SlotManager facilityType="gym" />
      </div>
    </div>
  );
};

export default GymAdminDashboardPage;
