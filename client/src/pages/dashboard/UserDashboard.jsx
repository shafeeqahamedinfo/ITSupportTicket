import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { useAuth } from '../../context/AuthContext';
import { getMyStats } from '../../services/ticketService';
import {
  Ticket, PlusCircle, Clock, CheckCircle, AlertCircle,
  TrendingUp, ChevronRight, Loader, RefreshCw, Zap,
  Circle, Calendar, Shield, XCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { formatDate, timeAgo, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, cn } from '../../utils/helpers';

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, loading }) {
  return (
    <div
      className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 flex items-center gap-4 shadow-sm"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        {loading ? (
          <div className="skeleton h-7 w-12 mb-1" />
        ) : (
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{value}</p>
        )}
        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mt-1.5 truncate">{label}</p>
      </div>
    </div>
  );
}

function PriorityDot({ priority }) {
  const colors = {
    CRITICAL: 'bg-red-500',
    HIGH:     'bg-orange-500',
    MEDIUM:   'bg-yellow-500',
    LOW:      'bg-emerald-500',
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[priority] || 'bg-slate-500'}`} />;
}

function StatusBadge({ status }) {
  const classes = {
    NEW:              'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/30',
    ASSIGNED:         'bg-purple-50 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700/30',
    IN_PROGRESS:      'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700/30',
    WAITING_FOR_USER: 'bg-amber-50 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/30',
    RESOLVED:         'bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/30',
    CLOSED:           'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-600/30',
    REOPENED:         'bg-rose-50 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700/30',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${classes[status] || classes.NEW}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

const PIE_COLORS = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#eab308',
  LOW:      '#22c55e',
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function UserDashboard() {
  const { user } = useAuth();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMyStats();
      setStats(data.stats);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const statCards = [
    { label: 'Total Tickets', value: stats?.total ?? '–', icon: <Ticket className="w-5 h-5 text-blue-500" />, color: '#3b82f6' },
    { label: 'Open', value: stats?.open ?? '–', icon: <Circle className="w-5 h-5 text-amber-500" />, color: '#f59e0b' },
    { label: 'In Progress', value: stats?.inProgress ?? '–', icon: <Zap className="w-5 h-5 text-indigo-500" />, color: '#6366f1' },
    { label: 'Resolved', value: stats?.resolved ?? '–', icon: <CheckCircle className="w-5 h-5 text-emerald-500" />, color: '#10b981' },
  ];

  const priorityChartData = stats
    ? Object.entries(stats.byPriority || {}).map(([name, value]) => ({ name, value }))
    : [];

  const monthlyData = stats?.monthlyTrend || [];

  return (
    <MainLayout title="My Dashboard">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-800 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 border border-primary-500/30 dark:border-primary-800/50 p-6 md:p-7 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl shadow-primary-600/10">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.fullName?.split(' ')[0]}! 👋
          </h1>
          <p className="text-primary-100 dark:text-slate-300 text-xs md:text-sm mt-1.5 flex items-center gap-2 font-medium">
            <Calendar className="w-3.5 h-3.5 text-primary-200 dark:text-primary-400" />
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
            title="Refresh statistics"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <Link to="/tickets/new" className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-primary-600/25 transition-all">
            <PlusCircle className="w-4 h-4" />
            New Ticket
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} loading={loading} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Monthly Trend */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 p-5 md:p-6 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-900 dark:text-white font-bold text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              Monthly Ticket Trend
            </h3>
            <span className="text-slate-500 text-xs">Last 6 Months</span>
          </div>
          {loading ? (
            <div className="skeleton h-52 rounded-xl" />
          ) : monthlyData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-slate-500">
              <Calendar className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs">No ticket history available</p>
            </div>
          ) : (
            <div className="h-52 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#f1f5f9', fontSize: 12 }}
                    cursor={{ fill: 'rgba(99,102,241,0.1)' }}
                  />
                  <Bar dataKey="tickets" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Priority Distribution */}
        <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 p-5 md:p-6 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-900 dark:text-white font-bold text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              By Priority
            </h3>
            <span className="text-slate-500 text-xs">Distribution</span>
          </div>
          {loading ? (
            <div className="skeleton h-52 rounded-xl" />
          ) : priorityChartData.filter((d) => d.value > 0).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-slate-500">
              <Shield className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs">No priority data recorded</p>
            </div>
          ) : (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityChartData.filter((d) => d.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                  >
                    {priorityChartData.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#6366f1'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#f1f5f9', fontSize: 12 }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    formatter={(val) => <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>{val}</span>}
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-slate-900 dark:text-white font-semibold text-sm">Recent Tickets</h3>
          <Link to="/tickets" className="text-primary-600 dark:text-primary-400 hover:underline text-xs font-medium flex items-center gap-1 transition-colors">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton h-10 w-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-2/3 rounded" />
                  <div className="skeleton h-3 w-1/3 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : !stats?.recentTickets?.length ? (
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
              <Ticket className="w-7 h-7 text-slate-600" />
            </div>
            <h4 className="text-slate-300 font-medium mb-1">No tickets yet</h4>
            <p className="text-slate-500 text-sm mb-4">Create your first IT support ticket to get started.</p>
            <Link to="/tickets/new" className="btn-primary btn-sm">
              <PlusCircle className="w-4 h-4" />
              Create Ticket
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {stats.recentTickets.map((ticket) => (
              <Link
                key={ticket._id}
                to={`/tickets/${ticket.ticketId}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
              >
                {/* Priority Indicator */}
                <div className="flex-shrink-0">
                  <PriorityDot priority={ticket.priority} />
                </div>

                {/* Ticket Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-mono">{ticket.ticketId}</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="text-slate-500 dark:text-slate-400 text-xs">{ticket.category}</span>
                  </div>
                  <p className="text-slate-900 dark:text-slate-100 text-sm font-semibold truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {ticket.title}
                  </p>
                </div>

                {/* Status & Time */}
                <div className="flex-shrink-0 text-right hidden sm:block">
                  <StatusBadge status={ticket.status} />
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{timeAgo(ticket.createdAt)}</p>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {[
          { to: '/tickets/new', icon: <PlusCircle className="w-5 h-5" />, label: 'Create New Ticket', desc: 'Report an IT issue', color: 'bg-primary-50 dark:bg-primary-600/20 border-primary-200 dark:border-primary-700/30 text-slate-900 dark:text-white hover:bg-primary-100 dark:hover:bg-primary-600/30' },
          { to: '/tickets',     icon: <Ticket className="w-5 h-5" />,     label: 'View My Tickets', desc: 'Track your requests', color: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700' },
          { to: '/knowledge-base', icon: <Shield className="w-5 h-5" />, label: 'Knowledge Base', desc: 'Find self-help guides', color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/30 text-slate-900 dark:text-white hover:bg-emerald-100 dark:hover:bg-emerald-900/30' },
        ].map(({ to, icon, label, desc, color }) => (
          <Link
            key={to}
            to={to}
            className={`rounded-2xl border p-4 flex items-center gap-4 transition-all duration-200 group ${color}`}
          >
            <div className="text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform flex-shrink-0">{icon}</div>
            <div className="min-w-0">
              <p className="text-slate-900 dark:text-white font-semibold text-sm">{label}</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs">{desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 ml-auto flex-shrink-0 transition-colors" />
          </Link>
        ))}
      </div>
    </MainLayout>
  );
}
