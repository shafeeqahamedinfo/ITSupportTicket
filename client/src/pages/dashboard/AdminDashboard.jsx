import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { getAdminStats } from '../../services/adminService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import {
  Users, Ticket, CheckCircle, AlertTriangle, TrendingUp, Shield,
  Building, ArrowRight, Activity, Zap, RefreshCw, Star,
} from 'lucide-react';

// ─── Config ───────────────────────────────────────────────────────────────────
const PRIORITY_COLORS  = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' };
const STATUS_COLORS    = {
  NEW: '#60a5fa', ASSIGNED: '#a78bfa', IN_PROGRESS: '#34d399',
  WAITING_FOR_USER: '#fbbf24', RESOLVED: '#22c55e', CLOSED: '#6b7280', REOPENED: '#f87171',
};
const STATUS_LABELS    = {
  NEW: 'New', ASSIGNED: 'Assigned', IN_PROGRESS: 'In Progress',
  WAITING_FOR_USER: 'Waiting', RESOLVED: 'Resolved', CLOSED: 'Closed', REOPENED: 'Reopened',
};
const PRIORITY_LABELS  = { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
const PIE_COLORS_ARR   = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a78bfa','#06b6d4','#ec4899'];

// ─── Components ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, color, sub, link }) {
  const content = (
    <div
      className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-2.5 sm:gap-3 relative overflow-hidden shadow-sm hover:shadow-md transition-all group"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="absolute -top-4 -right-4 opacity-5 dark:opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
        <Icon size={80} color={color} />
      </div>
      <div className="flex items-center justify-between">
        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon size={18} color={color} />
        </div>
        {link && (
          <span className="text-xs font-semibold flex items-center gap-1 transition-colors" style={{ color }}>
            Manage <ArrowRight size={12} />
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">{value}</p>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1.5">{label}</p>
      </div>
      {sub && <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{sub}</p>}
    </div>
  );
  return link ? <Link to={link} className="no-underline">{content}</Link> : content;
}

function PriorityBadge({ p }) {
  const color = PRIORITY_COLORS[p] || '#94a3b8';
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
      {PRIORITY_LABELS[p] || p}
    </span>
  );
}

function StatusBadge({ s }) {
  const color = STATUS_COLORS[s] || '#94a3b8';
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
      {STATUS_LABELS[s] || s}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminStats();
      setStats(data.stats);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load admin stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <MainLayout title="Admin Dashboard">
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="h-32 rounded-2xl skeleton" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Admin Dashboard">
        <div className="p-12 text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-500 font-semibold">{error}</p>
          <button onClick={fetchStats} className="btn-primary mt-4">Retry</button>
        </div>
      </MainLayout>
    );
  }

  // ─── Chart data prep ───
  const priorityPieData = stats
    ? Object.entries(stats.byPriority)
        .filter(([,v]) => v > 0)
        .map(([k, v]) => ({ name: PRIORITY_LABELS[k] || k, value: v, color: PRIORITY_COLORS[k] }))
    : [];

  const statusBarData = stats
    ? Object.entries(stats.byStatus)
        .filter(([,v]) => v > 0)
        .map(([k, v]) => ({ name: STATUS_LABELS[k] || k, count: v, color: STATUS_COLORS[k] }))
    : [];

  const categoryData = stats?.byCategory || [];

  return (
    <MainLayout title="Admin Dashboard">
      <div className="space-y-6">

        {/* ─ Header ─ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-600/20 flex-shrink-0">
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Admin Dashboard</h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                System-wide overview — {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchStats}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <Link
              to="/admin/users"
              className="px-3.5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1.5 no-underline hover:bg-blue-100 transition-colors shadow-sm"
            >
              <Users size={14} /> Users
            </Link>
            <Link
              to="/admin/tickets"
              className="px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 no-underline hover:bg-rose-100 transition-colors shadow-sm"
            >
              <Ticket size={14} /> All Tickets
            </Link>
            <Link
              to="/admin/departments"
              className="px-3.5 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/30 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center gap-1.5 no-underline hover:bg-purple-100 transition-colors shadow-sm"
            >
              <Building size={14} /> Depts
            </Link>
          </div>
        </div>

        {/* ─ KPI Cards Grid ─ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={Ticket}       value={stats?.totalTickets   ?? 0} label="Total Tickets"     color="#3b82f6" link="/admin/tickets" />
          <StatCard icon={AlertTriangle} value={stats?.openTickets   ?? 0} label="Open Tickets"      color="#f97316" sub="Requires attention" />
          <StatCard icon={CheckCircle}  value={stats?.resolvedToday  ?? 0} label="Resolved Today"    color="#22c55e" />
          <StatCard icon={Zap}          value={stats?.slaBreached    ?? 0} label="SLA Breached"      color="#ef4444" sub="Needs immediate action" />
          <StatCard icon={Users}        value={stats?.totalUsers     ?? 0} label="Total Users"       color="#a78bfa" link="/admin/users" />
          <StatCard icon={Shield}       value={stats?.activeStaff   ?? 0} label="Active IT Staff"   color="#06b6d4" />
          <StatCard icon={Building}     value={stats?.totalDepts     ?? 0} label="Departments"       color="#ec4899" link="/admin/departments" />
          <StatCard icon={TrendingUp}   value={stats?.pendingUserCount ?? 0} label="Inactive Accounts" color="#64748b" />
        </div>

        {/* ─ Tabs Bar ─ */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 max-w-full overflow-x-auto whitespace-nowrap scrollbar-hide">
          {[
            { id:'overview', label:'Overview' },
            { id:'performance', label:'Staff Performance' },
            { id:'recent', label:'Recent Tickets' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === t.id
                  ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200 dark:border-slate-700/60'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ─ OVERVIEW TAB ─ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trend */}
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 md:p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-primary-600 dark:text-primary-400" /> Monthly Trend (6 months)
                </h3>
                {stats?.monthlyTrend?.length > 0 ? (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.monthlyTrend}>
                        <defs>
                          <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradResolved" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fill:'#64748b', fontSize:11 }} />
                        <YAxis tick={{ fill:'#64748b', fontSize:11 }} />
                        <Tooltip contentStyle={{ background:'#0f172a', border:'1px solid #334155', borderRadius:10, color:'#f1f5f9' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize:12, color:'#64748b' }} />
                        <Area type="monotone" dataKey="created" name="Created" stroke="#3b82f6" fill="url(#gradCreated)" strokeWidth={2} />
                        <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#22c55e" fill="url(#gradResolved)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-56 flex items-center justify-center text-slate-500 text-xs">No trend data available</div>
                )}
              </div>

              {/* Priority Pie */}
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 md:p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Zap size={16} className="text-amber-500" /> Priority Distribution
                </h3>
                {priorityPieData.length > 0 ? (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={priorityPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                          {priorityPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background:'#0f172a', border:'1px solid #334155', borderRadius:10, color:'#f1f5f9' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize:12, color:'#64748b' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-56 flex items-center justify-center text-slate-500 text-xs">No tickets available</div>
                )}
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Bar Chart */}
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 md:p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Tickets by Status</h3>
                {statusBarData.length > 0 ? (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusBarData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis type="number" tick={{ fill:'#64748b', fontSize:11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fill:'#64748b', fontSize:11 }} width={90} />
                        <Tooltip contentStyle={{ background:'#0f172a', border:'1px solid #334155', borderRadius:10, color:'#f1f5f9' }} />
                        <Bar dataKey="count" name="Count" radius={[0,6,6,0]}>
                          {statusBarData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-56 flex items-center justify-center text-slate-500 text-xs">No status data available</div>
                )}
              </div>

              {/* Category Bar Chart */}
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 md:p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Top Categories</h3>
                {categoryData.length > 0 ? (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="category" tick={{ fill:'#64748b', fontSize:10 }} angle={-20} textAnchor="end" height={40} />
                        <YAxis tick={{ fill:'#64748b', fontSize:11 }} />
                        <Tooltip contentStyle={{ background:'#0f172a', border:'1px solid #334155', borderRadius:10, color:'#f1f5f9' }} />
                        <Bar dataKey="count" name="Tickets" radius={[6,6,0,0]}>
                          {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS_ARR[i % PIE_COLORS_ARR.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-56 flex items-center justify-center text-slate-500 text-xs">No category data available</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─ STAFF PERFORMANCE TAB ─ */}
        {activeTab === 'performance' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 md:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Star size={16} className="text-amber-500" />
                Staff Performance Leaderboard
              </h3>
              <Link to="/admin/users?role=it_staff" className="text-xs font-bold text-primary-600 dark:text-primary-400 no-underline hover:underline">View All Staff →</Link>
            </div>
            {stats?.staffPerformance?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                      {['Rank', 'Staff Member', 'Resolved', 'Avg Resolution', 'SLA Breached', 'Score'].map(h => (
                        <th key={h} className="p-3.5 px-5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {stats.staffPerformance.map((s, i) => {
                      const score = Math.min(100, Math.round(s.resolved * 3 - s.slaBreached * 5));
                      return (
                        <tr key={s._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5 px-5">
                            <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                              i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                              i === 1 ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                              i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                        'bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400'
                            }`}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="p-3.5 px-5">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{s.name}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.email}</p>
                          </td>
                          <td className="p-3.5 px-5 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">{s.resolved}</td>
                          <td className="p-3.5 px-5 text-slate-600 dark:text-slate-400">{s.avgResolutionHrs?.toFixed(1) ?? '—'}h</td>
                          <td className={`p-3.5 px-5 font-semibold ${s.slaBreached > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{s.slaBreached}</td>
                          <td className="p-3.5 px-5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden min-w-[80px]">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" style={{ width: `${Math.max(0,score)}%` }} />
                              </div>
                              <span className="font-bold text-indigo-600 dark:text-indigo-400 min-w-[28px]">{score}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs">
                <Star size={36} className="mx-auto mb-2 opacity-40" />
                <p>No resolved tickets yet. Staff leaderboard will update dynamically.</p>
              </div>
            )}
          </div>
        )}

        {/* ─ RECENT TICKETS TAB ─ */}
        {activeTab === 'recent' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 md:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Tickets (System-Wide)</h3>
              <Link to="/admin/tickets" className="text-xs font-bold text-primary-600 dark:text-primary-400 no-underline hover:underline">View All Tickets →</Link>
            </div>
            {stats?.recentTickets?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                      {['Ticket ID','Title','Category','Priority','Status','SLA','Requester','Assigned To','Created'].map(h => (
                        <th key={h} className="p-3.5 px-4 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {stats.recentTickets.map(t => {
                      const slaDiff = t.slaDeadline ? new Date(t.slaDeadline) - new Date() : null;
                      return (
                        <tr key={t._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5 px-4 font-mono font-bold text-primary-600 dark:text-primary-400">{t.ticketId}</td>
                          <td className="p-3.5 px-4 text-slate-800 dark:text-slate-200 max-w-[180px] truncate">{t.title}</td>
                          <td className="p-3.5 px-4 text-slate-500 dark:text-slate-400">{t.category}</td>
                          <td className="p-3.5 px-4"><PriorityBadge p={t.priority} /></td>
                          <td className="p-3.5 px-4"><StatusBadge s={t.status} /></td>
                          <td className="p-3.5 px-4">
                            {t.slaBreached ? (
                              <span className="text-red-500 font-bold">⚠ Breached</span>
                            ) : slaDiff != null ? (
                              <span className={`font-semibold ${slaDiff < 0 ? 'text-red-500' : slaDiff < 7200000 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                {slaDiff < 0 ? 'Overdue' : `${Math.floor(slaDiff/3600000)}h`}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="p-3.5 px-4 text-slate-600 dark:text-slate-400">{t.createdBy?.fullName}</td>
                          <td className="p-3.5 px-4 text-slate-600 dark:text-slate-400">{t.assignedTo?.fullName || <span className="text-slate-400 italic">Unassigned</span>}</td>
                          <td className="p-3.5 px-4 text-slate-500 dark:text-slate-500 whitespace-nowrap">
                            {new Date(t.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs">
                <Ticket size={36} className="mx-auto mb-2 opacity-40" />
                <p>No tickets recorded in the system yet.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </MainLayout>
  );
}
