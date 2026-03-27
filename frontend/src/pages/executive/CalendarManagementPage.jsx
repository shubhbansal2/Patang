import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../components/ui/ToastContainer';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
    Calendar as CalendarIcon,
    MapPin,
    Plus,
    Lock,
    X,
    AlertTriangle,
    Clock,
    Tag,
    User,
    FileText
} from 'lucide-react';

const EVENT_CATEGORIES = ['Cultural', 'Technical', 'Sports', 'Notice', 'Other'];
const BLOCK_REASONS = [
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'event', label: 'Event' },
    { value: 'team_practice', label: 'Team Practice' },
];

const CalendarManagementPage = () => {
    const { showSuccess, showError } = useToast();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [facilities, setFacilities] = useState([]);

    // Modal visibility
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);

    // Block Slot form
    const [blockForm, setBlockForm] = useState({
        facility: '', startTime: '', endTime: '', reason: 'maintenance', notes: ''
    });
    const [blockSubmitting, setBlockSubmitting] = useState(false);
    const [blockError, setBlockError] = useState('');

    // Create Event form
    const [eventForm, setEventForm] = useState({
        title: '', description: '', category: 'Sports', startTime: '', endTime: '',
        venue: '', organizingClub: '', registrationLink: ''
    });
    const [eventSubmitting, setEventSubmitting] = useState(false);
    const [eventError, setEventError] = useState('');

    // ── Fetch events ──────────────────────────────────────────────────
    const loadEvents = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/v2/events');
            setEvents(data.data?.events || data.data || []);
        } catch (err) {
            console.error('Events fetch error:', err);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Fetch facilities (for dropdowns) ──────────────────────────────
    const loadFacilities = useCallback(async () => {
        try {
            const { data } = await api.get('/facilities');
            setFacilities(Array.isArray(data) ? data : data.data || []);
        } catch (err) {
            console.error('Facilities fetch error:', err);
        }
    }, []);

    useEffect(() => { loadEvents(); loadFacilities(); }, [loadEvents, loadFacilities]);

    // ── Block Slot handlers ───────────────────────────────────────────
    const openBlockModal = () => {
        setBlockForm({ facility: '', startTime: '', endTime: '', reason: 'maintenance', notes: '' });
        setBlockError('');
        setShowBlockModal(true);
    };

    const handleBlockSubmit = async () => {
        if (!blockForm.facility) { setBlockError('Please select a facility.'); return; }
        if (!blockForm.startTime || !blockForm.endTime) { setBlockError('Start and end times are required.'); return; }
        if (new Date(blockForm.startTime) >= new Date(blockForm.endTime)) { setBlockError('End time must be after start time.'); return; }

        setBlockSubmitting(true);
        setBlockError('');
        try {
            await api.post('/facilities/blocks', {
                facility: blockForm.facility,
                startTime: new Date(blockForm.startTime).toISOString(),
                endTime: new Date(blockForm.endTime).toISOString(),
                reason: blockForm.reason,
                notes: blockForm.notes || undefined,
            });
            showSuccess('Facility slot blocked successfully');
            setShowBlockModal(false);
            loadEvents();
        } catch (err) {
            setBlockError(err.response?.data?.message || 'Failed to block slot');
        } finally {
            setBlockSubmitting(false);
        }
    };

    // ── Create Event handlers ─────────────────────────────────────────
    const openEventModal = () => {
        setEventForm({
            title: '', description: '', category: 'Sports', startTime: '', endTime: '',
            venue: '', organizingClub: '', registrationLink: ''
        });
        setEventError('');
        setShowEventModal(true);
    };

    const handleEventSubmit = async () => {
        if (!eventForm.title.trim()) { setEventError('Title is required.'); return; }
        if (!eventForm.description.trim()) { setEventError('Description is required.'); return; }
        if (!eventForm.category) { setEventError('Category is required.'); return; }
        if (!eventForm.startTime || !eventForm.endTime) { setEventError('Start and end times are required.'); return; }
        if (new Date(eventForm.startTime) >= new Date(eventForm.endTime)) { setEventError('End time must be after start time.'); return; }
        if (!eventForm.organizingClub.trim()) { setEventError('Organizing club/body is required.'); return; }

        setEventSubmitting(true);
        setEventError('');
        try {
            await api.post('/v2/events', {
                title: eventForm.title.trim(),
                description: eventForm.description.trim(),
                category: eventForm.category,
                startTime: new Date(eventForm.startTime).toISOString(),
                endTime: new Date(eventForm.endTime).toISOString(),
                venue: eventForm.venue || null,
                organizingClub: eventForm.organizingClub.trim(),
                registrationLink: eventForm.registrationLink || null,
            });
            showSuccess('Event proposal submitted for review');
            setShowEventModal(false);
            loadEvents();
        } catch (err) {
            setEventError(err.response?.data?.message || 'Failed to create event');
        } finally {
            setEventSubmitting(false);
        }
    };

    // ── Helpers ───────────────────────────────────────────────────────
    const formatDate = (d) => {
        if (!d) return '—';
        const dt = new Date(d);
        return { day: dt.getDate(), month: dt.toLocaleString('default', { month: 'short' }) };
    };

    const formatTime = (d) => {
        if (!d) return '';
        return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Calendar Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage institute events and facility availability.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={openBlockModal}
                        className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 shadow-sm transition-colors"
                    >
                        <Lock size={16} /> Block Slot
                    </button>
                    <button
                        onClick={openEventModal}
                        className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-600 shadow-sm transition-colors"
                    >
                        <Plus size={16} /> Create Event
                    </button>
                </div>
            </div>

            {/* Events List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 min-h-[400px]">
                {loading ? (
                    <LoadingSpinner message="Loading schedule..." />
                ) : events.length === 0 ? (
                    <EmptyState icon={CalendarIcon} title="No Upcoming Events" subtitle="Create an event or block a slot to get started." />
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                            <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <CalendarIcon size={20} className="text-brand-500" /> Upcoming Schedule
                            </h2>
                            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                {events.length} event{events.length !== 1 && 's'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            {events.map(ev => {
                                const d = formatDate(ev.startTime || ev.date);
                                const isBlock = ev.status === 'blocked' || ev.type === 'block';
                                return (
                                    <div key={ev._id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-gray-100 hover:border-brand-200 transition-colors bg-gray-50/50">
                                        <div className="w-24 shrink-0 text-center sm:text-left sm:border-r border-gray-200 sm:pr-4">
                                            <p className="font-bold text-brand-600 text-xl">{d.day}</p>
                                            <p className="text-xs font-semibold text-gray-500 uppercase">{d.month}</p>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start gap-2">
                                                <h3 className="font-bold text-gray-800">{ev.title}</h3>
                                                <div className="flex items-center gap-2">
                                                    {ev.category && (
                                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-blue-100 text-blue-600">
                                                            {ev.category}
                                                        </span>
                                                    )}
                                                    <StatusBadge status={ev.status || (isBlock ? 'blocked' : 'approved')} />
                                                </div>
                                            </div>
                                            {ev.description && (
                                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{ev.description}</p>
                                            )}
                                            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500 font-medium">
                                                <span className="flex items-center gap-1.5">
                                                    <MapPin size={14} /> {ev.venue || ev.facility?.name || 'TBD'}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock size={14} /> {formatTime(ev.startTime)} – {formatTime(ev.endTime)}
                                                </span>
                                                {ev.organizingClub && (
                                                    <span className="flex items-center gap-1.5">
                                                        <Tag size={14} /> {ev.organizingClub}
                                                    </span>
                                                )}
                                                {ev.createdBy?.name && (
                                                    <span className="flex items-center gap-1.5">
                                                        <User size={14} /> {ev.createdBy.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════════ BLOCK SLOT MODAL ═══════════ */}
            {showBlockModal && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setShowBlockModal(false)} />
                    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-xl z-50 overflow-hidden">
                        <div className="p-6 border-b border-red-100 bg-red-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Lock size={24} className="text-red-600" />
                                    <h3 className="text-lg font-bold text-red-800">Block Facility Slot</h3>
                                </div>
                                <button onClick={() => setShowBlockModal(false)} className="text-red-400 hover:text-red-600">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            {/* Facility */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-2">
                                    Facility <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={blockForm.facility}
                                    onChange={e => setBlockForm(p => ({ ...p, facility: e.target.value }))}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                >
                                    <option value="">— Select a facility —</option>
                                    {facilities.map(f => (
                                        <option key={f._id} value={f._id}>{f.name} ({f.facilityType})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Times in a row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                                        Start Time <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={blockForm.startTime}
                                        onChange={e => setBlockForm(p => ({ ...p, startTime: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                                        End Time <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={blockForm.endTime}
                                        onChange={e => setBlockForm(p => ({ ...p, endTime: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-2">
                                    Reason <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={blockForm.reason}
                                    onChange={e => setBlockForm(p => ({ ...p, reason: e.target.value }))}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                >
                                    {BLOCK_REASONS.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-2">Notes (optional)</label>
                                <textarea
                                    rows={2}
                                    value={blockForm.notes}
                                    onChange={e => setBlockForm(p => ({ ...p, notes: e.target.value }))}
                                    placeholder="Additional details..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
                                />
                            </div>

                            {blockError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-semibold flex items-center gap-2">
                                    <AlertTriangle size={14} /> {blockError}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setShowBlockModal(false)} disabled={blockSubmitting} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 disabled:opacity-50">Cancel</button>
                            <button onClick={handleBlockSubmit} disabled={blockSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50">
                                {blockSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Lock size={16} /> Block Slot</>}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* ═══════════ CREATE EVENT MODAL ═══════════ */}
            {showEventModal && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setShowEventModal(false)} />
                    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-xl z-50 overflow-hidden">
                        <div className="p-6 border-b border-brand-100 bg-brand-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Plus size={24} className="text-brand-600" />
                                    <h3 className="text-lg font-bold text-brand-800">Create Event</h3>
                                </div>
                                <button onClick={() => setShowEventModal(false)} className="text-brand-400 hover:text-brand-600">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-2">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={eventForm.title}
                                    onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))}
                                    placeholder="Event title"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-2">
                                    Description <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    rows={3}
                                    value={eventForm.description}
                                    onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Describe the event..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
                                />
                            </div>

                            {/* Category + Organizing Club row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                                        Category <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={eventForm.category}
                                        onChange={e => setEventForm(p => ({ ...p, category: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                    >
                                        {EVENT_CATEGORIES.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                                        Organizing Club <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={eventForm.organizingClub}
                                        onChange={e => setEventForm(p => ({ ...p, organizingClub: e.target.value }))}
                                        placeholder="e.g. Sports Club"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Times */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                                        Start Time <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={eventForm.startTime}
                                        onChange={e => setEventForm(p => ({ ...p, startTime: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                                        End Time <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={eventForm.endTime}
                                        onChange={e => setEventForm(p => ({ ...p, endTime: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Venue */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-2">Venue (optional)</label>
                                <input
                                    type="text"
                                    value={eventForm.venue}
                                    onChange={e => setEventForm(p => ({ ...p, venue: e.target.value }))}
                                    placeholder="e.g. SAC Auditorium, Sports Ground"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                />
                            </div>

                            {/* Registration Link */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-2">Registration Link (optional)</label>
                                <input
                                    type="url"
                                    value={eventForm.registrationLink}
                                    onChange={e => setEventForm(p => ({ ...p, registrationLink: e.target.value }))}
                                    placeholder="https://forms.google.com/..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                />
                            </div>

                            {eventError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-semibold flex items-center gap-2">
                                    <AlertTriangle size={14} /> {eventError}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setShowEventModal(false)} disabled={eventSubmitting} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 disabled:opacity-50">Cancel</button>
                            <button onClick={handleEventSubmit} disabled={eventSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors shadow-sm disabled:opacity-50">
                                {eventSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus size={16} /> Create Event</>}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default CalendarManagementPage;
