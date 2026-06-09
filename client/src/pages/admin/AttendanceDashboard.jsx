import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Filter, Users, ClipboardX } from 'lucide-react';

const AttendanceDashboard = () => {
  const { apiRequest } = useAuth();
  
  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClassId, setSelectedClassId] = useState('');
  
  // Data
  const [absentees, setAbsentees] = useState([]);
  const [classes, setClasses] = useState([]);
  
  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFilters = async () => {
    try {
      const response = await apiRequest('/admin/classes');
      if (response.success) {
        setClasses(response.classes);
      }
    } catch (err) {
      console.error('Error fetching classes for dropdown:', err);
    }
  };

  const fetchAbsentees = async (dateStr, classId) => {
    try {
      setLoading(true);
      setError('');
      let url = `/admin/attendance/absent?date=${dateStr}`;
      if (classId) {
        url += `&classId=${classId}`;
      }
      
      const response = await apiRequest(url);
      if (response.success) {
        setAbsentees(response.records);
      }
    } catch (err) {
      setError('Failed to load absent student records.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
    fetchAbsentees(selectedDate, selectedClassId);
  }, []);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    fetchAbsentees(newDate, selectedClassId);
  };

  const handleClassChange = (e) => {
    const newClassId = e.target.value;
    setSelectedClassId(newClassId);
    fetchAbsentees(selectedDate, newClassId);
  };

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Attendance Overview Dashboard</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Track absent students across sections and grades in real-time.</p>
      </div>

      {error && (
        <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '1rem', borderRadius: 'var(--border-radius)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Filters Card */}
      <div 
        className="card" 
        style={{ 
          padding: '1.25rem 1.5rem', 
          marginBottom: '2rem', 
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '2rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <Filter size={18} />
          <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>Filter Records:</strong>
        </div>

        {/* Date Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={16} style={{ color: 'var(--primary)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Date:</span>
            <input 
              type="date" 
              className="form-control" 
              style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              value={selectedDate}
              onChange={handleDateChange}
            />
          </div>
        </div>

        {/* Class Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={16} style={{ color: 'var(--primary)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Class Section:</span>
            <select 
              className="form-control" 
              style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              value={selectedClassId}
              onChange={handleClassChange}
            >
              <option value="">-- All Classes --</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  Class {c.className}-{c.section}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Absentee Data Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Querying absent records...</div>
      ) : absentees.length === 0 ? (
        <div className="card text-center" style={{ padding: '4rem 2rem', backgroundColor: '#ffffff' }}>
          <ClipboardX size={48} style={{ color: 'var(--success)', opacity: 0.7, margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>No Absent Records Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            All students are marked Present for class {selectedClassId ? classes.find(c => c._id === selectedClassId)?.className + '-' + classes.find(c => c._id === selectedClassId)?.section : 'sections'} on {new Date(selectedDate).toLocaleDateString()}.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Class</th>
                <th>Section</th>
                <th>Class Teacher</th>
                <th>Date Marked</th>
              </tr>
            </thead>
            <tbody>
              {absentees.map((record) => (
                <tr key={record._id} style={{ backgroundColor: 'rgba(239, 68, 68, 0.01)' }}>
                  <td style={{ fontWeight: 600 }}>{record.student ? record.student.rollNumber : 'N/A'}</td>
                  <td style={{ fontWeight: 500 }}>{record.student && record.student.user ? record.student.user.name : 'Unknown Student'}</td>
                  <td>Class {record.class ? record.class.className : 'N/A'}</td>
                  <td>
                    <span className="badge badge-danger">
                      Section {record.class ? record.class.section : 'N/A'}
                    </span>
                  </td>
                  <td>
                    {record.class && record.class.classTeacher && record.class.classTeacher.user ? (
                      record.class.classTeacher.user.name
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>Unassigned</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {new Date(record.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AttendanceDashboard;
