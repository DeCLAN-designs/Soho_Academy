import { useEffect, useState } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import './AnnouncementNotification.css';

interface Announcement {
  id: number;
  title: string;
  content: string;
  target_audience: string;
  published_at: string;
}

const AnnouncementNotification = () => {
  const { announcements, addAnnouncement } = useWebSocket();
  const [visibleAnnouncements, setVisibleAnnouncements] = useState<Map<number, boolean>>(new Map());

  useEffect(() => {
    announcements.forEach(announcement => {
      if (!visibleAnnouncements.has(announcement.id)) {
        setVisibleAnnouncements(prev => new Map(prev).set(announcement.id, true));
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
          setVisibleAnnouncements(prev => {
            const newMap = new Map(prev);
            newMap.set(announcement.id, false);
            return newMap;
          });
        }, 10000);
      }
    });
  }, [announcements, visibleAnnouncements]);

  const dismissAnnouncement = (id: number) => {
    setVisibleAnnouncements(prev => {
      const newMap = new Map(prev);
      newMap.set(id, false);
      return newMap;
    });
  };

  const visibleAnnouncementsList = announcements.filter(a => visibleAnnouncements.get(a.id));

  if (visibleAnnouncementsList.length === 0) return null;

  return (
    <div className="announcement-notifications">
      {visibleAnnouncementsList.map(announcement => (
        <div key={announcement.id} className="announcement-notification">
          <div className="announcement-header">
            <div className="announcement-title">
              <span className="announcement-icon">📢</span>
              <span>New Announcement</span>
            </div>
            <button 
              className="announcement-close"
              onClick={() => dismissAnnouncement(announcement.id)}
            >
              ×
            </button>
          </div>
          <div className="announcement-body">
            <h4>{announcement.title}</h4>
            <p>{announcement.content}</p>
            <div className="announcement-meta">
              <span className="announcement-target">
                Target: {announcement.target_audience}
              </span>
              <span className="announcement-time">
                {new Date(announcement.published_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AnnouncementNotification;