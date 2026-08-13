import { useState, useEffect } from 'react';
import axios from 'axios';
import './InternalMessaging.css';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  subject: string;
  content: string;
  sent_at: string;
  read_at: string | null;
  status: 'Sent' | 'Read' | 'Archived';
  sender_first_name: string;
  sender_last_name: string;
  receiver_first_name: string;
  receiver_last_name: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
}

const InternalMessaging = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'All' | 'Sent' | 'Read' | 'Archived'>('All');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [formData, setFormData] = useState({
    receiverId: '',
    subject: '',
    content: '',
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('soho_auth_token');
      
      const [messagesRes, usersRes] = await Promise.all([
        axios.get('/api/messages', {
          headers: { Authorization: `Bearer ${token}` },
          params: filter !== 'All' ? { status: filter } : {},
        }),
        axios.get('/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      
      setMessages(messagesRes.data.data.messages || []);
      setUsers(usersRes.data.data.users || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      const token = localStorage.getItem('soho_auth_token');
      await axios.patch(`/api/messages/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark as read');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    try {
      const token = localStorage.getItem('soho_auth_token');
      await axios.delete(`/api/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete message');
    }
  };

  const handleSend = async () => {
    try {
      const token = localStorage.getItem('soho_auth_token');
      await axios.post('/api/messages', {
        receiverId: parseInt(formData.receiverId),
        subject: formData.subject,
        content: formData.content,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setShowComposeModal(false);
      setFormData({ receiverId: '', subject: '', content: '' });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send message');
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

  if (loading) return <div className="loading">Loading messages...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="internal-messaging">
      <div className="header">
        <h2>Internal Messaging</h2>
        <div className="actions">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as any)}
            className="filter-select"
          >
            <option value="All">All Messages</option>
            <option value="Sent">Sent</option>
            <option value="Read">Read</option>
            <option value="Archived">Archived</option>
          </select>
          <button className="btn-compose" onClick={() => setShowComposeModal(true)}>
            Compose Message
          </button>
        </div>
      </div>

      <div className="messages-list">
        {messages.length === 0 ? (
          <div className="no-data">No messages found</div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`message-card ${message.status === 'Sent' ? 'unread' : ''}`}>
              <div className="message-header">
                <div className="message-info">
                  <h3>{message.subject}</h3>
                  <span className="message-direction">
                    {message.sender_first_name === 'Your' ? 'To: ' : 'From: '}
                    {message.sender_first_name} {message.sender_last_name}
                  </span>
                </div>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(message.status) }}
                >
                  {message.status}
                </span>
              </div>
              <div className="message-body">
                <p>{message.content}</p>
                <div className="message-meta">
                  <span>{new Date(message.sent_at).toLocaleString()}</span>
                  {message.read_at && (
                    <span>Read: {new Date(message.read_at).toLocaleString()}</span>
                  )}
                </div>
              </div>
              <div className="message-actions">
                {message.status === 'Sent' && (
                  <button className="btn-read" onClick={() => handleMarkAsRead(message.id)}>
                    Mark as Read
                  </button>
                )}
                <button className="btn-delete" onClick={() => handleDelete(message.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showComposeModal && (
        <div className="modal-overlay" onClick={() => setShowComposeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Compose Message</h3>
              <button className="close-btn" onClick={() => setShowComposeModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>To *</label>
                <select
                  value={formData.receiverId}
                  onChange={(e) => setFormData({ ...formData, receiverId: e.target.value })}
                >
                  <option value="">Select Recipient</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Subject *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Message *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={5}
                />
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowComposeModal(false)}>Cancel</button>
                <button className="btn-send" onClick={handleSend}>Send</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternalMessaging;
