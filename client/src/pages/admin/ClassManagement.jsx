import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import Modal from '../../components/Modal';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  BookMarked, 
  Save, 
  ArrowLeft, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Key, 
  ArrowRightLeft,
  Settings
} from 'lucide-react';

const ClassManagement = () => {
  const { apiRequest } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  const confirm = useConfirm();
  
  // Data States
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Detail View State
  const [activeView, setActiveView] = useState('list'); // 'list' | 'details'
  const [currentClass, setCurrentClass] = useState(null); // Full class document
  const [classStudents, setClassStudents] = useState([]); // Students in active class
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'subjects' | 'dailywork' | 'settings'
  const [dailyWorkDate, setDailyWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyWorkEntries, setDailyWorkEntries] = useState({});
  const [dailyWorkLoading, setDailyWorkLoading] = useState(false);

  // Modals Toggle States
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Active items for CRUD
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Form States
  const [classForm, setClassForm] = useState({
    className: '',
    section: '',
    classTeacher: ''
  });
  
  const [studentForm, setStudentForm] = useState({
    name: '',
    rollNumber: '',
    gender: 'Male',
    dob: '',
    parentName: '',
    parentMobile: '',
    password: ''
  });

  const [transferClassId, setTransferClassId] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  
  const [formError, setFormError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const classRes = await apiRequest('/admin/classes');
      const teacherRes = await apiRequest('/admin/teachers');
      
      if (classRes.success) setClasses(classRes.classes);
      if (teacherRes.success) setTeachers(teacherRes.teachers);
    } catch (err) {
      setError('Error loading class lists.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchClassDetails = async (classId) => {
    try {
      setDetailLoading(true);
      const data = await apiRequest(`/admin/classes/${classId}`);
      if (data.success) {
        setCurrentClass(data.classItem);
        setClassStudents(data.students);
      }
    } catch (err) {
      console.error(err);
      showError('Error fetching class details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchDailyWorkForClass = async (classId, date) => {
    if (!classId) return;
    try {
      setDailyWorkLoading(true);
      const res = await apiRequest(`/admin/classes/${classId}/daily-work/${date}`);
      if (res.success && res.work) {
        const map = {};
        res.work.entries.forEach((ent) => {
          map[ent.subject] = ent.workDetails;
        });
        setDailyWorkEntries(map);
      } else {
        setDailyWorkEntries({});
      }
    } catch (err) {
      console.error(err);
      setDailyWorkEntries({});
    } finally {
      setDailyWorkLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dailywork' && currentClass) {
      fetchDailyWorkForClass(currentClass._id, dailyWorkDate);
    }
  }, [activeTab, dailyWorkDate, currentClass?._id]);

  const handleViewDetails = (classItem) => {
    setCurrentClass(classItem);
    setActiveTab('students');
    setActiveView('details');
    fetchClassDetails(classItem._id);
  };

  const handleBackToList = () => {
    setActiveView('list');
    setCurrentClass(null);
    setClassStudents([]);
    fetchData();
  };

  // ==========================================
  // CLASS CRUD
  // ==========================================
  const handleCreateClassOpen = () => {
    setSelectedClass(null);
    setClassForm({
      className: '',
      section: '',
      classTeacher: ''
    });
    setFormError('');
    setIsClassModalOpen(true);
  };

  const handleEditClassOpen = (cItem) => {
    setSelectedClass(cItem);
    setClassForm({
      className: cItem.className,
      section: cItem.section,
      classTeacher: cItem.classTeacher ? cItem.classTeacher._id : ''
    });
    setFormError('');
    setIsClassModalOpen(true);
  };

  const handleClassSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const { className, section, classTeacher } = classForm;
    if (!className || !section) {
      setFormError('Class Name and Section are required.');
      return;
    }

    try {
      let response;
      const payload = {
        className,
        section,
        classTeacher: classTeacher || null
      };

      if (selectedClass) {
        response = await apiRequest(`/admin/classes/${selectedClass._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        response = await apiRequest('/admin/classes', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (response.success) {
        setIsClassModalOpen(false);
        showSuccess(selectedClass ? 'Class updated successfully!' : 'Class created successfully!');
        if (activeView === 'details') {
          fetchClassDetails(currentClass._id);
        } else {
          fetchData();
        }
      }
    } catch (err) {
      setFormError(err.message || 'Error processing class details.');
      showError(err.message || 'Failed to save class details.');
    }
  };

  const handleClassDelete = async (id, label) => {
    const confirmed = await confirm({
      title: 'Delete Class',
      message: `Are you sure you want to delete class ${label}? Make sure there are no students assigned.`,
      danger: true
    });
    if (!confirmed) {
      return;
    }
    try {
      const response = await apiRequest(`/admin/classes/${id}`, { method: 'DELETE' });
      if (response.success) {
        showSuccess('Class deleted successfully!');
        fetchData();
      }
    } catch (err) {
      showError(err.message || 'Error deleting class. Remove students first.');
    }
  };

  // ==========================================
  // STUDENT CRUD (INSIDE CLASS DETAILS)
  // ==========================================
  const handleCreateStudentOpen = () => {
    setSelectedStudent(null);
    setStudentForm({
      name: '',
      rollNumber: '',
      gender: 'Male',
      dob: '',
      parentName: '',
      parentMobile: '',
      password: ''
    });
    setFormError('');
    setIsStudentModalOpen(true);
  };

  const handleEditStudentOpen = (stud) => {
    setSelectedStudent(stud);
    setStudentForm({
      name: stud.user ? stud.user.name : '',
      rollNumber: stud.rollNumber,
      gender: stud.gender,
      dob: stud.dob ? new Date(stud.dob).toISOString().split('T')[0] : '',
      parentName: stud.parentName,
      parentMobile: stud.parentMobile,
      password: 'dummy-password' // Dummy value
    });
    setFormError('');
    setIsStudentModalOpen(true);
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const { name, rollNumber, gender, dob, parentName, parentMobile, password } = studentForm;
    
    if (!name || !rollNumber || !gender || !dob || !parentName || !parentMobile || (!selectedStudent && !password)) {
      setFormError('All student fields are required.');
      return;
    }

    try {
      let response;
      if (selectedStudent) {
        // Edit student
        response = await apiRequest(`/admin/students/${selectedStudent._id}`, {
          method: 'PUT',
          body: JSON.stringify({ name, gender, dob, parentName, parentMobile })
        });
      } else {
        // Create student inside currently open class
        response = await apiRequest('/admin/students', {
          method: 'POST',
          body: JSON.stringify({
            ...studentForm,
            classId: currentClass._id
          })
        });
      }

      if (response.success) {
        setIsStudentModalOpen(false);
        showSuccess(selectedStudent ? 'Student updated successfully!' : 'Student enrolled successfully!');
        fetchClassDetails(currentClass._id); // Reload list and calculated strengths
      }
    } catch (err) {
      setFormError(err.message || 'Error saving student profile.');
      showError(err.message || 'Failed to save student profile.');
    }
  };

  const handleStudentDelete = async (id, name) => {
    const confirmed = await confirm({
      title: 'Delete Student',
      message: `Are you sure you want to delete student ${name}?`,
      danger: true
    });
    if (!confirmed) {
      return;
    }
    try {
      const response = await apiRequest(`/admin/students/${id}`, { method: 'DELETE' });
      if (response.success) {
        showSuccess('Student deleted successfully!');
        fetchClassDetails(currentClass._id);
      }
    } catch (err) {
      showError(err.message || 'Error deleting student.');
    }
  };

  // ==========================================
  // STUDENT TRANSFER & PASSWORDS RESETS
  // ==========================================
  const handleTransferOpen = (stud) => {
    setSelectedStudent(stud);
    setTransferClassId('');
    setFormError('');
    setIsTransferModalOpen(true);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!transferClassId) {
      setFormError('Please select a target class.');
      return;
    }

    try {
      const response = await apiRequest(`/admin/students/${selectedStudent._id}/transfer`, {
        method: 'PUT',
        body: JSON.stringify({ targetClassId: transferClassId })
      });
      if (response.success) {
        setIsTransferModalOpen(false);
        showSuccess('Student transferred successfully!');
        fetchClassDetails(currentClass._id); // Refreshes and removes transferred student
      }
    } catch (err) {
      setFormError(err.message || 'Error transferring student.');
      showError(err.message || 'Failed to transfer student.');
    }
  };

  const handlePasswordOpen = (stud) => {
    setSelectedStudent(stud);
    setTempPassword('');
    setFormError('');
    setIsPasswordModalOpen(true);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!tempPassword || tempPassword.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    try {
      const response = await apiRequest(`/admin/users/${selectedStudent.user._id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: tempPassword })
      });
      if (response.success) {
        setIsPasswordModalOpen(false);
        showSuccess('Student password reset successfully! They must change it on next login.');
      }
    } catch (err) {
      setFormError(err.message || 'Error resetting password.');
      showError(err.message || 'Failed to reset password.');
    }
  };

  // ==========================================
  // SUBJECT MANAGEMENT
  // ==========================================
  const [newSubVal, setNewSubVal] = useState('');
  
  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubVal.trim()) return;
    
    if (currentClass.subjects.some(s => s.toLowerCase() === newSubVal.trim().toLowerCase())) {
      showWarning('Subject already exists.');
      return;
    }

    const updatedSubjects = [...currentClass.subjects, newSubVal.trim()];
    
    try {
      const response = await apiRequest(`/admin/classes/${currentClass._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          className: currentClass.className,
          section: currentClass.section,
          classTeacher: currentClass.classTeacher ? currentClass.classTeacher._id : null,
          subjects: updatedSubjects
        })
      });
      if (response.success) {
        setNewSubVal('');
        showSuccess('Subject added successfully!');
        fetchClassDetails(currentClass._id);
      }
    } catch (err) {
      showError('Error adding subject.');
    }
  };

  const handleRemoveSubject = async (subjectToRemove) => {
    const updatedSubjects = currentClass.subjects.filter(s => s !== subjectToRemove);
    try {
      const response = await apiRequest(`/admin/classes/${currentClass._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          className: currentClass.className,
          section: currentClass.section,
          classTeacher: currentClass.classTeacher ? currentClass.classTeacher._id : null,
          subjects: updatedSubjects
        })
      });
      if (response.success) {
        showSuccess('Subject removed successfully!');
        fetchClassDetails(currentClass._id);
      }
    } catch (err) {
      showError('Error removing subject.');
    }
  };

  return (
    <div>
      {activeView === 'list' ? (
        // ========================================================
        // 1. MAIN CLASSES TABLE LIST
        // ========================================================
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Class & Student ERP Overview</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Create grades, manage subject structures, and perform student management nested inside each class.
              </p>
            </div>
            <button className="btn btn-primary" onClick={handleCreateClassOpen}>
              <Plus size={16} />
              <span>Create Class</span>
            </button>
          </div>

          {error && (
            <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '1rem', borderRadius: 'var(--border-radius)', marginBottom: '1.5rem' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>Loading Classes...</div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Class Section</th>
                    <th>Class Teacher</th>
                    <th>Total Strength</th>
                    <th>Boys Count</th>
                    <th>Girls Count</th>
                    <th>Subjects Registered</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No classes created yet. Click "Create Class" to register.
                      </td>
                    </tr>
                  ) : (
                    classes.map((c) => (
                      <tr 
                        key={c._id} 
                        onClick={() => handleViewDetails(c)}
                        style={{ cursor: 'pointer', transition: 'var(--transition)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(79, 70, 229, 0.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          Class {c.className}-{c.section}
                        </td>
                        <td>
                          {c.classTeacher && c.classTeacher.user ? (
                            c.classTeacher.user.name
                          ) : (
                            <span style={{ color: 'var(--warning)', fontWeight: 500, fontSize: '0.8rem' }}>⚠️ Unassigned</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{c.totalStrength}</td>
                        <td>{c.boysStrength}</td>
                        <td>{c.girlsStrength}</td>
                        <td>
                          <span className="badge badge-info" style={{ fontWeight: 600 }}>
                            {c.subjects ? c.subjects.length : 0} Subjects
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleViewDetails(c)}
                              title="Manage Students & Subjects"
                            >
                              <span>Manage</span>
                            </button>
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => handleClassDelete(c._id, `${c.className}-${c.section}`)}
                              style={{ padding: '0.35rem' }}
                              title="Delete Class"
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
        </div>
      ) : (
        // ========================================================
        // 2. DETAILED NESTED CLASS VIEW (CLASS-CENTRIC)
        // ========================================================
        <div>
          {/* Detail View Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleBackToList} style={{ padding: '0.4rem' }}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Class {currentClass.className}-{currentClass.section} Panel</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Class Teacher: {currentClass.classTeacher && currentClass.classTeacher.user ? currentClass.classTeacher.user.name : 'Unassigned'} •
                Strength: <strong>{currentClass.totalStrength} students</strong> ({currentClass.boysStrength} Boys, {currentClass.girlsStrength} Girls)
              </p>
            </div>
          </div>

          {/* Details tab selector */}
          <div 
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '1.5rem',
              gap: '1rem'
            }}
          >
            {[
              { id: 'students', label: 'Students List', icon: GraduationCap },
              { id: 'subjects', label: 'Subjects Assigned', icon: BookOpen },
              { id: 'dailywork', label: 'Daily Work History', icon: BookMarked },
              { id: 'settings', label: 'Class Settings', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.75rem 0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                    border: 'none',
                    borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* DETAIL VIEW TAB BODY */}
          {detailLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>Updating records...</div>
          ) : (
            <div>
              
              {/* TAB 1: STUDENTS LIST */}
              {activeTab === 'students' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Active Students ({classStudents.length})</h3>
                  </div>

                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Roll Number</th>
                          <th>Student Name</th>
                          <th>Gender</th>
                          <th>Date of Birth</th>
                          <th>Parent/Guardian</th>
                          <th>Parent Mobile</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classStudents.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                              No students registered inside this class yet. Click "Add Student" to enroll.
                            </td>
                          </tr>
                        ) : (
                          classStudents.map((s) => (
                            <tr key={s._id}>
                              <td style={{ fontWeight: 600 }}>{s.rollNumber}</td>
                              <td style={{ fontWeight: 500 }}>{s.user ? s.user.name : ''}</td>
                              <td>{s.gender}</td>
                              <td>{s.dob ? new Date(s.dob).toLocaleDateString() : ''}</td>
                              <td>{s.parentName}</td>
                              <td>{s.parentMobile}</td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                  <button 
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleTransferOpen(s)}
                                    style={{ padding: '0.3rem', color: 'var(--info)' }}
                                    title="Transfer Student"
                                  >
                                    <ArrowRightLeft size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: SUBJECTS LIST */}
              {activeTab === 'subjects' && (
                <div style={{ maxWidth: '600px' }}>
                  <div className="card" style={{ backgroundColor: '#ffffff', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Assign New Subject</h3>
                    <form onSubmit={handleAddSubject} style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Enter Subject Name"
                        value={newSubVal}
                        onChange={(e) => setNewSubVal(e.target.value)}
                      />
                      <button type="submit" className="btn btn-primary">Add</button>
                    </form>
                  </div>

                  <div className="card" style={{ backgroundColor: '#ffffff' }}>
                    <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Active Curriculum Subjects</h3>
                    {currentClass.subjects.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No subjects assigned to this class.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {currentClass.subjects.map((sub) => (
                          <div 
                            key={sub}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.625rem 1rem',
                              backgroundColor: '#f8fafc',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--border-radius-sm)'
                            }}
                          >
                            <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{sub}</span>
                            <button
                              onClick={() => handleRemoveSubject(sub)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--danger)',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 500
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: CLASS SETTINGS */}
              {activeTab === 'settings' && (
                <div style={{ maxWidth: '500px' }}>
                  <div className="card" style={{ backgroundColor: '#ffffff' }}>
                    <h3 style={{ fontSize: '1.05rem', marginBottom: '1.25rem' }}>Edit Class Metadata</h3>
                    
                    <form onSubmit={handleClassSubmit}>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Class Grade</label>
                          <input 
                            type="text" 
                            className="form-control"
                            value={classForm.className}
                            onChange={(e) => setClassForm({ ...classForm, className: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Section</label>
                          <input 
                            type="text" 
                            className="form-control"
                            value={classForm.section}
                            onChange={(e) => setClassForm({ ...classForm, section: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label className="form-label">Class Teacher</label>
                        <select
                          className="form-control"
                          value={classForm.classTeacher}
                          onChange={(e) => setClassForm({ ...classForm, classTeacher: e.target.value })}
                        >
                          <option value="">-- Unassigned --</option>
                          {teachers.map((t) => (
                            <option key={t._id} value={t._id}>
                              {t.user ? t.user.name : ''} ({t.employeeId})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button type="submit" className="btn btn-primary">
                        Update Settings
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 4: DAILY WORK HISTORY */}
              {activeTab === 'dailywork' && (
                <div>
                  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', backgroundColor: '#ffffff' }}>
                    <BookMarked size={18} style={{ color: 'var(--primary)' }} />
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, marginRight: '0.5rem' }}>View Daily Work for Date:</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      style={{ width: 'auto', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                      value={dailyWorkDate}
                      onChange={(e) => setDailyWorkDate(e.target.value)}
                    />
                  </div>

                  {dailyWorkLoading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>Loading daily work...</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {currentClass.subjects && currentClass.subjects.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No subjects assigned to this class.</p>
                      ) : (
                        currentClass.subjects.map((sub) => {
                          const workDetails = dailyWorkEntries[sub] || 'None';
                          return (
                            <div key={sub} className="card" style={{ backgroundColor: '#ffffff', borderLeft: '4px solid var(--primary)' }}>
                              <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', margin: '0 0 0.5rem 0', fontWeight: 600 }}>{sub}</h4>
                              <p style={{ 
                                margin: 0, 
                                fontSize: '0.85rem', 
                                whiteSpace: 'pre-wrap', 
                                color: workDetails === 'None' ? 'var(--text-muted)' : 'var(--text-main)' 
                              }}>
                                {workDetails}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* ==========================================
          MODALS SECTION
          ========================================== */}

      {/* 1. CLASS MODAL (CREATE ONLY - EDITS IN TAB SETTINGS) */}
      <Modal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        title="Create New Grade Class"
      >
        {formError && (
          <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleClassSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Class Name</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Enter Class Name"
                value={classForm.className}
                onChange={(e) => setClassForm({ ...classForm, className: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Enter Section"
                value={classForm.section}
                onChange={(e) => setClassForm({ ...classForm, section: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Assigned Class Teacher</label>
            <select
              className="form-control"
              value={classForm.classTeacher}
              onChange={(e) => setClassForm({ ...classForm, classTeacher: e.target.value })}
            >
              <option value="">-- Unassigned --</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.user ? t.user.name : ''} ({t.employeeId})
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
              Note: Dynamic subjects English, Mathematics, Science, Social, Telugu are assigned by default.
            </span>
          </div>

          <div className="modal-footer" style={{ margin: '0 -1.5rem -1.5rem -1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsClassModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Class</button>
          </div>
        </form>
      </Modal>

      {/* 2. STUDENT NESTED MODAL (CLASS ID AUTOMATICALLY FIXED) */}
      <Modal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        title={selectedStudent ? 'Edit Student Profile' : 'Enroll Student in Class'}
      >
        {formError && (
          <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleStudentSubmit}>
          <div className="form-group">
            <label className="form-label">Student Name</label>
            <input 
              type="text" 
              className="form-control"
              placeholder="Enter Student Name"
              value={studentForm.name}
              onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Roll Number</label>
              <input 
                type="text" 
                className="form-control"
                placeholder="Enter Roll Number"
                value={studentForm.rollNumber}
                onChange={(e) => setStudentForm({ ...studentForm, rollNumber: e.target.value })}
                disabled={!!selectedStudent}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select
                className="form-control"
                value={studentForm.gender}
                onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                required
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Date of Birth</label>
            <input 
              type="date" 
              className="form-control"
              value={studentForm.dob}
              onChange={(e) => setStudentForm({ ...studentForm, dob: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Parent/Guardian Name</label>
              <input 
                type="text" 
                className="form-control"
                placeholder="Enter Parent/Guardian Name"
                value={studentForm.parentName}
                onChange={(e) => setStudentForm({ ...studentForm, parentName: e.target.value })}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Parent Mobile Number</label>
              <input 
                type="tel" 
                className="form-control"
                placeholder="Enter Parent Mobile Number"
                value={studentForm.parentMobile}
                onChange={(e) => setStudentForm({ ...studentForm, parentMobile: e.target.value })}
                required
              />
            </div>
          </div>

          {!selectedStudent && (
            <div className="form-group">
              <label className="form-label">Initial Password</label>
              <input 
                type="password" 
                className="form-control"
                placeholder="Enter Password (min 6 characters)"
                value={studentForm.password}
                onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                autoComplete="new-password"
                required
              />
            </div>
          )}

          <div className="modal-footer" style={{ margin: '0 -1.5rem -1.5rem -1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsStudentModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Enroll Student</button>
          </div>
        </form>
      </Modal>

      {/* 3. TRANSFER STUDENT MODAL */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title={selectedStudent ? `Transfer ${selectedStudent.user ? selectedStudent.user.name : ''}` : 'Transfer Student'}
      >
        {formError && (
          <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleTransferSubmit}>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Target Class Section</label>
            <select
              className="form-control"
              value={transferClassId}
              onChange={(e) => setTransferClassId(e.target.value)}
              required
            >
              <option value="">-- Select Target Class --</option>
              {classes
                .filter((c) => c._id !== currentClass?._id) // Filter out current class
                .map((c) => (
                  <option key={c._id} value={c._id}>
                    Class {c.className}-{c.section}
                  </option>
                ))}
            </select>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
              Note: Moving the student automatically recalculates strength values for both classes.
            </span>
          </div>

          <div className="modal-footer" style={{ margin: '0 -1.5rem -1.5rem -1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsTransferModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <ArrowRightLeft size={16} />
              <span>Execute Transfer</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. STUDENT PASSWORD RESET MODAL */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title={selectedStudent ? `Reset Password for ${selectedStudent.user ? selectedStudent.user.name : ''}` : 'Reset Password'}
      >
        {formError && (
          <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            {formError}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">New Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="Enter Password (min 6 characters)"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
              The student will be forced to update this temporary password upon logging in.
            </span>
          </div>

          <div className="modal-footer" style={{ margin: '0 -1.5rem -1.5rem -1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsPasswordModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Reset Password</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ClassManagement;
