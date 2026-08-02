import { useNavigate } from 'react-router-dom';
import {
  Package, AlertTriangle, Receipt, Truck,
  TrendingUp, ChevronRight, RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import StockAlertModal from '../components/StockAlertModal';

function StatCard({ icon: Icon, label, value, sub, color, onClick }) {
  return (
    <button className={`stat-card stat-card--${color} ${onClick ? 'stat-card--clickable' : ''}`} onClick={onClick}>
      <div className="stat-icon"><Icon size={24} /></div>
      <div className="stat-body">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {sub && <p className="stat-sub">{sub}</p>}
      </div>
      {onClick && <ChevronRight size={16} className="stat-chevron" />}
    </button>
  );
}

export default function ManagerDashboard() {
  const { products, bills, suppliers, todaysBills } = useApp();
  const navigate = useNavigate();

  const lowStockItems  = products.filter((p) => p.stock < p.reorderThreshold);
  const todayList      = todaysBills();
  const todayRevenue   = todayList.reduce((s, b) => s + b.total, 0);
  const totalValue     = products.reduce((s, p) => s + p.price * p.stock, 0);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Manager Dashboard</h1>
        <p className="page-subtitle">Store overview for today</p>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        <StatCard icon={Package}      label="Total Products"  value={products.length}
          sub={`${[...new Set(products.map(p=>p.category))].length} categories`}
          color="blue"   onClick={() => navigate('/manager/inventory')} />
        <StatCard icon={AlertTriangle} label="Low Stock Items" value={lowStockItems.length}
          sub="Below reorder threshold"
          color="red"    onClick={() => navigate('/manager/reorder')} />
        <StatCard icon={Receipt}       label="Today's Bills"   value={todayList.length}
          sub={todayList.length ? `₹${todayRevenue.toLocaleString()} revenue` : 'No bills yet'}
          color="green" />
        <StatCard icon={Truck}         label="Suppliers"       value={suppliers.length}
          color="purple" />
      </div>

      {/* Alert strip */}
      {lowStockItems.length > 0 && (
        <div className="alert-strip">
          <AlertTriangle size={16} className="alert-strip-icon" />
          <span>
            <strong>{lowStockItems.length} product{lowStockItems.length > 1 ? 's' : ''}</strong>{' '}
            below reorder level — {lowStockItems.map(p => p.name).join(', ')}
          </span>
          <button className="alert-strip-btn" onClick={() => navigate('/manager/reorder')}>
            Reorder <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* Inventory value bar */}
      <div className="card value-bar">
        <TrendingUp size={18} />
        <span>Total inventory value at current prices:</span>
        <strong>₹{totalValue.toLocaleString()}</strong>
      </div>

      {/* Bottom grid: recent bills + low stock */}
      <div className="dashboard-bottom">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title"><Receipt size={15}/> Recent Bills</h2>
          </div>
          {bills.length === 0 ? <p className="empty-msg">No bills yet.</p> : (
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr>
                  <th>Invoice</th><th>Date</th><th>Biller</th>
                  <th>Items</th><th className="text-right">Total</th>
                </tr></thead>
                <tbody>
                  {bills.slice(0, 6).map(b => (
                    <tr key={b.invoiceNo}>
                      <td className="mono">{b.invoiceNo}</td>
                      <td className="text-sm">{b.date}</td>
                      <td>{b.billerName || '—'}</td>
                      <td>{b.items.length}</td>
                      <td className="text-right font-semibold">₹{b.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title"><AlertTriangle size={15}/> Low Stock</h2>
            <button className="link-btn" onClick={() => navigate('/manager/reorder')}>
              <RefreshCw size={13}/> Reorder
            </button>
          </div>
          {lowStockItems.length === 0
            ? <p className="empty-msg success-msg">All products are well-stocked.</p>
            : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead><tr><th>Product</th><th>Stock</th><th>Supplier</th></tr></thead>
                  <tbody>
                    {lowStockItems.map(p => (
                      <tr key={p.id} className="row-low-stock">
                        <td>{p.name}</td>
                        <td><span className="badge badge-red">{p.stock} left</span></td>
                        <td className="text-muted">{p.supplierName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      </div>

      {/* Stock Alert Modal — only visible on Manager's screen */}
      <StockAlertModal />
    </div>
  );
}
