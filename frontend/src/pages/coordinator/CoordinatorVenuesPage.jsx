import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { 
  Building2, Plus, Clock, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight,
  RefreshCw, X, MapPin, CalendarDays, ClipboardList, Users
} from 'lucide-react';

const Badge = ({ status }) => {
  const styles = {
    pending: 'bg-amber-50 text-amber-600 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    rejected: 'bg-red-50 text-red-600 border-red-200',
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

const CoordinatorVenuesPage = () => {
  const [data, setData] = useState({ venues: [], bookableDates: [], availabilityByVenue: {}, myRequests: [], requestStats: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Default to today based on backend if empty, persist via localStorage
  const [selectedDate, setSelectedDate] = useState(() => localStorage.getItem('patang_venue_date') || '');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Using explicit datetime-local to allow free selection and overcome UTC boundaries
  const [formData, setFormData] = useState({
    venueId: '', startDateTime: '', endDateTime: '', reason: 'event', notes: ''
  });

  const fetchData = async (dateParam = '') => {
    setLoading(true);
    try {
      const response = await api.get(`/coordinator/venues${dateParam ? `?date=${dateParam}` : ''}`);
      setData(response.data.data);
      if (!selectedDate && response.data.data.selectedDate) {
        setSelectedDate(response.data.data.selectedDate);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load venues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      localStorage.setItem('patang_venue_date', selectedDate);
    }
    fetchData(selectedDate);
    // eslint-disable-next-line
  }, [selectedDate]);

  // Open modal resets data
  const handleOpenModal = () => {
    setFormError('');
    setFormData({ venueId: '', startDateTime: '', endDateTime: '', reason: 'event', notes: '' });
    setIsModalOpen(true);
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Sync background data when user changes the target date inside the modal
  useEffect(() => {
    if (formData.startDateTime) {
      const formDateStr = formData.startDateTime.split('T')[0];
      if (formDateStr && formDateStr !== selectedDate) {
        setSelectedDate(formDateStr);
      }
    }
  }, [formData.startDateTime, selectedDate]);

  // Compute actual Date objects from datetime-local strings
  const computedStart = useMemo(() => {
    if (!formData.startDateTime) return null;
    return new Date(formData.startDateTime);
  }, [formData.startDateTime]);

  const computedEnd = useMemo(() => {
    if (!formData.endDateTime) return null;
    return new Date(formData.endDateTime);
  }, [formData.endDateTime]);

  // Validate timestamps locally
  const timeValidationError = useMemo(() => {
    if (!computedStart || !computedEnd) return null;
    const now = new Date();
    if (computedStart < now) return "Start time cannot be in the past.";
    if (computedEnd <= computedStart) return "End time must be after start time.";
    return null;
  }, [computedStart, computedEnd]);

  // Compute Venue availability based on computed start/end
  const availabilityMap = useMemo(() => {
    const map = {};
    if (!computedStart || !computedEnd || timeValidationError) {
      // If no valid time range, return empty map (nothing is marked unavailable/red yet)
      return map; 
    }
    const cStartTime = computedStart.getTime();
    const cEndTime = computedEnd.getTime();

    data.venues.forEach(venue => {
      const blocks = data.availabilityByVenue[venue._id]?.bookedSlots || [];
      const hasConflict = blocks.some(b => {
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();
        // Overlap: RequestStart < BlockEnd AND RequestEnd > BlockStart
        return cStartTime < bEnd && cEndTime > bStart;
      });
      map[venue._id] = !hasConflict; // true = Available, false = Unavailable (red)
    });
    return map;
  }, [computedStart, computedEnd, timeValidationError, data.venues, data.availabilityByVenue]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (timeValidationError) {
      setFormError(timeValidationError);
      return;
    }
    if (!formData.venueId) {
      setFormError("Please select a venue.");
      return;
    }
    if (!availabilityMap[formData.venueId]) {
      setFormError("The selected venue is blocked for this time frame.");
      return;
    }

    setSubmitLoading(true);
    setFormError('');
    try {
      await api.post('/coordinator/venues', {
        venueId: formData.venueId,
        startTime: computedStart.toISOString(),
        endTime: computedEnd.toISOString(),
        reason: formData.reason,
        notes: formData.notes
      });
      setIsModalOpen(false);
      fetchData(selectedDate); // Refresh
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit venue booking request.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading && !data.venues.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  const { requestStats = {}, myRequests = [], bookableDates = [], venues = [], availabilityByVenue = {} } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Book Venue</h1>
          <p className="text-sm text-gray-500 mt-1">Check availability and request venue bookings for events.</p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-brand-500/30 flex items-center gap-2 transition-all"
        >
          <Plus size={18} />
          New Venue Request
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-center gap-2 border border-red-100">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile title="Total Requests" value={requestStats.total || 0} icon={ClipboardList} colorClass="text-brand-600" />
        <MetricTile title="Pending Review" value={requestStats.pending || 0} icon={Clock} colorClass="text-amber-500" />
        <MetricTile title="Approved" value={requestStats.approved || 0} icon={CheckCircle} colorClass="text-emerald-500" />
        <MetricTile title="Rejected" value={requestStats.rejected || 0} icon={XCircle} colorClass="text-red-500" />
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex overflow-x-auto">
        {bookableDates.map((d) => (
          <button
            key={d.date}
            onClick={() => setSelectedDate(d.date)}
            className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all mr-2 last:mr-0 ${selectedDate === d.date ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Availability Grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <CalendarDays size={18} className="text-brand-500" /> Availability Outline for {selectedDate && new Date(selectedDate).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric'})}
          </h2>
          <button onClick={() => fetchData(selectedDate)} className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="space-y-6">
          {venues.length > 0 ? venues.map((venue) => {
            const venueBlocks = availabilityByVenue[venue._id]?.bookedSlots || [];
            return (
              <div key={venue._id} className="border border-gray-100 rounded-xl p-4 hover:border-brand-200 transition-colors">
                <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-3">
                  <div>
                    <h3 className="font-bold text-gray-800">{venue.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 font-medium">
                      <span className="flex items-center gap-1"><MapPin size={12}/>{venue.location || 'Campus'}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 px-2 py-1 rounded">
                    {venue.facilityType}
                  </span>
                </div>
                
                {venueBlocks.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {venueBlocks.map(block => (
                      <div key={block._id} className="flex flex-col bg-gray-50 text-xs px-3 py-2 rounded-lg border border-gray-100">
                         <span className="font-bold text-gray-700">
                           {new Date(block.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - {new Date(block.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                         </span>
                         <span className="text-amber-600 font-semibold mt-0.5" title={block.requestedBy}>
                           {block.status === 'pending' ? 'Pending Request' : 'Booked'} ({block.reason})
                         </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-600 font-semibold bg-emerald-50 inline-block px-3 py-1.5 rounded-lg">
                    Full day available • No overlapping blocks found
                  </p>
                )}
              </div>
            );
          }) : (
             <div className="text-center py-6 text-gray-400">
                <Building2 size={32} className="mx-auto mb-2 opacity-20" />
                <p>No bookable venues found in the system.</p>
             </div>
          )}
        </div>
      </div>

      {/* My Requests Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-50">
          <h2 className="text-base font-bold text-gray-800">My Venue Requests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="px-5 py-3 rounded-tl-lg">Venue</th>
                <th className="px-5 py-3">Timing</th>
                <th className="px-5 py-3">Reason</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {myRequests.length > 0 ? myRequests.map((req) => (
                <tr key={req._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-bold text-gray-800">{req.venue}</p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><MapPin size={10}/>{req.location || 'Campus'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-gray-700 font-medium">
                      {new Date(req.startTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      to {new Date(req.endTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded font-semibold capitalize">
                      {req.reason.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <Badge status={req.status} />
                    {req.notes && req.status !== 'pending' && (
                      <p className={`text-[10px] mt-2 max-w-[150px] leading-tight font-medium ${req.status === 'rejected' ? 'text-red-500' : 'text-emerald-600'}`}>
                        Note: {req.notes}
                      </p>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="px-5 py-8 text-center text-gray-400">
                    <ClipboardList size={32} className="mx-auto mb-3 opacity-20" />
                    <p>No venue requests submitted yet.</p>
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
              <h2 className="text-lg font-bold text-gray-800">Request Venue Booking</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <p className="text-sm font-semibold text-brand-600 bg-brand-50 px-4 py-2 rounded-lg mb-6 flex items-center gap-2">
                 <CalendarDays size={16} /> Booking for {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              {formError && (
                <div className="mb-6 bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 flex gap-2">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" /> {formError}
                </div>
              )}
              
              <form id="venueForm" onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Time Selection */}
                <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-5">
                   <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                     <Clock size={16} className="text-brand-500" /> 1. Select Date & Time
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-1">
                       <label className="text-xs font-semibold text-gray-600">Start Time <span className="text-red-500">*</span></label>
                       <input required type="datetime-local" name="startDateTime" value={formData.startDateTime} onChange={handleChange} min={new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 16)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm outline-none transition-all bg-white" />
                     </div>
                     <div className="space-y-1">
                       <label className="text-xs font-semibold text-gray-600">End Time <span className="text-red-500">*</span></label>
                       <input required type="datetime-local" name="endDateTime" value={formData.endDateTime} onChange={handleChange} min={formData.startDateTime || new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 16)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm outline-none transition-all bg-white" />
                     </div>
                   </div>
                   {timeValidationError && formData.startDateTime && formData.endDateTime && (
                      <p className="text-xs font-semibold text-red-500 mt-3 flex items-center gap-1"><AlertCircle size={12}/>{timeValidationError}</p>
                   )}
                </div>

                {/* 2. Smart Venue Selection */}
                <div className={`bg-gray-50/50 rounded-2xl border border-gray-100 p-5 transition-opacity duration-300 ${(!computedStart || !computedEnd || timeValidationError) ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                   <div className="flex justify-between items-center mb-4">
                     <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                       <Building2 size={16} className="text-brand-500" /> 2. Select Available Venue
                     </h3>
                     {computedStart && computedEnd && !timeValidationError && (
                        <p className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                          <CheckCircle size={12} /> Timeslot Valid
                        </p>
                     )}
                   </div>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                      {venues.map(v => {
                        const isSelected = formData.venueId === v._id;
                        const isAvailable = availabilityMap[v._id] ?? true;
                        
                        return (
                          <button
                            type="button"
                            key={v._id}
                            disabled={!isAvailable}
                            onClick={() => setFormData({...formData, venueId: v._id})}
                            className={`
                              flex flex-col text-left p-3 rounded-xl border transition-all
                              ${!isAvailable 
                                 ? 'bg-red-50/50 border-red-100 text-red-400 cursor-not-allowed opacity-70 hover:opacity-70' 
                                 : isSelected
                                    ? 'bg-brand-50 border-brand-400 ring-2 ring-brand-500/20 text-brand-700 shadow-sm'
                                    : 'bg-white border-gray-200 text-gray-700 hover:border-brand-300 hover:shadow-sm'
                              }
                            `}
                          >
                            <span className={`font-bold text-sm truncate w-full ${!isAvailable ? 'text-red-500 line-through decoration-red-300' : ''}`}>
                               {v.name}
                            </span>
                            <span className="text-[10px] font-semibold mt-1 flex items-center gap-1">
                               {!isAvailable && <><XCircle size={10} /> Conflicted</>}
                            </span>
                          </button>
                        );
                      })}
                   </div>
                   {venues.length === 0 && (
                     <p className="text-sm text-gray-500 text-center">No venues available in the system.</p>
                   )}
                </div>

                {/* 3. Extra Information */}
                <div className={`space-y-4 transition-opacity duration-300 ${!formData.venueId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">3. Booking Reason</label>
                    <select name="reason" value={formData.reason} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm outline-none transition-all appearance-none bg-white">
                      <option value="event">Official Event</option>
                      <option value="team_practice">Team Practice / Rehearsal</option>
                      <option value="maintenance">Maintenance / Setup</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Additional Notes</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" placeholder="Any specific requirements... (e.g. Projector needed)" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm outline-none transition-all resize-none" />
                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
                Cancel
              </button>
              <button form="venueForm" type="submit" disabled={submitLoading || !formData.venueId || timeValidationError} className="px-6 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm shadow-brand-500/30 transition-all flex items-center gap-2">
                {submitLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Submit Venue Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoordinatorVenuesPage;
