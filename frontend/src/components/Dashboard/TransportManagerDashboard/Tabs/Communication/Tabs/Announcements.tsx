import { useState, useEffect } from 'react';
import axios from 'axios';
import './Announcements.css';

interface Announcement {
  id: number;
  title: string;
  content: string;
  target_audience: string;
  created_by_user_id: number;
  creator_first_name: string;
  creator_last_name: string;
  published_at: string | null;
  status: 'Draft' | 'Published' | 'Archived';
  created_at: string;
}

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'All' | 'Draft' | 'Published' | 'Archived'>('All');
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetAudience: 'All',
    status: 'Draft' as const,
  });

  useEffect(() => {
    fetchAnnouncements();
  }, [filter]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('soho_auth_token');
      const response = await axios.get('/api/transport-manager/announcements', {
        headers: { Authorization: `Bearer ${token}` },
        params: filter !== 'All' ? { status: filter } : {},
      });
      setAnnouncements(response.data.data.announcements || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAnnouncement(null);
    setFormData({ title: '', content: '', targetAudience: 'All', status: 'Draft' });
    setShowModal(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      targetAudience: announcement.target_audience,
      status: announcement.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
      const token = localStorage.getItem('soho_auth_token');
      await axios.delete(`/api/transport-manager/announcements/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAnnouncements();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete announcement');
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('soho_auth_token');
      const payload = {
        title: formData.title,
        content: formData.content,
        targetAudience: formData.targetAudience,
        status: formData.status,
      };

      if (editingAnnouncement) {
        await axios.patch(`/api/transport-manager/announcements/${editingAnnouncement.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post('/api/transport-manager/announcements', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      
      setShowModal(false);
      fetchAnnouncements();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save announcement');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return '#6b7280';
      case 'Published': return '#10b981';
      case 'Archived': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  if (loading) return <div className="loading">Loading announcements...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="announcements">
      <div className="header">
        <h2>Announcements</h2>
        <div className="actions">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as any)}
            className="filter-select"
          >
            <option value="All">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
            <option value="Archived">Archived</option>
          </select>
          <button className="btn-add" onClick={handleCreate}>
            Create Announcement
          </button>
        </div>
      </div>

      <div className="announcements-list">
        {announcements.length === 0 ? (
          <div className="no-data">No announcements found</div>
        ) : (
          announcements.map((announcement) => (
            <div key={announcement.id} className="announcement-card">
              <div className="announcement-header">
                <h3>{announcement.title}</h3>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(announcement.status) }}
                >
                  {announcement.status}
                </span>
              </div>
              <div className="announcement-body">
                <p>{announcement.content}</p>
                <div className="announcement-meta">
                  <span><strong>Target:</strong> {announcement.target_audience}</span>
                  <span><strong>Created by:</strong> {announcement.creator_first_name} {announcement.creator_last_name}</span>
                  <span><strong>Created:</strong> {new Date(announcement.created_at).toLocaleDateString()}</span>
                  {announcement.published_at && (
                    <span><strong>Published:</strong> {new Date(announcement.published_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <div className="announcement-actions">
                <button className="btn-edit" onClick={() => handleEdit(announcement)}>Edit</button>
                <button className="btn-delete" onClick={() => handleDelete(announcement.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Content *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={5}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Target Audience</label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  >
                    <option value="All">All</option>
                    <option value="Staff">Staff</option>
                    <option value="Parents">Parents</option>
                    <option value="Drivers">Drivers</option>
                    <option value="Bus Assistants">Bus Assistants</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn-confirm" onClick={handleSubmit}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
