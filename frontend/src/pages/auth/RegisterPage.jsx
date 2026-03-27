import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import loginBG from '../../assets/loginBG.jpg';
import logo from '../../assets/logo.png';

const RegisterPage = () => {
  const [step, setStep] = useState('register'); // 'register' | 'otp'
  const [userType, setUserType] = useState('student'); // 'student' | 'faculty'
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { register, verifyOtp, loading } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const p = password.trim();
    const cp = confirmPassword.trim();

    if (p !== cp) {
      setError('Passwords do not match');
      return;
    }
    const result = await register(
      name.trim(), 
      email.trim(), 
      userType === 'student' ? rollNumber.trim() : '', 
      p, 
      cp, 
      userType
    );
    if (result.success) {
      setMessage(`OTP sent to ${result.data.email}!`);
      setStep('otp');
    } else {
      setError(result.message);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    const result = await verifyOtp(email.trim(), otp.trim());
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    const p = password.trim();
    const cp = confirmPassword.trim();
    const result = await register(
      name.trim(),
      email.trim(),
      userType === 'student' ? rollNumber.trim() : '',
      p,
      cp,
      userType
    );
    if (result.success) {
      setMessage(`OTP re-sent to ${result.data.email}!`);
    } else {
      setError(result.message);
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
        <img src={logo} alt="Patang Logo" className="w-28 sm:w-36 h-auto drop-shadow-lg" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 sm:p-10">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}
        {message && !error && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
            {message}
          </div>
        )}

        {step === 'register' ? (
          <>
            <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Sign up</h1>
            
            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
              <button 
                type="button" 
                onClick={() => setUserType('student')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${userType === 'student' ? 'bg-white text-brand-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Student
              </button>
              <button 
                type="button" 
                onClick={() => setUserType('faculty')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${userType === 'faculty' ? 'bg-white text-brand-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Faculty
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label htmlFor="register-name" className="block text-sm font-medium text-gray-600 mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input id="register-name" name="name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name" required
                    className="w-full pl-10 pr-4 py-3 bg-white rounded-lg border border-gray-300 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all" />
                </div>
              </div>

              <div>
                <label htmlFor="register-email" className="block text-sm font-medium text-gray-600 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input id="register-email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@iitk.ac.in" required
                    className="w-full pl-10 pr-4 py-3 bg-white rounded-lg border border-gray-300 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all" />
                </div>
                <p className="mt-1 text-xs text-gray-400">OTP will be sent to this email address.</p>
              </div>

              {userType === 'student' && (
                <div>
                  <label htmlFor="register-roll" className="block text-sm font-medium text-gray-600 mb-1.5">Roll Number</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input id="register-roll" name="rollNumber" type="text" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="Roll No. (e.g. 210123)" required
                      className="w-full pl-10 pr-4 py-3 bg-white rounded-lg border border-gray-300 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all" />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="register-password" className="block text-sm font-medium text-gray-600 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input id="register-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••" required
                    className="w-full pl-10 pr-10 py-3 bg-white rounded-lg border border-gray-300 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="register-confirm" className="block text-sm font-medium text-gray-600 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input id="register-confirm" name="confirmPassword" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
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
                {loading ? 'Creating account...' : 'Sign up'}
              </button>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-sm text-gray-400">Or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="text-brand-500 hover:text-brand-600 font-semibold underline">
                  Login
                </Link>
              </p>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Verify it's you</h1>
            <p className="text-gray-500 mb-8">
              We just sent a six-digit code to your email address. Enter the code below.
            </p>

            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Activation Code</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input id="register-otp" name="otp" type="text" autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456" maxLength={6} required
                    className="w-full pl-10 pr-4 py-3 bg-white rounded-lg border border-gray-300 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all tracking-widest text-lg" />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-brand-500 text-white font-semibold rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-md">
                {loading ? 'Verifying...' : 'Confirm'}
              </button>

              <p className="text-sm text-gray-500">
                Didn't receive the code?{' '}
                <button type="button" onClick={handleResendOtp} className="text-brand-500 hover:text-brand-600 font-semibold underline">
                  Re-send.
                </button>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;
