import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar        from './components/Navbar';
import ToastContainer from './components/Toast';

import Login           from './pages/Login';
import AccessDenied    from './pages/AccessDenied';
import ManagerDashboard from './pages/ManagerDashboard';
import AddProduct      from './pages/AddProduct';
import Inventory       from './pages/Inventory';
import ReorderPage     from './pages/ReorderPage';
import BillingScreen   from './pages/BillingScreen';

import './App.css';

function AppRoutes() {
  const { currentUser } = useApp();

  return (
    <>
      <Navbar />
      <main className={`main-content${!currentUser ? ' main-content--full' : ''}`}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/access-denied" element={<AccessDenied />} />

          {/* Manager-only */}
          <Route path="/manager" element={
            <ProtectedRoute allowedRoles={['manager']}><ManagerDashboard /></ProtectedRoute>
          }/>
          <Route path="/manager/products" element={
            <ProtectedRoute allowedRoles={['manager']}><AddProduct /></ProtectedRoute>
          }/>
          <Route path="/manager/inventory" element={
            <ProtectedRoute allowedRoles={['manager']}><Inventory /></ProtectedRoute>
          }/>
          <Route path="/manager/reorder" element={
            <ProtectedRoute allowedRoles={['manager']}><ReorderPage /></ProtectedRoute>
          }/>

          {/* Biller-only */}
          <Route path="/biller" element={
            <ProtectedRoute allowedRoles={['biller']}><BillingScreen /></ProtectedRoute>
          }/>

          {/* Default redirect */}
          <Route path="/" element={
            currentUser
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
