import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import Modal from '../../components/Modal';
import { Plus, Trash2, Calendar, FileText } from 'lucide-react';

const NoticeBoard = () => {
  const { apiRequest } = useAuth();
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();
  
  // Data States
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form States
  const [formData, setFormData] = useState({
    title: '',
    type: 'General Notice',
    content: ''
  });
  const [formError, setFormError] = useState('');

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/notices');
      if (response.success) {
        setNotices(response.notices);
      }
    } catch (err) {
      setError('Error retrieving notice board listings.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateOpen = () => {
    setFormData({
      title: '',
      type: 'General Notice',
      content: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleNoticeSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const { title, type, content } = formData;
    if (!title || !type || !content) {
      setFormError('All fields are required.');
      return;
    }

    try {
      const response = await apiRequest('/notices', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (response.success) {
        setIsModalOpen(false);
        showSuccess('Notice published successfully!');
        fetchNotices();
      }
    } catch (err) {
      setFormError(err.message || 'Error publishing notice.');
      showError(err.message || 'Failed to publish notice.');
    }
  };

  const handleNoticeDelete = async (id, title) => {
    const confirmed = await confirm({
      title: 'Delete Notice',
      message: `Are you sure you want to delete notice "${title}"?`,
      danger: true
    });
    if (!confirmed) {
      return;
    }
    try {
      const response = await apiRequest(`/notices/${id}`, { method: 'DELETE' });
      if (response.success) {
        showSuccess('Notice deleted successfully!');
        fetchNotices();
      }
    } catch (err) {
      showError(err.message || 'Error deleting notice.');
    }
  };

  const getBadgeClass = (type) => {
    switch (type) {
      case 'Holiday Notice': return 'badge-danger';
      case 'Examination Notice': return 'badge-warning';
      case 'Event Notice': return 'badge-success';
      default: return 'badge-info';
    }
  };

  return (
    <div>
      {/* Header & Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>School Notice Board</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Publish announcements, exam sheets, events, and holiday notices for all users.</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateOpen}>
          <Plus size={16} />
          <span>Publish Notice</span>
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '1rem', borderRadius: 'var(--border-radius)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Notices Grid Layout */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading notice board...</div>
      ) : notices.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <Calendar size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
          <h3>Notice Board is Empty</h3>
          <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Publish a new holiday, examination, event, or general announcement to display here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {notices.map((notice) => (
            <div key={notice._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px', backgroundColor: '#ffffff' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span className={`badge ${getBadgeClass(notice.type)}`}>
                    {notice.type}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {new Date(notice.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', lineHeight: 1.2 }}>{notice.title}</h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                  {notice.content}
                </p>
              </div>

              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginTop: '1.5rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-color)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)'
                }}
              >
                <span>By: {notice.createdBy ? notice.createdBy.name : 'Administrator'}</span>
                <button
                  onClick={() => handleNoticeDelete(notice._id, notice.title)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = 0.7}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
                >
                  <Trash2 size={13} />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE NOTICE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Publish Notice Board Entry"
      >
        {formError && (
          <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleNoticeSubmit}>
          <div className="form-group">
            <label className="form-label">Notice Title</label>
            <input 
              type="text" 
              name="title" 
              className="form-control" 
              placeholder="e.g. Summer Vacation Holidays"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notice Type</label>
            <select 
              name="type" 
              className="form-control"
              value={formData.type}
              onChange={handleInputChange}
              required
            >
              <option value="General Notice">General Notice</option>
              <option value="Holiday Notice">Holiday Notice</option>
              <option value="Examination Notice">Examination Notice</option>
              <option value="Event Notice">Event Notice</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Notice Message Details</label>
            <textarea 
              name="content" 
              className="form-control" 
              rows="5"
              placeholder="Type your notice description here..."
              value={formData.content}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="modal-footer" style={{ margin: '0 -1.5rem -1.5rem -1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <FileText size={16} />
              <span>Publish Now</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default NoticeBoard;
