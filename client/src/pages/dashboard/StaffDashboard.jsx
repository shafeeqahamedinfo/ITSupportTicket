import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { useAuth } from '../../context/AuthContext';
import { getStaffStats } from '../../services/staffService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Ticket, CheckCircle, AlertTriangle, TrendingUp,
  Inbox, Star, RefreshCw, ArrowRight, Zap, Shield, Activity,
} from 'lucide-react';

// ─── Priority Config ──────────────────────────────────────────────────────────
const PRIORITY_CFG = {
  CRITICAL: { label: 'Critical', color: '#ef4444' },
  HIGH:     { label: 'High',     color: '#f97316' },
  MEDIUM:   { label: 'Medium',   color: '#eab308' },
  LOW:      { label: 'Low',      color: '#22c55e' },
};

const STATUS_CFG = {
  NEW:              { label: 'New',              color: '#3b82f6' },
  ASSIGNED:         { label: 'Assigned',         color: '#8b5cf6' },
  IN_PROGRESS:      { label: 'In Progress',      color: '#6366f1' },
  WAITING_FOR_USER: { label: 'Waiting',          color: '#f59e0b' },
  RESOLVED:         { label: 'Resolved',         color: '#10b981' },
  CLOSED:           { label: 'Closed',           color: '#64748b' },
  REOPENED:         { label: 'Reopened',         color: '#f43f5e' },
};

const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, color, sub, trend }) {
  return (
    <div
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-3 relative overflow-hidden shadow-sm"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="absolute -top-4 -right-4 opacity-5 pointer-events-none">
        <Icon size={90} color={color} />
      </div>
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        <Icon size={22} color={color} />
      </div>
      <div>
        <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">{value}</p>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mt-1.5">{label}</p>
      </div>
      {sub && <p className="text-slate-400 text-xs">{sub}</p>}
      {trend !== undefined && (
        <div className={`text-xs font-semibold flex items-center gap-1 ${trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          <TrendingUp size={12} />
          {trend >= 0 ? '+' : ''}{trend}% this week
        </div>
      )}
    </div>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────
function PriorityBadge({ p }) {
  const cfg = PRIORITY_CFG[p] || { label: p, color: '#94a3b8' };
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{ color: cfg.color, background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ s }) {
  const cfg = STATUS_CFG[s] || { label: s, color: '#94a3b8' };
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}
    >
      {cfg.label}
    </span>
  );
}

// ─── SLA Cell ─────────────────────────────────────────────────────────────────
function SlaCell({ deadline, status }) {
  if (!deadline) return <span className="text-slate-400">—</span>;
  const done = ['RESOLVED', 'CLOSED'].includes(status);
  const diff = new Date(deadline) - new Date();
  if (done) return <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓ Done</span>;
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const overdue = diff < 0;
  return (
    <span className={`text-xs font-semibold ${overdue ? 'text-red-600 dark:text-red-400' : hrs < 2 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
      {overdue ? 'Overdue' : `${hrs}h ${mins}m`}
    </span>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStaffStats();
      setStats(data.stats);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load dashboard stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const pieData = stats
    ? Object.entries(stats.byPriority || {})
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: PRIORITY_CFG[k]?.label || k, value: v }))
    : [];

  const statusData = stats
    ? Object.entries(stats.byStatus || {})
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: STATUS_CFG[k]?.label || k, count: v, color: STATUS_CFG[k]?.color || '#94a3b8' }))
    : [];

  if (loading) {
    return (
      <MainLayout title="Staff Dashboard">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Staff Dashboard">
        <div className="p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={fetchStats} className="btn-primary">
            Try Again
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Staff Dashboard">
      {/* ─ Header ─ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Staff Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Welcome back, {user?.fullName?.split(' ')[0]} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchStats}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Refresh statistics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link to="/staff/available" className="btn-primary btn-sm">
            <Inbox className="w-4 h-4" /> Pick Up Tickets
          </Link>
          <Link to="/staff/tickets" className="btn-secondary btn-sm">
            <Ticket className="w-4 h-4" /> My Tickets
          </Link>
        </div>
      </div>

      {/* ─ Performance Score Banner ─ */}
      {stats && (
        <div className="rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <span className="text-slate-900 dark:text-white font-bold text-sm">Performance Score</span>
          </div>
          <div className="flex-1 h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden min-w-[140px]">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000"
              style={{ width: `${stats.performanceScore}%` }}
            />
          </div>
          <span className="text-indigo-600 dark:text-indigo-400 font-extrabold text-xl">{stats.performanceScore}/100</span>
          <div className="hidden md:block w-px h-6 bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              Avg Resolution: <strong className="text-slate-900 dark:text-white">{stats.avgResolutionHrs}h</strong>
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              SLA Breached: <strong className={stats.slaBreached > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>{stats.slaBreached}</strong>
            </span>
          </div>
        </div>
      )}

      {/* ─ Stat Cards ─ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard icon={Ticket}       value={stats?.assignedTotal   ?? 0} label="Assigned to Me"       color="#3b82f6" />
        <StatCard icon={CheckCircle}  value={stats?.resolvedToday   ?? 0} label="Resolved Today"       color="#10b981" />
        <StatCard icon={Inbox}        value={stats?.availableTickets ?? 0} label="Available to Pick Up" color="#8b5cf6" />
        <StatCard icon={AlertTriangle} value={stats?.slaBreached    ?? 0} label="SLA Breached"         color="#ef4444" />
      </div>

      {/* ─ Charts Row ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Resolution Trend */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-sm">
          <h3 className="text-slate-900 dark:text-white font-bold text-sm mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Resolution Trend (6 months)
          </h3>
          {stats?.monthlyTrend?.length > 0 ? (
            <div className="h-52 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#f1f5f9', fontSize: 12 }}
                    cursor={{ fill: 'rgba(99,102,241,0.1)' }}
                  />
                  <Bar dataKey="resolved" name="Resolved" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-52 text-slate-400">
              <TrendingUp className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-xs">No resolved tickets recorded yet</p>
            </div>
          )}
        </div>

        {/* Priority Distribution */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-sm">
          <h3 className="text-slate-900 dark:text-white font-bold text-sm mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Priority Distribution
          </h3>
          {pieData.length > 0 ? (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#f1f5f9', fontSize: 12 }} />
                  <Legend verticalAlign="bottom" formatter={(val) => <span className="text-slate-600 dark:text-slate-400 text-xs font-semibold">{val}</span>} iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-52 text-slate-400">
              <Ticket className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-xs">No priority data recorded</p>
            </div>
          )}
        </div>
      </div>

      {/* ─ Status Breakdown ─ */}
      {statusData.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 mb-6 shadow-sm">
          <h3 className="text-slate-900 dark:text-white font-bold text-sm mb-3">Status Breakdown</h3>
          <div className="flex items-center gap-3 flex-wrap">
            {statusData.map(({ name, count, color }) => (
              <div
                key={name}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold"
                style={{ background: `${color}10`, borderColor: `${color}30` }}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-slate-600 dark:text-slate-400">{name}</span>
                <span style={{ color }} className="font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─ Recent Activity Table ─ */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-slate-900 dark:text-white font-bold text-sm">Recent Activity</h3>
          <Link to="/staff/tickets" className="text-primary-600 dark:text-primary-400 hover:underline text-xs font-semibold flex items-center gap-1">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {stats?.recentActivity?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="p-3.5 px-4">Ticket ID</th>
                  <th className="p-3.5 px-4">Title</th>
                  <th className="p-3.5 px-4">Category</th>
                  <th className="p-3.5 px-4">Priority</th>
                  <th className="p-3.5 px-4">Status</th>
                  <th className="p-3.5 px-4">SLA</th>
                  <th className="p-3.5 px-4">Requester</th>
                  <th className="p-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {stats.recentActivity.map((t) => (
                  <tr
                    key={t._id}
                    onClick={() => navigate(`/staff/tickets/${t.ticketId}`)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="p-3.5 px-4 font-mono font-bold text-primary-600 dark:text-primary-400">{t.ticketId}</td>
                    <td className="p-3.5 px-4 text-slate-900 dark:text-slate-200 max-w-[200px] truncate font-medium">{t.title}</td>
                    <td className="p-3.5 px-4 text-slate-500 dark:text-slate-400">{t.category}</td>
                    <td className="p-3.5 px-4"><PriorityBadge p={t.priority} /></td>
                    <td className="p-3.5 px-4"><StatusBadge s={t.status} /></td>
                    <td className="p-3.5 px-4"><SlaCell deadline={t.slaDeadline} status={t.status} /></td>
                    <td className="p-3.5 px-4 text-slate-600 dark:text-slate-400">{t.createdBy?.fullName}</td>
                    <td className="p-3.5 px-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/staff/tickets/${t.ticketId}`); }}
                        className="btn-ghost btn-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                      >
                        Open →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-slate-400">
            <Ticket className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No tickets assigned yet.</p>
            <Link to="/staff/available" className="btn-primary btn-sm mt-3 inline-flex">
              <Inbox className="w-4 h-4" /> Pick Up a Ticket
            </Link>
          </div>
        )}
      </div>

      <p className="text-center text-slate-400 dark:text-slate-600 text-xs mt-4">
        Last refreshed: {lastRefresh.toLocaleTimeString()}
      </p>
    </MainLayout>
  );
}
