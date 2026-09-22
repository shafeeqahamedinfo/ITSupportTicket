import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader } from 'lucide-react';

/**
 * ProtectedRoute
 * Redirects to /login if user is not authenticated.
 * Redirects to correct dashboard if role doesn't match `allowedRoles`.
 */
export function ProtectedRoute({ children, allowedRoles }) {
  const { isLoggedIn, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-slate-400 text-sm">Verifying session…</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to correct dashboard based on role
    const dashMap = { admin: '/admin', it_staff: '/staff', user: '/dashboard' };
    return <Navigate to={dashMap[user.role] || '/dashboard'} replace />;
  }

  return children;
}

/**
 * GuestRoute
 * Redirects logged-in users away from auth pages (login, register)
 */
export function GuestRoute({ children }) {
  const { isLoggedIn, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (isLoggedIn) {
    const dashMap = { admin: '/admin', it_staff: '/staff', user: '/dashboard' };
    return <Navigate to={dashMap[user.role] || '/dashboard'} replace />;
  }

  return children;
}
