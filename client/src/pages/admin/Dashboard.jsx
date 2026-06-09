import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  UserCheck, 
  UserX,
  BellRing,
  Activity
} from 'lucide-react';

const AdminDashboard = () => {
  const { apiRequest } = useAuth();
  const { showSuccess, showError } = useToast();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    presentStudents: 0,
    absentStudents: 0,
    todayDate: ''
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [error, setError] = useState('');

  const [monitoringData, setMonitoringData] = useState([]);
  const [monitoringLoading, setMonitoringLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/admin/stats');
      if (data.success) {
        setStats(data.stats);
        setRecentActivity(data.recentActivity);
      }
      
      const config = await apiRequest('/admin/settings');
      if (config.success) {
        setNotificationsEnabled(config.settings.attendance_notifications === 'ON');
      }

      await fetchMonitoringData();
    } catch (err) {
      setError('Failed to fetch dashboard statistics.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonitoringData = async () => {
    try {
      setMonitoringLoading(true);
      const response = await apiRequest('/admin/exams-monitoring');
      if (response.success) {
        setMonitoringData(response.monitoringData);
      }
    } catch (err) {
      console.error('Error fetching exam monitoring data:', err);
    } finally {
      setMonitoringLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleToggleChange = async () => {
    setToggleLoading(true);
    const newValue = !notificationsEnabled ? 'ON' : 'OFF';
    try {
      const response = await apiRequest('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ attendance_notifications: newValue })
      });
      if (response.success) {
        setNotificationsEnabled(!notificationsEnabled);
        showSuccess(`Attendance notifications turned ${newValue.toLowerCase()} successfully.`);
        
        // Refresh activity logs since the toggle logs an event
        const data = await apiRequest('/admin/stats');
        if (data.success) {
          setRecentActivity(data.recentActivity);
        }
      }
    } catch (err) {
      console.error(err);
      showError('Error updating notification settings.');
    } finally {
      setToggleLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Admin Panel Statistics...</div>;
  }

  return (
    <div>
      {/* Title Header and Notification Control Toggle */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Management Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            System overview and school stats for today, {new Date(stats.todayDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Global Attendance Notification Toggle */}
        <div 
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.75rem 1.25rem',
            backgroundColor: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <BellRing size={18} style={{ color: notificationsEnabled ? 'var(--primary)' : 'var(--text-muted)' }} />
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', color: 'var(--text-main)' }}>Attendance Alerts</span>
              <span style={{ fontSize: '0.65rem' }}>Absent notifications are {notificationsEnabled ? 'ON' : 'OFF'}</span>
            </div>
          </div>
          
          <label className="switch">
            <input 
              type="checkbox" 
              checked={notificationsEnabled} 
              onChange={handleToggleChange}
              disabled={toggleLoading}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '1rem', borderRadius: 'var(--border-radius)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Grid of Metric Cards */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}
      >
        <Card title="Total Students" value={stats.totalStudents} icon={GraduationCap} color="primary" />
        <Card title="Total Teachers" value={stats.totalTeachers} icon={Users} color="accent" />
        <Card title="Total Classes" value={stats.totalClasses} icon={BookOpen} color="info" />
        <Card title="Present Students" value={stats.presentStudents} icon={UserCheck} color="success" />
        <Card title="Absent Students" value={stats.absentStudents} icon={UserX} color="danger" />
      </div>

      {/* EXAM MONITORING STATUS */}
      <div className="card" style={{ padding: '1.5rem 0', overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{ padding: '0 1.5rem 1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={20} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Class-wise Exam Monitoring</h3>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="table" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th>Exam Name</th>
                <th>Class</th>
                <th>Assigned Class Teacher</th>
                <th>Marks Entry Progress</th>
                <th>Publication Status</th>
              </tr>
            </thead>
            <tbody>
              {monitoringLoading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading exam status data...
                  </td>
                </tr>
              ) : monitoringData.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No exam metrics found.
                  </td>
                </tr>
              ) : (
                monitoringData.map((mon, index) => (
                  <tr key={index}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{mon.examName}</td>
                    <td style={{ fontWeight: 500 }}>{mon.className}</td>
                    <td>{mon.teacherName}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{mon.marksCompleted}</span>
                        {mon.totalStudents > 0 && (
                          <div style={{ width: '60px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                height: '100%', 
                                width: `${Math.round((mon.enteredCount / mon.totalStudents) * 100)}%`, 
                                backgroundColor: mon.status === 'Published' ? 'var(--success)' : 'var(--primary)' 
                              }} 
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span 
                        className={`badge ${
                          mon.status === 'Published' ? 'badge-success' :
                          mon.status === 'Draft' ? 'badge-warning' : 'badge-danger'
                        }`}
                        style={{ textTransform: 'capitalize' }}
                      >
                        {mon.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Logs Section */}
      <div className="card" style={{ padding: '1.5rem 0', overflow: 'hidden' }}>
        <div style={{ padding: '0 1.5rem 1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={20} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>System Activity Logs</h3>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="table" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th>Actor</th>
                <th>Role</th>
                <th>Action</th>
                <th>Details</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No system activities recorded yet.
                  </td>
                </tr>
              ) : (
                recentActivity.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{log.user ? log.user.name : 'Unknown User'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {log.user ? log.user.username : ''}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        log.user && log.user.role === 'admin' ? 'badge-success' :
                        log.user && log.user.role === 'teacher' ? 'badge-info' : 'badge-warning'
                      }`} style={{ textTransform: 'capitalize' }}>
                        {log.user ? log.user.role : 'System'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{log.action}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '300px', wordBreak: 'break-word' }}>
                      {log.details}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
