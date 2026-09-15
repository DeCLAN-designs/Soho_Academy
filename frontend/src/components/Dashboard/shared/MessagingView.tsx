import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import './MessagingView.css';

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

interface Announcement {
  id: number;
  title: string;
  content: string;
  target_audience: string;
  status: string;
  published_at: string;
  created_at: string;
  creator_first_name: string;
  creator_last_name: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
}

interface MessagingViewProps {
  allowedRecipients?: string[];
}

const MessagingView = ({ allowedRecipients = ['Transport Manager', 'School Admin'] }: MessagingViewProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'messages' | 'announcements'>(
    requestedTab === 'announcements' ? 'announcements' : 'messages'
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'All' | 'Sent' | 'Read' | 'Archived'>('All');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    receiverId: '',
    subject: '',
    content: '',
  });

  useEffect(() => {
    fetchData();
  }, [filter, activeTab]);

  useEffect(() => {
    const nextTab = requestedTab === 'announcements' ? 'announcements' : 'messages';
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, requestedTab]);

  const selectTab = (tab: 'messages' | 'announcements') => {
    setActiveTab(tab);
    if (tab === 'announcements') {
      setSearchParams({ tab }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('soho_auth_token');
      
      const [messagesRes, announcementsRes, usersRes] = await Promise.all([
        axios.get('/api/messages', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/announcements/public', {
          headers: { Authorization: `Bearer ${token}` },
          params: { status: 'Published' }
        }),
        axios.get('/api/users/transport-team', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setMessages(messagesRes.data?.data?.messages || []);
      setAnnouncements(announcementsRes.data?.data?.announcements || []);
      setUsers(usersRes.data?.data?.users || []);
      setError('');
    } catch (err) {
      setError('Failed to load data');
      console.error('Error fetching data:', err);
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

  const handleOpenAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowMessageModal(true);
  };

  const handleCloseMessageModal = () => {
    setShowMessageModal(false);
    setSelectedMessage(null);
    setSelectedAnnouncement(null);
  };

  const filteredMessages = messages.filter(msg => {
    if (filter === 'All') return true;
    return msg.status === filter;
  });

  const transportTeamUsers = users.filter(user => 
    allowedRecipients.includes(user.role)
  );

  if (loading) {
    return <div className="messaging-view-loading">Loading...</div>;
  }

  return (
    <div className="messaging-view">
      <div className="messaging-view-header">
        <h2>Messages & Announcements</h2>
      </div>

      {error && <div className="messaging-view-error">{error}</div>}

      <div className="messaging-view-tabs">
        <button 
          className={activeTab === 'messages' ? 'active' : ''}
          onClick={() => selectTab('messages')}
        >
          Messages ({messages.filter(m => m.status !== 'Read').length})
        </button>
        <button 
          className={activeTab === 'announcements' ? 'active' : ''}
          onClick={() => selectTab('announcements')}
        >
          Announcements ({announcements.length})
        </button>
      </div>

      {activeTab === 'messages' && (
        <>
          <div className="messaging-view-actions">
            <button 
              className="messaging-view-compose-btn"
              onClick={() => setShowComposeModal(true)}
            >
              Compose Message
            </button>
          </div>

          <div className="messaging-view-filters">
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

          <div className="messaging-view-list">
            {filteredMessages.length === 0 ? (
              <div className="messaging-view-empty">No messages found</div>
            ) : (
              filteredMessages.map(message => (
                <div 
                  key={message.id} 
                  className={`messaging-view-item ${message.status === 'Read' ? 'read' : 'unread'}`}
                  onClick={() => handleOpenMessage(message)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="messaging-view-item-header">
                    <div className="messaging-view-sender-info">
                      <span className="messaging-view-sender">
                        {message.sender_first_name} {message.sender_last_name}
                      </span>
                      {message.sender_role && (
                        <span className="messaging-view-sender-role">
                          {message.sender_role}
                        </span>
                      )}
                    </div>
                    <span className="messaging-view-date">
                      {new Date(message.sent_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="messaging-view-subject">{message.subject}</div>
                  <div className="messaging-view-content-preview">
                    {message.content.substring(0, 100)}{message.content.length > 100 ? '...' : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'announcements' && (
        <div className="messaging-view-list">
          {announcements.length === 0 ? (
            <div className="messaging-view-empty">No announcements found</div>
          ) : (
            announcements.map(announcement => (
              <div 
                key={announcement.id} 
                className="messaging-view-item"
                onClick={() => handleOpenAnnouncement(announcement)}
                style={{ cursor: 'pointer' }}
              >
                <div className="messaging-view-item-header">
                  <div className="messaging-view-sender-info">
                    <span className="messaging-view-sender">
                      {announcement.creator_first_name} {announcement.creator_last_name}
                    </span>
                    <span className="messaging-view-sender-role">
                      Transport Manager
                    </span>
                  </div>
                  <span className="messaging-view-date">
                    {new Date(announcement.published_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="messaging-view-subject">{announcement.title}</div>
                <div className="messaging-view-content-preview">
                  {announcement.content.substring(0, 100)}{announcement.content.length > 100 ? '...' : ''}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showComposeModal && (
        createPortal(<div className="messaging-view-modal-overlay" onClick={() => setShowComposeModal(false)}>
          <div className="messaging-view-modal" onClick={e => e.stopPropagation()}>
            <div className="messaging-view-modal-header">
              <h3>Compose Message</h3>
              <button onClick={() => setShowComposeModal(false)}>×</button>
            </div>
            <form onSubmit={handleSendMessage} className="messaging-view-form">
              <div className="messaging-view-form-group">
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
              <div className="messaging-view-form-group">
                <label>Subject:</label>
                <input 
                  type="text"
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                  required
                />
              </div>
              <div className="messaging-view-form-group">
                <label>Message:</label>
                <textarea 
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  required
                  rows={5}
                />
              </div>
              <div className="messaging-view-modal-actions">
                <button type="button" onClick={() => setShowComposeModal(false)}>
                  Cancel
                </button>
                <button type="submit">Send Message</button>
              </div>
            </form>
          </div>
        </div>, document.body)
      )}

      {showMessageModal && (selectedMessage || selectedAnnouncement) && (
        createPortal(
          <div className="messaging-view-modal-overlay" onClick={handleCloseMessageModal}>
          <div
            className={`messaging-view-modal messaging-view-message-modal${selectedAnnouncement ? ' messaging-view-announcement-modal' : ''}`}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="messaging-view-modal-header">
              <h3>{selectedMessage ? 'Message Details' : 'Announcement Details'}</h3>
              <button onClick={handleCloseMessageModal}>×</button>
            </div>
            {selectedMessage && (
              <div className="messaging-view-message-content">
                <div className="messaging-view-message-sender">
                  <div className="messaging-view-sender-info">
                    <span className="messaging-view-sender-name">
                      {selectedMessage.sender_first_name} {selectedMessage.sender_last_name}
                    </span>
                    {selectedMessage.sender_role && (
                      <span className="messaging-view-sender-role">
                        {selectedMessage.sender_role}
                      </span>
                    )}
                  </div>
                  <span className="messaging-view-message-date">
                    {new Date(selectedMessage.sent_at).toLocaleString()}
                  </span>
                </div>
                <div className="messaging-view-message-subject">{selectedMessage.subject}</div>
                <div className="messaging-view-message-body">{selectedMessage.content}</div>
                {selectedMessage.read_at && (
                  <div className="messaging-view-message-read-at">
                    Read at: {new Date(selectedMessage.read_at).toLocaleString()}
                  </div>
                )}
              </div>
            )}
            {selectedAnnouncement && (
              <div className="messaging-view-announcement-content">
                <div className="messaging-view-announcement-meta">
                  <div>
                    <span>From</span>
                    <strong>
                      {selectedAnnouncement.creator_first_name} {selectedAnnouncement.creator_last_name}
                    </strong>
                  </div>
                  <div>
                    <span>Published</span>
                    <strong>{new Date(selectedAnnouncement.published_at).toLocaleString()}</strong>
                  </div>
                </div>
                <div className="messaging-view-announcement-subject">
                  <span>Subject</span>
                  <h4>{selectedAnnouncement.title}</h4>
                </div>
                <div className="messaging-view-announcement-body">
                  <span>Announcement</span>
                  <p>{selectedAnnouncement.content}</p>
                </div>
              </div>
            )}
            <div className="messaging-view-modal-actions">
              <button type="button" onClick={handleCloseMessageModal}>
                Close
              </button>
            </div>
          </div>
          </div>,
          document.body
        )
      )}
    </div>
  );
};

export default MessagingView;
