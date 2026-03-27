import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '../../components/ui/ToastContainer';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmModal from '../../components/ui/ConfirmModal';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { fetchPendingVenues, reviewVenue, fetchPendingEvents, reviewEvent } from '../../services/executiveApi';
import {
    AlertTriangle,
    Calendar,
    Clock,
    User,
    FileText,
    Search,
    Check,
    X,
    Building2,
    ClipboardList,
    CalendarDays,
    Tag,
    ExternalLink
} from 'lucide-react';

const TABS = [
    { key: 'venues', label: 'Venue Requests', icon: Building2 },
    { key: 'events', label: 'Event Requests', icon: CalendarDays },
];

const BookingApprovalsPage = () => {
    const { showSuccess, showError } = useToast();
    const [activeTab, setActiveTab] = useState('venues');

    // ── Venue State ───────────────────────────────────────────────────
    const [venueRequests, setVenueRequests] = useState([]);
    const [venueLoading, setVenueLoading] = useState(true);
    const [venueError, setVenueError] = useState('');
    const [venueSearch, setVenueSearch] = useState('');
    const [venueSortOrder, setVenueSortOrder] = useState('newest');

    // ── Event State ───────────────────────────────────────────────────
    const [eventRequests, setEventRequests] = useState([]);
    const [eventLoading, setEventLoading] = useState(true);
    const [eventError, setEventError] = useState('');
    const [eventSearch, setEventSearch] = useState('');

    // ── Modal State (shared) ──────────────────────────────────────────
    const [selectedItem, setSelectedItem] = useState(null);
    const [actionType, setActionType] = useState(null); // 'approve' | 'reject' | 'requestChanges'
    const [actionSource, setActionSource] = useState(null); // 'venue' | 'event'
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState('');

    // ── Venue Fetching ────────────────────────────────────────────────
    const loadVenues = useCallback(async () => {
        setVenueLoading(true);
        setVenueError('');
        try {
            const data = await fetchPendingVenues();
            setVenueRequests(data?.venueRequests || data?.requests || []);
        } catch (err) {
            setVenueError(err.response?.data?.message || 'Failed to load pending venue requests');
        } finally {
            setVenueLoading(false);
        }
    }, []);

    // ── Event Fetching ────────────────────────────────────────────────
    const loadEvents = useCallback(async () => {
        setEventLoading(true);
        setEventError('');
        try {
            const data = await fetchPendingEvents();
            setEventRequests(Array.isArray(data) ? data : data?.events || []);
        } catch (err) {
            setEventError(err.response?.data?.message || 'Failed to load pending events');
        } finally {
            setEventLoading(false);
        }
    }, []);

    useEffect(() => { loadVenues(); loadEvents(); }, [loadVenues, loadEvents]);

    // ── Modal handlers ────────────────────────────────────────────────
    const handleOpenModal = (item, type, source) => {
        setSelectedItem(item);
        setActionType(type);
        setActionSource(source);
        setReason('');
        setActionError('');
    };

    const handleCloseModal = () => {
        setSelectedItem(null);
        setActionType(null);
        setActionSource(null);
        setReason('');
        setActionError('');
    };

    const handleSubmitAction = async () => {
        if (actionType === 'reject' && !reason.trim()) {
            setActionError('A reason is required when rejecting.');
            return;
        }
        if (actionType === 'requestChanges' && !reason.trim()) {
            setActionError('A note is required when requesting changes.');
            return;
        }

        setSubmitting(true);
        setActionError('');

        try {
            if (actionSource === 'venue') {
                await reviewVenue(selectedItem._id, { action: actionType, reason: reason.trim() });
                // Optimistic update
                setVenueRequests(prev => prev.filter(r => r._id !== selectedItem._id));
            } else {
                const payload = { action: actionType };
                if (actionType === 'reject') payload.rejectionReason = reason.trim();
                if (actionType === 'requestChanges') payload.changeRequestNote = reason.trim();
                await reviewEvent(selectedItem._id, payload);
                setEventRequests(prev => prev.filter(e => e._id !== selectedItem._id));
            }
            showSuccess(`Request ${actionType === 'approve' ? 'approved' : actionType === 'reject' ? 'rejected' : 'changes requested'}`);
            handleCloseModal();
        } catch (err) {
            setActionError(err.response?.data?.message || `Failed to ${actionType} request`);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Venue filtering & sorting ─────────────────────────────────────
    const filteredVenues = useMemo(() => {
        let result = [...venueRequests];
        if (venueSearch.trim()) {
            const q = venueSearch.toLowerCase();
            result = result.filter(r =>
                (r.facility?.name || '').toLowerCase().includes(q) ||
                (r.requestedBy?.name || '').toLowerCase().includes(q) ||
                (r.notes || '').toLowerCase().includes(q)
            );
        }
        result.sort((a, b) => {
            if (venueSortOrder === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
        return result;
    }, [venueRequests, venueSearch, venueSortOrder]);

    // ── Event filtering ───────────────────────────────────────────────
    const filteredEvents = useMemo(() => {
        let result = [...eventRequests];
        if (eventSearch.trim()) {
            const q = eventSearch.toLowerCase();
            result = result.filter(e =>
                (e.title || '').toLowerCase().includes(q) ||
                (e.organizingClub || '').toLowerCase().includes(q) ||
                (e.createdBy?.name || '').toLowerCase().includes(q)
            );
        }
        return result;
    }, [eventRequests, eventSearch]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Booking Approvals</h1>
                <p className="text-sm text-gray-500 mt-1">Review and manage pending facility and event requests.</p>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const count = tab.key === 'venues' ? venueRequests.length : eventRequests.length;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.key
                                ? 'bg-white text-gray-800 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Icon size={16} />
                            {tab.label}
                            {count > 0 && (
                                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{count}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ═══════════ VENUE TAB ═══════════ */}
            {activeTab === 'venues' && (
                <>
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="relative w-full sm:w-96">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by venue, requester, or purpose..."
                                value={venueSearch}
                                onChange={e => setVenueSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                            />
                        </div>
                        <div className="w-full sm:w-auto flex items-center gap-3">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sort</span>
                            <select value={venueSortOrder} onChange={e => setVenueSortOrder(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all">
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                            </select>
                        </div>
                    </div>

                    {/* Venue Content */}
                    {venueLoading ? (
                        <LoadingSpinner message="Loading pending venue requests..." />
                    ) : venueError ? (
                        <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-red-600 text-sm max-w-md text-center">
                                <AlertTriangle size={24} className="mx-auto mb-2" />{venueError}
                            </div>
                        </div>
                    ) : filteredVenues.length === 0 ? (
                        <EmptyState icon={ClipboardList} title="No Pending Venue Requests" subtitle={venueSearch ? 'No requests match your search.' : 'All caught up! No pending venue approvals.'} />
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm font-semibold text-gray-500">{filteredVenues.length} Pending Approval{filteredVenues.length !== 1 && 's'}</p>
                            {filteredVenues.map(request => (
                                <div key={request._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                                                    <Building2 size={24} className="text-brand-500" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-800">{request.facility?.name || 'Unknown Facility'}</h3>
                                                    <StatusBadge status="pending" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="flex items-start gap-3 text-sm text-gray-600">
                                                    <User size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="font-semibold text-gray-800">{request.requestedBy?.email || request.requester?.email || 'No email'}</p>
                                                        <p className="text-xs text-gray-500">{request.requestedBy?.name || request.requester?.name || 'Unknown Name'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 text-sm text-gray-600">
                                                    <Calendar size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="font-semibold text-gray-800">{formatDate(request.date || request.startTime)}</p>
                                                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                            <Clock size={12} />
                                                            {request.startTime ? formatTime(request.startTime) : ''} — {request.endTime ? formatTime(request.endTime) : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            {(request.purpose || request.reason || request.notes) && (
                                                <div className="flex items-start gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                    <FileText size={16} className="text-gray-400 shrink-0" />
                                                    <div>
                                                        <span className="font-semibold text-gray-800 mr-2">Purpose:</span>
                                                        {request.purpose || request.reason || request.notes || 'Not specified'}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col sm:flex-row lg:flex-col justify-end gap-3 shrink-0 pt-2 lg:pt-0">
                                            <button onClick={() => handleOpenModal(request, 'approve', 'venue')} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors shadow-sm">
                                                <Check size={18} /> Approve
                                            </button>
                                            <button onClick={() => handleOpenModal(request, 'reject', 'venue')} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors">
                                                <X size={18} /> Reject
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ═══════════ EVENT TAB ═══════════ */}
            {activeTab === 'events' && (
                <>
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="relative w-full sm:flex-1">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by title, club, or organizer..."
                                value={eventSearch}
                                onChange={e => setEventSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Event Content */}
                    {eventLoading ? (
                        <LoadingSpinner message="Loading pending event requests..." />
                    ) : eventError ? (
                        <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-red-600 text-sm max-w-md text-center">
                                <AlertTriangle size={24} className="mx-auto mb-2" />{eventError}
                            </div>
                        </div>
                    ) : filteredEvents.length === 0 ? (
                        <EmptyState icon={CalendarDays} title="No Pending Event Requests" subtitle={eventSearch ? 'No events match your search.' : 'All caught up! No pending event approvals.'} />
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm font-semibold text-gray-500">{filteredEvents.length} Pending Event{filteredEvents.length !== 1 && 's'}</p>
                            {filteredEvents.map(event => (
                                <div key={event._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                    <CalendarDays size={24} className="text-blue-500" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-lg font-bold text-gray-800">{event.title}</h3>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        <StatusBadge status="pending" />
                                                        {event.category && (
                                                            <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                                                {event.category}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {event.description && (
                                                <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="flex items-start gap-3 text-sm text-gray-600">
                                                    <User size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="font-semibold text-gray-800">{event.createdBy?.email || 'No email'}</p>
                                                        <p className="text-xs text-gray-500">{event.createdBy?.name || 'Unknown Name'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 text-sm text-gray-600">
                                                    <Calendar size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="font-semibold text-gray-800">{formatDate(event.startTime)}</p>
                                                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                            <Clock size={12} />
                                                            {formatTime(event.startTime)} — {formatTime(event.endTime)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-4 text-xs text-gray-500 font-medium">
                                                {event.organizingClub && (
                                                    <span className="flex items-center gap-1.5"><Tag size={12} /> {event.organizingClub}</span>
                                                )}
                                                {event.venue && (
                                                    <span className="flex items-center gap-1.5"><Building2 size={12} /> {event.venue}</span>
                                                )}
                                                {event.registrationLink && (
                                                    <a href={event.registrationLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-brand-500 hover:text-brand-600">
                                                        <ExternalLink size={12} /> Registration
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col sm:flex-row lg:flex-col justify-end gap-3 shrink-0 pt-2 lg:pt-0">
                                            <button onClick={() => handleOpenModal(event, 'approve', 'event')} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors shadow-sm">
                                                <Check size={18} /> Approve
                                            </button>
                                            <button onClick={() => handleOpenModal(event, 'requestChanges', 'event')} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-amber-200 text-amber-600 font-semibold rounded-xl hover:bg-amber-50 hover:border-amber-300 transition-colors">
                                                <FileText size={18} /> Request Changes
                                            </button>
                                            <button onClick={() => handleOpenModal(event, 'reject', 'event')} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors">
                                                <X size={18} /> Reject
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ═══════════ ACTION MODAL (shared) ═══════════ */}
            <ConfirmModal
                isOpen={!!selectedItem}
                onClose={handleCloseModal}
                onConfirm={handleSubmitAction}
                title={
                    actionType === 'approve' ? 'Approve Request'
                        : actionType === 'reject' ? 'Reject Request'
                            : 'Request Changes'
                }
                description={
                    selectedItem
                        ? `You are about to ${actionType === 'requestChanges' ? 'request changes for' : actionType} the ${actionSource === 'venue' ? 'venue request for' : 'event'} "${actionSource === 'venue' ? (selectedItem.facility?.name || 'this venue') : (selectedItem.title || 'this event')}".`
                        : ''
                }
                variant={actionType === 'approve' ? 'success' : 'danger'}
                confirmLabel={
                    actionType === 'approve' ? 'Confirm Approval'
                        : actionType === 'reject' ? 'Confirm Rejection'
                            : 'Submit Request'
                }
                textAreaProps={{
                    value: reason,
                    onChange: e => setReason(e.target.value),
                    label: actionType === 'approve' ? 'Comments (optional)' : actionType === 'reject' ? 'Reason for rejection' : 'Changes needed',
                    placeholder: actionType === 'approve' ? 'Optional comments...' : actionType === 'reject' ? 'Provide a reason for rejection...' : 'Describe the changes needed...',
                    required: actionType !== 'approve',
                }}
                loading={submitting}
                error={actionError}
            />
        </div>
    );
};

export default BookingApprovalsPage;
