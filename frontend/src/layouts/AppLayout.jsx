import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import logo from '../assets/logo.png';
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  Settings,
  MessageSquare,
  Dumbbell,
  Menu,
  X,
  LogOut,
  ChevronDown,
  User,
  Bell,
  Sun,
  Moon,
  Users,
  ShieldCheck,
  Shield,
  BarChart3,
  ClipboardList,
  Building2,
  Gavel,
  FileText,
  ScanLine,
  BookOpen,
  Building,
  CalendarPlus,
  ClipboardCheck
} from 'lucide-react';

/* ──────────────────────────────────────────────────────────────────────
   Navigation item definitions (per-role)
   ────────────────────────────────────────────────────────────────────── */

const studentItems = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/slot-booking', label: 'Slot Booking', icon: Dumbbell },
  { path: '/history', label: 'My History', icon: Clock },
  { path: '/calendar', label: 'Calendar', icon: CalendarDays },
  { path: '/feedback', label: 'Feedback', icon: MessageSquare },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const coordinatorItems = [
  { path: '/coordinator/events', label: 'Manage Events', icon: CalendarDays },
  { path: '/coordinator/venues', label: 'Book Venue', icon: LayoutDashboard },
];

const captainItems = [
  { path: '/captain/dashboard', label: 'Slot Block', icon: ShieldCheck },
];
const caretakerItems = [
  { path: '/caretaker/sports', label: 'Sports Console', icon: ClipboardCheck },
];
const executiveItems = [
  { path: '/executive/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/executive/calendar', label: 'Calendar Mgmt', icon: CalendarDays },
  { path: '/executive/coordinators', label: 'Coordinator Access', icon: Users },
  { path: '/executive/approvals', label: 'Booking Approvals', icon: ClipboardList },
  { path: '/executive/feedback', label: 'Feedback', icon: MessageSquare },
  { path: '/executive/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/executive/audit-log', label: 'Audit Log', icon: FileText },
  { path: '/executive/users', label: 'User Management', icon: User },
  { path: '/executive/facilities', label: 'Facilities', icon: Building2 },
  { path: '/executive/penalties', label: 'Penalties', icon: Gavel },
];

const gymAdminItems = [
  { path: '/gym-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/gym-admin/requests', label: 'Subscription Requests', icon: ClipboardList },
  { path: '/gym-admin/scanner', label: 'QR Scanner', icon: ScanLine },
  { path: '/gym-admin/feedback', label: 'Feedback', icon: MessageSquare },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const swimAdminItems = [
  { path: '/swim-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/swim-admin/requests', label: 'Subscription Requests', icon: ClipboardList },
  { path: '/swim-admin/scanner', label: 'QR Scanner', icon: ScanLine },
  { path: '/swim-admin/feedback', label: 'Feedback', icon: MessageSquare },
  { path: '/settings', label: 'Settings', icon: Settings },
];

/* ──────────────────────────────────────────────────────────────────────
   Sidebar Component
   ────────────────────────────────────────────────────────────────────── */

const NavItem = ({ path, label, icon: Icon, collapsed, onClose }) => (
  <NavLink
    to={path}
    onClick={onClose}
    title={collapsed ? label : undefined}
    className={({ isActive }) =>
      `flex items-center gap-3 ${collapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-xl text-sm font-medium transition-all duration-200
      ${isActive
        ? 'bg-white/10 text-white shadow-sm'
        : 'text-brand-100 hover:bg-white/5 hover:text-white'
      }`
    }
  >
    <Icon size={18} className="text-brand-200 flex-shrink-0" />
    {!collapsed && label}
  </NavLink>
);

const NavSection = ({ title, items, collapsed, onClose }) => (
  <>
    <div className="my-6 border-t border-white/10" />
    {!collapsed && (
      <p className="px-4 text-xs font-semibold text-brand-300 uppercase tracking-wider mb-3">
        {title}
      </p>
    )}
    {items.map(item => (
      <NavItem key={item.path} {...item} collapsed={collapsed} onClose={onClose} />
    ))}
  </>
);

const Sidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const roles = user?.roles || [];
  const isCaretakerOnly = roles.includes('caretaker')
    && !roles.some((role) => ['student', 'faculty', 'executive', 'admin', 'coordinator', 'captain', 'gym_admin', 'swim_admin'].includes(role));

  const isCoordinator = user?.roles?.some(r => ['coordinator', 'executive', 'admin'].includes(r));
  const isCaptain = user?.roles?.some(r => r === 'captain');
  const isCaretaker = user?.roles?.some(r => ['caretaker', 'executive', 'admin'].includes(r));
  const isExecutive = user?.roles?.some(r => ['executive', 'admin'].includes(r));
  const isGymAdmin = user?.roles?.some(r => r === 'gym_admin');
  const isSwimAdmin = user?.roles?.some(r => r === 'swim_admin');
  const isFacilityAdmin = isGymAdmin || isSwimAdmin;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full bg-sidebar
          flex flex-col overflow-y-auto transition-all duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${collapsed ? 'w-20' : 'w-64'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo + Hamburger toggle */}
        <div className={`flex items-center ${collapsed ? 'justify-center px-2' : 'px-6'} py-4 border-b border-white/10`}>
          <img src={logo} alt="Patang" className={`object-contain flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-10 h-10' : 'w-36 h-auto'}`} />

          {!collapsed && <div className="flex-1" />}

          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-brand-200 hover:bg-white/10 hover:text-white transition-all flex-shrink-0"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu size={20} />
          </button>

          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white ml-auto">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {/* ── Student nav (hidden for facility admins and pure caretakers) ── */}
          {!isFacilityAdmin && !isCaretakerOnly && studentItems.map(item => (
            <NavItem key={item.path} {...item} collapsed={collapsed} onClose={onClose} />
          ))}

          {/* ── Coordinator section ── */}
          {isCoordinator && !isFacilityAdmin && (
            <NavSection title="Coordinators" items={coordinatorItems} collapsed={collapsed} onClose={onClose} />
          )}

          {/* ── Captain section ── */}
          {isCaptain && !isFacilityAdmin && (
            <NavSection title="Captain" items={captainItems} collapsed={collapsed} onClose={onClose} />
          )}

          {/* ── Caretaker section ── */}
          {isCaretaker && !isFacilityAdmin && (
            <NavSection title="Caretaker" items={caretakerItems} collapsed={collapsed} onClose={onClose} />
          )}

          {/* ── Executive section ── */}
          {isExecutive && !isFacilityAdmin && (
            <NavSection title="Executive" items={executiveItems} collapsed={collapsed} onClose={onClose} />
          )}

          {/* ── Gym Admin section ── */}
          {isGymAdmin && (
            <NavSection title="Gym Administration" items={gymAdminItems} collapsed={collapsed} onClose={onClose} />
          )}

          {/* ── Swim Admin section ── */}
          {isSwimAdmin && (
            <NavSection title="Swim Administration" items={swimAdminItems} collapsed={collapsed} onClose={onClose} />
          )}
        </nav>

        {/* Separator + Logout */}
        <div className="mt-auto">
          <div className="mx-4 border-t border-white/10" />
          <div className="p-3">
            <button
              onClick={handleLogout}
              title={collapsed ? 'Logout' : undefined}
              className={`flex items-center gap-3 ${collapsed ? 'justify-center px-2' : 'px-4'} py-3 w-full rounded-xl text-sm font-medium text-brand-100 hover:bg-white/5 hover:text-white transition-all duration-200`}
            >
              <LogOut size={18} className="text-brand-200 flex-shrink-0" />
              {!collapsed && 'Logout'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

/* ──────────────────────────────────────────────────────────────────────
   Topbar Component
   ────────────────────────────────────────────────────────────────────── */

const Topbar = ({ onMenuToggle }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const roles = user?.roles || [];
  const isCaretakerOnly = roles.includes('caretaker')
    && !roles.some((role) => ['student', 'faculty', 'executive', 'admin', 'coordinator', 'captain', 'gym_admin', 'swim_admin'].includes(role));
  const [profileOpen, setProfileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [showNotif, setShowNotif] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [dashboardName, setDashboardName] = useState(null);

  const isFacilityAdmin = user?.roles?.some(r => ['gym_admin', 'swim_admin'].includes(r));

  // Apply dark mode on mount and toggle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Fetch dashboard info — only for non-admin roles (student/coordinator/executive)
  useEffect(() => {
    if (isFacilityAdmin || isCaretakerOnly) return; 

    const fetchDashboardInfo = async () => {
      try {
        const { data } = await api.get('/dashboard');
        const d = data.data;
        if (d.user?.name) {
          setDashboardName(d.user.name);
        }
        const hasPenalties = d.penalties?.totalActiveCount > 0;
        const hasNewEvents = d.upcomingEvents?.length > 0;
        setHasUnread(hasPenalties || hasNewEvents);
      } catch {
        // Silently fail
      }
    };
    fetchDashboardInfo();
  }, [isFacilityAdmin, isCaretakerOnly]);

  // Derive page name from path
  const pageName = (() => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/slot-booking') return 'Slot Booking';
    if (path === '/history') return 'My History';
    if (path === '/settings') return 'Settings';
    if (path === '/calendar') return 'Calendar';
    if (path === '/feedback') return 'Feedback';
    if (path.startsWith('/caretaker')) return 'Caretaker Console';

    if (path.startsWith('/coordinator')) return 'Coordinators';
    if (path.startsWith('/executive')) return 'Executive Portal';
    if (path.startsWith('/gym-admin')) return 'Gym Administration';
    if (path.startsWith('/swim-admin')) return 'Swim Administration';
    return 'Dashboard';
  })();

  // Context-aware header text
  const headerText = isFacilityAdmin ? 'Operations Console' : 'My Activity';

  const displayName = dashboardName || user?.name || user?.email?.split('@')[0]?.split('.')?.map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' ') || 'User';

  const roleBadge = (() => {
    if (user?.roles?.includes('admin')) return 'Admin';
    if (user?.roles?.includes('executive')) return 'Executive';
    if (user?.roles?.includes('gym_admin')) return 'Gym Admin';
    if (user?.roles?.includes('swim_admin')) return 'Swim Admin';
    if (user?.roles?.includes('coordinator')) return 'Coordinator';
    return 'Student';
  })();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 mr-2"
        >
          <Menu size={20} />
        </button>
        <div className="hidden sm:block">
          <p className="text-xs text-gray-400">Home / <span className="text-brand-500">{pageName}</span></p>
          <h2 className="text-lg font-bold text-gray-800">{headerText}</h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotif(!showNotif); setHasUnread(false); }}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100 relative"
          >
            <Bell size={20} />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border border-white"></span>
            )}
          </button>

          {showNotif && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
              <div className="absolute right-0 top-12 z-50 w-72 bg-white rounded-xl shadow-xl border border-gray-100 py-3">
                <div className="px-4 pb-2 border-b border-gray-50">
                  <p className="text-sm font-semibold text-gray-800">Notifications</p>
                </div>
                <div className="px-4 py-6 text-center">
                  <Bell size={24} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No new notifications</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="h-8 w-px bg-gray-200 mx-2" />

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-3 py-1 px-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold text-gray-800 leading-tight">
                {displayName}
              </p>
              <p className="text-xs text-gray-500">{roleBadge}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
              <User size={20} className="text-brand-600" />
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-14 z-50 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2">
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                {!isCaretakerOnly ? (
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/settings'); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <Settings size={16} />
                    Settings
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

/* ──────────────────────────────────────────────────────────────────────
   AppLayout
   ────────────────────────────────────────────────────────────────────── */

const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
      />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Topbar onMenuToggle={() => setSidebarOpen(prev => !prev)} />
        <main className="flex-1 overflow-y-auto px-4 lg:px-8 pb-8 pt-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
