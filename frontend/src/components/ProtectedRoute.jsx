import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Returns the correct home path for a given user based on their primary role.
 */
const getRoleHome = (user) => {
  if (user?.roles?.includes('gym_admin')) return '/gym-admin/dashboard';
  if (user?.roles?.includes('swim_admin')) return '/swim-admin/dashboard';
  if (user?.roles?.includes('executive') || user?.roles?.includes('admin')) return '/executive/dashboard';
  return '/dashboard';
};

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRoles = user?.roles?.length ? user.roles : ['student'];
    const hasRole = userRoles.some(r => allowedRoles.includes(r));
    if (!hasRole) {
      return <Navigate to={getRoleHome(user)} replace />;
    }
  }

  return <Outlet />;
};

export { getRoleHome };
export default ProtectedRoute;
