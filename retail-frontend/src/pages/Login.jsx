import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, LogIn, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

const HINTS = [
  { role: 'Manager', username: 'manager',  password: 'manager123' },
  { role: 'Biller',  username: 'biller',   password: 'biller123'  },
];

export default function Login() {
  const { login, currentUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // Already logged in → redirect
  if (currentUser) {
    const dest = currentUser.role === 'manager' ? '/manager' : '/biller';
    navigate(dest, { replace: true });
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    // Simulate slight async delay for UX realism
    setTimeout(() => {
      const result = login(username, password);
      setLoading(false);
      if (!result.success) {
        setError(result.message);
        return;
      }
      const from = location.state?.from?.pathname;
      const dest = result.user.role === 'manager' ? '/manager' : '/biller';
      navigate(from || dest, { replace: true });
    }, 400);
  };

  const fillHint = (hint) => {
    setUsername(hint.username);
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
          <h1 className="login-title">RetailManager</h1>
          <p className="login-subtitle">Inventory &amp; Billing Management System</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="login-form">
          <div className="form-group">
            <label className="form-label">Username / Employee ID</label>
            <input
              className={`form-input ${error ? 'input-error' : ''}`}
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              placeholder="Enter your username"
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
              <button key={h.role} className={`demo-hint-btn hint-${h.role.toLowerCase()}`} onClick={() => fillHint(h)}>
                <strong>{h.role}</strong>
                <span>{h.username} / {h.password}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
