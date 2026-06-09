import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Lock, CheckCircle2 } from 'lucide-react';

const ChangePassword = () => {
  const { user, updatePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Field Validations
    if (!user.mustChangePassword && !currentPassword) {
      setError('Please enter your current password.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match. Please verify.');
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(currentPassword, newPassword);
      setSuccess('Password updated successfully!');
      
      // Auto redirect to dashboard after 2 seconds
      setTimeout(() => {
        if (user.role === 'admin') navigate('/admin/dashboard');
        else if (user.role === 'teacher') navigate('/teacher/dashboard');
        else if (user.role === 'student') navigate('/student/dashboard');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to update password. Verify your current password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        minHeight: user.mustChangePassword ? '100vh' : 'calc(100vh - var(--header-height) - 4rem)',
        background: user.mustChangePassword ? 'linear-gradient(135deg, #e0e7ff 0%, #f1f5f9 100%)' : 'transparent',
      }}
    >
      <div 
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div 
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              backgroundColor: 'rgba(79, 70, 229, 0.08)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto'
            }}
          >
            <KeyRound size={26} />
          </div>
          <h2 style={{ fontSize: '1.25rem' }}>Change Account Password</h2>
          {user.mustChangePassword ? (
            <p style={{ color: 'var(--warning)', fontSize: '0.8rem', fontWeight: 500, marginTop: '0.5rem' }}>
              ⚠️ First Login: You are required to change your initial password to secure your account.
            </p>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Update your account password regularly to maintain security.
            </p>
          )}
        </div>

        {error && (
          <div 
            style={{
              backgroundColor: 'var(--danger-light)',
              color: '#991b1b',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: '0.8rem',
              fontWeight: 500,
              marginBottom: '1.5rem',
              border: '1px solid rgba(239, 68, 68, 0.1)'
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div 
            style={{
              backgroundColor: 'var(--success-light)',
              color: '#065f46',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: '0.8rem',
              fontWeight: 500,
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: '1px solid rgba(16, 185, 129, 0.1)'
            }}
          >
            <CheckCircle2 size={16} />
            <span>{success} Redirecting to dashboard...</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Current Password Field (Only if not first login force-change) */}
          {!user.mustChangePassword && (
            <div className="form-group">
              <label className="form-label" htmlFor="currentPassword">Current Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  id="currentPassword"
                  className="form-control"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={submitting || success}
                />
              </div>
            </div>
          )}

          {/* New Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="newPassword">New Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Lock size={16} />
              </span>
              <input
                type="password"
                id="newPassword"
                className="form-control"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={submitting || success}
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label" htmlFor="confirmPassword">Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Lock size={16} />
              </span>
              <input
                type="password"
                id="confirmPassword"
                className="form-control"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting || success}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={submitting || success}
            style={{ padding: '0.75rem 1rem' }}
          >
            {submitting ? 'Updating...' : 'Save Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
