import { useNavigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function AccessDenied() {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const home = currentUser?.role === 'manager' ? '/manager' : currentUser ? '/biller' : '/login';

  return (
    <div className="access-denied-page">
      <div className="access-denied-card">
        <ShieldOff size={52} className="ad-icon" />
        <h1 className="ad-title">Access Denied</h1>
        <p className="ad-msg">You don't have permission to view this page.</p>
        <button className="btn btn-primary" onClick={() => navigate(home, { replace: true })}>
          Go to My Dashboard
        </button>
      </div>
    </div>
  );
}
