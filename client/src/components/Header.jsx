import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, Bell, CheckSquare, CalendarDays } from 'lucide-react';
import schoolLogo from '../assets/logo.png';

const Header = ({ toggleSidebar }) => {
  const { user, apiRequest } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications only for Student role
  const fetchNotifications = async () => {
    if (!user || user.role !== 'student') return;
    try {
      const data = await apiRequest('/student/dashboard');
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id) => {
    try {
      await apiRequest(`/student/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/student/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error(error);
    }
  };

  if (!user) return null;

  return (
    <header className="erp-header">
      
      {/* LEFT SECTION: Official School Branding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        
        {/* Mobile Sidebar Menu Button */}
        <button
          onClick={toggleSidebar}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            cursor: 'pointer',
            padding: '0.25rem',
            marginRight: '0.25rem'
          }}
          className="mobile-toggle-btn"
        >
          <Menu size={26} />
        </button>

        {/* Crisp School Circular Logo */}
        <img 
          src={schoolLogo} 
          alt="Don Bosco Logo" 
          style={{ 
            width: '64px', 
            height: '64px', 
            objectFit: 'contain',
            borderRadius: '50%',
            border: '2px solid var(--primary-light)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }} 
        />

        {/* Text Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.05rem', textAlign: 'left' }}>
          <h1 
            style={{ 
              fontSize: '1.25rem', 
              fontWeight: 800, 
              color: 'var(--primary)', 
              margin: 0, 
              lineHeight: 1.15,
              letterSpacing: '0.015em',
              fontFamily: 'var(--font-heading)'
            }}
          >
            DON BOSCO PUBLIC SCHOOL
          </h1>
          <span 
            style={{ 
              color: 'var(--accent)', 
              fontSize: '0.725rem', 
              fontWeight: 700, 
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              lineHeight: 1.2
            }}
          >
            AFFILIATED TO CBSE, NEW DELHI
          </span>
          <span 
            style={{ 
              color: 'var(--text-muted)', 
              fontSize: '0.68rem', 
              fontWeight: 500,
              lineHeight: 1.2,
              marginTop: '0.1rem'
            }}
          >
            44+ Years of Educational Excellence <span style={{ color: '#cbd5e1', margin: '0 0.25rem' }}>|</span> Guru Nanak Colony, Vijayawada - 520007, Andhra Pradesh
          </span>
        </div>
      </div>

      {/* RIGHT SECTION: Session Info, Alerts, User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        
        {/* Academic Year Badge */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            padding: '0.35rem 0.75rem',
            borderRadius: '20px',
            border: '1px solid rgba(30, 58, 138, 0.15)',
            fontSize: '0.75rem',
            fontWeight: 600
          }}
          className="academic-year-badge"
        >
          <CalendarDays size={14} />
          <span>A.Y. 2026-27</span>
        </div>

        {/* Notifications Dropdown (Only visible to students who receive attendance/daily work triggers) */}
        {user.role === 'student' && (
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                position: 'relative',
                padding: '0.5rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span 
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '18px',
                    height: '18px',
                    backgroundColor: 'var(--danger)',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #ffffff'
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {showDropdown && (
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  width: '320px',
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--border-radius)',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--border-color)',
                  marginTop: '0.5rem',
                  overflow: 'hidden',
                  zIndex: 100
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justify_content: 'space-between', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: 0, fontSize: '0.875rem' }}>Notifications</h4>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <CheckSquare size={12} />
                      Mark all read
                    </button>
                  )}
                </div>

                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No new notifications
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif._id} 
                        style={{
                          padding: '1rem',
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: notif.isRead ? 'transparent' : 'rgba(30, 58, 138, 0.03)',
                          cursor: 'pointer',
                          transition: 'var(--transition)'
                        }}
                        onClick={() => !notif.isRead && handleMarkAsRead(notif._id)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: notif.isRead ? 'var(--text-main)' : 'var(--primary)' }}>
                            {notif.title}
                          </span>
                          {!notif.isRead && (
                            <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--primary)', borderRadius: '50%' }} />
                          )}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.3 }}>
                          {notif.message}
                        </p>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block', marginTop: '0.5rem' }}>
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Card identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', paddingLeft: '0.5rem', borderLeft: '1px solid var(--border-color)' }}>
          <div 
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: '1px solid rgba(30, 58, 138, 0.15)'
            }}
          >
            {user.name.charAt(0)}
          </div>
          
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--secondary)', lineHeight: 1.2 }}>{user.name}</span>
            <span 
              className={`badge ${
                user.role === 'admin' ? 'badge-success' : 
                user.role === 'teacher' ? 'badge-info' : 'badge-warning'
              }`}
              style={{ 
                fontSize: '0.65rem', 
                padding: '0.05rem 0.35rem', 
                width: 'fit-content',
                marginTop: '0.15rem',
                textTransform: 'uppercase'
              }}
            >
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile view responsive css style patches */}
      <style>{`
        @media (max-width: 1024px) {
          .mobile-toggle-btn {
            display: block !important;
          }
          .academic-year-badge {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};

export default Header;
