import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Monitor, LayoutDashboard, Ticket, PlusCircle, User,
  BookOpen, Bell, Settings, LogOut, ChevronRight, X, ShieldAlert,
} from 'lucide-react';
import { cn, getInitials } from '../utils/helpers';
import toast from 'react-hot-toast';

const USER_NAV = [
  { to: '/dashboard',      icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard' },
  { to: '/tickets/new',    icon: <PlusCircle className="w-4 h-4" />,      label: 'New Ticket' },
  { to: '/tickets',        icon: <Ticket className="w-4 h-4" />,          label: 'My Tickets' },
  { to: '/knowledge-base', icon: <BookOpen className="w-4 h-4" />,        label: 'Knowledge Base' },
  { to: '/profile',        icon: <User className="w-4 h-4" />,            label: 'My Profile' },
];

const STAFF_NAV = [
  { to: '/staff',            icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard' },
  { to: '/staff/tickets',    icon: <Ticket className="w-4 h-4" />,          label: 'Assigned Tickets' },
  { to: '/staff/available',  icon: <Bell className="w-4 h-4" />,            label: 'Available Tickets' },
  { to: '/profile',          icon: <User className="w-4 h-4" />,            label: 'My Profile' },
];

const ADMIN_NAV = [
  { to: '/admin',             icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard' },
  { to: '/admin/tickets',     icon: <Ticket className="w-4 h-4" />,          label: 'All Tickets' },
  { to: '/admin/sla',         icon: <ShieldAlert className="w-4 h-4" />,      label: 'SLA Engine' },
  { to: '/admin/users',       icon: <User className="w-4 h-4" />,            label: 'Users' },
  { to: '/admin/staff',       icon: <Settings className="w-4 h-4" />,        label: 'IT Staff' },
  { to: '/admin/departments', icon: <BookOpen className="w-4 h-4" />,        label: 'Departments' },
  { to: '/admin/categories',  icon: <Settings className="w-4 h-4" />,        label: 'Categories' },
  { to: '/admin/reports',     icon: <LayoutDashboard className="w-4 h-4" />, label: 'Reports' },
  { to: '/admin/logs',        icon: <Bell className="w-4 h-4" />,            label: 'Activity Logs' },
];

const NAV_MAP = { user: USER_NAV, it_staff: STAFF_NAV, admin: ADMIN_NAV };

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = NAV_MAP[user?.role] || USER_NAV;

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully.');
    navigate('/login');
  };

  const roleLabel = { user: 'User', it_staff: 'IT Support Staff', admin: 'Administrator' };
  const roleBadge = {
    user:     'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/30',
    it_staff: 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700/30',
    admin:    'bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700/30',
  };

  return (
    <>
      {/* Mobile Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-[260px] z-40 flex flex-col transition-all duration-200 ease-in-out',
          'bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-primary-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/20 flex-shrink-0">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-slate-900 dark:text-white font-bold text-sm tracking-tight leading-tight">SmartCampus</p>
              <p className="text-primary-600 dark:text-primary-400 text-[11px] font-medium tracking-wide">ITCare System</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card */}
        <div className="mx-3 my-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md flex-shrink-0">
              {getInitials(user?.fullName || 'U')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-slate-900 dark:text-white text-xs font-semibold truncate leading-snug">{user?.fullName}</p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate leading-tight mt-0.5">{user?.email}</p>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Role</span>
            <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide border', roleBadge[user?.role])}>
              {roleLabel[user?.role]}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1 scrollbar-hide">
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2 mb-2">
            Navigation
          </p>
          <div className="space-y-1">
            {navItems.map(({ to, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={true}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group border',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-600/20 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-500/30 shadow-sm'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                  )
                }
              >
                <span className="flex-shrink-0 transition-transform group-hover:scale-110">{icon}</span>
                <span className="flex-1 truncate">{label}</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-70 transition-opacity flex-shrink-0" />
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-500/20 border border-transparent transition-all duration-150"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
