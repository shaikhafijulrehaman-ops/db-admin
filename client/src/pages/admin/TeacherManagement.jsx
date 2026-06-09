import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import Modal from '../../components/Modal';
import { Plus, Edit2, Trash2, Key, Search } from 'lucide-react';

const TeacherManagement = () => {
  const { apiRequest } = useAuth();
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();
  
  // Data States
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  
  // Form States
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    mobileNumber: '',
    email: '',
    gender: 'Male',
    password: ''
  });
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [formError, setFormError] = useState('');

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/admin/teachers');
      if (response.success) {
        setTeachers(response.teachers);
      }
    } catch (err) {
      setError('Error loading teachers list.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateOpen = () => {
    setSelectedTeacher(null);
    setFormData({
      name: '',
      employeeId: '',
      mobileNumber: '',
      email: '',
      gender: 'Male',
      password: ''
    });
    setFormError('');
    setIsTeacherModalOpen(true);
  };

  const handleEditOpen = (teacher) => {
    setSelectedTeacher(teacher);
    setFormData({
      name: teacher.user ? teacher.user.name : '',
      employeeId: teacher.employeeId,
      mobileNumber: teacher.mobileNumber,
      email: teacher.email,
      gender: teacher.gender,
      password: 'dummy-password' // Dummy, not sent on edits
    });
    setFormError('');
    setIsTeacherModalOpen(true);
  };

  const handleResetOpen = (teacher) => {
    setSelectedTeacher(teacher);
    setResetPasswordVal('');
    setFormError('');
    setIsResetModalOpen(true);
  };

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const { name, employeeId, mobileNumber, email, gender, password } = formData;

    if (!name || !employeeId || !mobileNumber || !email || !gender || (!selectedTeacher && !password)) {
      setFormError('Please fill in all required fields.');
      return;
    }

    try {
      let response;
      if (selectedTeacher) {
        // Edit mode (excludes ID and Password)
        response = await apiRequest(`/admin/teachers/${selectedTeacher._id}`, {
          method: 'PUT',
          body: JSON.stringify({ name, mobileNumber, email, gender })
        });
      } else {
        // Create mode
        response = await apiRequest('/admin/teachers', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }

      if (response.success) {
        setIsTeacherModalOpen(false);
        showSuccess(selectedTeacher ? 'Teacher updated successfully!' : 'Teacher registered successfully!');
        fetchTeachers();
      }
    } catch (err) {
      setFormError(err.message || 'Error saving teacher details.');
      showError(err.message || 'Failed to save teacher details.');
    }
  };

  const handleTeacherDelete = async (id, name) => {
    const confirmed = await confirm({
      title: 'Delete Teacher',
      message: `Are you sure you want to delete teacher ${name}? This will delete their login credentials and unassign them from any class.`,
      danger: true
    });
    if (!confirmed) {
      return;
    }
    try {
      const response = await apiRequest(`/admin/teachers/${id}`, { method: 'DELETE' });
      if (response.success) {
        showSuccess('Teacher deleted successfully!');
        fetchTeachers();
      }
    } catch (err) {
      showError(err.message || 'Error deleting teacher profile.');
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!resetPasswordVal || resetPasswordVal.length < 6) {
      setFormError('New password must be at least 6 characters.');
      return;
    }

    try {
      const response = await apiRequest(`/admin/users/${selectedTeacher.user._id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: resetPasswordVal })
      });

      if (response.success) {
        setIsResetModalOpen(false);
        showSuccess('Password reset successfully! The teacher will be prompted to change it upon their next login.');
      }
    } catch (err) {
      setFormError(err.message || 'Error resetting password.');
      showError(err.message || 'Failed to reset password.');
    }
  };

  // Filter teachers list based on search
  const filteredTeachers = teachers.filter(t => {
    const name = t.user ? t.user.name.toLowerCase() : '';
    const id = t.employeeId.toLowerCase();
    const email = t.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || id.includes(query) || email.includes(query);
  });

  return (
    <div>
      {/* Header and Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Teacher Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Register teachers, manage contact details, and perform password resets.</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateOpen}>
          <Plus size={16} />
          <span>Register Teacher</span>
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '1rem', borderRadius: 'var(--border-radius)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#ffffff' }}>
        <Search size={18} style={{ color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          placeholder="Search teachers by name, employee ID, or email..." 
          className="form-control"
          style={{ border: 'none', padding: 0 }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Teachers list table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading Teachers...</div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Teacher Name</th>
                <th>Employee ID</th>
                <th>Email</th>
                <th>Mobile Number</th>
                <th>Gender</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No teachers registered matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t) => (
                  <tr key={t._id}>
                    <td style={{ fontWeight: 600 }}>{t.user ? t.user.name : 'Unknown'}</td>
                    <td style={{ fontWeight: 500 }}>{t.employeeId}</td>
                    <td>{t.email}</td>
                    <td>{t.mobileNumber}</td>
                    <td>{t.gender}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleResetOpen(t)}
                          style={{ padding: '0.35rem', color: 'var(--accent)' }}
                          title="Reset Password"
                        >
                          <Key size={14} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleEditOpen(t)}
                          style={{ padding: '0.35rem' }}
                          title="Edit Teacher"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleTeacherDelete(t._id, t.user ? t.user.name : '')}
                          style={{ padding: '0.35rem' }}
                          title="Delete Teacher"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE/EDIT TEACHER PROFILE MODAL */}
      <Modal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        title={selectedTeacher ? 'Edit Teacher Information' : 'Register New Teacher'}
      >
        {formError && (
          <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleTeacherSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              name="name" 
              className="form-control" 
              placeholder="Enter Teacher Name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Employee ID</label>
              <input 
                type="text" 
                name="employeeId" 
                className="form-control" 
                placeholder="Enter Employee ID"
                value={formData.employeeId}
                onChange={handleInputChange}
                disabled={!!selectedTeacher} // Cannot modify ID after creation
                autoComplete="new-password"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select 
                name="gender" 
                className="form-control"
                value={formData.gender}
                onChange={handleInputChange}
                required
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <input 
                type="tel" 
                name="mobileNumber" 
                className="form-control" 
                placeholder="Enter Mobile Number"
                value={formData.mobileNumber}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                name="email" 
                className="form-control" 
                placeholder="Enter Email Address"
                value={formData.email}
                onChange={handleInputChange}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          {/* Password field only shown on Create */}
          {!selectedTeacher && (
            <div className="form-group">
              <label className="form-label">Initial Password</label>
              <input 
                type="password" 
                name="password" 
                className="form-control" 
                placeholder="Enter Password (min 6 characters)"
                value={formData.password}
                onChange={handleInputChange}
                autoComplete="new-password"
                required
              />
            </div>
          )}

          <div className="modal-footer" style={{ margin: '0 -1.5rem -1.5rem -1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsTeacherModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Teacher</button>
          </div>
        </form>
      </Modal>

      {/* RESET PASSWORD MODAL */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title={selectedTeacher ? `Reset Password for ${selectedTeacher.user ? selectedTeacher.user.name : ''}` : 'Reset Password'}
      >
        {formError && (
          <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleResetSubmit}>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Temporary Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="Enter Password (min 6 characters)"
              value={resetPasswordVal}
              onChange={(e) => setResetPasswordVal(e.target.value)}
              autoComplete="new-password"
              required
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
              The teacher will be forced to change this password immediately on their next login attempt.
            </span>
          </div>

          <div className="modal-footer" style={{ margin: '0 -1.5rem -1.5rem -1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsResetModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Reset Password</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TeacherManagement;
