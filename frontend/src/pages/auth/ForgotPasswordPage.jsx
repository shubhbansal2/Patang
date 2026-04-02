import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';
import loginBG from '../../assets/loginBG.jpg';
import logo from '../../assets/logo.png';

const ForgotPasswordPage = () => {
  const [step, setStep] = useState('email'); // 'email' | 'otp' | 'reset'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setMessage('OTP sent to your email!');
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');

    const np = newPassword.trim();
    const cp = confirmPassword.trim();

    if (np !== cp) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email: email.trim(), otp: otp.trim(), newPassword: np, confirmPassword: cp });
      setMessage('Password reset successfully!');
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat px-4"
      style={{ backgroundImage: `url(${loginBG})` }}
    >
      <div className="absolute inset-0 bg-black/30" />

      {/* Logo Container */}
      <div className="absolute top-6 left-6 z-20">
        <Link to="/">
          <img src={logo} alt="Patang Logo" className="w-28 sm:w-36 h-auto drop-shadow-lg transition-transform hover:scale-105" />
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 sm:p-10">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}
        {message && !error && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">{message}</div>
        )}

        {step === 'email' && (
          <>
            <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Forgot password?</h1>
            <p className="text-gray-500 mb-8">Enter your email and we'll send you a code to reset your password.</p>
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-600 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input id="forgot-email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@iitk.ac.in" required
                    className="w-full pl-10 pr-4 py-3 bg-white rounded-lg border border-gray-300 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-brand-500 text-white font-semibold rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-md">
                {loading ? 'Sending...' : 'Send Code'}
              </button>
              <p className="text-center text-sm text-gray-500">
                <Link to="/login" className="text-brand-500 hover:text-brand-600 font-semibold underline">Back to Login</Link>
              </p>
            </form>
          </>
        )}

        {step === 'otp' && (
          <>
            <h1 className="text-3xl font-extrabold text-gray-800 mb-2">New password</h1>
            <p className="text-gray-500 mb-8">
              Your new password must be different from previously used one, and must have at least 8 characters.
            </p>
            <form onSubmit={handleVerifyAndReset} className="space-y-5">
              <div>
                <label htmlFor="forgot-otp" className="block text-sm font-medium text-gray-600 mb-1.5">OTP Code</label>
                <input id="forgot-otp" name="otp" type="text" autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456" maxLength={6} required
                  className="w-full px-4 py-3 bg-white rounded-lg border border-gray-300 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all tracking-widest text-lg" />
              </div>
              <div>
                <label htmlFor="forgot-new" className="block text-sm font-medium text-gray-600 mb-1.5">New password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input id="forgot-new" name="newPassword" type={showNew ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••" required
                    className="w-full pl-10 pr-10 py-3 bg-white rounded-lg border border-gray-300 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all" />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="forgot-confirm" className="block text-sm font-medium text-gray-600 mb-1.5">Confirm password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input id="forgot-confirm" name="confirmPassword" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••" required
                    className="w-full pl-10 pr-10 py-3 bg-white rounded-lg border border-gray-300 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all" />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-brand-500 text-white font-semibold rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-md">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-sm text-gray-400">Or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <p className="text-center text-sm text-gray-500">
                Don't have an account?{' '}
                <Link to="/register" className="text-brand-500 hover:text-brand-600 font-semibold underline">SignUp</Link>
              </p>
            </form>
          </>
        )}

        {step === 'done' && (
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-800 mb-4">Password Reset!</h1>
            <p className="text-gray-500 mb-6">Your password has been updated. You can now log in.</p>
            <Link to="/login"
              className="inline-block px-8 py-3 bg-brand-500 text-white font-semibold rounded-lg hover:bg-brand-600 transition-colors shadow-md">
              Go to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
