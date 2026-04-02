import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import loginBG from '../../assets/loginBG.jpg';
import logo from '../../assets/logo.png';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(email.trim(), password.trim());
    if (result.success) {
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      const roles = stored.roles || [];
      const isAdmin = roles.some(r => ['executive', 'admin', 'gym_admin', 'swim_admin'].includes(r));
      navigate(isAdmin ? '/executive/dashboard' : '/dashboard');
    } else {
      setError(result.message);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat px-4"
      style={{ backgroundImage: `url(${loginBG})` }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Logo Container */}
      <div className="absolute top-6 left-6 z-20">
        <Link to="/">
          <img src={logo} alt="Patang Logo" className="w-28 sm:w-36 h-auto drop-shadow-lg transition-transform hover:scale-105" />
        </Link>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 sm:p-10">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Login</h1>
        {/* <p className="text-gray-500 mb-8">Log in by entering your email address and password.</p> */}

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-600 mb-1.5">Email address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@iitk.ac.in"
                required
                className="w-full pl-10 pr-4 py-3 bg-white rounded-lg border border-gray-300 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-600 mb-1.5">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                className="w-full pl-10 pr-10 py-3 bg-white rounded-lg border border-gray-300 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Link to="/forgot-password" className="inline-block text-sm text-brand-500 hover:text-brand-600 font-medium">
            Forgot password?
          </Link>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-500 text-white font-semibold rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-md"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>

          {/* Remember me */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRememberMe(!rememberMe)}
              className={`w-10 h-5 rounded-full transition-colors ${rememberMe ? 'bg-brand-500' : 'bg-gray-300'} relative`}
            >
              <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${rememberMe ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-sm text-gray-600">Remember me</span>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-400">Or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <p className="text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-500 hover:text-brand-600 font-semibold underline">
              SignUp
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
