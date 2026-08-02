/**
 * AppContext — single source of truth for auth, products, bills,
 * reorders, stock alerts, reports, user management, and toasts.
 *
 * All data comes from the real backend via src/api/api.js.
 */

import {
  createContext, useContext, useState,
  useCallback, useEffect, useRef,
} from 'react';
import {
  authApi, productApi, billApi, reorderApi,
  alertApi, userApi, reportApi,
  setToken, clearToken, getToken,
} from '../api/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [bills, setBills] = useState([]);
  const [reorderHistory, setReorderHistory] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [billers, setBillers] = useState([]);

  // ── Reports ───────────────────────────────────────────────────────────────
  const [todayStats, setTodayStats] = useState(null);   // { totalRevenue, billCount }
  const [profitStats, setProfitStats] = useState(null);   // { totalRevenue, totalCost, totalProfit, billCount, dateRange }

  // ── Toasts ────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);

  // ── Alert poll ref ────────────────────────────────────────────────────────
  const alertPollRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Session restore on mount
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      if (!getToken()) { setAuthLoading(false); return; }
      try {
        const res = await authApi.me();
        const u = res.data;
        setCurrentUser({ id: u.userId, name: u.username, employeeId: u.employeeId, role: u.role });
      } catch {
        clearToken();
      } finally {
        setAuthLoading(false);
      }
    };
    restore();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Load data when user logs in
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    loadProducts();
    loadBills();
    if (currentUser.role === 'manager') {
      loadReorders();
      loadBillers();
      loadTodayStats();
      loadProfitStats();
      startAlertPolling();
    }
    return () => stopAlertPolling();
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  // Auth
  // ─────────────────────────────────────────────────────────────────────────
  const login = useCallback(async (employeeId, password) => {
    const res = await authApi.login(employeeId, password);
    setToken(res.data.token);
    const user = { id: res.data.userId, name: res.data.name, employeeId: res.data.employeeId, role: res.data.role };
    setCurrentUser(user);
    return { success: true, user };
  }, []);

  const register = useCallback(async (signupData) => {
    const res = await authApi.register(signupData);
    setToken(res.data.token);
    const user = { id: res.data.userId, name: res.data.name, employeeId: res.data.employeeId, role: res.data.role };
    setCurrentUser(user);
    return { success: true, user };
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setCurrentUser(null);
    setProducts([]); setBills([]); setReorderHistory([]);
    setStockAlerts([]); setBillers([]);
    setTodayStats(null); setProfitStats(null);
    stopAlertPolling();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  // Products
  // ─────────────────────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    try {
      const res = await productApi.getAll();
      setProducts(res.data.map(normalizeProduct));
    } catch (err) { console.error('loadProducts:', err.message); }
  }, []);

  const addProduct = useCallback(async (formData) => {
    const payload = {
      name: formData.name,
      category: formData.category,
      price: Number(formData.price),
      costPrice: Number(formData.costPrice) || 0,
      quantity: Number(formData.stock),
      supplierName: formData.supplierName,
      supplierContact: formData.supplierContact,
      supplierEmail: formData.supplierEmail || '',
      reorderThreshold: Number(formData.reorderThreshold) || 5,
    };
    const res = await productApi.create(payload);
    const p = normalizeProduct(res.data);
    setProducts((prev) => [p, ...prev]);
    return p;
  }, []);

  const getProductByBarcode = useCallback(async (code) => {
    try {
      const res = await productApi.getByBarcode(code);
      return normalizeProduct(res.data);
    } catch { return null; }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Bills
  // ─────────────────────────────────────────────────────────────────────────
  const loadBills = useCallback(async () => {
    try {
      const res = await billApi.getAll();
      setBills(res.data.map(normalizeBill));
    } catch (err) { console.error('loadBills:', err.message); }
  }, []);

  /**
   * createBill — sends cart items to backend.
   * Returns { bill, emailSent } so the caller can show the right toast.
   */
  const createBill = useCallback(async (cartItems, customerEmail) => {
    const items = cartItems.map((i) => ({ productId: i.productId, qty: i.qty }));
    const res = await billApi.create(items, customerEmail);
    const bill = normalizeBill(res.data);
    setBills((prev) => [bill, ...prev]);
    await loadProducts();               // refresh stock counts
    await loadTodayStats();             // refresh revenue card
    await loadProfitStats();
    return { bill, emailSent: res.emailSent };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const todaysBills = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return bills.filter((b) => b.invoiceNo.includes(today));
  }, [bills]);

  // ─────────────────────────────────────────────────────────────────────────
  // Reorders
  // ─────────────────────────────────────────────────────────────────────────
  const loadReorders = useCallback(async () => {
    try {
      const res = await reorderApi.getAll();
      setReorderHistory(res.data.map(normalizeReorder));
    } catch (err) { console.error('loadReorders:', err.message); }
  }, []);

  /**
   * addReorder — returns { reorder, emailSent }
   * params: productId, quantity, expectedDeliveryDate, managerFeedback
   */
  const addReorder = useCallback(async (productId, quantity, expectedDeliveryDate, managerFeedback) => {
    const res = await reorderApi.create({
      productId,
      quantity,
      expectedDeliveryDate,
      managerFeedback: managerFeedback || '',
    });
    const entry = normalizeReorder(res.data);
    setReorderHistory((prev) => [entry, ...prev]);
    return { reorder: entry, emailSent: res.emailSent };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Stock Alerts (polled every 5 s, manager only)
  // ─────────────────────────────────────────────────────────────────────────
  const fetchPendingAlerts = useCallback(async () => {
    try {
      const res = await alertApi.getPending();
      setStockAlerts(res.data.map(normalizeAlert));
    } catch { /* silent */ }
  }, []);

  const startAlertPolling = useCallback(() => {
    fetchPendingAlerts();
    alertPollRef.current = setInterval(fetchPendingAlerts, 5000);
  }, [fetchPendingAlerts]);

  const stopAlertPolling = useCallback(() => {
    if (alertPollRef.current) { clearInterval(alertPollRef.current); alertPollRef.current = null; }
  }, []);

  const informAlert = useCallback(async (alertId) => {
    const res = await alertApi.inform(alertId);
    setStockAlerts((prev) => prev.filter((a) => a.alertId !== alertId));
    return res.message;
  }, []);

  const dismissStockAlert = useCallback(async (alertId) => {
    await alertApi.dismiss(alertId);
    setStockAlerts((prev) => prev.filter((a) => a.alertId !== alertId));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // User management (Manager only)
  // ─────────────────────────────────────────────────────────────────────────
  const loadBillers = useCallback(async () => {
    try {
      const res = await userApi.getBillers();
      setBillers(res.data);
    } catch (err) { console.error('loadBillers:', err.message); }
  }, []);

  const createBiller = useCallback(async (data) => {
    const res = await userApi.createBiller(data);
    await loadBillers();
    return res;
  }, [loadBillers]);

  // ─────────────────────────────────────────────────────────────────────────
  // Reports
  // ─────────────────────────────────────────────────────────────────────────
  const loadTodayStats = useCallback(async () => {
    try {
      const res = await reportApi.todayRevenue();
      setTodayStats(res.data);
    } catch (err) { console.error('loadTodayStats:', err.message); }
  }, []);

  const loadProfitStats = useCallback(async (params) => {
    try {
      const res = await reportApi.profitSummary(params);
      setProfitStats(res.data);
    } catch (err) { console.error('loadProfitStats:', err.message); }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Toasts
  // ─────────────────────────────────────────────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3800);
  }, []);

  const removeToast = useCallback(
    (id) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Derived
  // ─────────────────────────────────────────────────────────────────────────
  const suppliers = [
    ...new Map(
      products.map((p) => [p.supplierName, { name: p.supplierName, contact: p.supplierContact }])
    ).values(),
  ];

  return (
    <AppContext.Provider value={{
      // auth
      currentUser, authLoading, login, logout, register,
      // products
      products, addProduct, getProductByBarcode, loadProducts,
      // bills
      bills, createBill, todaysBills,
      // stock alerts
      stockAlerts, informAlert, dismissStockAlert,
      // reorders
      reorderHistory, addReorder, loadReorders,
      // user management
      billers, createBiller, loadBillers,
      // reports
      todayStats, profitStats, loadProfitStats,
      // derived
      suppliers,
      // toasts
      toasts, showToast, removeToast,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
};

// ─────────────────────────────────────────────────────────────────────────────
// Normalisers
// ─────────────────────────────────────────────────────────────────────────────

function normalizeProduct(p) {
  return {
    id: p._id, productId: p._id,
    barcode: p.barcode, name: p.name, category: p.category,
    price: p.price, costPrice: p.costPrice || 0,
    stock: p.quantity,
    reorderThreshold: p.reorderThreshold,
    supplierName: p.supplierName, supplierContact: p.supplierContact,
    supplierEmail: p.supplierEmail || '',
    createdAt: p.createdAt, updatedAt: p.updatedAt,
  };
}

function normalizeBill(b) {
  return {
    id: b._id, invoiceNo: b.invoiceNumber,
    date: new Date(b.createdAt).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }),
    billerName: b.billedBy?.username || b.billedBy?.employeeId || '—',
    items: b.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price, subtotal: i.subtotal })),
    total: b.total,
  };
}

function normalizeReorder(r) {
  return {
    id: r._id,
    productId: r.productId?._id || r.productId,
    barcode: r.productId?.barcode || '',
    productName: r.productId?.name || '—',
    supplierName: r.supplierName,
    qty: r.quantity,
    feedback: r.managerFeedback || '',
    expectedDeliveryDate: r.expectedDeliveryDate
      ? new Date(r.expectedDeliveryDate).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
      : '—',
    date: new Date(r.createdAt).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }),
    status: r.status === 'received' ? 'Delivered' : 'Placed',
    rawStatus: r.status,
  };
}

function normalizeAlert(a) {
  return {
    alertId: a._id, id: a._id,
    productId: a.productId?._id || a.productId,
    name: a.productId?.name || '—',
    barcode: a.productId?.barcode || '',
    category: a.productId?.category || '',
    stock: a.remainingStock,
    reorderThreshold: a.productId?.reorderThreshold ?? 5,
    supplierName: a.supplierName,
    supplierContact: a.supplierContact,
    status: a.status,
    createdAt: a.createdAt,
  };
}
