import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import Modal from '../../components/Modal';
import { Plus, Edit2, Trash2, Key, Search } from 'lucide-react';

const StudentManagement = () => {
  const { apiRequest } = useAuth();
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();
  
  // Data States
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Form States
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    gender: 'Male',
    dob: '',
    parentName: '',
    parentMobile: '',
    classId: '',
    password: ''
  });
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const studentRes = await apiRequest('/admin/students');
      const classRes = await apiRequest('/admin/classes');
      
      if (studentRes.success) setStudents(studentRes.students);
      if (classRes.success) setClasses(classRes.classes);
    } catch (err) {
      setError('Error loading student listings or classes.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateOpen = () => {
    setSelectedStudent(null);
    setFormData({
      name: '',
      rollNumber: '',
      gender: 'Male',
      dob: '',
      parentName: '',
      parentMobile: '',
      classId: classes.length > 0 ? classes[0]._id : '',
      password: ''
    });
    setFormError('');
    setIsStudentModalOpen(true);
  };

  const handleEditOpen = (student) => {
    setSelectedStudent(student);
    setFormData({
      name: student.user ? student.user.name : '',
      rollNumber: student.rollNumber,
      gender: student.gender,
      dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : '',
      parentName: student.parentName,
      parentMobile: student.parentMobile,
      classId: student.class ? student.class._id : '',
      password: 'dummy-password' // Dummy, not sent
    });
    setFormError('');
    setIsStudentModalOpen(true);
  };

  const handleResetOpen = (student) => {
    setSelectedStudent(student);
    setResetPasswordVal('');
    setFormError('');
    setIsResetModalOpen(true);
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const { name, rollNumber, gender, dob, parentName, parentMobile, classId, password } = formData;

    if (!name || !rollNumber || !gender || !dob || !parentName || !parentMobile || !classId || (!selectedStudent && !password)) {
      setFormError('Please fill in all student details.');
      return;
    }

    try {
      let response;
      if (selectedStudent) {
        // Edit mode (excludes rollNumber and password)
        response = await apiRequest(`/admin/students/${selectedStudent._id}`, {
          method: 'PUT',
          body: JSON.stringify({ name, gender, dob, parentName, parentMobile, classId })
        });
      } else {
        // Create mode
        response = await apiRequest('/admin/students', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }

      if (response.success) {
        setIsStudentModalOpen(false);
        showSuccess(selectedStudent ? 'Student updated successfully!' : 'Student registered successfully!');
        fetchData();
      }
    } catch (err) {
      setFormError(err.message || 'Error saving student profile details.');
      showError(err.message || 'Failed to save student profile.');
    }
  };

  const handleStudentDelete = async (id, name) => {
    const confirmed = await confirm({
      title: 'Delete Student',
      message: `Are you sure you want to delete student ${name}? This will remove their profile and login credentials.`,
      danger: true
    });
    if (!confirmed) {
      return;
    }
    try {
      const response = await apiRequest(`/admin/students/${id}`, { method: 'DELETE' });
      if (response.success) {
        showSuccess('Student deleted successfully!');
        fetchData();
      }
    } catch (err) {
      showError(err.message || 'Error deleting student profile.');
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
      const response = await apiRequest(`/admin/users/${selectedStudent.user._id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: resetPasswordVal })
      });

      if (response.success) {
        setIsResetModalOpen(false);
        showSuccess('Password reset successfully! The student will be prompted to change it upon their next login.');
      }
    } catch (err) {
      setFormError(err.message || 'Error resetting password.');
      showError(err.message || 'Failed to reset password.');
    }
  };

  // Filter students based on search query
  const filteredStudents = students.filter(s => {
    const name = s.user ? s.user.name.toLowerCase() : '';
    const roll = s.rollNumber.toLowerCase();
    const className = s.class ? `${s.class.className}-${s.class.section}`.toLowerCase() : '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || roll.includes(query) || className.includes(query);
  });

  return (
    <div>
      {/* Header and Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Student Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Add new students, assign classes, update details, and reset passwords.</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateOpen} disabled={classes.length === 0}>
          <Plus size={16} />
          <span>Register Student</span>
        </button>
      </div>

      {classes.length === 0 && (
        <div style={{ backgroundColor: 'var(--warning-light)', color: '#92400e', padding: '1rem', borderRadius: 'var(--border-radius)', marginBottom: '1.5rem', border: '1px solid rgba(245, 158, 11, 0.15)', fontSize: '0.85rem' }}>
          ⚠️ <strong>Notice:</strong> Please create at least one Class in the "Classes & Subjects" page before registering students.
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '1rem', borderRadius: 'var(--border-radius)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Search Filter Card */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#ffffff' }}>
        <Search size={18} style={{ color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          placeholder="Search students by name, roll number, or class (e.g. 6-A)..." 
          className="form-control"
          style={{ border: 'none', padding: 0 }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Students Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading Students...</div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Roll Number</th>
                <th>Class</th>
                <th>Gender</th>
                <th>Date of Birth</th>
                <th>Parent/Guardian</th>
                <th>Parent Mobile</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No students registered matching search filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 600 }}>{s.user ? s.user.name : 'Unknown'}</td>
                    <td style={{ fontWeight: 500 }}>{s.rollNumber}</td>
                    <td>
                      {s.class ? (
                        <span className="badge badge-info" style={{ fontWeight: 600 }}>
                          Class {s.class.className}-{s.class.section}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>Unassigned</span>
                      )}
                    </td>
                    <td>{s.gender}</td>
                    <td>{s.dob ? new Date(s.dob).toLocaleDateString() : ''}</td>
                    <td>{s.parentName}</td>
                    <td>{s.parentMobile}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleResetOpen(s)}
                          style={{ padding: '0.35rem', color: 'var(--accent)' }}
                          title="Reset Password"
                        >
                          <Key size={14} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleEditOpen(s)}
                          style={{ padding: '0.35rem' }}
                          title="Edit Student"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleStudentDelete(s._id, s.user ? s.user.name : '')}
                          style={{ padding: '0.35rem' }}
                          title="Delete Student"
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

      {/* CREATE/EDIT STUDENT MODAL */}
      <Modal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        title={selectedStudent ? 'Edit Student Details' : 'Register New Student'}
      >
        {formError && (
          <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleStudentSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              name="name" 
              className="form-control" 
              placeholder="e.g. Bob Smith"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Roll Number</label>
              <input 
                type="text" 
                name="rollNumber" 
                className="form-control" 
                placeholder="e.g. S101"
                value={formData.rollNumber}
                onChange={handleInputChange}
                disabled={!!selectedStudent} // Cannot change Roll Number
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Class</label>
              <select 
                name="classId" 
                className="form-control"
                value={formData.classId}
                onChange={handleInputChange}
                required
              >
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    Class {c.className}-{c.section}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
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
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input 
                type="date" 
                name="dob" 
                className="form-control" 
                value={formData.dob}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Parent/Guardian Name</label>
              <input 
                type="text" 
                name="parentName" 
                className="form-control" 
                placeholder="e.g. David Smith"
                value={formData.parentName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Parent Mobile Number</label>
              <input 
                type="tel" 
                name="parentMobile" 
                className="form-control" 
                placeholder="e.g. 9876543211"
                value={formData.parentMobile}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          {/* Password field only shown on Create */}
          {!selectedStudent && (
            <div className="form-group">
              <label className="form-label">Initial Password</label>
              <input 
                type="password" 
                name="password" 
                className="form-control" 
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>
          )}

          <div className="modal-footer" style={{ margin: '0 -1.5rem -1.5rem -1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsStudentModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Student</button>
          </div>
        </form>
      </Modal>

      {/* RESET PASSWORD MODAL */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title={selectedStudent ? `Reset Password for ${selectedStudent.user ? selectedStudent.user.name : ''}` : 'Reset Password'}
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
              placeholder="Minimum 6 characters"
              value={resetPasswordVal}
              onChange={(e) => setResetPasswordVal(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
              The student will be forced to change this password immediately on their next login attempt.
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

export default StudentManagement;
