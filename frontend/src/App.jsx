import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/ToastContainer';
import ProtectedRoute, { getDefaultRoute } from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// User portal pages
import DashboardPage from './pages/DashboardPage';
import CaptainDashboardPage from './pages/captain/CaptainDashboardPage';
import SlotBookingPage from './pages/SlotBookingPage';
import HistoryPage from './pages/HistoryPage';
import CalendarPage from './pages/CalendarPage';
import FeedbackPage from './pages/FeedbackPage';
import SettingsPage from './pages/SettingsPage';

// Coordinator pages
import CoordinatorEventsPage from './pages/coordinator/CoordinatorEventsPage';
import CoordinatorVenuesPage from './pages/coordinator/CoordinatorVenuesPage';
import SportsCaretakerPage from './pages/caretaker/SportsCaretakerPage';

// Executive pages
import ExecutiveDashboardPage from './pages/executive/ExecutiveDashboardPage';
import CalendarManagementPage from './pages/executive/CalendarManagementPage';
import CoordinatorAccessPage from './pages/executive/CoordinatorAccessPage';
import BookingApprovalsPage from './pages/executive/BookingApprovalsPage';
import FeedbackReportsPage from './pages/executive/FeedbackReportsPage';
import AnalyticsPage from './pages/executive/AnalyticsPage';
import AuditLogPage from './pages/executive/AuditLogPage';
import UserManagementPage from './pages/executive/UserManagementPage';
import FacilityManagementPage from './pages/executive/FacilityManagementPage';
import PenaltyManagementPage from './pages/executive/PenaltyManagementPage';
import ExecutiveSettingsPage from './pages/executive/ExecutiveSettingsPage';

// Gym Admin pages
import GymAdminDashboardPage from './pages/gym-admin/GymAdminDashboardPage';
import GymAdminRequestsPage from './pages/gym-admin/GymAdminRequestsPage';
import GymAdminScannerPage from './pages/gym-admin/GymAdminScannerPage';

// Swim Admin pages
import SwimAdminDashboardPage from './pages/swim-admin/SwimAdminDashboardPage';
import SwimAdminRequestsPage from './pages/swim-admin/SwimAdminRequestsPage';
import SwimAdminScannerPage from './pages/swim-admin/SwimAdminScannerPage';

const HomeRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={getDefaultRoute(user)} replace />;
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Captain Routes */}
            <Route element={<ProtectedRoute allowedRoles={['captain', 'admin', 'executive']} />}>
              <Route path="/captain/dashboard" element={<AppLayout><CaptainDashboardPage /></AppLayout>} />
            </Route>

            {/* ─── Student / General User Routes ─────────────────────────
                 gym_admin and swim_admin are EXCLUDED from these routes.
            ───────────────────────────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={['student', 'faculty', 'coordinator', 'captain', 'executive', 'admin']} />}>
              <Route path="/dashboard" element={<AppLayout><DashboardPage /></AppLayout>} />
              <Route path="/slot-booking" element={<AppLayout><SlotBookingPage /></AppLayout>} />
              <Route path="/history" element={<AppLayout><HistoryPage /></AppLayout>} />
              <Route path="/calendar" element={<AppLayout><CalendarPage /></AppLayout>} />
            </Route>

            {/* ─── Shared Routes (all authenticated users) ──────────── */}
            <Route element={<ProtectedRoute />}>
              <Route path="/feedback" element={<AppLayout><FeedbackPage /></AppLayout>} />
              <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
            </Route>

            {/* Coordinator Routes */}
            <Route element={<ProtectedRoute allowedRoles={['coordinator', 'executive', 'admin']} />}>
              <Route path="/coordinator/events" element={<AppLayout><CoordinatorEventsPage /></AppLayout>} />
              <Route path="/coordinator/venues" element={<AppLayout><CoordinatorVenuesPage /></AppLayout>} />
            </Route>

            {/* Caretaker Routes */}
            <Route element={<ProtectedRoute allowedRoles={['caretaker', 'executive', 'admin']} />}>
              <Route path="/caretaker/sports" element={<AppLayout><SportsCaretakerPage /></AppLayout>} />
            </Route>

            {/* Executive Routes */}
            <Route element={<ProtectedRoute allowedRoles={['executive', 'admin']} />}>
              <Route path="/executive/dashboard" element={<AppLayout><ExecutiveDashboardPage /></AppLayout>} />
              <Route path="/executive/calendar" element={<AppLayout><CalendarManagementPage /></AppLayout>} />
              <Route path="/executive/coordinators" element={<AppLayout><CoordinatorAccessPage /></AppLayout>} />
              <Route path="/executive/approvals" element={<AppLayout><BookingApprovalsPage /></AppLayout>} />
              <Route path="/executive/feedback" element={<AppLayout><FeedbackReportsPage /></AppLayout>} />
              <Route path="/executive/analytics" element={<AppLayout><AnalyticsPage /></AppLayout>} />
              <Route path="/executive/audit-log" element={<AppLayout><AuditLogPage /></AppLayout>} />
              <Route path="/executive/users" element={<AppLayout><UserManagementPage /></AppLayout>} />
              <Route path="/executive/facilities" element={<AppLayout><FacilityManagementPage /></AppLayout>} />
              <Route path="/executive/penalties" element={<AppLayout><PenaltyManagementPage /></AppLayout>} />
              <Route path="/executive/settings" element={<AppLayout><ExecutiveSettingsPage /></AppLayout>} />
            </Route>

            {/* Gym Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['gym_admin']} />}>
              <Route path="/gym-admin/dashboard" element={<AppLayout><GymAdminDashboardPage /></AppLayout>} />
              <Route path="/gym-admin/requests" element={<AppLayout><GymAdminRequestsPage /></AppLayout>} />
              <Route path="/gym-admin/scanner" element={<AppLayout><GymAdminScannerPage /></AppLayout>} />
              <Route path="/gym-admin/feedback" element={<AppLayout><FeedbackReportsPage /></AppLayout>} />
            </Route>

            {/* Swim Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['swim_admin']} />}>
              <Route path="/swim-admin/dashboard" element={<AppLayout><SwimAdminDashboardPage /></AppLayout>} />
              <Route path="/swim-admin/requests" element={<AppLayout><SwimAdminRequestsPage /></AppLayout>} />
              <Route path="/swim-admin/scanner" element={<AppLayout><SwimAdminScannerPage /></AppLayout>} />
              <Route path="/swim-admin/feedback" element={<AppLayout><FeedbackReportsPage /></AppLayout>} />
            </Route>

            {/* Root redirect */}
            <Route path="/" element={<HomeRedirect />} />
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
