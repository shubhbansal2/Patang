import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components/ui/ToastContainer';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmModal from '../../components/ui/ConfirmModal';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { fetchFacilities, updateFacility } from '../../services/executiveApi';
import { Building2, AlertTriangle, Wrench, Activity } from 'lucide-react';

const FacilityManagementPage = () => {
    const { showSuccess, showError } = useToast();
    const [facilities, setFacilities] = useState([]);
    const [stats, setStats] = useState({ total: 0, operational: 0, nonOperational: 0, byType: {} });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Edit modal
    const [editTarget, setEditTarget] = useState(null);
    const [editOperational, setEditOperational] = useState(true);
    const [editCapacity, setEditCapacity] = useState('');
    const [editReason, setEditReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [editError, setEditError] = useState('');

    const loadFacilities = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await fetchFacilities();
            setFacilities(data.facilities || []);
            setStats(data.stats || { total: 0, operational: 0, nonOperational: 0, byType: {} });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load facilities');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadFacilities(); }, [loadFacilities]);

    const openEdit = (facility) => {
        setEditTarget(facility);
        setEditOperational(facility.isOperational);
        setEditCapacity(facility.capacity || '');
        setEditReason('');
        setEditError('');
    };

    const handleUpdate = async () => {
        const payload = {};
        const statusChanged = editOperational !== editTarget.isOperational;
        const capacityChanged = editCapacity !== '' && Number(editCapacity) !== editTarget.capacity;

        if (statusChanged) {
            if (!editReason.trim()) {
                setEditError('A reason is required when changing operational status.');
                return;
            }
            payload.isOperational = editOperational;
            payload.reason = editReason.trim();
        }
        if (capacityChanged) {
            const cap = parseInt(editCapacity);
            if (isNaN(cap) || cap < 1) {
                setEditError('Capacity must be a positive number.');
                return;
            }
            payload.capacity = cap;
        }
        if (!statusChanged && !capacityChanged) {
            setEditError('No changes detected.');
            return;
        }

        setSubmitting(true);
        setEditError('');
        try {
            await updateFacility(editTarget._id, payload);
            showSuccess('Facility updated successfully');
            setEditTarget(null);
            loadFacilities();
        } catch (err) {
            setEditError(err.response?.data?.message || 'Failed to update facility');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">Facility Management</h1>
                <p className="text-sm text-gray-500">View and manage all campus sports facilities.</p>
            </div>

            {loading ? (
                <LoadingSpinner message="Loading facilities..." />
            ) : error ? (
                <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-red-600 text-sm max-w-md text-center">
                        <AlertTriangle size={24} className="mx-auto mb-2" />{error}
                    </div>
                </div>
            ) : (
                <>
                    {/* Stats Bar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total</p>
                            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Operational</p>
                            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.operational}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Non-Operational</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">{stats.nonOperational}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Types</p>
                            <p className="text-2xl font-bold text-gray-800 mt-1">{Object.keys(stats.byType).length}</p>
                        </div>
                    </div>

                    {/* Facility Cards */}
                    {facilities.length === 0 ? (
                        <EmptyState icon={Building2} title="No Facilities" subtitle="No facilities have been configured yet." />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {facilities.map(facility => (
                                <div key={facility._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                                                <Building2 size={20} className="text-brand-500" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800 text-sm">{facility.name}</h3>
                                                <p className="text-xs text-gray-400">{facility.facilityType || 'General'}</p>
                                            </div>
                                        </div>
                                        <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${facility.isOperational ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {facility.isOperational ? 'Active' : 'Offline'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                                        {facility.capacity && (
                                            <span className="flex items-center gap-1"><Activity size={12} /> Capacity: {facility.capacity}</span>
                                        )}
                                        {facility.location && (
                                            <span className="flex items-center gap-1"><Building2 size={12} /> {facility.location}</span>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => openEdit(facility)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 rounded-xl hover:bg-brand-100 transition-colors"
                                    >
                                        <Wrench size={14} /> Edit Facility
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Edit Modal */}
            {editTarget && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setEditTarget(null)} />
                    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 overflow-hidden">
                        <div className="p-6 border-b border-brand-100 bg-brand-50">
                            <div className="flex items-center gap-3">
                                <Wrench size={24} className="text-brand-600" />
                                <h3 className="text-lg font-bold text-brand-800">Edit — {editTarget.name}</h3>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-2">Operational Status</label>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setEditOperational(true)}
                                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${editOperational ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        ✓ Operational
                                    </button>
                                    <button
                                        onClick={() => setEditOperational(false)}
                                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${!editOperational ? 'bg-red-50 border-red-300 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        ✕ Offline
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-2">Capacity</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={editCapacity}
                                    onChange={e => setEditCapacity(e.target.value)}
                                    placeholder="Enter capacity..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                />
                            </div>

                            {editOperational !== editTarget.isOperational && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                                        Reason for status change <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={editReason}
                                        onChange={e => setEditReason(e.target.value)}
                                        placeholder="Provide a reason..."
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
                                    />
                                </div>
                            )}

                            {editError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-semibold flex items-center gap-2">
                                    <AlertTriangle size={14} /> {editError}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setEditTarget(null)} disabled={submitting} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 disabled:opacity-50">Cancel</button>
                            <button onClick={handleUpdate} disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors shadow-sm disabled:opacity-50">
                                {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default FacilityManagementPage;
