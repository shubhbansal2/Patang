import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Captain Routes */}
          <Route element={<ProtectedRoute allowedRoles={['captain', 'admin', 'executive']} />}>
            <Route
              path="/captain/dashboard"
              element={<AppLayout><CaptainDashboardPage /></AppLayout>}
            />
          </Route>

          {/* Protected Routes — any authenticated user */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/dashboard"
              element={<AppLayout><DashboardPage /></AppLayout>}
            />
            <Route
              path="/slot-booking"
              element={<AppLayout><SlotBookingPage /></AppLayout>}
            />
            <Route
              path="/history"
              element={<AppLayout><HistoryPage /></AppLayout>}
            />
            <Route
              path="/calendar"
              element={<AppLayout><CalendarPage /></AppLayout>}
            />
            <Route
              path="/feedback"
              element={<AppLayout><FeedbackPage /></AppLayout>}
            />
            <Route
              path="/settings"
              element={<AppLayout><SettingsPage /></AppLayout>}
            />
          </Route>

          {/* Coordinator Routes — coordinator, executive, admin only */}
          <Route element={<ProtectedRoute allowedRoles={['coordinator', 'executive', 'admin']} />}>
            <Route
              path="/coordinator/events"
              element={<AppLayout><CoordinatorEventsPage /></AppLayout>}
            />
            <Route
              path="/coordinator/venues"
              element={<AppLayout><CoordinatorVenuesPage /></AppLayout>}
            />
          </Route>

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
