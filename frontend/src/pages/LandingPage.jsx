import { Link } from 'react-router-dom';
import { Calendar, Activity, Zap, ChevronDown } from 'lucide-react';
import logo from '../assets/logo.png';
import loginBG from '../assets/loginBG.jpg';

const features = [
  {
    icon: Calendar,
    title: 'Smart Booking',
    desc: 'Instantly reserve gym sessions, swimming slots, and sports courts — all from one place.',
  },
  {
    icon: Activity,
    title: 'Live Availability',
    desc: 'See real-time facility status so you never show up to a full court again.',
  },
  {
    icon: Zap,
    title: 'Zero Hassle',
    desc: 'QR check-in, auto-penalties, group bookings and subscriptions — completely streamlined.',
  },
];

const LandingPage = () => {
  return (
    <div className="bg-sidebar font-sans scroll-smooth">
      {/* ───────────── HERO ───────────── */}
      <section
        id="hero"
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden"
      >
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${loginBG})` }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-sidebar" />

        {/* Floating kite accent */}
        <div className="absolute top-16 right-12 md:right-24 opacity-20 animate-float pointer-events-none select-none">
          <img src={logo} alt="" className="w-32 md:w-48 rotate-12" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center gap-6">
          {/* Logo */}
          <img
            src={logo}
            alt="Patang Logo"
            className="w-36 sm:w-44 md:w-52 drop-shadow-2xl animate-fadeIn"
          />

          {/* Tagline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
            <span className="inline-block animate-fadeInUp" style={{ animationDelay: '0.2s' }}>Book.</span>{' '}
            <span className="inline-block animate-fadeInUp text-brand-300" style={{ animationDelay: '0.45s' }}>Play.</span>{' '}
            <span className="inline-block animate-fadeInUp" style={{ animationDelay: '0.7s' }}>Repeat.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-gray-300 max-w-xl animate-fadeInUp" style={{ animationDelay: '0.9s' }}>
            IIT Kanpur's all-in-one sports facility booking platform — gym, pool, courts, and more at your fingertips.
          </p>

          {/* CTA buttons */}
          <div
            className="flex flex-col sm:flex-row gap-4 mt-4 animate-fadeInUp"
            style={{ animationDelay: '1.1s' }}
          >
            <Link
              to="/register"
              id="landing-cta-register"
              className="px-8 py-3.5 rounded-xl bg-brand-500 text-white font-semibold text-lg shadow-lg shadow-brand-500/30 hover:bg-brand-400 hover:shadow-brand-400/40 hover:scale-105 transition-all duration-300"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              id="landing-cta-login"
              className="px-8 py-3.5 rounded-xl border-2 border-white/30 text-white font-semibold text-lg backdrop-blur-sm hover:bg-white/10 hover:border-white/50 hover:scale-105 transition-all duration-300"
            >
              Log In
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <a
          href="#features"
          className="absolute bottom-8 z-10 text-white/40 hover:text-white/70 transition-colors animate-bounce"
        >
          <ChevronDown size={32} />
        </a>
      </section>

      {/* ───────────── FEATURES ───────────── */}
      <section id="features" className="relative py-24 px-6 bg-gradient-to-b from-sidebar to-sidebar-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-4 animate-fadeInUp">
            Why Patang?
          </h2>
          <p className="text-gray-400 text-center max-w-lg mx-auto mb-16 animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
            Everything you need to manage your campus sports life, in one beautiful app.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center hover:bg-white/10 hover:border-brand-400/40 hover:scale-[1.03] transition-all duration-300 animate-fadeInUp"
                style={{ animationDelay: `${0.3 + i * 0.15}s` }}
              >
                {/* Glow */}
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-brand-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="relative w-14 h-14 rounded-xl bg-brand-500/20 flex items-center justify-center mb-5">
                  <f.icon size={28} className="text-brand-300" />
                </div>
                <h3 className="relative text-xl font-semibold text-white mb-3">{f.title}</h3>
                <p className="relative text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── FOOTER ───────────── */}
      <footer className="py-8 text-center text-gray-500 text-sm bg-sidebar-light border-t border-white/5">
        <p>
          © {new Date().getFullYear()} <span className="text-brand-300 font-medium">Patang</span> · IIT Kanpur
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
