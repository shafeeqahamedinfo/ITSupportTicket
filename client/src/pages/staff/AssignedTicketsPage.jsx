import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { getAssignedTickets } from '../../services/staffService';
import {
  Ticket, Search, Filter, Clock, AlertTriangle, ArrowRight,
  ChevronLeft, ChevronRight, Inbox,
} from 'lucide-react';

const PRIORITY_CFG = {
  CRITICAL: { color: '#ef4444' },
  HIGH:     { color: '#f97316' },
  MEDIUM:   { color: '#eab308' },
  LOW:      { color: '#22c55e' },
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

function PriorityBadge({ p }) {
  const cfg = PRIORITY_CFG[p] || { color: '#94a3b8' };
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{ color: cfg.color, background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}
    >
      {p}
    </span>
  );
}

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

function SlaCell({ deadline, status }) {
  if (!deadline) return <span className="text-slate-400">—</span>;
  if (['RESOLVED','CLOSED'].includes(status)) return <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓ Done</span>;
  const diff = new Date(deadline) - new Date();
  const overdue = diff < 0;
  const hrs  = Math.abs(Math.floor(diff / 3600000));
  const mins = Math.abs(Math.floor((diff % 3600000) / 60000));
  return (
    <div className={`flex items-center gap-1 text-xs font-semibold ${overdue ? 'text-red-600 dark:text-red-400' : hrs < 2 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
      <Clock className="w-3 h-3" />
      {overdue ? `OVR ${hrs}h${mins}m` : `${hrs}h ${mins}m`}
    </div>
  );
}

export default function AssignedTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets]       = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState('');
  const [filters, setFilters]       = useState({ status: '', priority: '', page: 1 });
  const [searchInput, setSearchInput] = useState('');

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page: filters.page, limit: 12, sort: '-updatedAt' };
      if (filters.status)   params.status   = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (search)           params.search   = search;
      const data = await getAssignedTickets(params);
      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setFilters(f => ({ ...f, page: 1 }));
  };

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val, page: 1 }));

  return (
    <MainLayout title="Staff — My Assigned Tickets">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md flex-shrink-0">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">My Assigned Tickets</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              {loading ? 'Loading…' : `${pagination.total} ticket${pagination.total !== 1 ? 's' : ''} assigned to you`}
            </p>
          </div>
        </div>
        <Link to="/staff/available" className="btn-primary">
          <Inbox className="w-4 h-4" /> Pick Up More
        </Link>
      </div>

      {/* Search + Filter Row */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 mb-6 flex flex-wrap items-center gap-3 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search by title or ticket ID…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="input pl-9 py-2 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <button type="submit" className="btn-primary btn-sm">Search</button>
        </form>

        <Filter className="w-4 h-4 text-slate-400" />

        <select
          value={filters.status}
          onChange={e => setFilter('status', e.target.value)}
          className="input text-xs w-auto py-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
        >
          <option value="" className="bg-white dark:bg-slate-900">All Statuses</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k} className="bg-white dark:bg-slate-900">{v.label}</option>)}
        </select>

        <select
          value={filters.priority}
          onChange={e => setFilter('priority', e.target.value)}
          className="input text-xs w-auto py-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
        >
          <option value="" className="bg-white dark:bg-slate-900">All Priorities</option>
          <option value="CRITICAL" className="bg-white dark:bg-slate-900">Critical</option>
          <option value="HIGH" className="bg-white dark:bg-slate-900">High</option>
          <option value="MEDIUM" className="bg-white dark:bg-slate-900">Medium</option>
          <option value="LOW" className="bg-white dark:bg-slate-900">Low</option>
        </select>

        {(filters.status || filters.priority || search) && (
          <button
            onClick={() => { setFilters({ status: '', priority: '', page: 1 }); setSearch(''); setSearchInput(''); }}
            className="btn-ghost btn-sm text-red-600 dark:text-red-400"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading tickets…
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Ticket className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">No tickets found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try adjusting your filters or pick up some new tickets.</p>
            <Link to="/staff/available" className="btn-primary btn-sm mt-3 inline-flex">
              <Inbox className="w-4 h-4" /> Pick Up Tickets
            </Link>
          </div>
        ) : (
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
                  <th className="p-3.5 px-4">Updated</th>
                  <th className="p-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {tickets.map((t) => (
                  <tr
                    key={t._id}
                    onClick={() => navigate(`/staff/tickets/${t.ticketId}`)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="p-3.5 px-4 font-mono font-bold text-primary-600 dark:text-primary-400">{t.ticketId}</td>
                    <td className="p-3.5 px-4 text-slate-900 dark:text-slate-200 max-w-[220px] truncate font-medium">{t.title}</td>
                    <td className="p-3.5 px-4 text-slate-500 dark:text-slate-400">{t.category}</td>
                    <td className="p-3.5 px-4"><PriorityBadge p={t.priority} /></td>
                    <td className="p-3.5 px-4"><StatusBadge s={t.status} /></td>
                    <td className="p-3.5 px-4"><SlaCell deadline={t.slaDeadline} status={t.status} /></td>
                    <td className="p-3.5 px-4 text-slate-600 dark:text-slate-400">{t.createdBy?.fullName}</td>
                    <td className="p-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(t.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3.5 px-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/staff/tickets/${t.ticketId}`); }}
                        className="btn-ghost btn-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                      >
                        Open <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} disabled={filters.page <= 1}
            className="btn-secondary btn-sm disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-600/20 text-primary-700 dark:text-primary-300">
            {filters.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} disabled={filters.page >= pagination.totalPages}
            className="btn-secondary btn-sm disabled:opacity-40"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </MainLayout>
  );
}
