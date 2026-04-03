import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  Send, MessageSquare, ChevronDown, ChevronUp, Clock,
  CheckCircle2, AlertTriangle, ThumbsUp, Bug, HelpCircle,
  Eye, EyeOff, Filter, BarChart3, ArrowRight, Reply
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════ */

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  const now = new Date();
  const diff = (now - dt) / 86400000;
  if (diff < 1 && dt.getDate() === now.getDate()) return 'Today, ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (diff < 2) return 'Yesterday, ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/* ─── Status config ─────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  submitted:    { color: 'bg-blue-50 text-blue-600 border-blue-200',     icon: Send,          label: 'Submitted' },
  acknowledged: { color: 'bg-indigo-50 text-indigo-600 border-indigo-200', icon: Eye,           label: 'Acknowledged' },
  in_progress:  { color: 'bg-amber-50 text-amber-600 border-amber-200', icon: Clock,         label: 'In Progress' },
  resolved:     { color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: CheckCircle2, label: 'Resolved' },
  dismissed:    { color: 'bg-gray-100 text-gray-500 border-gray-200',    icon: EyeOff,        label: 'Dismissed' },
};

/* ─── Category config ───────────────────────────────────────────────── */
const CATEGORY_ICONS = {
  complaint:    { icon: AlertTriangle, color: 'text-red-500' },
  suggestion:   { icon: MessageSquare, color: 'text-blue-500' },
  appreciation: { icon: ThumbsUp, color: 'text-emerald-500' },
  bug_report:   { icon: Bug, color: 'text-amber-500' },
  other:        { icon: HelpCircle, color: 'text-gray-400' },
};

const getCatIcon = (cat) => CATEGORY_ICONS[cat] || CATEGORY_ICONS.other;

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════ */
const FeedbackPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [targetRole, setTargetRole] = useState('');
  const [category, setCategory] = useState('suggestion');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState({ type: '', text: '' });

  /* ── Fetch data ─────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (statusFilter) params.set('status', statusFilter);
      const { data: res } = await api.get(`/feedback?${params.toString()}`);
      setData(res.data || res);
    } catch (err) {
      console.error('Feedback fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Submit feedback ────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMsg({ type: '', text: '' });

    if (!targetRole) { setSubmitMsg({ type: 'error', text: 'Please select a recipient.' }); return; }
    if (!subject.trim()) { setSubmitMsg({ type: 'error', text: 'Subject is required.' }); return; }
    if (!message.trim()) { setSubmitMsg({ type: 'error', text: 'Message is required.' }); return; }

    setSubmitting(true);
    try {
      await api.post('/feedback', { targetRole, category, subject: subject.trim(), message: message.trim(), isAnonymous });
      setSubmitMsg({ type: 'success', text: 'Feedback submitted successfully!' });
      setTargetRole(''); setCategory('suggestion'); setSubject(''); setMessage(''); setIsAnonymous(false);
      setTimeout(() => { setShowForm(false); setSubmitMsg({ type: '', text: '' }); fetchData(); }, 1500);
    } catch (err) {
      setSubmitMsg({ type: 'error', text: err.response?.data?.message || 'Failed to submit feedback.' });
    } finally {
      setSubmitting(false);
    }
  };

  const stats = data?.stats || {};
  const feedbacks = data?.feedbacks || [];
  const pagination = data?.pagination;
  const recipients = data?.formOptions?.recipients || [];
  const categories = data?.formOptions?.categories || [];

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Home / <span className="text-gray-600 font-medium">Feedback</span></p>
          <h1 className="text-2xl font-bold text-gray-800">Feedback Portal</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl shadow-sm transition-all ${
            showForm
              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              : 'bg-brand-500 text-white hover:bg-brand-600 shadow-brand-500/20'
          }`}>
          {showForm ? <ChevronUp size={16} /> : <Send size={16} />}
          {showForm ? 'Close Form' : 'New Feedback'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ─── Main Content ────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* ── Submit Form ────────────────────────────────────────── */}
          {showForm && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5 animate-in slide-in-from-top-2">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Submit Feedback</h2>

              {submitMsg.text && (
                <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
                  submitMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-red-50 text-red-600 border border-red-200'
                }`}>{submitMsg.text}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Recipient + Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Send To *</label>
                    <select value={targetRole} onChange={e => setTargetRole(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all">
                      <option value="">Select recipient...</option>
                      {recipients.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all">
                      {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Subject *</label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)} maxLength={200}
                    placeholder="Brief summary of your feedback"
                    className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all" />
                  <span className="text-[10px] text-gray-400 mt-1 block text-right">{subject.length}/200</span>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Message *</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={2000} rows={4}
                    placeholder="Describe your feedback in detail..."
                    className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all resize-none" />
                  <span className="text-[10px] text-gray-400 mt-1 block text-right">{message.length}/2000</span>
                </div>

                {/* Anonymous + Submit */}
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button type="button" onClick={() => setIsAnonymous(!isAnonymous)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${isAnonymous ? 'bg-brand-500' : 'bg-gray-300'}`}>
                      <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${isAnonymous ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-sm text-gray-500">Submit anonymously</span>
                  </label>
                  <button type="submit" disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-brand-500 rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-sm shadow-brand-500/20">
                    <Send size={14} />
                    {submitting ? 'Sending...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Status Filter Pills ───────────────────────────────── */}
          <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            <Filter size={14} className="text-gray-400" />
            <button onClick={() => { setStatusFilter(''); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                !statusFilter ? 'bg-brand-50 text-brand-600 border-brand-200' : 'text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}>All ({stats.total || 0})</button>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button key={key} onClick={() => { setStatusFilter(key === statusFilter ? '' : key); setPage(1); }}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    statusFilter === key ? cfg.color : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}>
                  <Icon size={12} /> {cfg.label} ({stats[key] || 0})
                </button>
              );
            })}
          </div>

          {/* ── Feedback List ──────────────────────────────────────── */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16">
                <MessageSquare size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-500">No feedback found</p>
                <p className="text-sm text-gray-400 mt-1">Click "New Feedback" to submit your first one.</p>
              </div>
            ) : (
              feedbacks.map((fb) => {
                const catCfg = getCatIcon(fb.category);
                const CatIcon = catCfg.icon;
                const stCfg = STATUS_CONFIG[fb.status] || STATUS_CONFIG.submitted;
                const StIcon = stCfg.icon;
                const isExpanded = expandedId === fb._id;

                return (
                  <div key={fb._id}
                    className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                      isExpanded ? 'border-brand-200 shadow-md' : 'border-gray-100'
                    }`}>
                    {/* Header row */}
                    <button onClick={() => setExpandedId(isExpanded ? null : fb._id)}
                      className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                      <div className={`w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0`}>
                        <CatIcon size={18} className={catCfg.color} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{fb.subject}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span className="text-[10px] text-gray-400">
                            To: {recipients.find(r => r.value === fb.targetRole)?.label || fb.targetRole}
                          </span>
                          <span className="text-[10px] text-gray-400 hidden sm:inline">•</span>
                          <span className="text-[10px] text-gray-400">{fmtDate(fb.createdAt)}</span>
                          {fb.isAnonymous && (
                            <>
                              <span className="text-[10px] text-gray-400 hidden sm:inline">•</span>
                              <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><EyeOff size={9} /> Anonymous</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${stCfg.color}`}>
                        <StIcon size={10} /> {stCfg.label}
                      </span>
                      <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-gray-100">
                        <div className="pt-4">
                          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{fb.message}</p>

                          {/* Category badge */}
                          <div className="flex items-center gap-2 mt-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                              {(fb.category || '').replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </span>
                          </div>

                          {/* Admin Reply */}
                          {fb.adminReply && (
                            <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                              <div className="flex items-center gap-2 mb-2">
                                <Reply size={14} className="text-blue-500" />
                                <span className="text-xs font-bold text-blue-600">Admin Reply</span>
                                <span className="text-[10px] text-gray-400 ml-auto">{fmtDate(fb.repliedAt)}</span>
                              </div>
                              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{fb.adminReply}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.total > 0 && (
            <div className="flex items-center justify-between mt-5">
              <span className="text-xs text-gray-400">
                Showing {(page - 1) * (pagination.limit || 10) + 1}-{Math.min(page * (pagination.limit || 10), pagination.total)} of {pagination.total}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  Prev
                </button>
                <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Sidebar ─────────────────────────────────────────────── */}
        <div className="w-full lg:w-72 lg:flex-shrink-0 space-y-5">
          {/* Stats Overview */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-brand-500" />
              <h3 className="text-sm font-bold text-gray-800">Your Stats</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-blue-50/50 rounded-xl">
                <p className="text-2xl font-bold text-gray-800">{stats.total || 0}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Total</p>
              </div>
              <div className="text-center p-3 bg-emerald-50/50 rounded-xl">
                <p className="text-2xl font-bold text-emerald-500">{stats.resolved || 0}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Resolved</p>
              </div>
              <div className="text-center p-3 bg-amber-50/50 rounded-xl">
                <p className="text-2xl font-bold text-amber-500">{stats.in_progress || 0}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">In Progress</p>
              </div>
              <div className="text-center p-3 bg-indigo-50/50 rounded-xl">
                <p className="text-2xl font-bold text-indigo-500">{(stats.submitted || 0) + (stats.acknowledged || 0)}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Pending</p>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Quick Tips</h3>
            <div className="space-y-3 text-xs text-gray-500 leading-relaxed">
              <div className="flex items-start gap-2">
                <ArrowRight size={12} className="text-brand-500 flex-shrink-0 mt-0.5" />
                <span>Be specific about the issue or suggestion for faster resolution.</span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight size={12} className="text-brand-500 flex-shrink-0 mt-0.5" />
                <span>Select the right recipient to route your feedback efficiently.</span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight size={12} className="text-brand-500 flex-shrink-0 mt-0.5" />
                <span>Toggle anonymous mode if you prefer not to share your identity.</span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight size={12} className="text-brand-500 flex-shrink-0 mt-0.5" />
                <span>Track your submission status — admins may reply directly.</span>
              </div>
            </div>
          </div>

          {/* Category Legend */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Categories</h3>
            <div className="space-y-2">
              {Object.entries(CATEGORY_ICONS).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <Icon size={14} className={cfg.color} />
                    <span className="text-sm text-gray-600 capitalize">{key.replace('_', ' ')}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Legend */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Status Guide</h3>
            <div className="space-y-2">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                      <Icon size={9} /> {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;
