import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const getDefaultRoute = (user) => {
  const roles = user?.roles || [];

  if (roles.includes('executive') || roles.includes('admin')) return '/executive/dashboard';
  if (roles.includes('captain')) return '/captain/dashboard';
  if (roles.includes('coordinator')) return '/coordinator/events';
  if (roles.includes('caretaker')) return '/caretaker/sports';
  return '/dashboard';
};

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = user.roles?.some(r => allowedRoles.includes(r));
    if (!hasRole) {
      return <Navigate to={getDefaultRoute(user)} replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
