import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

/**
 * ProtectedRoute
 *
 * Behaviour:
 *  - authLoading = true  → show nothing (blank) while the token is being verified.
 *                          This prevents a flash-redirect to /login when the user
 *                          has a valid stored token that hasn't been checked yet.
 *  - Not logged in       → redirect to /login (saves current location for post-login return)
 *  - Wrong role          → redirect to /access-denied
 *  - OK                  → render children
 */
export default function ProtectedRoute({ children, allowedRoles, authLoading }) {
  const { currentUser } = useApp();
  const location = useLocation();

  // Still verifying the stored token — render nothing to avoid a flash redirect
  if (authLoading) {
    return null;
  }

  // No session — send to login, preserve the attempted URL
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wrong role
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}
