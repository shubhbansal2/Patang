import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components/ui/ToastContainer';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { fetchFeedbackInbox, replyToFeedback } from '../../services/executiveApi';
import {
    MessageSquare,
    AlertTriangle,
    User,
    Send,
    Filter,
    Clock
} from 'lucide-react';

const STATUS_TABS = [
    { value: '', label: 'All' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'acknowledged', label: 'Acknowledged' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'dismissed', label: 'Dismissed' },
];

const REPLY_STATUSES = [
    { value: 'acknowledged', label: 'Acknowledge' },
    { value: 'in_progress', label: 'Mark In Progress' },
    { value: 'resolved', label: 'Mark Resolved' },
    { value: 'dismissed', label: 'Dismiss' },
];

const CATEGORY_COLORS = {
    complaint: 'bg-red-100 text-red-700',
    suggestion: 'bg-blue-100 text-blue-700',
    appreciation: 'bg-emerald-100 text-emerald-700',
    bug_report: 'bg-purple-100 text-purple-700',
    other: 'bg-gray-100 text-gray-600',
};

const FeedbackReportsPage = () => {
    const { showSuccess, showError } = useToast();
    const [feedbacks, setFeedbacks] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);

    // Reply modal
    const [replyTarget, setReplyTarget] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [replyStatus, setReplyStatus] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [replyError, setReplyError] = useState('');

    const loadFeedback = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await fetchFeedbackInbox({ status: statusFilter || undefined, page, limit: 10 });
            setFeedbacks(data.feedbacks || []);
            setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load feedback');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, page]);

    useEffect(() => { loadFeedback(); }, [loadFeedback]);
    useEffect(() => { setPage(1); }, [statusFilter]);

    const openReply = (feedback) => {
        setReplyTarget(feedback);
        setReplyText(feedback.adminReply || '');
        setReplyStatus('');
        setReplyError('');
    };

    const handleReply = async () => {
        if (!replyText.trim() && !replyStatus) {
            setReplyError('Please provide a reply or update the status.');
            return;
        }
        setSubmitting(true);
        setReplyError('');
        try {
            const payload = {};
            if (replyText.trim()) payload.adminReply = replyText.trim();
            if (replyStatus) payload.status = replyStatus;
            await replyToFeedback(replyTarget._id, payload);
            showSuccess('Feedback updated successfully');
            setReplyTarget(null);
            loadFeedback();
        } catch (err) {
            setReplyError(err.response?.data?.message || 'Failed to reply');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">Feedback & Reports</h1>
                <p className="text-sm text-gray-500">Monitor user satisfaction, support tickets, and feedback trends.</p>
            </div>

            {/* Status filter tabs */}
            <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <Filter size={16} className="text-gray-400 mr-1" />
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setStatusFilter(tab.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === tab.value
                            ? 'bg-brand-500 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <LoadingSpinner message="Loading feedback..." />
            ) : error ? (
                <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-red-600 text-sm max-w-md text-center">
                        <AlertTriangle size={24} className="mx-auto mb-2" />{error}
                    </div>
                </div>
            ) : feedbacks.length === 0 ? (
                <EmptyState icon={MessageSquare} title="No Feedback" subtitle={statusFilter ? `No "${statusFilter.replace('_', ' ')}" feedback found.` : 'No feedback in your inbox.'} />
            ) : (
                <>
                    <p className="text-sm font-semibold text-gray-500">{pagination.total} feedback item{pagination.total !== 1 && 's'}</p>

                    <div className="space-y-4">
                        {feedbacks.map(fb => (
                            <div key={fb._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                                <div className="flex flex-col lg:flex-row justify-between gap-4">
                                    <div className="flex-1 space-y-3">
                                        {/* Header: user + badges */}
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                                    <User size={16} className="text-gray-400" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-800 text-sm">{fb.user?.name || 'Anonymous'}</p>
                                                    <p className="text-xs text-gray-400">{fb.user?.email || '—'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${CATEGORY_COLORS[fb.category] || CATEGORY_COLORS.other}`}>
                                                    {(fb.category || 'other').replace('_', ' ')}
                                                </span>
                                                <StatusBadge status={fb.status} />
                                            </div>
                                        </div>

                                        {/* Subject + Message */}
                                        <div>
                                            <h3 className="font-bold text-gray-800">{fb.subject}</h3>
                                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{fb.message}</p>
                                        </div>

                                        {/* Existing reply */}
                                        {fb.adminReply && (
                                            <div className="bg-brand-50 border border-brand-100 rounded-lg p-3">
                                                <p className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider mb-1">Admin Reply</p>
                                                <p className="text-sm text-gray-700">{fb.adminReply}</p>
                                                {fb.repliedAt && (
                                                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Clock size={10} /> {formatDate(fb.repliedAt)}</p>
                                                )}
                                            </div>
                                        )}

                                        <p className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12} /> Submitted {formatDate(fb.createdAt)}</p>
                                    </div>

                                    {/* Reply button */}
                                    <div className="flex lg:flex-col justify-end gap-3 shrink-0">
                                        <button
                                            onClick={() => openReply(fb)}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors shadow-sm text-sm"
                                        >
                                            <Send size={16} /> Reply
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Pagination page={pagination.page} totalPages={pagination.pages} onPageChange={setPage} />
                </>
            )}

            {/* Reply Modal */}
            {replyTarget && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setReplyTarget(null)} />
                    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-xl z-50 overflow-hidden">
                        <div className="p-6 border-b border-brand-100 bg-brand-50">
                            <div className="flex items-center gap-3">
                                <Send size={24} className="text-brand-600" />
                                <div>
                                    <h3 className="text-lg font-bold text-brand-800">Reply to Feedback</h3>
                                    <p className="text-xs text-brand-600 mt-0.5">{replyTarget.subject}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <p className="text-sm text-gray-600">{replyTarget.message}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-2">Update Status</label>
                                <select
                                    value={replyStatus}
                                    onChange={e => setReplyStatus(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                >
                                    <option value="">— Keep current status —</option>
                                    {REPLY_STATUSES.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-2">Your Reply</label>
                                <textarea
                                    rows={3}
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    placeholder="Write your reply here..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
                                />
                            </div>

                            {replyError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-semibold flex items-center gap-2">
                                    <AlertTriangle size={14} /> {replyError}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setReplyTarget(null)} disabled={submitting} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 disabled:opacity-50">Cancel</button>
                            <button onClick={handleReply} disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors shadow-sm disabled:opacity-50">
                                {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send Reply'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default FeedbackReportsPage;
