import { useState, useEffect } from 'react';
import axios from 'axios';
import './ParentNotifications.css';

interface Notification {
  id: number;
  recipient_id: number;
  type: string;
  title: string;
  message: string;
  sent_at: string;
  read_at: string | null;
  status: 'Sent' | 'Read' | 'Archived';
  related_entity_type: string | null;
  related_entity_id: number | null;
  recipient_first_name: string;
  recipient_last_name: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
}

const ParentNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'All' | 'Sent' | 'Read' | 'Archived'>('All');
  const [filterType, setFilterType] = useState<'All' | 'General' | 'Trip' | 'Emergency' | 'Attendance' | 'Compliance'>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    recipientId: '',
    type: 'General',
    title: '',
    message: '',
  });

  useEffect(() => {
    fetchData();
  }, [filter, filterType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('soho_auth_token');
      
      const [notificationsRes, usersRes] = await Promise.all([
        axios.get('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            ...(filter !== 'All' && { status: filter }),
            ...(filterType !== 'All' && { type: filterType }),
          },
        }),
        axios.get('/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      
      setNotifications(notificationsRes.data.data.notifications || []);
      setUsers(usersRes.data.data.users || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      const token = localStorage.getItem('soho_auth_token');
      await axios.patch(`/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('soho_auth_token');
      await axios.patch('/api/notifications/all/read', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark all as read');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    
    try {
      const token = localStorage.getItem('soho_auth_token');
      await axios.delete(`/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete notification');
    }
  };

  const handleCreate = async () => {
    try {
      const token = localStorage.getItem('soho_auth_token');
      await axios.post('/api/notifications', {
        recipientId: parseInt(formData.recipientId),
        type: formData.type,
        title: formData.title,
        message: formData.message,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setShowCreateModal(false);
      setFormData({ recipientId: '', type: 'General', title: '', message: '' });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create notification');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Sent': return '#3b82f6';
      case 'Read': return '#10b981';
      case 'Archived': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Emergency': return '#dc2626';
      case 'Trip': return '#3b82f6';
      case 'Attendance': return '#f59e0b';
      case 'Compliance': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  if (loading) return <div className="loading">Loading notifications...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="parent-notifications">
      <div className="header">
        <h2>Parent Notifications</h2>
        <div className="actions">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as any)}
            className="filter-select"
          >
            <option value="All">All Status</option>
            <option value="Sent">Sent</option>
            <option value="Read">Read</option>
            <option value="Archived">Archived</option>
          </select>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value as any)}
            className="filter-select"
          >
            <option value="All">All Types</option>
            <option value="General">General</option>
            <option value="Trip">Trip</option>
            <option value="Emergency">Emergency</option>
            <option value="Attendance">Attendance</option>
            <option value="Compliance">Compliance</option>
          </select>
          <button className="btn-mark-all" onClick={handleMarkAllAsRead}>
            Mark All as Read
          </button>
          <button className="btn-create" onClick={() => setShowCreateModal(true)}>
            Create Notification
          </button>
        </div>
      </div>

      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="no-data">No notifications found</div>
        ) : (
          notifications.map((notification) => (
            <div key={notification.id} className={`notification-card ${notification.status === 'Sent' ? 'unread' : ''}`}>
              <div className="notification-header">
                <div className="notification-info">
                  <h3>{notification.title}</h3>
                  <span className="notification-recipient">
                    To: {notification.recipient_first_name} {notification.recipient_last_name}
                  </span>
                </div>
                <div className="badges">
                  <span 
                    className="type-badge"
                    style={{ backgroundColor: getTypeColor(notification.type) }}
                  >
                    {notification.type}
                  </span>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(notification.status) }}
                  >
                    {notification.status}
                  </span>
                </div>
              </div>
              <div className="notification-body">
                <p>{notification.message}</p>
                <div className="notification-meta">
                  <span>Sent: {new Date(notification.sent_at).toLocaleString()}</span>
                  {notification.read_at && (
                    <span>Read: {new Date(notification.read_at).toLocaleString()}</span>
                  )}
                </div>
              </div>
              <div className="notification-actions">
                {notification.status === 'Sent' && (
                  <button className="btn-read" onClick={() => handleMarkAsRead(notification.id)}>
                    Mark as Read
                  </button>
                )}
                <button className="btn-delete" onClick={() => handleDelete(notification.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Notification</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Recipient *</label>
                <select
                  value={formData.recipientId}
                  onChange={(e) => setFormData({ ...formData, recipientId: e.target.value })}
                >
                  <option value="">Select Recipient</option>
                  {users.filter(u => u.role === 'Parent').map(user => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="General">General</option>
                  <option value="Trip">Trip</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Attendance">Attendance</option>
                  <option value="Compliance">Compliance</option>
                </select>
              </div>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Message *</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={5}
                />
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button className="btn-send" onClick={handleCreate}>Send Notification</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentNotifications;
