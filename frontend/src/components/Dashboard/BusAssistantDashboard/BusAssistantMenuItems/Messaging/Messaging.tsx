import { useState, useEffect } from 'react';
import axios from 'axios';
import './Messaging.css';

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
  sender_role?: string;
  receiver_first_name: string;
  receiver_last_name: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
}

const BusAssistantMessaging = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'All' | 'Sent' | 'Read' | 'Archived'>('All');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
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
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/users/transport-team', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setMessages(messagesRes.data?.data?.messages || []);
      setUsers(usersRes.data?.data?.users || []);
      setError('');
    } catch (err) {
      setError('Failed to load messages');
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('soho_auth_token');
      
      await axios.post('/api/messages', {
        receiver_id: parseInt(formData.receiverId),
        subject: formData.subject,
        content: formData.content,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowComposeModal(false);
      setFormData({ receiverId: '', subject: '', content: '' });
      fetchData();
    } catch (err) {
      setError('Failed to send message');
      console.error('Error sending message:', err);
    }
  };

  const handleMarkAsRead = async (messageId: number) => {
    try {
      const token = localStorage.getItem('soho_auth_token');
      
      await axios.patch(`/api/messages/${messageId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchData();
    } catch (err) {
      setError('Failed to mark message as read');
      console.error('Error marking message as read:', err);
    }
  };

  const handleOpenMessage = (message: Message) => {
    setSelectedMessage(message);
    setShowMessageModal(true);
    if (message.status !== 'Read') {
      handleMarkAsRead(message.id);
    }
  };

  const handleCloseMessageModal = () => {
    setShowMessageModal(false);
    setSelectedMessage(null);
  };

  const filteredMessages = messages.filter(msg => {
    if (filter === 'All') return true;
    return msg.status === filter;
  });

  const transportTeamUsers = users.filter(user => 
    ['Transport Manager', 'School Admin', 'Driver'].includes(user.role)
  );

  if (loading) {
    return <div className="bus-assistant-messaging-loading">Loading messages...</div>;
  }

  return (
    <div className="bus-assistant-messaging">
      <div className="bus-assistant-messaging-header">
        <h2>Messaging</h2>
        <button 
          className="bus-assistant-messaging-compose-btn"
          onClick={() => setShowComposeModal(true)}
        >
          Compose Message
        </button>
      </div>

      {error && <div className="bus-assistant-messaging-error">{error}</div>}

      <div className="bus-assistant-messaging-filters">
        <button 
          className={filter === 'All' ? 'active' : ''}
          onClick={() => setFilter('All')}
        >
          All
        </button>
        <button 
          className={filter === 'Sent' ? 'active' : ''}
          onClick={() => setFilter('Sent')}
        >
          Sent
        </button>
        <button 
          className={filter === 'Read' ? 'active' : ''}
          onClick={() => setFilter('Read')}
        >
          Read
        </button>
        <button 
          className={filter === 'Archived' ? 'active' : ''}
          onClick={() => setFilter('Archived')}
        >
          Archived
        </button>
      </div>

      <div className="bus-assistant-messaging-list">
        {filteredMessages.length === 0 ? (
          <div className="bus-assistant-messaging-empty">No messages found</div>
        ) : (
          filteredMessages.map(message => (
            <div 
              key={message.id} 
              className={`bus-assistant-messaging-item ${message.status === 'Read' ? 'read' : 'unread'}`}
              onClick={() => handleOpenMessage(message)}
              style={{ cursor: 'pointer' }}
            >
              <div className="bus-assistant-messaging-item-header">
                <div className="bus-assistant-messaging-sender-info">
                  <span className="bus-assistant-messaging-sender">
                    {message.sender_first_name} {message.sender_last_name}
                  </span>
                  {message.sender_role && (
                    <span className="bus-assistant-messaging-sender-role">
                      {message.sender_role}
                    </span>
                  )}
                </div>
                <span className="bus-assistant-messaging-date">
                  {new Date(message.sent_at).toLocaleDateString()}
                </span>
              </div>
              <div className="bus-assistant-messaging-subject">{message.subject}</div>
              <div className="bus-assistant-messaging-content-preview">
                {message.content.substring(0, 100)}{message.content.length > 100 ? '...' : ''}
              </div>
            </div>
          ))
        )}
      </div>

      {showComposeModal && (
        <div className="bus-assistant-messaging-modal-overlay" onClick={() => setShowComposeModal(false)}>
          <div className="bus-assistant-messaging-modal" onClick={e => e.stopPropagation()}>
            <div className="bus-assistant-messaging-modal-header">
              <h3>Compose Message</h3>
              <button onClick={() => setShowComposeModal(false)}>×</button>
            </div>
            <form onSubmit={handleSendMessage} className="bus-assistant-messaging-form">
              <div className="bus-assistant-messaging-form-group">
                <label>To:</label>
                <select 
                  value={formData.receiverId}
                  onChange={e => setFormData({...formData, receiverId: e.target.value})}
                  required
                >
                  <option value="">Select recipient</option>
                  {transportTeamUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="bus-assistant-messaging-form-group">
                <label>Subject:</label>
                <input 
                  type="text"
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                  required
                />
              </div>
              <div className="bus-assistant-messaging-form-group">
                <label>Message:</label>
                <textarea 
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  required
                  rows={5}
                />
              </div>
              <div className="bus-assistant-messaging-modal-actions">
                <button type="button" onClick={() => setShowComposeModal(false)}>
                  Cancel
                </button>
                <button type="submit">Send Message</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMessageModal && selectedMessage && (
        <div className="bus-assistant-messaging-modal-overlay" onClick={handleCloseMessageModal}>
          <div className="bus-assistant-messaging-modal bus-assistant-messaging-message-modal" onClick={e => e.stopPropagation()}>
            <div className="bus-assistant-messaging-modal-header">
              <h3>Message Details</h3>
              <button onClick={handleCloseMessageModal}>×</button>
            </div>
            <div className="bus-assistant-messaging-message-content">
              <div className="bus-assistant-messaging-message-sender">
                <div className="bus-assistant-messaging-sender-info">
                  <span className="bus-assistant-messaging-sender-name">
                    {selectedMessage.sender_first_name} {selectedMessage.sender_last_name}
                  </span>
                  {selectedMessage.sender_role && (
                    <span className="bus-assistant-messaging-sender-role">
                      {selectedMessage.sender_role}
                    </span>
                  )}
                </div>
                <span className="bus-assistant-messaging-message-date">
                  {new Date(selectedMessage.sent_at).toLocaleString()}
                </span>
              </div>
              <div className="bus-assistant-messaging-message-subject">{selectedMessage.subject}</div>
              <div className="bus-assistant-messaging-message-body">{selectedMessage.content}</div>
              {selectedMessage.read_at && (
                <div className="bus-assistant-messaging-message-read-at">
                  Read at: {new Date(selectedMessage.read_at).toLocaleString()}
                </div>
              )}
            </div>
            <div className="bus-assistant-messaging-modal-actions">
              <button type="button" onClick={handleCloseMessageModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusAssistantMessaging;