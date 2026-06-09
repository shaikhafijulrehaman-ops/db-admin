import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import Modal from '../../components/Modal';
import { 
  Award, 
  Calendar, 
  BookOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  Archive, 
  Check, 
  AlertTriangle,
  ChevronRight
} from 'lucide-react';

const ExamManagement = () => {
  const { apiRequest } = useAuth();
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();
  
  // Data States
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal States
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  
  // Form States
  const [examForm, setExamForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    subjects: [{ subjectName: '', maxMarks: 100 }]
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiRequest('/admin/exams');
      if (response.success) {
        setExams(response.exams);
      }
    } catch (err) {
      setError('Failed to retrieve examinations configuration.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleCreateOpen = () => {
    setSelectedExam(null);
    setExamForm({
      name: '',
      startDate: '',
      endDate: '',
      subjects: [
        { subjectName: 'English', maxMarks: 100 },
        { subjectName: 'Mathematics', maxMarks: 100 },
        { subjectName: 'Science', maxMarks: 100 },
        { subjectName: 'Social', maxMarks: 100 },
        { subjectName: 'Telugu', maxMarks: 100 }
      ]
    });
    setFormError('');
    setIsExamModalOpen(true);
  };

  const handleEditOpen = (exam) => {
    setSelectedExam(exam);
    setExamForm({
      name: exam.name,
      startDate: exam.startDate ? new Date(exam.startDate).toISOString().split('T')[0] : '',
      endDate: exam.endDate ? new Date(exam.endDate).toISOString().split('T')[0] : '',
      subjects: exam.subjects.map(s => ({
        subjectName: s.subjectName,
        maxMarks: s.maxMarks
      }))
    });
    setFormError('');
    setIsExamModalOpen(true);
  };

  const handleAddSubjectField = () => {
    setExamForm(prev => ({
      ...prev,
      subjects: [...prev.subjects, { subjectName: '', maxMarks: 100 }]
    }));
  };

  const handleRemoveSubjectField = (index) => {
    setExamForm(prev => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index)
    }));
  };

  const handleSubjectChange = (index, field, value) => {
    const updated = [...examForm.subjects];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setExamForm(prev => ({ ...prev, subjects: updated }));
  };

  const handleExamSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const { name, startDate, endDate, subjects } = examForm;

    if (!name.trim() || !startDate || !endDate || subjects.length === 0) {
      setFormError('Please fill in all details.');
      return;
    }

    // Validate subjects names
    for (const sub of subjects) {
      if (!sub.subjectName.trim()) {
        setFormError('Subject names cannot be empty.');
        return;
      }
      if (Number(sub.maxMarks) <= 0) {
        setFormError('Maximum marks must be greater than zero.');
        return;
      }
    }

    try {
      setSubmitting(true);
      let response;
      if (selectedExam) {
        response = await apiRequest(`/admin/exams/${selectedExam._id}`, {
          method: 'PUT',
          body: JSON.stringify(examForm)
        });
      } else {
        response = await apiRequest('/admin/exams', {
          method: 'POST',
          body: JSON.stringify(examForm)
        });
      }

      if (response.success) {
        setIsExamModalOpen(false);
        showSuccess(selectedExam ? 'Exam updated successfully!' : 'Exam created successfully!');
        fetchExams();
      }
    } catch (err) {
      setFormError(err.message || 'Error processing exam settings.');
      showError(err.message || 'Failed to save exam configurations.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveExam = async (id, name) => {
    const confirmed = await confirm({
      title: 'Archive Exam',
      message: `Are you sure you want to archive "${name}"? It will be hidden from active marks entry but student results will be preserved.`,
      danger: true
    });
    if (!confirmed) {
      return;
    }

    try {
      const response = await apiRequest(`/admin/exams/${id}/archive`, {
        method: 'POST'
      });
      if (response.success) {
        showSuccess(`Successfully archived exam "${name}".`);
        fetchExams();
      }
    } catch (err) {
      showError(err.message || 'Failed to archive exam.');
    }
  };

  const handleDeleteExam = async (id, name) => {
    const confirmed = await confirm({
      title: 'Delete Exam',
      message: `Are you sure you want to delete exam "${name}"? This action is permanent and cannot be undone.`,
      danger: true
    });
    if (!confirmed) {
      return;
    }

    try {
      const response = await apiRequest(`/admin/exams/${id}`, {
        method: 'DELETE'
      });
      if (response.success) {
        showSuccess('Exam deleted successfully.');
        fetchExams();
      }
    } catch (err) {
      // Deletion protection check: shows exact message from backend
      showError(err.message || 'Cannot delete exam.');
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Examination Configuration</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Configure examinations structure, dynamic subjects list, dates, and maximum marks.
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleCreateOpen}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} />
          <span>Create Exam</span>
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '1rem', borderRadius: 'var(--border-radius)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Exams Grid */}
      <div className="card" style={{ padding: '1.5rem 0', overflow: 'hidden' }}>
        <div style={{ padding: '0 1.5rem 1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={20} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Registered Examinations</h3>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="table" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th>Exam Name</th>
                <th>Exam Period</th>
                <th>Configured Subjects</th>
                <th>Total Marks</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading exams list...
                  </td>
                </tr>
              ) : exams.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No examinations configured yet. Click "Create Exam" to begin.
                  </td>
                </tr>
              ) : (
                exams.map((exam) => {
                  const totalMax = exam.subjects.reduce((sum, s) => sum + s.maxMarks, 0);
                  const isActive = exam.status === 'Active';
                  return (
                    <tr key={exam._id} style={{ opacity: isActive ? 1 : 0.65 }}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{exam.name}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <Calendar size={12} />
                          <span>
                            {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxWidth: '300px' }}>
                          {exam.subjects.map(s => (
                            <span 
                              key={s._id || s.subjectName}
                              style={{ 
                                padding: '0.15rem 0.4rem', 
                                backgroundColor: '#f1f5f9', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                color: 'var(--text-main)'
                              }}
                            >
                              {s.subjectName} ({s.maxMarks})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <strong style={{ fontSize: '0.9rem' }}>{totalMax}</strong>
                      </td>
                      <td>
                        <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                          {exam.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          {isActive && (
                            <>
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleEditOpen(exam)}
                                title="Edit Exam"
                                style={{ padding: '0.35rem' }}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleArchiveExam(exam._id, exam.name)}
                                title="Archive Exam"
                                style={{ padding: '0.35rem', color: 'var(--warning)' }}
                              >
                                <Archive size={13} />
                              </button>
                            </>
                          )}
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteExam(exam._id, exam.name)}
                            title="Delete Exam"
                            style={{ padding: '0.35rem' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE/EDIT EXAM MODAL */}
      <Modal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        title={selectedExam ? `Edit Exam: ${selectedExam.name}` : 'Create New Examination'}
      >
        {formError && (
          <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleExamSubmit}>
          <div className="form-group">
            <label className="form-label">Exam Title Name</label>
            <input 
              type="text" 
              className="form-control"
              placeholder="e.g. Half Yearly Examination"
              value={examForm.name}
              onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
              required
            />
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input 
                type="date" 
                className="form-control"
                value={examForm.startDate}
                onChange={(e) => setExamForm({ ...examForm, startDate: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input 
                type="date" 
                className="form-control"
                value={examForm.endDate}
                onChange={(e) => setExamForm({ ...examForm, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Subjects Configuration Section */}
          <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1.25rem', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <BookOpen size={16} />
                <span>Configure Subjects & Marks</span>
              </label>
              <button 
                type="button" 
                onClick={handleAddSubjectField}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Plus size={12} />
                <span>Add Subject</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {examForm.subjects.map((sub, index) => (
                <div 
                  key={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr auto',
                    gap: '0.75rem',
                    alignItems: 'center'
                  }}
                >
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="Enter Subject Name"
                    value={sub.subjectName}
                    onChange={(e) => handleSubjectChange(index, 'subjectName', e.target.value)}
                    required
                  />
                  <input 
                    type="number"
                    className="form-control"
                    placeholder="Max Marks"
                    value={sub.maxMarks}
                    min="1"
                    onChange={(e) => handleSubjectChange(index, 'maxMarks', e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => handleRemoveSubjectField(index)}
                    className="btn btn-danger btn-sm"
                    style={{ padding: '0.45rem' }}
                    disabled={examForm.subjects.length === 1}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-footer" style={{ margin: '0 -1.5rem -1.5rem -1.5rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setIsExamModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Examination'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ExamManagement;
