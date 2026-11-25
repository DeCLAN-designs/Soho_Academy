import { createContext, useCallback, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { apiUrl } from '../lib/api';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  unreadMessages: number;
  unreadAnnouncements: number;
  unreadCount: number;
  markMessagesAsRead: () => void;
  markAnnouncementsAsRead: () => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const { isAuthenticated } = useAuth();

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const token = localStorage.getItem('soho_auth_token');
      if (!token) return;
      
      // Get unread messages
      const messagesRes = await axios.get(apiUrl('/messages'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const messages = messagesRes.data?.data?.messages || [];
      const unreadMessagesCount = messages.filter((m: any) => m.status !== 'Read').length;
      setUnreadMessages(unreadMessagesCount);

      // Get unread announcements (published in last 7 days) - use public endpoint for all roles
      const announcementsRes = await axios.get(apiUrl('/announcements/public'), {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: 'Published' }
      });
      const announcements = announcementsRes.data?.data?.announcements || [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentAnnouncements = announcements.filter((a: any) => 
        new Date(a.published_at) > sevenDaysAgo
      );
      setUnreadAnnouncements(recentAnnouncements.length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    void refreshNotifications();
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(() => void refreshNotifications(), 30000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshNotifications]);

  const markMessagesAsRead = () => {
    setUnreadMessages(0);
  };

  const markAnnouncementsAsRead = () => {
    setUnreadAnnouncements(0);
  };

  const unreadCount = unreadMessages + unreadAnnouncements;

  return (
    <NotificationContext.Provider 
      value={{ 
        unreadMessages, 
        unreadAnnouncements, 
        unreadCount,
        markMessagesAsRead,
        markAnnouncementsAsRead,
        refreshNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};