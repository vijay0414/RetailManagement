/**
 * AppContext — single source of truth for:
 *  • Auth (current user, role, login/logout)
 *  • Products / inventory (shared between Manager and Biller)
 *  • Bills
 *  • Stock-alert queue  ← populated by Biller actions, consumed by Manager UI
 *  • Reorder history
 *  • Toast notifications
 *
 * NOTE FOR DEVELOPERS:
 *  In production the stock-alert queue would be driven by a backend event
 *  (e.g. WebSocket or Server-Sent Events).  Here we simulate it with shared
 *  React Context so that when a Biller deducts stock the Manager's view
 *  immediately reflects the alert — both roles share the same browser tab /
 *  Context provider in this demo.
 */

import { createContext, useContext, useState, useCallback } from 'react';

// ─── Mock credentials ────────────────────────────────────────────────────────
export const MOCK_USERS = [
  { id: 'u1', username: 'manager',  password: 'manager123',  role: 'manager', name: 'Rajesh Kumar'  },
  { id: 'u2', username: 'biller',   password: 'biller123',   role: 'biller',  name: 'Priya Sharma'  },
  { id: 'u3', username: 'manager2', password: 'mgr456',      role: 'manager', name: 'Anita Verma'   },
  { id: 'u4', username: 'biller2',  password: 'bill456',     role: 'biller',  name: 'Suresh Nair'   },
];

// ─── Seed products ───────────────────────────────────────────────────────────
const SEED_PRODUCTS = [
  { id: 1,  barcode: 'BC-100001', name: 'Basmati Rice (5kg)',      category: 'Grains & Pulses',       price: 320,  stock: 42, reorderThreshold: 5, supplierName: 'Agro Traders',        supplierContact: '9876543210' },
  { id: 2,  barcode: 'BC-100002', name: 'Sunflower Oil (1L)',       category: 'Oils & Fats',           price: 145,  stock: 28, reorderThreshold: 5, supplierName: 'Nature Fresh Supplies', supplierContact: '9123456780' },
  { id: 3,  barcode: 'BC-100003', name: 'Full Cream Milk (500ml)',  category: 'Dairy',                 price: 30,   stock: 4,  reorderThreshold: 5, supplierName: 'Dairy Direct Co.',      supplierContact: '9988776655' },
  { id: 4,  barcode: 'BC-100004', name: 'Wheat Flour (10kg)',       category: 'Grains & Pulses',       price: 410,  stock: 15, reorderThreshold: 5, supplierName: 'Agro Traders',          supplierContact: '9876543210' },
  { id: 5,  barcode: 'BC-100005', name: 'Toor Dal (1kg)',           category: 'Grains & Pulses',       price: 130,  stock: 3,  reorderThreshold: 5, supplierName: 'Pulse Hub',             supplierContact: '9001122334' },
  { id: 6,  barcode: 'BC-100006', name: 'Sugar (1kg)',              category: 'Sweeteners',            price: 48,   stock: 60, reorderThreshold: 5, supplierName: 'Sweet Supplies Ltd.',   supplierContact: '9345678901' },
  { id: 7,  barcode: 'BC-100007', name: 'Salt (1kg)',               category: 'Spices & Condiments',   price: 22,   stock: 80, reorderThreshold: 5, supplierName: 'Salt & More',           supplierContact: '9765432100' },
  { id: 8,  barcode: 'BC-100008', name: 'Green Tea (25 bags)',      category: 'Beverages',             price: 95,   stock: 2,  reorderThreshold: 5, supplierName: 'TeaLeaf Imports',       supplierContact: '9654321098' },
  { id: 9,  barcode: 'BC-100009', name: 'Biscuits Assorted (400g)', category: 'Snacks',                price: 65,   stock: 35, reorderThreshold: 5, supplierName: 'Snack World',           supplierContact: '9871234560' },
  { id: 10, barcode: 'BC-100010', name: 'Toothpaste (150g)',        category: 'Personal Care',         price: 85,   stock: 22, reorderThreshold: 5, supplierName: 'HygieneFirst',          supplierContact: '9012345678' },
];

const SEED_BILLS = [
  {
    invoiceNo: 'INV-20260801-001',
    date: '01 Aug 2026, 10:15 AM',
    billerName: 'Priya Sharma',
    items: [
      { name: 'Basmati Rice (5kg)', qty: 2, price: 320, subtotal: 640 },
      { name: 'Sunflower Oil (1L)', qty: 1, price: 145, subtotal: 145 },
    ],
    total: 785,
  },
  {
    invoiceNo: 'INV-20260801-002',
    date: '01 Aug 2026, 02:40 PM',
    billerName: 'Suresh Nair',
    items: [
      { name: 'Sugar (1kg)',    qty: 3, price: 48,  subtotal: 144 },
      { name: 'Salt (1kg)',     qty: 2, price: 22,  subtotal: 44  },
      { name: 'Toor Dal (1kg)', qty: 1, price: 130, subtotal: 130 },
    ],
    total: 318,
  },
];

// ─── Barcode generator ───────────────────────────────────────────────────────
let _barcodeSeq = 100011;
export const generateBarcode = () => `BC-${_barcodeSeq++}`;

// ─── Context ─────────────────────────────────────────────────────────────────
const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Auth
  const [currentUser, setCurrentUser] = useState(null);

  // Data
  const [products, setProducts]         = useState(SEED_PRODUCTS);
  const [bills, setBills]               = useState(SEED_BILLS);
  const [reorderHistory, setReorderHistory] = useState([]);

  // Stock-alert queue — Biller actions push here; Manager UI consumes it
  const [stockAlerts, setStockAlerts]   = useState([]);

  // Toasts
  const [toasts, setToasts]             = useState([]);

  // ── Auth ────────────────────────────────────────────────────────────────
  const login = useCallback((username, password) => {
    const user = MOCK_USERS.find(
      (u) => u.username === username.trim() && u.password === password
    );
    if (!user) return { success: false, message: 'Invalid username or password.' };
    setCurrentUser(user);
    return { success: true, user };
  }, []);

  const logout = useCallback(() => setCurrentUser(null), []);

  // ── Products ─────────────────────────────────────────────────────────────
  const addProduct = useCallback((data) => {
    const p = {
      ...data,
      id: Date.now(),
      barcode: generateBarcode(),
      stock: Number(data.stock),
      price: Number(data.price),
      reorderThreshold: Number(data.reorderThreshold) || 5,
    };
    setProducts((prev) => [p, ...prev]);
    return p;
  }, []);

  const getProductByBarcode = useCallback(
    (code) => products.find((p) => p.barcode === code.trim()) ?? null,
    [products]
  );

  /**
   * Called by BillingScreen after generating a bill.
   * Deducts stock for each cart item, then pushes any newly-low-stock
   * products onto the stockAlerts queue for the Manager to see.
   */
  const deductStockAndAlert = useCallback((cartItems) => {
    const newAlerts = [];
    setProducts((prev) => {
      const updated = prev.map((p) => {
        const item = cartItems.find((i) => i.barcode === p.barcode);
        if (!item) return p;
        const newStock = Math.max(0, p.stock - item.qty);
        if (newStock < p.reorderThreshold) {
          // Only push if not already in the queue
          newAlerts.push({ ...p, stock: newStock });
        }
        return { ...p, stock: newStock };
      });
      return updated;
    });
    // Push new alerts after state update (setTimeout gives setState time to flush)
    setTimeout(() => {
      if (newAlerts.length > 0) {
        setStockAlerts((prev) => {
          const existingBarcodes = new Set(prev.map((a) => a.barcode));
          const fresh = newAlerts.filter((a) => !existingBarcodes.has(a.barcode));
          return [...prev, ...fresh];
        });
      }
    }, 0);
  }, []);

  const dismissStockAlert = useCallback((barcode) => {
    setStockAlerts((prev) => prev.filter((a) => a.barcode !== barcode));
  }, []);

  // ── Bills ─────────────────────────────────────────────────────────────────
  const addBill = useCallback((bill) => setBills((prev) => [bill, ...prev]), []);

  const todaysBills = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return bills.filter((b) => b.invoiceNo.includes(today));
  }, [bills]);

  // ── Reorder history ───────────────────────────────────────────────────────
  const addReorder = useCallback((entry) => {
    setReorderHistory((prev) => [entry, ...prev]);
    // Also update product stock optimistically
    setProducts((prev) =>
      prev.map((p) =>
        p.barcode === entry.barcode
          ? { ...p, stock: p.stock + entry.qty }
          : p
      )
    );
  }, []);

  // ── Toasts ────────────────────────────────────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3800);
  }, []);

  const removeToast = useCallback(
    (id) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    []
  );

  const suppliers = [...new Map(products.map((p) => [p.supplierName, { name: p.supplierName, contact: p.supplierContact }])).values()];

  return (
    <AppContext.Provider
      value={{
        // auth
        currentUser, login, logout,
        // products
        products, addProduct, getProductByBarcode, deductStockAndAlert,
        // bills
        bills, addBill, todaysBills,
        // stock alerts
        stockAlerts, dismissStockAlert,
        // reorder
        reorderHistory, addReorder,
        // suppliers summary
        suppliers,
        // toasts
        toasts, showToast, removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
};
