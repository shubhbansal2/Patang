import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { 
  CalendarDays, Plus, Clock, CheckCircle, XCircle, AlertCircle, FileText, 
  MapPin, Building2, Link as LinkIcon, RefreshCw, X 
} from 'lucide-react';

const Badge = ({ status }) => {
  const styles = {
    Pending: 'bg-amber-50 text-amber-600 border-amber-200',
    Approved: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    Rejected: 'bg-red-50 text-red-600 border-red-200',
    ChangesRequested: 'bg-blue-50 text-blue-600 border-blue-200',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

const MetricTile = ({ title, value, icon: Icon, colorClass }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-brand-200 transition-colors">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
        <p className={`text-2xl font-bold mt-1 ${colorClass || 'text-gray-800'}`}>{value}</p>
      </div>
      <div className="p-2.5 rounded-xl bg-gray-50 text-gray-400">
        <Icon size={20} />
      </div>
    </div>
  </div>
);

const CoordinatorEventsPage = () => {
  const [data, setData] = useState({ events: [], stats: {}, pagination: {}, formOptions: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '', description: '', category: '', startTime: '', endTime: '', venue: '', organizingClub: '', registrationLink: ''
  });

  // Smart Venue Selection logic
  const [venuesData, setVenuesData] = useState({ venues: [], availabilityByVenue: {} });
  const [venueLoading, setVenueLoading] = useState(false);
  const [lastFetchedDateStr, setLastFetchedDateStr] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/coordinator/events?limit=50');
      setData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Compute local dates
  const computedStart = useMemo(() => {
    if (!formData.startTime) return null;
    return new Date(formData.startTime);
  }, [formData.startTime]);

  const computedEnd = useMemo(() => {
    if (!formData.endTime) return null;
    return new Date(formData.endTime);
  }, [formData.endTime]);

  // Validation
  const timeValidationError = useMemo(() => {
    if (!computedStart || !computedEnd) return null;
    const now = new Date();
    if (computedStart < now) return "Start time cannot be in the past.";
    if (computedEnd <= computedStart) return "End time must be after start time.";
    return null;
  }, [computedStart, computedEnd]);

  // Fetch Venues dynamically when start date changes
  useEffect(() => {
    if (!formData.startTime) return;
    const dateStr = formData.startTime.split('T')[0];
    if (dateStr && dateStr !== lastFetchedDateStr) {
      const fetchVenues = async () => {
        setVenueLoading(true);
        try {
          const res = await api.get(`/coordinator/venues?date=${dateStr}`);
          setVenuesData({
            venues: res.data.data.venues || [],
            availabilityByVenue: res.data.data.availabilityByVenue || {}
          });
          setLastFetchedDateStr(dateStr);
        } catch (err) {
          console.error("Failed to load venues for availability grid", err);
        } finally {
          setVenueLoading(false);
        }
      };
      fetchVenues();
    }
  }, [formData.startTime, lastFetchedDateStr]);

  // Availability Mapping based on venues API
  const availabilityMap = useMemo(() => {
    const map = {};
    if (!computedStart || !computedEnd || timeValidationError) return map;
    
    const cStart = computedStart.getTime();
    const cEnd = computedEnd.getTime();
    
    venuesData.venues.forEach(venue => {
      const blocks = venuesData.availabilityByVenue[venue._id]?.bookedSlots || [];
      const hasConflict = blocks.some(b => {
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();
        return cStart < bEnd && cEnd > bStart;
      });
      // Store conflict status by generic "name" since formData.venue handles strings
      map[venue.name] = !hasConflict; 
    });
    return map;
  }, [computedStart, computedEnd, timeValidationError, venuesData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (timeValidationError) {
      setFormError(timeValidationError);
      return;
    }
    
    // Make sure we are not forcefully letting them book a mapped conflicted venue...
    // Actually Event handles "venue" as a string. But we can warn them anyway!
    if (availabilityMap[formData.venue] === false) {
      setFormError(`The venue "${formData.venue}" is already booked for this timeframe. Please choose an open venue.`);
      return;
    }

    setSubmitLoading(true);
    setFormError('');
    try {
      await api.post('/coordinator/events', formData);
      setIsModalOpen(false);
      setFormData({ title: '', description: '', category: '', startTime: '', endTime: '', venue: '', organizingClub: '', registrationLink: '' });
      fetchData(); // Refresh list
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit event proposal.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading && !data.events.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  const { stats = {}, events = [] } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manage Events</h1>
          <p className="text-sm text-gray-500 mt-1">Submit event proposals and track executive approvals.</p>
        </div>
        <button 
          onClick={() => {
            setFormError('');
            setFormData({ title: '', description: '', category: '', startTime: '', endTime: '', venue: '', organizingClub: '', registrationLink: '' });
            setIsModalOpen(true);
          }}
          className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-brand-500/30 flex items-center gap-2 transition-all"
        >
          <Plus size={18} />
          New Event Proposal
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-center gap-2 border border-red-100">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile title="Total Proposals" value={stats.total || 0} icon={FileText} colorClass="text-brand-600" />
        <MetricTile title="Pending Review" value={stats.Pending || 0} icon={Clock} colorClass="text-amber-500" />
        <MetricTile title="Approved" value={stats.Approved || 0} icon={CheckCircle} colorClass="text-emerald-500" />
        <MetricTile title="Rejected" value={stats.Rejected || 0} icon={XCircle} colorClass="text-red-500" />
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-50">
          <h2 className="text-base font-bold text-gray-800">My Proposals</h2>
          <button onClick={fetchData} className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="px-5 py-3 rounded-tl-lg">Event Title & Details</th>
                <th className="px-5 py-3">Timing</th>
                <th className="px-5 py-3">Venue & Club</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {events.length > 0 ? events.map((event) => (
                <tr key={event._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-bold text-gray-800">{event.title}</p>
                    <p className="text-xs text-brand-500 font-semibold mt-0.5">{event.category}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-gray-700 font-medium">
                      {new Date(event.startTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      to {new Date(event.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-gray-600 mb-1">
                      <MapPin size={14} className="text-gray-400" /> 
                      <span className="text-xs">{event.venue || 'TBD'}</span>
                    </div>
                    {event.organizingClub && (
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Building2 size={14} className="text-gray-400" />
                        <span className="text-[10px] uppercase font-semibold">{event.organizingClub}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <Badge status={event.status} />
                    {event.rejectionReason && (
                      <p className="text-[10px] text-red-500 mt-2 max-w-[150px] leading-tight font-medium">
                        Reason: {event.rejectionReason}
                      </p>
                    )}
                    {event.changeRequestNote && (
                      <p className="text-[10px] text-amber-500 mt-2 max-w-[150px] leading-tight font-medium">
                        Changes requested: {event.changeRequestNote}
                      </p>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="px-5 py-8 text-center text-gray-400">
                    <CalendarDays size={32} className="mx-auto mb-3 opacity-20" />
                    <p>No event proposals submitted yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">New Event Proposal</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {formError && (
                <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 flex gap-2">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" /> {formError}
                </div>
              )}
              
              <form id="eventForm" onSubmit={handleSubmit} className="space-y-5">
                
                {/* 1. Basic Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Event Title <span className="text-red-500">*</span></label>
                      <input required name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Annual Tech Summit" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm outline-none transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Category <span className="text-red-500">*</span></label>
                      <select required name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm outline-none transition-all appearance-none bg-white">
                        <option value="" disabled>Select Category</option>
                        {(data.formOptions?.categories || []).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Event Description</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} rows="2" placeholder="Describe the event details..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm outline-none transition-all resize-none" />
                  </div>
                </div>

                {/* 2. Timing */}
                <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Clock size={16} className="text-brand-500"/> Schedule
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Start Time <span className="text-red-500">*</span></label>
                      <input required type="datetime-local" name="startTime" value={formData.startTime} onChange={handleChange} min={new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 16)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm outline-none transition-all bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">End Time <span className="text-red-500">*</span></label>
                      <input required type="datetime-local" name="endTime" value={formData.endTime} onChange={handleChange} min={formData.startTime || new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 16)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm outline-none transition-all bg-white" />
                    </div>
                  </div>
                  {timeValidationError && formData.startTime && formData.endTime && (
                     <p className="text-xs font-semibold text-red-500 mt-2 flex items-center gap-1"><AlertCircle size={12}/>{timeValidationError}</p>
                  )}
                </div>

                {/* 3. Smart Venue Grid */}
                <div className={`bg-gray-50/50 rounded-2xl border border-gray-100 p-4 transition-opacity duration-300 ${(!computedStart || !computedEnd || timeValidationError) ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                   <div className="flex justify-between items-center mb-3">
                     <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                       <MapPin size={16} className="text-brand-500" /> Select Available Venue
                     </h3>
                     {venueLoading && <RefreshCw size={14} className="text-gray-400 animate-spin" />}
                   </div>
                   
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                      {venuesData.venues.map(v => {
                        const isSelected = formData.venue === v.name;
                        const isAvailable = availabilityMap[v.name] ?? true;
                        
                        return (
                          <button
                            type="button"
                            key={v._id}
                            disabled={!isAvailable}
                            onClick={() => setFormData({...formData, venue: v.name})}
                            className={`
                              text-left px-3 py-2.5 rounded-xl border transition-all text-xs
                              ${!isAvailable 
                                 ? 'bg-red-50/50 border-red-100 text-red-400 cursor-not-allowed opacity-70' 
                                 : isSelected
                                    ? 'bg-brand-50 border-brand-400 ring-2 ring-brand-500/20 text-brand-700 shadow-sm font-bold'
                                    : 'bg-white border-gray-200 text-gray-700 hover:border-brand-300 hover:shadow-sm font-medium'
                              }
                            `}
                          >
                            <span className={`truncate w-full block ${!isAvailable ? 'text-red-500 line-through decoration-red-300' : ''}`}>
                               {v.name} {!isAvailable && '(Conflicted)'}
                            </span>
                          </button>
                        );
                      })}
                   </div>
                   
                   <div className="mt-3 pt-3 border-t border-gray-100">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Or type a Custom Venue / Link:</label>
                      <input name="venue" value={formData.venue} onChange={handleChange} placeholder="e.g. OAT, Online Teams Link, etc." className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 text-xs outline-none transition-all bg-white" />
                   </div>
                </div>

                {/* 4. Other Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Organizing Club</label>
                    <select name="organizingClub" value={formData.organizingClub} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm outline-none transition-all appearance-none bg-white">
                      <option value="">None / Custom</option>
                      {(data.formOptions?.clubs || []).map(club => <option key={club} value={club}>{club}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Registration Link (Optional)</label>
                    <div className="relative">
                      <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="url" name="registrationLink" value={formData.registrationLink} onChange={handleChange} placeholder="https://..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm outline-none transition-all" />
                    </div>
                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
                Cancel
              </button>
              <button form="eventForm" type="submit" disabled={submitLoading || timeValidationError} className="px-6 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm shadow-brand-500/30 transition-all flex items-center gap-2">
                {submitLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Submit Proposal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoordinatorEventsPage;
