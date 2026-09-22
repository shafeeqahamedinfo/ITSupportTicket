/**
 * NotificationContext.jsx
 * Global state for in-app notifications.
 * - Fetches notifications from API on mount
 * - Listens for real-time Socket.IO notification events
 * - Provides unread count, mark-as-read, etc.
 *
 * Usage:
 *   const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
 */
import {
  createContext, useContext, useState, useEffect, useCallback, useRef,
} from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { getNotifications, markNotificationsRead } from '../services/staffService';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

// Max notifications kept in memory
const MAX_NOTIFS = 50;

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(false);
  const [panelOpen, setPanelOpen]         = useState(false);
  const hasFetched = useRef(false);

  // ─── Fetch from API ────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getNotifications({ limit: MAX_NOTIFS });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      hasFetched.current = true;
    } catch (e) {
      console.error('Failed to fetch notifications:', e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !hasFetched.current) {
      fetchNotifications();
    }
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      hasFetched.current = false;
    }
  }, [user, fetchNotifications]);

  // ─── Socket.IO Real-Time Events ───────────────────────────────────────────
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewNotification = (notif) => {
      setNotifications(prev => [notif, ...prev].slice(0, MAX_NOTIFS));
      setUnreadCount(c => c + 1);

      // Show a toast popup
      const icons = {
        TICKET_ASSIGNED:  '🎯',
        STATUS_CHANGED:   '🔄',
        TICKET_RESOLVED:  '✅',
        COMMENT_ADDED:    '💬',
        SLA_WARNING:      '⚠️',
        SLA_BREACHED:     '🚨',
      };
      const icon = icons[notif.type] || '🔔';

      toast.custom(
        (t) => (
          <div
            onClick={() => toast.dismiss(t.id)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '14px 18px', borderRadius: 14,
              background: 'rgba(15,23,42,0.95)',
              border: notif.type === 'SLA_BREACHED'
                ? '1px solid rgba(239,68,68,0.5)'
                : '1px solid rgba(59,130,246,0.3)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(12px)',
              cursor: 'pointer',
              maxWidth: 360,
              animation: t.visible ? 'slideIn 0.3s ease' : 'slideOut 0.2s ease',
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>
                {notif.title}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>
                {notif.message}
              </div>
            </div>
          </div>
        ),
        {
          duration: notif.type === 'SLA_BREACHED' ? 8000 : 5000,
          position: 'top-right',
        }
      );
    };

    // Ticket status changed (live ticket detail page update)
    const handleTicketStatusChanged = (data) => {
      // Re-emit as notification event for panels listening
      console.log('🔄 Ticket status changed:', data);
    };

    const handleSlaWarning = (data) => {
      toast.error(`⚠️ SLA Warning: Ticket ${data.ticketId} expires in ${data.remaining}`, {
        duration: 10000,
        icon: '⚠️',
      });
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('ticket:statusChanged', handleTicketStatusChanged);
    socket.on('sla:warning', handleSlaWarning);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('ticket:statusChanged', handleTicketStatusChanged);
      socket.off('sla:warning', handleSlaWarning);
    };
  }, [socket, user]);

  // ─── Mark as Read ──────────────────────────────────────────────────────────
  const markRead = useCallback(async (ids = []) => {
    try {
      await markNotificationsRead(ids);
      if (ids.length === 0) {
        // Mark all
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      } else {
        setNotifications(prev =>
          prev.map(n => ids.includes(n._id) ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - ids.length));
      }
    } catch (e) {
      console.error('Failed to mark notifications as read:', e.message);
    }
  }, []);

  const markAllRead = useCallback(() => markRead([]), [markRead]);

  const togglePanel = useCallback(() => {
    setPanelOpen(p => {
      if (!p && unreadCount > 0) {
        // Mark all as read when panel is opened
        markAllRead();
      }
      return !p;
    });
  }, [unreadCount, markAllRead]);

  const closePanel = useCallback(() => setPanelOpen(false), []);

  const value = {
    notifications,
    unreadCount,
    loading,
    panelOpen,
    fetchNotifications,
    markRead,
    markAllRead,
    togglePanel,
    closePanel,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return ctx;
}

export default NotificationContext;
