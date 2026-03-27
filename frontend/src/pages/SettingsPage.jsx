import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  User, Mail, Lock, Shield, Eye, EyeOff, Save, CheckCircle2,
  AlertTriangle, Dumbbell, Waves, Calendar, BadgeCheck, Info,
  Hash, GraduationCap, Building2, Briefcase
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════ */

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/* ─── Reusable input field ──────────────────────────────────────────── */
const Field = ({ label, icon: Icon, value, onChange, disabled, type = 'text', placeholder }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">{label}</label>
    <div className="relative">
      {Icon && <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />}
      <input
        type={type}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 text-sm border rounded-xl transition-all ${
          disabled
            ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed'
            : 'bg-white text-gray-800 border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400'
        }`}
      />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════ */
const SettingsPage = () => {
  const { user: authUser, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [name, setName] = useState('');
  const [program, setProgram] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });
  const [savingPw, setSavingPw] = useState(false);

  /* ── Fetch ──────────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/settings');
      const d = res.data || res;
      setData(d);
      setName(d.profile?.name || '');
      setProgram(d.profile?.profileDetails?.program || '');
      setDepartment(d.profile?.profileDetails?.department || '');
      setDesignation(d.profile?.profileDetails?.designation || '');
    } catch (err) {
      console.error('Settings fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Save profile ───────────────────────────────────────────────── */
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    if (!name.trim()) { setProfileMsg({ type: 'error', text: 'Name cannot be empty.' }); return; }

    setSavingProfile(true);
    try {
      await api.patch('/settings/profile', { name: name.trim(), program: program.trim(), department: department.trim(), designation: designation.trim() });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setProfileMsg({ type: '', text: '' }), 3000);
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  /* ── Change password ────────────────────────────────────────────── */
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg({ type: '', text: '' });
    if (!currentPassword || !newPassword || !confirmPassword) { setPwMsg({ type: 'error', text: 'All fields are required.' }); return; }
    if (newPassword !== confirmPassword) { setPwMsg({ type: 'error', text: 'New passwords do not match.' }); return; }
    if (newPassword.length < 8) { setPwMsg({ type: 'error', text: 'Password must be at least 8 characters.' }); return; }

    setSavingPw(true);
    try {
      await api.patch('/settings/password', { currentPassword, newPassword, confirmPassword });
      setPwMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => setPwMsg({ type: '', text: '' }), 3000);
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.error?.message || err.response?.data?.message || 'Failed to change password.' });
    } finally {
      setSavingPw(false);
    }
  };

  const profile = data?.profile;
  const account = data?.account;
  const subscriptions = data?.subscriptions || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <p className="text-xs text-gray-400 mb-0.5">Home / <span className="text-gray-600 font-medium">Settings</span></p>
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
      </div>

      <div className="flex gap-6">
        {/* ─── Main Content ────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* ── Profile Information ────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <User size={18} className="text-brand-500" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800">Profile Information</h2>
                <p className="text-xs text-gray-400">Update your personal details</p>
              </div>
            </div>

            {profileMsg.text && (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
                profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}>{profileMsg.text}</div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Full Name" icon={User} value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
                <Field label="Email Address" icon={Mail} value={profile?.email} disabled placeholder="Email" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Roll Number" icon={Hash} value={profile?.profileDetails?.rollNumber} disabled placeholder="Roll number" />
                <Field label="Program" icon={GraduationCap} value={program} onChange={e => setProgram(e.target.value)} placeholder="e.g. BTech, MTech, PhD" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Department" icon={Building2} value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. CSE, EE, ME" />
                <Field label="Designation" icon={Briefcase} value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Student, Professor" />
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={savingProfile}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-brand-500 rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-sm shadow-brand-500/20">
                  <Save size={14} />
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* ── Change Password ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Lock size={18} className="text-amber-500" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800">Change Password</h2>
                <p className="text-xs text-gray-400">Minimum 8 characters required</p>
              </div>
            </div>

            {pwMsg.text && (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
                pwMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}>{pwMsg.text}</div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Current Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all" />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10">
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all" />
                    <button type="button" onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10">
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={savingPw}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm shadow-amber-500/20">
                  <Lock size={14} />
                  {savingPw ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ─── Sidebar ─────────────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 space-y-5">
          {/* Account Status */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-brand-500" />
              <h3 className="text-sm font-bold text-gray-800">Account Status</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                  account?.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  account?.status === 'suspended' ? 'bg-red-50 text-red-500 border-red-200' :
                  'bg-gray-100 text-gray-500 border-gray-200'
                }`}>
                  {account?.status === 'active' ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                  {(account?.status || 'unknown').charAt(0).toUpperCase() + (account?.status || 'unknown').slice(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Verified</span>
                <span className={`text-xs font-bold ${profile?.isVerified ? 'text-emerald-500' : 'text-red-500'}`}>
                  {profile?.isVerified ? '✓ Yes' : '✗ No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Role</span>
                <span className="text-xs font-semibold text-gray-700">
                  {(profile?.roles || []).map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ') || 'Student'}
                </span>
              </div>
              {profile?.captainOf && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Captain Of</span>
                  <span className="text-xs font-semibold text-brand-500">{profile.captainOf}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Penalties</span>
                <span className={`text-xs font-bold ${account?.activePenalties > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {account?.activePenalties || 0} active
                </span>
              </div>
              {account?.isSuspended && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-100 mt-2">
                  <p className="text-xs font-semibold text-red-600">⚠ Account Suspended</p>
                  <p className="text-[10px] text-red-400 mt-0.5">Until {fmtDate(account.suspendedUntil)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Subscriptions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <BadgeCheck size={16} className="text-brand-500" />
              <h3 className="text-sm font-bold text-gray-800">Active Subscriptions</h3>
            </div>
            {subscriptions.length > 0 ? (
              <div className="space-y-3">
                {subscriptions.map((sub, i) => (
                  <div key={sub._id || i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    {sub.facilityType === 'Gym' ? <Dumbbell size={16} className="text-purple-400" /> : <Waves size={16} className="text-blue-400" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-700">{sub.facilityType} — {sub.plan}</p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Calendar size={9} /> Valid till {fmtDate(sub.endDate)}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      sub.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                    }`}>{sub.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No active subscriptions.</p>
            )}
          </div>

          {/* Account Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Info size={16} className="text-brand-500" />
              <h3 className="text-sm font-bold text-gray-800">Account Info</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Member Since</span>
                <span className="text-gray-700 font-medium">{fmtDate(profile?.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Login</span>
                <span className="text-gray-700 font-medium">{fmtDate(profile?.lastLogin)}</span>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-2">Need Help?</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-3">
              Contact the sports office for account issues, subscription queries, or penalty disputes.
            </p>
            <a href={`mailto:${data?.supportContact || 'sports_office@iitk.ac.in'}`}
              className="block w-full text-center px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 border border-brand-200 rounded-xl hover:bg-brand-100 transition-all">
              {data?.supportContact || 'sports_office@iitk.ac.in'}
            </a>
          </div>

          {/* Logout */}
          <button onClick={logout}
            className="w-full px-4 py-2.5 text-sm font-semibold text-red-500 bg-red-50 border border-red-200 rounded-2xl hover:bg-red-100 transition-all">
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
