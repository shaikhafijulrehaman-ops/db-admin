import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Send, CheckCircle2, ArrowLeft } from 'lucide-react';

const AssignDailyWork = () => {
  const { apiRequest } = useAuth();
  const navigate = useNavigate();

  // Date State (default to current local date)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Data States
  const [classInfo, setClassInfo] = useState(null);
  const [entries, setEntries] = useState({}); // subjectName -> workDetails
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
        
        // Fetch existing daily work for this specific date
        await fetchDailyWorkForDate(date, response.classInfo.subjects);
      }
    } catch (err) {
      setError(err.message || 'Error loading class subjects.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyWorkForDate = async (targetDate, subjects) => {
    try {
      const response = await apiRequest(`/teacher/daily-work/${targetDate}`);
      if (response.success && response.work) {
        // Map existing work entries
        const map = {};
        response.work.entries.forEach((ent) => {
          map[ent.subject] = ent.workDetails;
        });
        
        // Fill any subjects missing in the database records
        subjects.forEach((sub) => {
          if (!map[sub]) {
            map[sub] = 'None';
          }
        });
        setEntries(map);
      } else {
        // Pre-populate with 'None' by default as required (no empty entries)
        const defaultMap = {};
        subjects.forEach((sub) => {
          defaultMap[sub] = 'None';
        });
        setEntries(defaultMap);
      }
    } catch (err) {
      console.error('Error fetching daily work:', err);
    }
  };

  useEffect(() => {
    fetchClassData();
  }, []);

  const handleDateChange = async (newDate) => {
    setDate(newDate);
    if (classInfo && classInfo.subjects) {
      setLoading(true);
      await fetchDailyWorkForDate(newDate, classInfo.subjects);
      setLoading(false);
    }
  };

  const handleWorkDetailsChange = (subject, val) => {
    setEntries((prev) => ({
      ...prev,
      [subject]: val
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    // Validations: verify no empty fields and entries represent either details or 'None'
    const formattedEntries = Object.keys(entries).map((subject) => ({
      subject,
      workDetails: entries[subject]
    }));

    for (const entry of formattedEntries) {
      if (!entry.workDetails.trim()) {
        setError(`Please fill in work details for '${entry.subject}'. Enter 'None' if no work is assigned.`);
        setSaving(false);
        return;
      }
    }

    try {
      const response = await apiRequest('/teacher/daily-work', {
        method: 'POST',
        body: JSON.stringify({ date, entries: formattedEntries })
      });

      if (response.success) {
        setSuccess('Daily work assigned and students notified!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      }
    } catch (err) {
      setError(err.message || 'Error posting daily work.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !classInfo) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading class subjects...</div>;
  }

  if (!classInfo) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>No class assigned.</div>;
  }

  return (
    <div>
      {/* Back button & Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => navigate('/teacher/dashboard')}
          className="btn btn-secondary btn-sm"
          style={{ padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Assign Daily Classroom Work</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Class {classInfo.className}-{classInfo.section} • Communication & Homework entries
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

      <form onSubmit={handleSubmit}>
        {/* Date Selection Card */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', backgroundColor: '#ffffff' }}>
          <Calendar size={20} style={{ color: 'var(--primary)' }} />
          <div>
            <label className="form-label" style={{ marginBottom: 0 }}>Work Assignment Date</label>
            <input 
              type="date" 
              className="form-control" 
              style={{ padding: '0.4rem 0.75rem', width: 'auto' }}
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        {/* Subjects List Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Updating Form entries...</div>
          ) : (
            classInfo.subjects.map((subject) => (
              <div key={subject} className="card" style={{ backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--secondary)' }}>{subject}</h3>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                    onClick={() => handleWorkDetailsChange(subject, 'None')}
                    disabled={saving}
                  >
                    Clear to "None"
                  </button>
                </div>
                
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder={`Write details for ${subject} or type 'None'...`}
                  value={entries[subject] || ''}
                  onChange={(e) => handleWorkDetailsChange(subject, e.target.value)}
                  disabled={saving}
                  required
                />
              </div>
            ))
          )}
        </div>

        {/* Submit */}
        {classInfo.subjects.length > 0 && !loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ minWidth: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              disabled={saving}
            >
              <Send size={16} />
              <span>{saving ? 'Publishing...' : 'Assign & Notify Students'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default AssignDailyWork;
