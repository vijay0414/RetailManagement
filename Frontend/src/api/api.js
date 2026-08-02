/**
 * api.js — Centralized API service layer for StockSense
 *
 * All network calls go through here. The Vite dev proxy forwards /api → http://localhost:5000
 * Token is stored in localStorage and attached as a Bearer header on every request.
 */

const BASE = '/api';

// ─── Token helpers ─────────────────────────────────────────────────────────
export const getToken  = () => localStorage.getItem('ss_token');
export const setToken  = (t) => localStorage.setItem('ss_token', t);
export const clearToken = () => localStorage.removeItem('ss_token');

// ─── Core fetch wrapper ────────────────────────────────────────────────────
async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res  = await fetch(`${BASE}${path}`, { ...options, headers });
  const json = await res.json();
  if (!res.ok) {
    throw Object.assign(new Error(json.message || 'Request failed'), {
      status: res.status,
      payload: json,
    });
  }
  return json;
}

const get   = (path)        => request(path);
const post  = (path, body)  => request(path, { method: 'POST',  body: JSON.stringify(body) });
const put   = (path, body)  => request(path, { method: 'PUT',   body: JSON.stringify(body) });
const patch = (path, body = {}) => request(path, { method: 'PATCH', body: JSON.stringify(body) });

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login : (employeeId, password) => post('/auth/login', { employeeId, password }),
  me    : () => get('/auth/me'),
};

// ─── Products ──────────────────────────────────────────────────────────────
export const productApi = {
  getAll      : (params = {}) => { const q = new URLSearchParams(params).toString(); return get(`/products${q ? `?${q}` : ''}`); },
  getByBarcode: (code)        => get(`/products/barcode/${encodeURIComponent(code)}`),
  getLowStock : ()            => get('/products/low-stock'),
  create      : (data)        => post('/products', data),
  update      : (id, data)    => put(`/products/${id}`, data),
};

// ─── Bills ─────────────────────────────────────────────────────────────────
export const billApi = {
  /** Body: { items: [{ productId, qty }], customerEmail? } */
  create  : (items, customerEmail) => post('/bills', { items, customerEmail: customerEmail || '' }),
  getAll  : ()    => get('/bills'),
  getById : (id)  => get(`/bills/${id}`),
};

// ─── Reorders ──────────────────────────────────────────────────────────────
export const reorderApi = {
  /** Body: { productId, quantity, managerFeedback? } */
  create      : (data) => post('/reorders', data),
  getAll      : (params = {}) => { const q = new URLSearchParams(params).toString(); return get(`/reorders${q ? `?${q}` : ''}`); },
  markReceived: (id)   => patch(`/reorders/${id}/receive`),
};

// ─── Alerts ────────────────────────────────────────────────────────────────
export const alertApi = {
  getPending: ()            => get('/alerts/pending'),
  getAll    : (params = {}) => { const q = new URLSearchParams(params).toString(); return get(`/alerts${q ? `?${q}` : ''}`); },
  inform    : (id)          => patch(`/alerts/${id}/inform`),
  dismiss   : (id)          => patch(`/alerts/${id}/dismiss`),
};

// ─── Users (Manager-only) ──────────────────────────────────────────────────
export const userApi = {
  createBiller : (data) => post('/users/billers', data),
  getBillers   : ()     => get('/users/billers'),
};

// ─── Reports (Manager-only) ────────────────────────────────────────────────
export const reportApi = {
  todayRevenue  : ()            => get('/reports/today-revenue'),
  profitSummary : (params = {}) => { const q = new URLSearchParams(params).toString(); return get(`/reports/profit-summary${q ? `?${q}` : ''}`); },
};
