import { useState, useEffect } from 'react';
import { Bell, Menu, Sun, Moon, ChevronDown, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useSocket } from '../context/SocketContext';
import { getInitials } from '../utils/helpers';
import { Link } from 'react-router-dom';

export default function Header({ onMenuClick, title }) {
  const { user } = useAuth();
  const { unreadCount, togglePanel } = useNotifications();
  const { connected } = useSocket();
  const [darkMode, setDarkMode] = useState(false);

  // Persist theme
  useEffect(() => {
    const stored = localStorage.getItem('itcare_theme');
    if (stored === 'light') {
      document.documentElement.classList.remove('dark');
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('itcare_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('itcare_theme', 'light');
    }
  };

  const roleColor = {
    admin:    '#ef4444',
    it_staff: '#3b82f6',
    user:     '#8b5cf6',
  }[user?.role] || '#64748b';

  return (
    <header className="h-16 px-3 sm:px-5 flex items-center gap-2 sm:gap-3 sticky top-0 z-20 backdrop-blur-md transition-colors duration-200 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800/80 max-w-full overflow-hidden">
      {/* Hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="mobile-menu-btn p-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-white bg-transparent border-0 cursor-pointer hidden flex-shrink-0"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Page Title */}
      <div className="flex-1 min-w-0">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 m-0 truncate">{title}</h2>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">

        {/* Socket.IO connection status indicator (hidden on narrow screens) */}
        <div
          title={connected ? 'Real-time: Connected' : 'Real-time: Disconnected'}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
            connected
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
          }`}
        >
          {connected ? (
            <Wifi size={13} className="text-emerald-500" />
          ) : (
            <WifiOff size={13} className="text-red-500" />
          )}
          <span className="connection-label hidden sm:inline-block text-[11px]">
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>

        {/* Dark / Light mode toggle */}
        <button
          onClick={toggleDarkMode}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer flex items-center justify-center transition-all shadow-sm flex-shrink-0"
        >
          {darkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-600" />}
        </button>

        {/* Notification Bell */}
        <button
          onClick={togglePanel}
          title="Notifications"
          className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer flex items-center justify-center transition-all shadow-sm flex-shrink-0"
        >
          <Bell size={16} style={{
            animation: unreadCount > 0 ? 'bellRing 2s ease-in-out infinite' : 'none',
          }} />

          {/* Unread badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-extrabold rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Avatar + Name */}
        <Link
          to="/profile"
          className="flex items-center gap-2 p-1 sm:p-1.5 sm:pr-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all text-slate-800 dark:text-slate-100 no-underline shadow-sm flex-shrink-0"
        >
          {/* Avatar */}
          <div
            className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${roleColor}, ${roleColor}bb)`,
            }}
          >
            {getInitials(user?.fullName || 'U')}
          </div>

          {/* Name + Role */}
          <div className="user-info hidden sm:block text-left">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {user?.fullName?.split(' ')[0]}
            </div>
            <div className="text-[10px] font-semibold leading-none mt-0.5" style={{ color: roleColor }}>
              {user?.role === 'it_staff' ? 'IT Staff' : user?.role === 'admin' ? 'Admin' : 'User'}
            </div>
          </div>

          <ChevronDown size={13} className="chevron text-slate-400 dark:text-slate-500 hidden sm:block" />
        </Link>
      </div>

      <style>{`
        @media (min-width: 640px) {
          .user-info { display: block !important; }
          .chevron { display: block !important; }
          .connection-label { display: block !important; }
        }
        @media (max-width: 1024px) {
          .mobile-menu-btn { display: flex !important; }
        }

        @keyframes bellRing {
          0%, 90%, 100% { transform: rotate(0deg); }
          92%  { transform: rotate(-8deg); }
          94%  { transform: rotate(8deg); }
          96%  { transform: rotate(-6deg); }
          98%  { transform: rotate(6deg); }
        }

        @keyframes pulse-badge {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50%       { transform: scale(1.1); box-shadow: 0 0 0 4px rgba(239,68,68,0); }
        }
      `}</style>
    </header>
  );
}
