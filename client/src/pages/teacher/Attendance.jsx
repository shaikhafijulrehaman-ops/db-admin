import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Calendar, UserCheck, CheckCircle2, ArrowLeft } from 'lucide-react';

const MarkAttendance = () => {
  const { apiRequest } = useAuth();
  const navigate = useNavigate();
  
  // Date State (default to current date in YYYY-MM-DD local format)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Data States
  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // studentId -> 'Present' | 'Absent'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchClassData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiRequest('/teacher/class-data');
      if (response.success) {
        setClassInfo(response.classInfo);
        setStudents(response.students);
        
        // Fetch attendance for this specific date
        await fetchAttendanceForDate(date, response.students);
      }
    } catch (err) {
      setError(err.message || 'Error loading class students.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceForDate = async (targetDate, studentList) => {
    try {
      const response = await apiRequest(`/teacher/attendance/${targetDate}`);
      if (response.success && response.records.length > 0) {
        // Map existing attendance status
        const map = {};
        response.records.forEach((rec) => {
          map[rec.student] = rec.status;
        });
        
        // Fill in any students that might not have records in the database yet
        studentList.forEach((s) => {
          if (!map[s._id]) {
            map[s._id] = 'Present'; // Default
          }
        });
        setAttendanceMap(map);
      } else {
        // Default all to Present
        const defaultMap = {};
        studentList.forEach((s) => {
          defaultMap[s._id] = 'Present';
        });
        setAttendanceMap(defaultMap);
      }
    } catch (err) {
      console.error('Error fetching attendance for date:', err);
    }
  };

  useEffect(() => {
    fetchClassData();
  }, []);

  // Fetch when date changes
  const handleDateChange = async (newDate) => {
    setDate(newDate);
    if (students.length > 0) {
      setLoading(true);
      await fetchAttendanceForDate(newDate, students);
      setLoading(false);
    }
  };

  const toggleStatus = (studentId) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present'
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    const records = Object.keys(attendanceMap).map((studentId) => ({
      studentId,
      status: attendanceMap[studentId]
    }));

    try {
      const response = await apiRequest('/teacher/attendance', {
        method: 'POST',
        body: JSON.stringify({ date, records })
      });

      if (response.success) {
        setSuccess('Attendance marked successfully!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      }
    } catch (err) {
      setError(err.message || 'Error saving attendance records.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && students.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading student lists...</div>;
  }

  if (!classInfo) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>No class assigned.</div>;
  }

  const presentCount = Object.values(attendanceMap).filter(v => v === 'Present').length;
  const absentCount = Object.values(attendanceMap).filter(v => v === 'Absent').length;

  return (
    <div>
      {/* Back navigation & header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => navigate('/teacher/dashboard')}
          className="btn btn-secondary btn-sm"
          style={{ padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Mark Student Attendance</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Class {classInfo.className}-{classInfo.section} • Manage daily presence records
          </p>
        </div>
      </div>

      {success && (
        <div style={{ backgroundColor: 'var(--success-light)', color: '#065f46', padding: '1rem', borderRadius: 'var(--border-radius)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '1rem', borderRadius: 'var(--border-radius)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Configuration Card (Date Selection & Summary) */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Calendar size={20} style={{ color: 'var(--primary)' }} />
          <div>
            <label className="form-label" style={{ marginBottom: 0 }}>Attendance Date</label>
            <input 
              type="date" 
              className="form-control" 
              style={{ padding: '0.4rem 0.75rem', width: 'auto' }}
              value={date}
              max={new Date().toISOString().split('T')[0]} // Cannot mark future attendance
              onChange={(e) => handleDateChange(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        {/* Live Counters */}
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Present</span>
            <span className="badge badge-success" style={{ fontSize: '0.9rem', padding: '0.2rem 0.8rem', marginTop: '0.25rem' }}>{presentCount}</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Absent</span>
            <span className="badge badge-danger" style={{ fontSize: '0.9rem', padding: '0.2rem 0.8rem', marginTop: '0.25rem' }}>{absentCount}</span>
          </div>
        </div>
      </div>

      {/* Students Roll Call Sheet */}
      <form onSubmit={handleSubmit}>
        <div className="table-container" style={{ marginBottom: '1.5rem' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Roll Number</th>
                <th>Student Name</th>
                <th>Gender</th>
                <th style={{ width: '200px', textAlign: 'center' }}>Attendance Status</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No students registered in this class.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const status = attendanceMap[student._id] || 'Present';
                  const isPresent = status === 'Present';
                  return (
                    <tr key={student._id}>
                      <td style={{ fontWeight: 600 }}>{student.rollNumber}</td>
                      <td style={{ fontWeight: 500 }}>{student.user ? student.user.name : ''}</td>
                      <td>{student.gender}</td>
                      <td style={{ textAlign: 'center' }}>
                        {/* Attendance Toggle Button */}
                        <button
                          type="button"
                          onClick={() => toggleStatus(student._id)}
                          disabled={saving}
                          style={{
                            padding: '0.4rem 1.25rem',
                            borderRadius: '9999px',
                            border: '1px solid',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            minWidth: '100px',
                            transition: 'var(--transition)',
                            backgroundColor: isPresent ? 'var(--success-light)' : 'var(--danger-light)',
                            borderColor: isPresent ? 'var(--success)' : 'var(--danger)',
                            color: isPresent ? '#065f46' : '#991b1b',
                          }}
                        >
                          {status}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Submit */}
        {students.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ minWidth: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              disabled={saving}
            >
              <UserCheck size={16} />
              <span>{saving ? 'Submitting...' : 'Save Attendance'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default MarkAttendance;
