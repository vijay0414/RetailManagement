import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

/**
 * ProtectedRoute
 *  allowedRoles: string[]  e.g. ['manager'] or ['biller'] or ['manager','biller']
 *
 * Behaviour:
 *  - Not logged in  → /login
 *  - Wrong role     → /access-denied
 *  - OK             → render children
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser } = useApp();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}
