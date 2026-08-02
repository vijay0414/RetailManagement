import { Package, AlertTriangle, Receipt, TrendingUp, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className={`stat-card stat-card--${color}`}>
      <div className="stat-icon">
        <Icon size={26} />
      </div>
      <div className="stat-body">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {sub && <p className="stat-sub">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard({ onNavigate }) {
  const { products, bills } = useApp();

  const lowStockItems = products.filter((p) => p.stock < p.reorderThreshold);
  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);

  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const todaysBills = bills.filter((b) => b.invoiceNo.includes(todayStr));
  const todaysRevenue = todaysBills.reduce((s, b) => s + b.total, 0);

  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back — here's what's happening in your store today.</p>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="stats-grid">
        <StatCard
          icon={Package}
          label="Total Products"
          value={products.length}
          color="blue"
          sub={`${categories.length} categories`}
        />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock Items"
          value={lowStockItems.length}
          color="red"
          sub="Below reorder threshold"
        />
        <StatCard
          icon={Receipt}
          label="Today's Bills"
          value={todaysBills.length}
          color="green"
          sub={todaysBills.length ? `₹${todaysRevenue.toLocaleString()} revenue` : 'No bills yet'}
        />
        <StatCard
          icon={TrendingUp}
          label="Inventory Value"
          value={`₹${totalValue.toLocaleString()}`}
          color="purple"
          sub="At current prices"
        />
      </div>

      {/* ── Low stock alert strip ────────────────────────────────────────── */}
      {lowStockItems.length > 0 && (
        <div className="alert-strip">
          <AlertTriangle size={18} className="alert-strip-icon" />
          <span>
            <strong>{lowStockItems.length} product{lowStockItems.length > 1 ? 's' : ''}</strong>
            {' '}below reorder threshold:{' '}
            {lowStockItems.map((p) => p.name).join(', ')}
          </span>
          <button className="alert-strip-btn" onClick={() => onNavigate('inventory')}>
            View Inventory <ChevronRight size={14} />
          </button>
        </div>
      )}

      <div className="dashboard-bottom">
        {/* ── Recent bills ────────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Bills</h2>
            <button className="link-btn" onClick={() => onNavigate('billing')}>
              New Bill
            </button>
          </div>
          {bills.length === 0 ? (
            <p className="empty-msg">No bills yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {bills.slice(0, 5).map((b) => (
                  <tr key={b.invoiceNo}>
                    <td className="mono">{b.invoiceNo}</td>
                    <td>{b.date}</td>
                    <td>{b.items.length}</td>
                    <td className="text-right font-semibold">₹{b.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Low stock table ──────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Low Stock Summary</h2>
            <button className="link-btn" onClick={() => onNavigate('inventory')}>
              View All
            </button>
          </div>
          {lowStockItems.length === 0 ? (
            <p className="empty-msg success-msg">All products are well-stocked.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Supplier</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>
                      <span className="badge badge-red">{p.stock} left</span>
                    </td>
                    <td className="text-muted">{p.supplierName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
