import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import Card from '../../components/Card';
import { 
  GraduationCap, 
  Calendar, 
  BookOpen, 
  Clock, 
  Phone, 
  User, 
  BellRing,
  FileSpreadsheet
} from 'lucide-react';

const calculateGrade = (percentage) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
};

const StudentDashboard = () => {
  const { apiRequest, user } = useAuth();
  const location = useLocation();
  
  // Date State for Daily Work log selection (default to current local date)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Data States
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState({ totalDays: 0, presentDays: 0, percentage: 100, history: [] });
  const [notices, setNotices] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dailyWork, setDailyWork] = useState([]);
  const [dailyWorkHasPost, setDailyWorkHasPost] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [loadingWork, setLoadingWork] = useState(false);
  const [error, setError] = useState('');

  const [profileExtra, setProfileExtra] = useState(null);
  const [profileExtraLoading, setProfileExtraLoading] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState('info');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['info', 'attendance', 'dailywork', 'notes', 'marks'].includes(tabParam)) {
      setActiveProfileTab(tabParam);
      const profileCard = document.getElementById('profile-cockpit-card');
      if (profileCard) {
        setTimeout(() => {
          profileCard.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } else if (!tabParam) {
      setActiveProfileTab('info');
    }
  }, [location.search]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load student profile, attendance percentages, notifications and notices
      const data = await apiRequest('/student/dashboard');
      if (data.success) {
        setProfile(data.profile);
        setAttendance(data.attendance);
        setNotifications(data.notifications);
        setNotices(data.notices);
        
        // Fetch daily work for current date
        await fetchDailyWork(selectedDate);

        // Fetch extra profile data (tabs logs, notes, marks)
        await fetchProfileExtra();
      }
    } catch (err) {
      setError('Error retrieving student dashboard information.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileExtra = async () => {
    try {
      setProfileExtraLoading(true);
      const data = await apiRequest('/student/profile-extra');
      if (data.success) {
        setProfileExtra(data);
      }
    } catch (err) {
      console.error('Error fetching student profile extra data:', err);
    } finally {
      setProfileExtraLoading(false);
    }
  };

  const fetchDailyWork = async (dateStr) => {
    try {
      setLoadingWork(true);
      const data = await apiRequest(`/student/daily-work?date=${dateStr}`);
      if (data.success) {
        setDailyWork(data.entries);
        setDailyWorkHasPost(data.hasPost);
      }
    } catch (err) {
      console.error('Error fetching student daily work:', err);
    } finally {
      setLoadingWork(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    fetchDailyWork(newDate);
  };

  const formatWorkText = (text) => {
    if (text.toLowerCase() === 'none') {
      return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No Work Assigned.</span>;
    }
    return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;
  };

  const getNoticeBadgeClass = (type) => {
    switch (type) {
      case 'Holiday Notice': return 'badge-danger';
      case 'Examination Notice': return 'badge-warning';
      case 'Event Notice': return 'badge-success';
      default: return 'badge-info';
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Student Portal Dashboard...</div>;
  }

  if (error) {
    return (
      <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '1.5rem', borderRadius: 'var(--border-radius)', margin: '1rem' }}>
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Title greeting */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Student Dashboard</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Hello {profile.classInfo ? `Class ${profile.classInfo.className}-${profile.classInfo.section}` : ''} student. Review your homework and notices.
        </p>
      </div>

      {/* Stats Cards Row */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}
      >
        <Card title="Attendance Percentage" value={`${attendance.percentage}%`} icon={FileSpreadsheet} color={attendance.percentage >= 75 ? 'success' : 'danger'} />
        <Card title="Days Attended" value={`${attendance.presentDays} / ${attendance.totalDays}`} icon={Clock} color="primary" />
        <Card title="Class Teacher" value={profile.classInfo && profile.classInfo.classTeacher && profile.classInfo.classTeacher.user ? profile.classInfo.classTeacher.user.name : 'Unassigned'} icon={User} color="info" />
        <Card title="Roll Number" value={profile.rollNumber} icon={GraduationCap} color="accent" />
      </div>

      {/* IMPORTANT NOTE FROM TEACHER ALERT */}
      {profileExtra && profileExtra.notes && profileExtra.notes.length > 0 && (
        <div 
          className="card animate-fade-in" 
          style={{ 
            backgroundColor: '#fffbeb', 
            border: '2px solid #f59e0b', 
            borderRadius: 'var(--border-radius)', 
            padding: '1.25rem 1.5rem', 
            marginBottom: '2rem', 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '1rem',
            boxShadow: 'var(--box-shadow-sm)'
          }}
        >
          <div 
            style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '50%', 
              backgroundColor: '#fef3c7', 
              color: '#d97706', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flexShrink: 0 
            }}
          >
            <BellRing size={20} />
          </div>
          <div style={{ flexGrow: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>📢 Important Note from Teacher</span>
                <span style={{ padding: '0.15rem 0.4rem', backgroundColor: '#fef3c7', color: '#b45309', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>Latest</span>
              </h4>
              <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 500 }}>
                {new Date(profileExtra.notes[0].date || profileExtra.notes[0].createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#78350f', fontWeight: 500, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
              {profileExtra.notes[0].content}
            </p>
            <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.5rem', fontWeight: 600 }}>
              &mdash; Sent by Teacher <strong>{profileExtra.notes[0].teacherName}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Grid of details: Today's Work & Notices Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* TODAY'S WORK MODULE */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#ffffff' }}>
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              paddingBottom: '0.75rem', 
              borderBottom: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={20} style={{ color: 'var(--primary)' }} />
              <span>Today's Work Log</span>
            </h3>
            
            {/* Work Date Selection */}
            <input 
              type="date" 
              className="form-control" 
              style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} 
              value={selectedDate}
              onChange={handleDateChange}
            />
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Selected Date: {new Date(selectedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            {dailyWorkHasPost ? (
              <span className="badge badge-success">Assigned</span>
            ) : (
              <span className="badge badge-danger">Not Posted</span>
            )}
          </div>

          {/* Subject list */}
          {loadingWork ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Updating Work log...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {dailyWork.map((entry) => (
                <div 
                  key={entry.subject}
                  style={{
                    padding: '0.85rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-sm)',
                    backgroundColor: '#f8fafc',
                    transition: 'var(--transition)'
                  }}
                >
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--secondary)', marginBottom: '0.25rem' }}>
                    {entry.subject}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.4 }}>
                    {formatWorkText(entry.workDetails)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NOTICE BOARD MODULE */}
        <div className="card" style={{ backgroundColor: '#ffffff' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BellRing size={18} style={{ color: 'var(--warning)' }} />
            <span>School Notice Board</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {notices.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '3rem 0' }}>
                No active announcements published.
              </p>
            ) : (
              notices.map((n) => (
                <div 
                  key={n._id} 
                  style={{ 
                    padding: '1rem', 
                    backgroundColor: '#f8fafc', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--border-radius-sm)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className={`badge ${getNoticeBadgeClass(n.type)}`} style={{ fontSize: '0.65rem' }}>{n.type}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h4 style={{ fontSize: '0.9rem', margin: '0.25rem 0', fontWeight: 600 }}>{n.title}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                    {n.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* STUDENT PROFILE CARD - REDESIGNED TABBED LAYOUT */}
      <div className="card" id="profile-cockpit-card" style={{ backgroundColor: '#ffffff', minHeight: '350px' }}>
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
            Student Profile Cockpit
          </h3>
          
          {/* Tab Selector */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
            {[
              { id: 'info', label: 'Personal Info' },
              { id: 'attendance', label: 'Attendance Summary' },
              { id: 'dailywork', label: 'Daily Work History' },
              { id: 'notes', label: 'Teacher Notes' },
              { id: 'marks', label: 'Exam Results (Marks)' }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveProfileTab(t.id)}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: activeProfileTab === t.id ? 'var(--primary)' : 'transparent',
                  color: activeProfileTab === t.id ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  boxShadow: activeProfileTab === t.id ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {t.id === 'notes' && profileExtra?.notes ? `${t.label} (${profileExtra.notes.length})` : t.label}
              </button>
            ))}
          </div>
        </div>

        {profileExtraLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Loading student profile logs and exam results...
          </div>
        ) : (
          <div style={{ fontSize: '0.85rem' }}>
            
            {/* 1. PERSONAL INFO */}
            {activeProfileTab === 'info' && (
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                  gap: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={16} style={{ color: 'var(--text-muted)' }} />
                    <strong>Full Name:</strong> <span>{user ? user.name : ''}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <GraduationCap size={16} style={{ color: 'var(--text-muted)' }} />
                    <strong>Roll Number:</strong> <span>{profile.rollNumber}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                    <strong>Date of Birth:</strong> <span>{profile.dob ? new Date(profile.dob).toLocaleDateString() : ''}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={16} style={{ color: 'var(--text-muted)' }} />
                    <strong>Parent/Guardian:</strong> <span>{profile.parentName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Phone size={16} style={{ color: 'var(--text-muted)' }} />
                    <strong>Parent Mobile:</strong> <span>{profile.parentMobile}</span>
                  </div>
                  {profile.classInfo && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <BookOpen size={16} style={{ color: 'var(--text-muted)' }} />
                      <strong>Grade Assigned:</strong> <span>Class {profile.classInfo.className}-{profile.classInfo.section}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. ATTENDANCE LOGS */}
            {activeProfileTab === 'attendance' && profileExtra && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Attendance Rate</div>
                    <strong style={{ fontSize: '1.5rem', color: attendance.percentage >= 75 ? 'var(--success)' : 'var(--danger)' }}>{profileExtra.attendance.percentage}%</strong>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Days Present</div>
                    <strong style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>{profileExtra.attendance.presentDays} / {profileExtra.attendance.totalDays} Days</strong>
                  </div>
                </div>

                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>Attendance Logs (Last 30 Entries)</h4>
                {profileExtra.attendance.history.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No attendance logs registered in the system yet.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {profileExtra.attendance.history.map(h => (
                      <div key={h._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.75rem' }}>
                        <span>{new Date(h.date).toLocaleDateString()}</span>
                        <span style={{ fontWeight: 600, color: h.status === 'Present' ? 'var(--success)' : 'var(--danger)' }}>{h.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. DAILY WORK LOGS */}
            {activeProfileTab === 'dailywork' && profileExtra && (
              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>Recent Daily Work Assignments</h4>
                {profileExtra.dailyWork.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No homework assignments recorded recently.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto' }}>
                    {profileExtra.dailyWork.map(w => (
                      <div key={w._id} style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem', color: 'var(--primary)' }}>
                          {new Date(w.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.75rem' }}>
                          {w.entries.map(ent => (
                            <div key={ent.subject} style={{ padding: '0.35rem', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                              <strong style={{ color: 'var(--secondary)' }}>{ent.subject}:</strong>
                              <span style={{ marginLeft: '0.25rem' }}>{ent.workDetails}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. TEACHER NOTES HISTORY */}
            {activeProfileTab === 'notes' && profileExtra && (
              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>Teacher Remarks & Notes</h4>
                {profileExtra.notes.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No evaluation notes recorded by your class teacher.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                    {profileExtra.notes.map(n => (
                      <div key={n._id} style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                          <span>Logged by Teacher: <strong>{n.teacherName}</strong></span>
                          <span>{new Date(n.date || n.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p style={{ margin: 0, fontWeight: 500, fontSize: '0.8rem' }}>{n.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. PUBLISHED EXAM RESULTS */}
            {activeProfileTab === 'marks' && profileExtra && (
              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>Report Card: Published Exam Marks</h4>
                {profileExtra.marks.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2.5rem' }}>No exam results have been published for you yet.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', maxHeight: '260px', overflowY: 'auto' }}>
                    {profileExtra.marks.map(res => {
                      const totalObtained = res.marks.reduce((acc, m) => acc + m.marksObtained, 0);
                      const totalMax = res.marks.reduce((acc, m) => acc + m.maxMarks, 0);
                      const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 1000) / 10 : 0;
                      
                      return (
                        <div key={res._id} style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>
                              <strong style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>{res.examName}</strong>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(res.date).toLocaleDateString()}</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem 1rem', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                              {res.marks.map(m => (
                                <div key={m.subject} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>{m.subject}:</span>
                                  <strong>{m.marksObtained} / {m.maxMarks}</strong>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.35rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                                <span>Total Score: <strong>{totalObtained} / {totalMax}</strong></span>
                                <span style={{ color: 'var(--primary)' }}>Percentage: <strong>{percentage}%</strong></span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>
                                <span>Grade: <strong>{calculateGrade(percentage)}</strong></span>
                              </div>
                            </div>

                            {res.remarks && (
                              <div style={{ padding: '0.4rem', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                <strong>Teacher Remarks:</strong> {res.remarks}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
