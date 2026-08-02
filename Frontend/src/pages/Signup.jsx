import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ShoppingCart, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Signup() {
    const { register, currentUser, showToast } = useApp();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('biller'); // default role is Biller
    const [contactNumber, setContactNumber] = useState('');

    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Already logged in — redirect to dashboard
    if (currentUser) {
        const dest = currentUser.role === 'manager' ? '/manager' : '/biller';
        return <Navigate to={dest} replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !employeeId.trim() || !password) {
            setError('Please fill in all required fields.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (role === 'manager' && !contactNumber.trim()) {
            setError('Managers must provide a contact number.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                username: username.trim(),
                employeeId: employeeId.trim(),
                password,
                role,
                contactNumber: role === 'manager' ? contactNumber.trim() : '',
            };

            await register(payload);
            showToast('Registration successful! Welcome to StockSense.', 'success');
            // Redirect will be handled automatically by redirect state or navigate
            const dest = role === 'manager' ? '/manager' : '/biller';
            navigate(dest, { replace: true });
        } catch (err) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card" style={{ maxWidth: '460px' }}>
                {/* Brand header */}
                <div className="login-brand">
                    <div className="login-brand-icon">
                        <ShoppingCart size={28} />
                    </div>
                    <h1 className="login-title">StockSense</h1>
                    <p className="login-subtitle">Create your account</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate className="login-form">
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input
                            type="text"
                            className={`form-input ${error && !username.trim() ? 'input-error' : ''}`}
                            value={username}
                            onChange={(e) => { setUsername(e.target.value); setError(''); }}
                            placeholder="e.g. Rajesh Kumar"
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Employee ID</label>
                        <input
                            type="text"
                            className={`form-input ${error && !employeeId.trim() ? 'input-error' : ''}`}
                            value={employeeId}
                            onChange={(e) => { setEmployeeId(e.target.value); setError(''); }}
                            placeholder="e.g. EMP003"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Role</label>
                        <select
                            className="form-input"
                            value={role}
                            onChange={(e) => {
                                setRole(e.target.value);
                                setError('');
                                if (e.target.value !== 'manager') {
                                    setContactNumber('');
                                }
                            }}
                            style={{ padding: '9px 12px' }}
                        >
                            <option value="biller">Biller</option>
                            <option value="manager">Manager</option>
                        </select>
                    </div>

                    {/* Conditional field for Manager: Contact number */}
                    {role === 'manager' && (
                        <div className="form-group animate-fade-in" style={{ animation: 'modal-in 0.2s ease' }}>
                            <label className="form-label">Contact Number (Manager Only)</label>
                            <input
                                type="tel"
                                className={`form-input ${error && !contactNumber.trim() ? 'input-error' : ''}`}
                                value={contactNumber}
                                onChange={(e) => { setContactNumber(e.target.value); setError(''); }}
                                placeholder="e.g. +91-9876543210"
                            />
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                                Used in reorder emails sent to suppliers
                            </span>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div className="pw-wrap">
                            <input
                                className={`form-input ${error && password.length < 6 ? 'input-error' : ''}`}
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                placeholder="Minimum 6 characters"
                                autoComplete="new-password"
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
                        {loading ? <span className="spinner" /> : <UserPlus size={16} />}
                        {loading ? 'Creating Account…' : 'Sign Up'}
                    </button>
                </form>

                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-sub)' }}>
                        Already have an account?{' '}
                        <button
                            onClick={() => navigate('/login')}
                            className="link-btn"
                            style={{ display: 'inline', textTransform: 'none', padding: 0, font: 'inherit', verticalAlign: 'baseline' }}
                        >
                            Sign In
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
