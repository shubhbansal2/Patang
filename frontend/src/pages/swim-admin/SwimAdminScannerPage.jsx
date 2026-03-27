import React, { useState } from 'react';
import api from '../../services/api';
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  User,
  Activity,
  Calendar,
  ArrowRightLeft,
  Search
} from 'lucide-react';

const SwimAdminScannerPage = () => {
  const [passId, setPassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const handleScan = async (e) => {
    e?.preventDefault();
    if (!passId.trim()) return;

    setLoading(true);
    setScanResult(null);

    try {
      const { data } = await api.post('/v2/subscriptions/verify-entry', { passId: passId.trim() });
      // Ensure it's for swimming
      if (data.data?.facilityType?.toLowerCase() !== 'swimming' && data?.facilityType?.toLowerCase() !== 'swimming') {
         // optional: could reject if it's a gym pass
      }
      setScanResult({
        success: true,
        data: data.data || data,
        message: data.message || 'Access granted'
      });
      setPassId('');
    } catch (err) {
      console.error('Scan error:', err);
      setScanResult({
        success: false,
        error: err.response?.data?.error?.message || err.response?.data?.message || 'Invalid pass or scan failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl font-bold text-gray-900">Pool Access Scanner</h1>
        <p className="text-gray-500 mt-1">Scan or enter student access passes to verify swimming pool entry.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <ScanLine size={20} className="text-blue-500" />
              Scan Pass
            </h2>
          </div>
          
          <div className="p-8 flex-1 flex flex-col justify-center">
            <div className="w-full aspect-square max-w-[240px] mx-auto bg-gray-50 border-2 border-dashed border-gray-300 rounded-3xl flex items-center justify-center mb-8 relative">
              <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
              <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
              <ScanLine size={48} className="text-gray-300" />
            </div>

            <form onSubmit={handleScan} className="w-full">
              <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">
                Manual Entry (Pass ID)
              </label>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={passId}
                  onChange={(e) => setPassId(e.target.value)}
                  placeholder="e.g. SWIM-12345"
                  className="w-full pl-11 pr-32 py-4 bg-gray-50 border border-gray-200 rounded-xl text-lg font-mono placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase tracking-wider"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || !passId.trim()}
                  className="absolute right-2 top-2 bottom-2 px-6 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center min-w-[100px]"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Verify'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Activity size={20} className="text-blue-500" />
              Scan Result
            </h2>
          </div>
          
          <div className="p-6 flex-1 flex flex-col">
            {!scanResult && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                <ScanLine size={48} className="mb-4 opacity-30" />
                <p>Waiting for scan...</p>
                <p className="text-sm mt-1">Scan a pass to view entry/exit details</p>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-blue-500">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="font-semibold animate-pulse">Verifying pass...</p>
              </div>
            )}

            {scanResult && scanResult.success && (
              <div className="flex-1 flex flex-col animate-in fade-in zoom-in duration-300">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center mb-6">
                  <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-emerald-800">{scanResult.message}</h3>
                  <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mt-1">
                    Recorded as {scanResult.data.action}
                  </p>
                </div>

                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <User size={18} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">User</p>
                      <p className="text-sm font-bold text-gray-800">{scanResult.data.userName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{scanResult.data.userEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <Activity size={18} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">Facility</p>
                      <p className="text-sm font-bold text-gray-800 capitalize">{scanResult.data.facilityType}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <Calendar size={18} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">Pass Valid Until</p>
                      <p className="text-sm font-bold text-gray-800">{formatDate(scanResult.data.validUntil)}</p>
                    </div>
                  </div>

                  {scanResult.data.occupancy && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl mt-auto">
                      <ArrowRightLeft size={18} className="text-blue-500 shrink-0" />
                      <div>
                        <p className="text-xs text-blue-600 font-semibold uppercase">Current Occupancy</p>
                        <p className="text-sm font-bold text-blue-800">
                          {scanResult.data.occupancy.occupiedSlots ?? 0} / {scanResult.data.occupancy.totalSlots ?? '--'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {scanResult && !scanResult.success && (
              <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
                <XCircle size={64} className="text-red-500 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h3>
                <p className="text-red-600 bg-red-50 py-2 px-4 rounded-lg font-semibold border border-red-100">
                  {scanResult.error}
                </p>
                <button
                  onClick={() => { setScanResult(null); setPassId(''); }}
                  className="mt-8 text-sm font-semibold text-gray-500 hover:text-gray-800 underline underline-offset-4 transition-colors"
                >
                  Clear and try again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwimAdminScannerPage;
