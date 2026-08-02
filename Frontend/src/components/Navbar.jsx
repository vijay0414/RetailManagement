import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PackagePlus, Warehouse, RefreshCw,
  Receipt, ShoppingCart, Menu, X, Bell, LogOut, User, Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const MANAGER_LINKS = [
  { to: '/manager',          label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/manager/products', label: 'Add Product',   icon: PackagePlus     },
  { to: '/manager/inventory',label: 'Inventory',     icon: Warehouse       },
  { to: '/manager/reorder',  label: 'Reorder',       icon: RefreshCw       },
  { to: '/manager/billers',  label: 'Manage Billers',icon: Users           },
];

const BILLER_LINKS = [
  { to: '/biller', label: 'Billing Counter', icon: Receipt },
];

export default function Navbar() {
  const { currentUser, logout, stockAlerts, products } = useApp();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!currentUser) return null;

  const links    = currentUser.role === 'manager' ? MANAGER_LINKS : BILLER_LINKS;
  const lowCount = products.filter((p) => p.stock < p.reorderThreshold).length;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <header className="navbar-header">
        <div className="navbar-brand">
          <ShoppingCart size={20} />
          <span>StockSense</span>
        </div>

        <nav className="navbar-links">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/manager' || to === '/biller'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={15} />{label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar-actions">
          {currentUser.role === 'manager' && stockAlerts.length > 0 && (
            <NavLink to="/manager" className="alert-badge" title="Stock alerts pending">
              <Bell size={16} />
              <span className="badge-count">{stockAlerts.length}</span>
            </NavLink>
          )}
          {currentUser.role === 'manager' && lowCount > 0 && (
            <NavLink to="/manager/inventory" className="low-badge" title="Low stock items">
              <Warehouse size={16} />
              <span className="badge-count">{lowCount}</span>
            </NavLink>
          )}
          <div className="user-chip">
            <User size={14} />
            <span>{currentUser.name}</span>
            <span className={`role-tag role-${currentUser.role}`}>{currentUser.role}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={16} />
            <span className="logout-label">Logout</span>
          </button>
          <button className="hamburger" onClick={() => setMobileOpen((o) => !o)} aria-label="Toggle menu">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {mobileOpen && (
        <nav className="mobile-drawer">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/manager' || to === '/biller'}
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}>
              <Icon size={17} />{label}
            </NavLink>
          ))}
          <button className="mobile-nav-link text-red" onClick={handleLogout}>
            <LogOut size={17} /> Logout
          </button>
        </nav>
      )}
    </>
  );
}
