import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { ShieldCheck, Calendar, X, AlertTriangle, Plus, Tag, Pencil, Trash2 } from 'lucide-react';

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.toString().split(':');
  if(!h || !m) return timeStr;
  const hNum = parseInt(h, 10);
  const ampm = hNum >= 12 ? 'PM' : 'AM';
  const h12 = hNum % 12 || 12;
  return `${h12.toString().padStart(2, '0')}:${m} ${ampm}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const StatusBadge = ({ status }) => {
  const colors = {
    pending: 'bg-amber-50 text-amber-600 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    cancelled: 'bg-gray-50 text-gray-600 border-gray-200',
    rejected: 'bg-red-50 text-red-600 border-red-200'
  };
  const cls = colors[status?.toLowerCase()] || 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span className={`text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full border ${cls}`}>
      {(status || 'UNKNOWN').toUpperCase()}
    </span>
  );
};

const CaptainDashboardPage = () => {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Add Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [facilities, setFacilities] = useState([]);
  const [formData, setFormData] = useState({ facilityId: '', startTime: '', endTime: '', notes: '' });
  const [formLoading, setFormLoading] = useState(false);

  // Edit Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({ id: '', startTime: '', endTime: '', notes: '' });
  const [editLoading, setEditLoading] = useState(false);

  const fetchBlocks = async () => {
    try {
      const { data } = await api.get('/captain/practice-blocks');
      const allBlocks = data.data?.blocks || [];
      // Don't display cancelled slots
      setBlocks(allBlocks.filter(b => b.status?.toLowerCase() !== 'cancelled'));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load practice blocks');
    } finally {
      setLoading(false);
    }
  };

  const fetchFacilities = async () => {
    try {
      const { data } = await api.get('/facilities');
      const facs = data.data || data;
      
      // The exact names the user wants to see in the dropdown:
      const displayNames = [
        'Tennis Court', 'Football Court', 'Badminton Court', 
        'Cricket Ground', 'Squash Court', 'Swimming Pool', 
        'Basketball Court', 'Athletics Ground', 'Table Tennis Court', 'Hockey Ground'
      ];
      
      const captainFacilities = Array.isArray(facs) ? facs.filter(f => 
        (user.captainOf && f.sportType === user.captainOf) || 
        displayNames.some(d => f.name.toLowerCase().includes(d.toLowerCase().split(' ')[0])) // e.g. "Tennis" in "Tennis Court 1"
      ) : [];

      // Map raw facilities to clean display names and deduplicate
      const uniqueCleanFacilities = [];
      const seenNames = new Set();

      captainFacilities.forEach(f => {
        // Find which display name this raw facility belongs to
        const matchedName = displayNames.find(d => f.name.toLowerCase().includes(d.toLowerCase().split(' ')[0])) || f.name;
        
        if (!seenNames.has(matchedName)) {
          seenNames.add(matchedName);
          uniqueCleanFacilities.push({
            ...f,
            displayName: matchedName // Store clean name for the UI
          });
        }
      });
      
      setFacilities(uniqueCleanFacilities);
    } catch (err) {
      console.error("Failed to load facilities", err);
    }
  };

  useEffect(() => {
    fetchBlocks();
    fetchFacilities();
  }, [user.captainOf]);

  const handleCancelBlock = async (blockId) => {
    if (!window.confirm('Are you sure you want to cancel this practice block?')) return;
    try {
      await api.delete(`/captain/practice-blocks/${blockId}`);
      fetchBlocks();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel block');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.post('/captain/practice-blocks', formData);
      setIsModalOpen(false);
      setFormData({ facilityId: '', startTime: '', endTime: '', notes: '' });
      fetchBlocks();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add block');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await api.patch(`/captain/practice-blocks/${editData.id}`, {
        startTime: editData.startTime,
        endTime: editData.endTime,
        notes: editData.notes
      });
      setIsEditModalOpen(false);
      setEditData({ id: '', startTime: '', endTime: '', notes: '' });
      fetchBlocks();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update block timings');
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* LEFT COLUMN: Practice Blocks */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-gray-800">Team Practice Blocks</h2>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-600 transition-colors"
            >
              <Plus size={16} />
              Add A New Slot
            </button>
          </div>

          {error ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-4">{error}</div>
          ) : null}

          {blocks.length > 0 ? (
            <div className="space-y-4">
              {blocks.map((block) => (
                <div key={block._id} className="bg-gray-50 rounded-xl border border-gray-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">{block.facility?.name || 'Facility'}</h4>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Calendar size={12} />
                      Mon-Sat • {formatTime(block.startTime)} to {formatTime(block.endTime)}
                    </p>
                    {block.notes && <p className="text-xs text-gray-400 mt-2 italic">"{block.notes}"</p>}
                    {block.rejectionReason && (
                      <p className="text-xs text-red-500 mt-1 font-medium select-none">Reason: {block.rejectionReason}</p>
                    )}
                  </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end gap-2">
                        <StatusBadge status={block.status} />
                        {block.status !== 'cancelled' && block.status !== 'rejected' && (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setEditData({ id: block._id, startTime: block.startTime, endTime: block.endTime, notes: block.notes || '' });
                                setIsEditModalOpen(true);
                              }}
                              title="Edit Timing"
                              className="p-2 rounded-lg text-brand-500 hover:bg-brand-50 transition-colors border border-transparent hover:border-brand-100"
                            >
                              <Pencil size={14} />
                            </button>
                            <button 
                              onClick={() => handleCancelBlock(block._id)}
                              title="Cancel Slot"
                              className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
              <Calendar size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No practice blocks found</p>
              <p className="text-xs text-gray-400 mt-1">Add a new slots block for your team practice.</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Captain Status */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <div className="w-16 h-16 mx-auto bg-brand-50 text-brand-500 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-800">{user?.name}</h3>
          <p className="text-sm text-brand-500 font-semibold mt-1">
            {user?.captainOf ? `${user.captainOf} Captain` : 'Captain'}
          </p>
          <p className="text-xs text-gray-400 mt-3 px-4">
            As captain, you can request and manage recurring team practice slots for all sports facilities.
          </p>
        </div>
        
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
           <div className="flex items-center gap-2 text-blue-700 font-bold text-sm mb-2">
             <Tag size={16} /> Quick Guidelines
           </div>
           <ul className="text-xs text-blue-600 space-y-2 list-disc pl-4">
             <li>Practice blocks are valid Monday through Saturday.</li>
             <li>All requests must be approved by an executive.</li>
             <li>Repeated no-shows by your team may result in block cancellation.</li>
           </ul>
        </div>
      </div>

      {/* MODAL: Request Block */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800">Add A New Slot</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Facility</label>
                <select 
                  required
                  className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                  value={formData.facilityId}
                  onChange={(e) => setFormData({...formData, facilityId: e.target.value})}
                >
                  <option value="">-- Choose Facility --</option>
                  {facilities.map(f => (
                    <option key={f._id} value={f._id}>{f.displayName}</option>
                  ))}
                  {facilities.length === 0 && <option value="" disabled>No facilities found for your sport</option>}
                </select>
                <p className="mt-2 text-[11px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 leading-relaxed">
                  <strong className="font-semibold">Note:</strong> You can directly book <strong className="font-semibold">{user?.captainOf || 'your sport\'s'}</strong> courts. If you wish to book a court or ground belonging to another sport, you will have to wait for the approval of that sport's team captain.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start Time</label>
                  <input 
                    type="time" 
                    required
                    className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 outline-none"
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">End Time</label>
                  <input 
                    type="time" 
                    required
                    className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 outline-none"
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes (Optional)</label>
                <textarea 
                  rows="2"
                  className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 outline-none resize-none"
                  placeholder="e.g. For Men's Inter-IIT preparation"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={formLoading}
                  className="w-full bg-brand-500 text-white font-bold text-sm py-3 rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                  {formLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Slott Block */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800">Edit Slot Timing</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start Time</label>
                  <input 
                    type="time" 
                    required
                    className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 outline-none"
                    value={editData.startTime}
                    onChange={(e) => setEditData({...editData, startTime: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">End Time</label>
                  <input 
                    type="time" 
                    required
                    className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 outline-none"
                    value={editData.endTime}
                    onChange={(e) => setEditData({...editData, endTime: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes (Optional)</label>
                <textarea 
                  rows="2"
                  className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 outline-none resize-none"
                  placeholder="e.g. Adjusted timings for upcoming tournament."
                  value={editData.notes}
                  onChange={(e) => setEditData({...editData, notes: e.target.value})}
                />
              </div>
              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={editLoading}
                  className="w-full bg-brand-500 text-white font-bold text-sm py-3 rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaptainDashboardPage;
