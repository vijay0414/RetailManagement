import { useState } from 'react';
import { Users, UserPlus, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

const EMPTY = { username: '', employeeId: '', password: '' };

export default function ManageBillers() {
  const { billers, createBiller, showToast } = useApp();
  const [form,    setForm]    = useState(EMPTY);
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState('');

  const validate = () => {
    const e = {};
    if (!form.username.trim())   e.username   = 'Required.';
    if (!form.employeeId.trim()) e.employeeId = 'Required.';
    if (!form.password)          e.password   = 'Required.';
    else if (form.password.length < 6) e.password = 'Minimum 6 characters.';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: '' }));
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await createBiller({
        username:   form.username.trim(),
        employeeId: form.employeeId.trim(),
        password:   form.password,
      });
      setSuccess(`Biller "${form.username.trim()}" (${form.employeeId.trim().toUpperCase()}) created.`);
      setForm(EMPTY);
      setErrors({});
      showToast(`Biller ${form.username.trim()} created successfully.`);
    } catch (err) {
      // 400 duplicate employeeId comes through as err.message
      if (err.status === 400) {
        setErrors({ employeeId: err.message });
      } else {
        showToast(err.message || 'Failed to create biller.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title"><Users size={20}/> Manage Billers</h1>
        <p className="page-subtitle">Create new biller accounts and view existing ones.</p>
      </div>

      <div className="add-product-layout">
        {/* ── Create form ─────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title"><UserPlus size={15}/> Add New Biller</h2>
          </div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              <Field label="Full Name *" error={errors.username} full>
                <input className={`form-input ${errors.username ? 'input-error' : ''}`}
                  name="username" value={form.username} onChange={handleChange}
                  placeholder="e.g. Priya Sharma" autoFocus />
              </Field>
              <Field label="Employee ID *" error={errors.employeeId}>
                <input className={`form-input ${errors.employeeId ? 'input-error' : ''}`}
                  name="employeeId" value={form.employeeId} onChange={handleChange}
                  placeholder="e.g. EMP010" />
              </Field>
              <Field label="Password *" error={errors.password}>
                <input className={`form-input ${errors.password ? 'input-error' : ''}`}
                  name="password" type="password" value={form.password} onChange={handleChange}
                  placeholder="Min 6 characters" />
              </Field>
            </div>

            {success && (
              <p style={{ color: 'var(--color-green,#16a34a)', fontSize: 13, marginBottom: 12 }}>
                <CheckCircle size={13}/> {success}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
              {saving
                ? <><span className="spinner-sm"/> Creating…</>
                : <><UserPlus size={15}/> Create Biller Account</>}
            </button>
          </form>
        </div>
      </div>

      {/* ── Biller list ──────────────────────────────────────────────── */}
      <div className="card mt-6">
        <div className="card-header">
          <h2 className="card-title"><Users size={15}/> Biller Accounts ({billers.length})</h2>
        </div>
        {billers.length === 0 ? (
          <p className="empty-msg">No biller accounts found.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr>
                <th>Name</th><th>Employee ID</th><th>Role</th><th>Created</th>
              </tr></thead>
              <tbody>
                {billers.map((b) => (
                  <tr key={b._id}>
                    <td className="font-medium">{b.username}</td>
                    <td className="mono">{b.employeeId}</td>
                    <td><span className="category-pill">biller</span></td>
                    <td className="text-sm text-muted">
                      {new Date(b.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, error, full, children }) {
  return (
    <div className={`form-group${full ? ' form-group--full' : ''}`}>
      <label className="form-label">{label}</label>
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
