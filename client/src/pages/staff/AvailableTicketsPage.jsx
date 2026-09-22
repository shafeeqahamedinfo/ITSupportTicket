import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { getAvailableTickets, selfAssignTicket } from '../../services/staffService';
import { Inbox, Filter, Zap, Clock, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Loader } from 'lucide-react';

const PRIORITY_CFG = {
  CRITICAL: { label: 'Critical', color: '#ef4444' },
  HIGH:     { label: 'High',     color: '#f97316' },
  MEDIUM:   { label: 'Medium',   color: '#eab308' },
  LOW:      { label: 'Low',      color: '#22c55e' },
};

const CATEGORIES = ['Network', 'Hardware', 'Software', 'Email', 'Account', 'Printer', 'Security', 'Other'];

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

function SlaCountdown({ deadline }) {
  if (!deadline) return null;
  const diff = new Date(deadline) - new Date();
  const overdue = diff < 0;
  const hrs = Math.abs(Math.floor(diff / 3600000));
  const mins = Math.abs(Math.floor((diff % 3600000) / 60000));
  return (
    <div className={`flex items-center gap-1 text-xs font-semibold ${overdue ? 'text-red-600 dark:text-red-400' : hrs < 2 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
      <Clock className="w-3.5 h-3.5" />
      {overdue ? `Overdue ${hrs}h ${mins}m` : `${hrs}h ${mins}m`}
    </div>
  );
}

export default function AvailableTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets]       = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading]       = useState(true);
  const [assigning, setAssigning]   = useState(null);
  const [error, setError]           = useState(null);
  const [success, setSuccess]       = useState(null);
  const [filters, setFilters]       = useState({ priority: '', category: '', page: 1 });

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page: filters.page, limit: 10 };
      if (filters.priority) params.priority = filters.priority;
      if (filters.category) params.category = filters.category;
      const data = await getAvailableTickets(params);
      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load available tickets.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleAssign = async (ticket) => {
    if (assigning) return;
    try {
      setAssigning(ticket._id);
      setError(null);
      await selfAssignTicket(ticket._id);
      setSuccess(`Ticket ${ticket.ticketId} assigned to you! Redirecting…`);
      setTimeout(() => navigate(`/staff/tickets/${ticket.ticketId}`), 1500);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to assign ticket.');
    } finally {
      setAssigning(null);
    }
  };

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val, page: 1 }));

  return (
    <MainLayout title="Staff — Available Tickets">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
          <Inbox className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Available Tickets</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Unassigned tickets — pick one up to start working</p>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-4 flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 mb-6 flex flex-wrap items-center gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold">
          <Filter className="w-4 h-4" /> Filters:
        </div>

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

        <select
          value={filters.category}
          onChange={e => setFilter('category', e.target.value)}
          className="input text-xs w-auto py-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
        >
          <option value="" className="bg-white dark:bg-slate-900">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c} className="bg-white dark:bg-slate-900">{c}</option>)}
        </select>

        {(filters.priority || filters.category) && (
          <button
            onClick={() => setFilters({ priority: '', category: '', page: 1 })}
            className="btn-ghost btn-sm text-red-600 dark:text-red-400"
          >
            Clear
          </button>
        )}

        <div className="ml-auto text-xs text-slate-400">
          {loading ? 'Loading…' : `${pagination.total} ticket${pagination.total !== 1 ? 's' : ''} available`}
        </div>
      </div>

      {/* Tickets Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="skeleton h-48 rounded-2xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
          <Inbox className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">No tickets available</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">All tickets are currently assigned. Check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {tickets.map((ticket) => (
            <div
              key={ticket._id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              {/* Top row */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400">{ticket.ticketId}</span>
                <PriorityBadge p={ticket.priority} />
              </div>

              {/* Title */}
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-1">{ticket.title}</h3>
                {ticket.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{ticket.description}</p>
                )}
              </div>

              {/* Meta */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-semibold">
                  {ticket.category}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px]">
                  {ticket.affectedUsers} user{ticket.affectedUsers !== 1 ? 's' : ''} affected
                </span>
              </div>

              {/* SLA + requester */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-3">
                <SlaCountdown deadline={ticket.slaDeadline} />
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                  {ticket.createdBy?.fullName}
                </span>
              </div>

              {/* Assign button */}
              <button
                onClick={() => handleAssign(ticket)}
                disabled={!!assigning}
                className="w-full btn-primary btn-sm flex items-center justify-center gap-2"
              >
                {assigning === ticket._id ? (
                  <><Loader className="w-4 h-4 animate-spin" /> Assigning…</>
                ) : (
                  <><Zap className="w-4 h-4" /> Assign to Me</>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
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
