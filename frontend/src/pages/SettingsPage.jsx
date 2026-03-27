import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Key, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';

const SettingsPage = () => {
  const { user } = useAuth();
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPasswordMap, setShowPasswordMap] = useState({
    current: false,
    new: false,
    confirm: false
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }

    setIsUpdating(true);
    try {
      const res = await api.put('/auth/update-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword
      });
      setPasswordMessage({ type: 'success', text: res.data.message || 'Password updated successfully!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordMessage({ type: '', text: '' });
      }, 3000);
    } catch (err) {
      setPasswordMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to update password.'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const roleLabels = {
    'student': 'Student',
    'admin': 'Super Admin',
    'executive': 'Executive Admin',
    'gym_admin': 'Gym Administrator',
    'swim_admin': 'Swim Administrator',
    'coordinator': 'Facility Coordinator'
  };

  const currentRole = user.roles?.[0] ? roleLabels[user.roles[0]] || user.roles[0] : 'User';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Account Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your profile, roles, and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Profile Information */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4 text-brand-500">
            <User size={20} />
            <h3 className="text-lg font-bold text-gray-800">Profile Information</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Full Name</p>
              <p className="mt-1 text-base font-medium text-gray-800">{user.name || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Email Address</p>
              <p className="mt-1 text-base font-medium text-gray-800">{user.email}</p>
            </div>
            {user.profileDetails?.rollNumber && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Roll Number</p>
                <p className="mt-1 text-base font-medium text-gray-800">{user.profileDetails.rollNumber}</p>
              </div>
            )}
          </div>
        </div>

        {/* Account Status / Roles */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4 text-blue-500">
            <Shield size={20} />
            <h3 className="text-lg font-bold text-gray-800">Account Status</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Primary Role</p>
              <div className="mt-2 inline-flex" >
                 <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-sm font-semibold tracking-wide">
                    {currentRole}
                 </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Permissions</p>
              <p className="mt-1 text-sm text-gray-600">
                You have access to areas defined for your specific role. Additional permissions must be granted by the Super Admin.
              </p>
            </div>
          </div>
        </div>

        {/* Security Mock */}
        <div className="bg-white lg:col-span-2 rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4 text-emerald-500">
            <Key size={20} />
            <h3 className="text-lg font-bold text-gray-800">Security Preferences</h3>
          </div>
          <div className="flex flex-col gap-4">
            {!showPasswordForm ? (
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Change Password</p>
                  <p className="text-xs text-gray-500 mt-1">We recommend changing your password every 90 days.</p>
                </div>
                <button 
                  onClick={() => setShowPasswordForm(true)}
                  className="px-4 py-2 bg-white border border-gray-200 text-sm font-semibold text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 transition-colors shrink-0"
                >
                   Update Password
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdatePassword} className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-800">Update Password</h4>
                  <button 
                    type="button" 
                    onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordMessage({ type: '', text: '' });
                    }}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
                
                {passwordMessage.text && (
                  <div className={`p-3 rounded-lg flex items-start gap-2 text-sm ${
                    passwordMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  }`}>
                    {passwordMessage.type === 'error' ? <AlertCircle size={16} className="mt-0.5" /> : <CheckCircle2 size={16} className="mt-0.5" />}
                    <span>{passwordMessage.text}</span>
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <div className="relative">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Current Password</label>
                    <input 
                      type={showPasswordMap.current ? 'text' : 'password'}
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      required
                      className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordMap(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute right-3 top-[26px] text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPasswordMap.current ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">New Password</label>
                    <input 
                      type={showPasswordMap.new ? 'text' : 'password'}
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      required
                      minLength="8"
                      className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                     <button
                      type="button"
                      onClick={() => setShowPasswordMap(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute right-3 top-[26px] text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPasswordMap.new ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Confirm New Password</label>
                    <input 
                      type={showPasswordMap.confirm ? 'text' : 'password'}
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      minLength="8"
                      className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                     <button
                      type="button"
                      onClick={() => setShowPasswordMap(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-[26px] text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPasswordMap.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={isUpdating}
                    className="px-4 py-2 bg-brand-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-brand-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUpdating ? 'Updating...' : 'Save Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default SettingsPage;
