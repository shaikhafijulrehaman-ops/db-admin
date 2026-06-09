import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  GraduationCap, 
  ClipboardList, 
  FileText, 
  KeyRound, 
  LogOut,
  Bell,
  Award
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define navigation items based on User Roles
  const adminNav = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Attendance Overview', path: '/admin/attendance', icon: ClipboardList },
    { name: 'Classes & Subjects', path: '/admin/classes', icon: BookOpen },
    { name: 'Teacher Management', path: '/admin/teachers', icon: Users },
    { name: 'Exam Management', path: '/admin/exams', icon: Award },
    { name: 'Notice Board', path: '/admin/notices', icon: FileText },
  ];

  const teacherNav = [
    { name: 'Classroom Cockpit', path: '/teacher/dashboard', icon: LayoutDashboard },
  ];

  const studentNav = [
    { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { name: 'My Marks', path: '/student/dashboard?tab=marks', icon: Award },
  ];

  const getNavItems = () => {
    switch (user.role) {
      case 'admin': return adminNav;
      case 'teacher': return teacherNav;
      case 'student': return studentNav;
      default: return [];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 40
          }}
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`erp-sidebar sidebar-responsive ${isOpen ? 'open' : ''}`}
      >

        {/* Navigation Items */}
        <nav style={{ flexGrow: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const currentFullPath = location.pathname + location.search;
            const isItemActive = item.path.includes('?') 
              ? currentFullPath === item.path 
              : location.pathname === item.path && !location.search;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => { if (window.innerWidth <= 1024) toggleSidebar(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--border-radius-sm)',
                  color: isItemActive ? '#ffffff' : '#94a3b8',
                  backgroundColor: isItemActive ? 'var(--primary)' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'var(--transition)'
                }}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User profile / footer */}
        <div 
          style={{
            padding: '1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(0, 0, 0, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div 
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#cbd5e1',
                color: 'var(--secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              {user.name.charAt(0)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.name}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'capitalize' }}>{user.role}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <NavLink
              to="/change-password"
              onClick={() => { if (window.innerWidth <= 1024) toggleSidebar(); }}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.5rem',
                fontSize: '0.75rem',
                color: '#94a3b8',
                backgroundColor: isActive ? 'rgba(79, 70, 229, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--border-radius-sm)',
                textDecoration: 'none',
                transition: 'var(--transition)'
              })}
            >
              <KeyRound size={14} />
              <span>Change Password</span>
            </NavLink>

            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.5rem',
                fontSize: '0.75rem',
                color: '#f87171',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--border-radius-sm)',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* CSS Override for responsive desktop sidebar */}
      <style>{`
        @media (min-width: 1025px) {
          .sidebar-responsive {
            transform: translateX(0) !important;
          }
        }
      `}</style>
    </>
  );
};

export default Sidebar;
