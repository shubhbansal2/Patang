import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import {
  AlertTriangle,
  ClipboardList,
  Search,
  Check,
  X,
  User,
  Image as ImageIcon,
  Calendar,
  AlertCircle,
  Clock3
} from 'lucide-react';

const GymAdminRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending'); // 'Pending', 'Approved', 'Rejected'

  // Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject' | 'revoke' | 'view_receipt'
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentMimeType, setDocumentMimeType] = useState('');
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentError, setDocumentError] = useState('');

  const inferMimeType = (documentPath = '', disposition = '') => {
    const source = `${documentPath} ${disposition}`.toLowerCase();
    if (source.includes('.pdf')) return 'application/pdf';
    if (source.includes('.png')) return 'image/png';
    if (source.includes('.jpg') || source.includes('.jpeg')) return 'image/jpeg';
    return '';
  };

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      // Pass the selected status to the API
      const { data } = await api.get(`/v2/admin/subscriptions?status=${statusFilter}&limit=5000`);
      setRequests(data.data?.subscriptions || []);
    } catch (err) {
      console.error('Fetch requests error:', err);
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to load subscription requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const revokeDocumentPreview = () => {
    if (documentUrl) {
      URL.revokeObjectURL(documentUrl);
    }
    setDocumentUrl('');
    setDocumentMimeType('');
    setDocumentLoading(false);
    setDocumentError('');
  };

  const fetchDocumentPreview = async (documentPath) => {
    if (!documentPath) {
      setDocumentError('Document URL is missing');
      return;
    }

    setDocumentLoading(true);
    setDocumentError('');

    try {
      const requestPath = documentPath.startsWith('/api/')
        ? documentPath.replace(/^\/api/, '')
        : documentPath;

      const response = await api.get(requestPath, { responseType: 'blob' });
      const blob = response.data;
      const inferredMimeType = blob.type || response.headers['content-type'] || inferMimeType(documentPath, response.headers['content-disposition']);
      setDocumentMimeType(inferredMimeType);
      setDocumentUrl(URL.createObjectURL(blob));
    } catch (err) {
      setDocumentError(err.response?.data?.message || 'Failed to load document');
    } finally {
      setDocumentLoading(false);
    }
  };

  const handleOpenModal = (request, type) => {
    revokeDocumentPreview();
    setSelectedRequest(request);
    setActionType(type);
    setReason('');
    setActionError('');

    if (type === 'view_receipt') {
      fetchDocumentPreview(request.paymentReceiptUrl);
    }

    if (type === 'view_medical') {
      fetchDocumentPreview(request.medicalCertUrl);
    }
  };

  const handleCloseModal = () => {
    revokeDocumentPreview();
    setSelectedRequest(null);
    setActionType(null);
    setReason('');
    setActionError('');
  };

  useEffect(() => revokeDocumentPreview, []);

  const handleSubmitAction = async () => {
    if ((actionType === 'reject' || actionType === 'revoke') && !reason.trim()) {
      setActionError(`A reason is required when ${actionType}ing a request.`);
      return;
    }

    setSubmitting(true);
    setActionError('');

    try {
      await api.patch(`/v2/admin/subscriptions/${selectedRequest._id}`, {
        action: actionType,
        [actionType === 'reject' ? 'rejectionReason' : 'comments']: reason.trim()
      });

      // Optimistic upate: remove if still filtering by Pending, or refetch
      if (statusFilter === 'Pending') {
         setRequests((prev) => prev.filter((r) => r._id !== selectedRequest._id));
      } else {
         fetchRequests();
      }
      handleCloseModal();
    } catch (err) {
      console.error(`${actionType} error:`, err);
      setActionError(err.response?.data?.error?.message || err.response?.data?.message || `Failed to ${actionType} request`);
    } finally {
      setSubmitting(false);
    }
  };

  // Process data (filter)
  const filteredRequests = useMemo(() => {
    let result = [...requests];
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter((r) => {
        const userName = r.userId?.name?.toLowerCase() || '';
        const email = r.userId?.email?.toLowerCase() || '';
        const rollNumber = r.userId?.profileDetails?.rollNumber?.toLowerCase() || '';
        const facility = r.facilityType?.toLowerCase() || '';
        const plan = r.plan?.toLowerCase() || '';
        return (
          userName.includes(lowerQuery) ||
          email.includes(lowerQuery) ||
          rollNumber.includes(lowerQuery) ||
          facility.includes(lowerQuery) ||
          plan.includes(lowerQuery)
        );
      });
    }
    return result;
  }, [requests, searchQuery]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatSlotLabel = (slot) => {
    if (!slot?.startTime || !slot?.endTime) return 'No slot selected';
    return `${slot.startTime} - ${slot.endTime}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Header ──────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Subscription Requests</h1>
        <p className="text-sm text-gray-500 mt-1">Review and manage gym and swimming subscriptions.</p>
      </div>

      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, facility..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>
        <div className="w-full sm:w-auto flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          >
            <option value="Pending">Pending Approvals</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading {statusFilter.toLowerCase()} requests...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-red-600 text-sm max-w-md text-center">
            <AlertTriangle size={24} className="mx-auto mb-2" />
            {error}
          </div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm text-center">
          <div>
            <ClipboardList size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-semibold">No {statusFilter} Requests</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery ? 'No requests match your search.' : `There are no ${statusFilter.toLowerCase()} subscriptions at the moment.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-gray-500">
            {filteredRequests.length} {statusFilter} Request{filteredRequests.length !== 1 && 's'}
          </p>
          {filteredRequests.map((request) => (
            <div key={request._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row justify-between gap-6">

                {/* Left Side: Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <ClipboardList size={24} className="text-brand-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 capitalize">{request.facilityType} Subscription</h3>
                      <p className={`text-sm font-medium uppercase tracking-wider mt-0.5 ${
                        request.status === 'Approved' ? 'text-emerald-600' :
                        request.status === 'Rejected' ? 'text-red-600' : 'text-amber-600'
                      }`}>
                        {request.status} • {request.plan}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-start gap-3 text-sm text-gray-600">
                      <User size={16} className="text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-800">{request.userId?.email || 'No email provided'}</p>
                        <p className="text-xs text-gray-500 font-medium">
                          {request.userId?.name || 'Unknown'} • {request.userId?.roles?.includes('faculty') ? 'Faculty' : (request.userId?.profileDetails?.rollNumber || 'No roll number')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-gray-600">
                      <Calendar size={16} className="text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-800">Applied on: {formatDate(request.createdAt)}</p>
                        {request.status === 'Approved' && request.endDate && (
                          <p className="text-xs text-brand-600 mt-0.5">Valid until: {formatDate(request.endDate)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-gray-600">
                      <Clock3 size={16} className="text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-800">Requested slot: {formatSlotLabel(request.slotId)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {request.slotId?.capacity ? `Capacity ${request.slotId.capacity}` : 'Selected by student at application time'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Documents Row */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleOpenModal(request, 'view_receipt')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <ImageIcon size={14} className="text-brand-500" />
                      View Payment Receipt
                    </button>
                    {request.medicalCertUrl && (
                       <button
                         type="button"
                         onClick={() => handleOpenModal(request, 'view_medical')}
                         className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                       >
                         <ImageIcon size={14} className="text-blue-500" />
                         View Medical Cert
                       </button>
                    )}
                  </div>
                </div>

                {/* Right Side: Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col justify-end gap-3 shrink-0 pt-2 lg:pt-0">
                  {request.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => handleOpenModal(request, 'approve')}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors shadow-sm"
                      >
                        <Check size={18} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleOpenModal(request, 'reject')}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors"
                      >
                        <X size={18} />
                        Reject
                      </button>
                    </>
                  )}
                  {request.status === 'Approved' && (
                     <button
                        onClick={() => handleOpenModal(request, 'revoke')}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors"
                      >
                        <AlertCircle size={18} />
                        Revoke Active Pass
                      </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Action / View Modal ────────────────────────────────── */}
      {selectedRequest && actionType && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={handleCloseModal} />
          
          {/* View Receipt Modal */}
          {actionType === 'view_receipt' || actionType === 'view_medical' ? (
             <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden">
               <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                 <h3 className="text-lg font-bold text-gray-800">
                   {actionType === 'view_receipt' ? 'Payment Receipt' : 'Medical Certificate'}
                 </h3>
                 <button onClick={handleCloseModal} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                   <X size={20} />
                 </button>
               </div>
               <div className="p-4 overflow-y-auto bg-gray-50 flex-1 flex justify-center items-center">
                 {documentLoading ? (
                   <div className="flex flex-col items-center gap-3 text-gray-500">
                     <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                     <p>Loading document...</p>
                   </div>
                 ) : documentError ? (
                   <div className="text-red-500 flex flex-col items-center text-center">
                     <AlertCircle size={48} className="mb-2 opacity-70" />
                     <p>{documentError}</p>
                   </div>
                 ) : documentUrl ? (
                   documentMimeType.startsWith('image/') ? (
                     <img
                       src={documentUrl}
                       alt={actionType === 'view_receipt' ? 'Payment Receipt' : 'Medical Certificate'}
                       className="max-w-full max-h-[70vh] object-contain rounded-lg border border-gray-200 shadow-sm"
                     />
                   ) : (
                     <iframe
                       src={documentUrl}
                       title={actionType === 'view_receipt' ? 'Payment Receipt' : 'Medical Certificate'}
                       className="h-[70vh] w-full rounded-lg border border-gray-200 bg-white"
                     />
                   )
                 ) : (
                   <div className="text-gray-400 flex flex-col items-center">
                     <ImageIcon size={48} className="mb-2 opacity-30" />
                     <p>No document available</p>
                   </div>
                 )}
               </div>
             </div>
          ) : (
            /* Action Modal (Approve/Reject) */
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className={`p-6 border-b ${actionType === 'approve' ? 'border-brand-100 bg-brand-50' : 'border-red-100 bg-red-50'}`}>
                <div className="flex items-center gap-3">
                  {actionType === 'approve' ? (
                    <Check className="text-brand-600" size={24} />
                  ) : (
                    <AlertCircle className="text-red-600" size={24} />
                  )}
                  <h3 className={`text-lg font-bold ${actionType === 'approve' ? 'text-brand-800' : 'text-red-800'}`}>
                    {actionType === 'approve' ? 'Approve Subscription' : actionType === 'revoke' ? 'Revoke Subscription' : 'Reject Subscription'}
                  </h3>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600">
                  You are about to <strong className={actionType === 'approve' ? 'text-brand-600' : 'text-red-600'}>{actionType}</strong> the {selectedRequest.facilityType} subscription for <strong>{selectedRequest.userId?.name}</strong>.
                </p>

                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  <span className="font-semibold text-gray-800">Requested slot:</span>{' '}
                  {formatSlotLabel(selectedRequest.slotId)}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    {actionType === 'reject' || actionType === 'revoke' ? `Reason for ${actionType === 'revoke' ? 'Revocation' : 'Rejection'} *` : 'Comments (Optional)'}
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={actionType === 'approve' ? 'Add any notes...' : 'Required reason to notify the user...'}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
                  />
                </div>

                {actionError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={14} />
                    {actionError}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAction}
                  disabled={submitting}
                  className={`flex items-center gap-2 px-6 py-2.5 text-white font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 ${actionType === 'approve'
                      ? 'bg-brand-500 hover:bg-brand-600'
                      : 'bg-red-500 hover:bg-red-600'
                    }`}
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Confirm {actionType === 'approve' ? 'Approval' : actionType === 'revoke' ? 'Revocation' : 'Rejection'}</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GymAdminRequestsPage;
