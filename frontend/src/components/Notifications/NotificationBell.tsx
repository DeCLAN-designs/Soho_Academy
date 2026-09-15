import { useState, useEffect } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import './NotificationBell.css';

interface NotificationBellProps {
  onMessagesClick: () => void;
  onAnnouncementsClick: () => void;
}

const NotificationBell = ({ onMessagesClick, onAnnouncementsClick }: NotificationBellProps) => {
  const { unreadMessages, unreadAnnouncements, unreadCount, markMessagesAsRead, markAnnouncementsAsRead, refreshNotifications } = useNotifications();
  const { announcements } = useWebSocket();
  const [isOpen, setIsOpen] = useState(false);

  // Refresh notifications when new announcements come via WebSocket
  useEffect(() => {
    if (announcements.length > 0) {
      refreshNotifications();
    }
  }, [announcements, refreshNotifications]);

  const handleMessagesClick = () => {
    markMessagesAsRead();
    onMessagesClick();
    setIsOpen(false);
  };

  const handleAnnouncementsClick = () => {
    markAnnouncementsAsRead();
    onAnnouncementsClick();
    setIsOpen(false);
  };

  return (
    <div className="notification-bell">
      <button 
        className="notification-bell-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <span className="notification-bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>Notifications</h3>
            <button onClick={() => setIsOpen(false)}>×</button>
          </div>
          
          <div className="notification-dropdown-body">
            <button 
              className="notification-item"
              onClick={handleMessagesClick}
            >
              <div className="notification-item-icon">💬</div>
              <div className="notification-item-content">
                <div className="notification-item-title">Messages</div>
                <div className="notification-item-count">
                  {unreadMessages} unread
                </div>
              </div>
            </button>

            <button 
              className="notification-item"
              onClick={handleAnnouncementsClick}
            >
              <div className="notification-item-icon">📢</div>
              <div className="notification-item-content">
                <div className="notification-item-title">Announcements</div>
                <div className="notification-item-count">
                  {unreadAnnouncements} recent
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;