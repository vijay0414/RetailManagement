import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ShoppingCart, LogIn, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

const HINTS = [
  { role: 'Manager', employeeId: 'EMP001', password: 'manager123', display: 'EMP001 / manager123' },
  { role: 'Biller',  employeeId: 'EMP002', password: 'biller123',  display: 'EMP002 / biller123'  },
];

export default function Login() {
  const { login, currentUser } = useApp();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [employeeId, setEmployeeId] = useState('');
  const [password,   setPassword]   = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  // Already logged in — redirect via <Navigate> (safe during render)
  if (currentUser) {
    const dest = currentUser.role === 'manager' ? '/manager' : '/biller';
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!employeeId.trim() || !password) {
      setError('Please enter your Employee ID and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await login(employeeId.trim(), password);
      const from = location.state?.from?.pathname;
      const dest = result.user.role === 'manager' ? '/manager' : '/biller';
      navigate(from || dest, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid Employee ID or password.');
    } finally {
      setLoading(false);
    }
  };

  const fillHint = (hint) => {
    setEmployeeId(hint.employeeId);
    setPassword(hint.password);
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand header */}
        <div className="login-brand">
          <div className="login-brand-icon">
            <ShoppingCart size={28} />
          </div>
          <h1 className="login-title">StockSense</h1>
          <p className="login-subtitle">Inventory &amp; Billing Management System</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="login-form">
          <div className="form-group">
            <label className="form-label">Employee ID or Username</label>
            <input
              className={`form-input ${error ? 'input-error' : ''}`}
              value={employeeId}
              onChange={(e) => { setEmployeeId(e.target.value); setError(''); }}
              placeholder="e.g. EMP001 or manager"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="pw-wrap">
              <input
                className={`form-input ${error ? 'input-error' : ''}`}
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button
            type="submit"
            className={`btn btn-primary btn-block ${loading ? 'btn-loading' : ''}`}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : <LogIn size={16} />}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Demo hints */}
        <div className="demo-hints">
          <p className="demo-hints-label">Demo credentials — click to fill:</p>
          <div className="demo-hint-row">
            {HINTS.map((h) => (
              <button
                key={h.role}
                className={`demo-hint-btn hint-${h.role.toLowerCase()}`}
                onClick={() => fillHint(h)}
              >
                <strong>{h.role}</strong>
                <span>{h.display}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
