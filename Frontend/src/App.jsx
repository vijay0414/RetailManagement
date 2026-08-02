import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import ProtectedRoute   from './components/ProtectedRoute';
import Navbar           from './components/Navbar';
import ToastContainer   from './components/Toast';
import Login            from './pages/Login';
import AccessDenied     from './pages/AccessDenied';
import ManagerDashboard from './pages/ManagerDashboard';
import AddProduct       from './pages/AddProduct';
import Inventory        from './pages/Inventory';
import ReorderPage      from './pages/ReorderPage';
import BillingScreen    from './pages/BillingScreen';
import ManageBillers    from './pages/ManageBillers';

import './App.css';

function AppRoutes() {
  const { currentUser, authLoading } = useApp();

  // While checking the stored token, show a minimal non-blocking indicator
  // only on protected routes — the login page renders immediately regardless.
  // ProtectedRoute will redirect to /login as soon as authLoading is false.
  // We render routes immediately so unauthenticated users land on /login
  // without a delay; ProtectedRoute gates access until the check resolves.

  return (
    <>
      <Navbar />
      <main className={`main-content${!currentUser ? ' main-content--full' : ''}`}>
        <Routes>
          {/* Public — always accessible */}
          <Route path="/login"         element={<Login />} />
          <Route path="/access-denied" element={<AccessDenied />} />

          {/* Manager-only */}
          <Route path="/manager" element={
            <ProtectedRoute allowedRoles={['manager']} authLoading={authLoading}>
              <ManagerDashboard />
            </ProtectedRoute>
          }/>
          <Route path="/manager/products" element={
            <ProtectedRoute allowedRoles={['manager']} authLoading={authLoading}>
              <AddProduct />
            </ProtectedRoute>
          }/>
          <Route path="/manager/inventory" element={
            <ProtectedRoute allowedRoles={['manager']} authLoading={authLoading}>
              <Inventory />
            </ProtectedRoute>
          }/>
          <Route path="/manager/reorder" element={
            <ProtectedRoute allowedRoles={['manager']} authLoading={authLoading}>
              <ReorderPage />
            </ProtectedRoute>
          }/>
          <Route path="/manager/billers" element={
            <ProtectedRoute allowedRoles={['manager']} authLoading={authLoading}>
              <ManageBillers />
            </ProtectedRoute>
          }/>

          {/* Biller-only */}
          <Route path="/biller" element={
            <ProtectedRoute allowedRoles={['biller']} authLoading={authLoading}>
              <BillingScreen />
            </ProtectedRoute>
          }/>

          {/* Root — redirect based on auth state */}
          <Route path="/" element={
            authLoading
              ? null   // stay put while checking; ProtectedRoute handles the rest
              : currentUser
                ? <Navigate to={currentUser.role === 'manager' ? '/manager' : '/biller'} replace />
                : <Navigate to="/login" replace />
          }/>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="app-root">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
