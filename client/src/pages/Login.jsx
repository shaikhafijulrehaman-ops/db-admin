import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, ArrowRight } from 'lucide-react';
import schoolLogo from '../assets/logo.png';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password) {
      setError('Please enter both your User ID and Password.');
      return;
    }

    setSubmitting(true);
    try {
      // Authenticate with the unified API endpoint
      const loggedUser = await login(username.trim(), password);
      
      // Auto-detect role and navigate accordingly
      if (loggedUser.mustChangePassword) {
        navigate('/change-password');
      } else {
        if (loggedUser.role === 'admin') navigate('/admin/dashboard');
        else if (loggedUser.role === 'teacher') navigate('/teacher/dashboard');
        else if (loggedUser.role === 'student') navigate('/student/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid User ID or Password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e0e7ff 0%, #f1f5f9 100%)',
        padding: '1rem'
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          border: '1px solid rgba(226, 232, 240, 0.8)'
        }}
      >
        {/* Banner branding */}
        <div 
          style={{
            backgroundColor: 'var(--secondary)',
            color: '#ffffff',
            padding: '2.5rem 2rem 2rem 2rem',
            textAlign: 'center',
            position: 'relative',
            borderBottom: '4px solid var(--primary)'
          }}
        >
          {/* Circular Branding Logo */}
          <img 
            src={schoolLogo} 
            alt="Don Bosco Logo" 
            style={{ 
              width: '68px', 
              height: '68px', 
              objectFit: 'contain',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: '2px solid var(--primary-light)',
              display: 'block',
              margin: '0 auto 1.25rem auto',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)'
            }} 
          />
          <h2 style={{ color: '#ffffff', margin: 0, fontSize: '1.4rem', fontFamily: 'var(--font-heading)' }}>Don Bosco School</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.25rem', letterSpacing: '0.02em' }}>Unified ERP Portal Login</p>
        </div>

        {/* Form area */}
        <div style={{ padding: '2.25rem 2rem' }}>
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
                border: '1px solid rgba(239, 68, 68, 0.15)'
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            {/* Dummy inputs to absorb browser autofill on page load */}
            <input type="text" name="dummy_username" style={{ display: 'none' }} autoComplete="new-password" />
            <input type="password" name="dummy_password" style={{ display: 'none' }} autoComplete="new-password" />

            {/* User ID Field */}
            <div className="form-group">
              <label className="form-label" htmlFor="username" style={{ fontWeight: 600 }}>
                User ID
              </label>
              <div style={{ position: 'relative' }}>
                <span 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '12px',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                >
                  <User size={18} />
                </span>
                <input
                  type="text"
                  id="username"
                  className="form-control"
                  style={{ paddingLeft: '2.5rem', borderRadius: '8px' }}
                  placeholder="Enter User ID"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={submitting}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label" htmlFor="password" style={{ fontWeight: 600 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <span 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '12px',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                >
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  id="password"
                  className="form-control"
                  style={{ paddingLeft: '2.5rem', borderRadius: '8px' }}
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              className="btn btn-primary w-full"
              style={{ 
                padding: '0.85rem 1rem', 
                borderRadius: '8px', 
                fontSize: '0.95rem',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)'
              }}
              disabled={submitting}
            >
              <span>{submitting ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
