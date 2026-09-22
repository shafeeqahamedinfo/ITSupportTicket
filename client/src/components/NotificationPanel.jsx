/**
 * NotificationPanel.jsx
 * Sliding right-side notification drawer.
 * Shows all notifications, grouped by read/unread.
 * Triggered by the bell icon in Header.
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import {
  Bell, X, CheckCheck, RefreshCw, Ticket, MessageSquare,
  AlertTriangle, CheckCircle, Clock, Info,
} from 'lucide-react';

// ─── Config ───────────────────────────────────────────────────────────────────
const NOTIF_TYPE_CFG = {
  TICKET_ASSIGNED:  { icon: Ticket,        color: '#3b82f6', label: 'Assigned'  },
  STATUS_CHANGED:   { icon: RefreshCw,     color: '#8b5cf6', label: 'Updated'   },
  TICKET_RESOLVED:  { icon: CheckCircle,   color: '#10b981', label: 'Resolved'  },
  COMMENT_ADDED:    { icon: MessageSquare, color: '#06b6d4', label: 'Comment'   },
  SLA_WARNING:      { icon: Clock,         color: '#f97316', label: 'SLA Alert' },
  SLA_BREACHED:     { icon: AlertTriangle, color: '#ef4444', label: 'SLA Breach'},
  TICKET_CLOSED:    { icon: CheckCheck,    color: '#64748b', label: 'Closed'    },
  DEFAULT:          { icon: Bell,          color: '#94a3b8', label: 'Notice'    },
};

function timeAgoShort(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotifItem({ notif, onNavigate }) {
  const cfg = NOTIF_TYPE_CFG[notif.type] || NOTIF_TYPE_CFG.DEFAULT;
  const Icon = cfg.icon;

  return (
    <div
      onClick={() => notif.ticketId && onNavigate(notif)}
      className={`flex gap-3 p-3.5 border-b border-slate-100 dark:border-slate-800/80 transition-colors relative ${
        notif.ticketId ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''
      } ${notif.isRead ? 'bg-transparent' : 'bg-blue-50/40 dark:bg-blue-950/20'}`}
    >
      {/* Unread dot */}
      {!notif.isRead && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
      )}

      {/* Icon */}
      <div
        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center"
        style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}
      >
        <Icon size={16} color={cfg.color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={`text-xs ${notif.isRead ? 'font-normal text-slate-800 dark:text-slate-200' : 'font-semibold text-slate-900 dark:text-white'} truncate mb-0.5`}>
          {notif.title}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {notif.message}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ color: cfg.color, background: `${cfg.color}18` }}
          >
            {cfg.label}
          </span>
          {notif.ticketId && (
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
              {notif.ticketId}
            </span>
          )}
          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
            {timeAgoShort(notif.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function NotificationPanel() {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const {
    notifications, unreadCount, loading, panelOpen,
    fetchNotifications, markAllRead, closePanel,
  } = useNotifications();

  // Close on outside click
  useEffect(() => {
    if (!panelOpen) return;
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        closePanel();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [panelOpen, closePanel]);

  // Close on Escape
  useEffect(() => {
    if (!panelOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') closePanel(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [panelOpen, closePanel]);

  const handleNavigate = (notif) => {
    closePanel();
    if (notif.ticket) navigate(`/tickets/${notif.ticket}`);
  };

  const unread = notifications.filter(n => !n.isRead);
  const read   = notifications.filter(n => n.isRead);

  return (
    <>
      {/* Backdrop */}
      {panelOpen && (
        <div
          onClick={closePanel}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-30"
        />
      )}

      {/* Sliding Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 bottom-0 w-full max-w-[380px] z-40 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out ${
          panelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Panel Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Bell size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                </p>
              </div>
            </div>
            <button
              onClick={closePanel}
              className="p-1.5 rounded-lg bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={fetchNotifications}
              disabled={loading}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-700/30 hover:bg-primary-100 transition flex items-center justify-center gap-1.5"
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading notifications…
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Bell size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">All caught up!</p>
              <p className="text-xs text-slate-500">No notifications yet. You'll be notified when there's activity on your tickets.</p>
            </div>
          ) : (
            <>
              {/* Unread section */}
              {unread.length > 0 && (
                <>
                  <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
                    Unread ({unread.length})
                  </div>
                  {unread.map(n => (
                    <NotifItem key={n._id} notif={n} onNavigate={handleNavigate} />
                  ))}
                </>
              )}

              {/* Read section */}
              {read.length > 0 && (
                <>
                  <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
                    Earlier
                  </div>
                  {read.map(n => (
                    <NotifItem key={n._id} notif={n} onNavigate={handleNavigate} />
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* Panel Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 text-[11px] text-slate-400 dark:text-slate-500 text-center flex-shrink-0">
          Showing last {notifications.length} notifications · Real-time via Socket.IO
        </div>
      </div>
    </>
  );
}
