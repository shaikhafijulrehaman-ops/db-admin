import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';

// Import Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Import Pages
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import ClassManagement from './pages/admin/ClassManagement';
import TeacherManagement from './pages/admin/TeacherManagement';
import AttendanceDashboard from './pages/admin/AttendanceDashboard';
import NoticeBoard from './pages/admin/NoticeBoard';
import ExamManagement from './pages/admin/ExamManagement';

// Teacher Pages
import TeacherDashboard from './pages/teacher/Dashboard';

// Student Pages
import StudentDashboard from './pages/student/Dashboard';

// Route Guard: Enforce Auth and Force Password Change Redirect
const RouteGuard = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading session...</div>;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to force change password if flag is active
  if (user && user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  // Check Role authorization
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their default dashboard
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
    if (user.role === 'student') return <Navigate to="/student/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Layout wrapper for authenticated pages
const DashboardLayout = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <Header toggleSidebar={toggleSidebar} />
      <main className="main-content">
        <Routes>
          {/* Redirect root dashboard path to specific role dashboard */}
          <Route path="/" element={
            user?.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> :
            user?.role === 'teacher' ? <Navigate to="/teacher/dashboard" replace /> :
            <Navigate to="/student/dashboard" replace />
          } />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<RouteGuard allowedRoles={['admin']}><AdminDashboard /></RouteGuard>} />
          <Route path="/admin/attendance" element={<RouteGuard allowedRoles={['admin']}><AttendanceDashboard /></RouteGuard>} />
          <Route path="/admin/classes" element={<RouteGuard allowedRoles={['admin']}><ClassManagement /></RouteGuard>} />
          <Route path="/admin/teachers" element={<RouteGuard allowedRoles={['admin']}><TeacherManagement /></RouteGuard>} />
          <Route path="/admin/exams" element={<RouteGuard allowedRoles={['admin']}><ExamManagement /></RouteGuard>} />
          <Route path="/admin/notices" element={<RouteGuard allowedRoles={['admin']}><NoticeBoard /></RouteGuard>} />

          {/* Teacher Routes */}
          <Route path="/teacher/dashboard" element={<RouteGuard allowedRoles={['teacher']}><TeacherDashboard /></RouteGuard>} />

          {/* Student Routes */}
          <Route path="/student/dashboard" element={<RouteGuard allowedRoles={['student']}><StudentDashboard /></RouteGuard>} />

          {/* Profile password change inside dashboard */}
          <Route path="/change-password" element={
            <RouteGuard>
               <ChangePassword />
            </RouteGuard>
          } />

          {/* Catch-all dashboard redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

// Root App Switcher
const AppContent = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading School ERP...</div>;
  }

  return (
    <Routes>
      {/* Public Login Route */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? (
            user.mustChangePassword ? (
              <Navigate to="/change-password" replace />
            ) : user.role === 'admin' ? (
              <Navigate to="/admin/dashboard" replace />
            ) : user.role === 'teacher' ? (
              <Navigate to="/teacher/dashboard" replace />
            ) : (
              <Navigate to="/student/dashboard" replace />
            )
          ) : (
            <Login />
          )
        } 
      />

      {/* Force Change Password Route (isolated from dashboard layout if first login) */}
      <Route 
        path="/change-password" 
        element={
          isAuthenticated && user.mustChangePassword ? (
            <ChangePassword />
          ) : isAuthenticated ? (
            // If they are authenticated but don't need force change, render inside dashboard layout
            <Navigate to="/change-password-dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />

      {/* Authenticated Dashboard Routes */}
      <Route 
        path="*" 
        element={
          isAuthenticated ? (
            user.mustChangePassword ? (
              <Navigate to="/change-password" replace />
            ) : (
              <DashboardLayout />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />

      {/* Fallback route inside dashboard layout when path doesn't require forced password change */}
      <Route 
        path="/change-password-dashboard/*" 
        element={
          isAuthenticated ? (
            <DashboardLayout />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <Router>
            <AppContent />
          </Router>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
