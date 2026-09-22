import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { getMyTickets, exportTicketsCSV } from '../../services/ticketService';
import {
  Ticket, Search, Filter, PlusCircle, ChevronRight, ChevronLeft,
  Loader, AlertCircle, SlidersHorizontal, X, Clock, RefreshCw, Download
} from 'lucide-react';
import { formatDate, timeAgo, STATUS_LABELS, cn } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STATUSES = ['NEW','ASSIGNED','IN_PROGRESS','WAITING_FOR_USER','RESOLVED','CLOSED','REOPENED'];
const PRIORITIES = ['CRITICAL','HIGH','MEDIUM','LOW'];
const CATEGORIES = ['Hardware','Software','Network','Wi-Fi','Printer','Projector','Email','Account/Login','Operating System','Application','Cybersecurity','Other'];

const STATUS_STYLE = {
  NEW:              'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/30',
  ASSIGNED:         'bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700/30',
  IN_PROGRESS:      'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700/30',
  WAITING_FOR_USER: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/30',
  RESOLVED:         'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/30',
  CLOSED:           'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-600/30',
  REOPENED:         'bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700/30',
};

const PRIORITY_STYLE = {
  CRITICAL: 'text-red-400',
  HIGH:     'text-orange-400',
  MEDIUM:   'text-yellow-400',
  LOW:      'text-emerald-400',
};

const PRIORITY_DOT = {
  CRITICAL: 'bg-red-500',
  HIGH:     'bg-orange-500',
  MEDIUM:   'bg-yellow-500',
  LOW:      'bg-emerald-500',
};

function SLABadge({ ticket }) {
  if (!ticket.slaDeadline) return null;
  const now  = new Date();
  const dead = new Date(ticket.slaDeadline);
  const done = ['RESOLVED','CLOSED'].includes(ticket.status);

  if (done && ticket.resolvedAt) {
    const breached = new Date(ticket.resolvedAt) > dead;
    return (
      <span className={cn('text-xs flex items-center gap-1', breached ? 'text-red-400' : 'text-emerald-400')}>
        <Clock className="w-3 h-3" />
        {breached ? 'SLA Breached' : 'Within SLA'}
      </span>
    );
  }
  if (done) return null;

  const isBreached = now > dead;
  return (
    <span className={cn('text-xs flex items-center gap-1', isBreached ? 'text-red-400' : 'text-slate-500')}>
      <Clock className="w-3 h-3" />
      {isBreached ? '⚠ Overdue' : `Due ${formatDate(dead)}`}
    </span>
  );
}

export default function MyTicketsPage() {
  const [tickets, setTickets]     = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading]     = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError]         = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: '', status: '', priority: '', category: '',
    page: 1, limit: 10, sort: '-createdAt',
  });

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const data = await getMyTickets(params);
      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const blob = await exportTicketsCSV();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SmartCampus_My_Tickets_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Tickets exported to CSV!');
    } catch (err) {
      toast.error('Failed to export tickets CSV');
    } finally {
      setExporting(false);
    }
  };

  const setFilter = (key, value) =>
    setFilters((p) => ({ ...p, [key]: value, page: 1 }));

  const clearFilters = () =>
    setFilters({ search: '', status: '', priority: '', category: '', page: 1, limit: 10, sort: '-createdAt' });

  const activeFilterCount = [filters.status, filters.priority, filters.category].filter(Boolean).length;

  return (
    <MainLayout title="My Tickets">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">My Tickets</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-0.5">
              {loading ? '…' : `${pagination.total ?? 0} total tickets`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchTickets} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" title="Refresh">
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs md:text-sm flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
            <Link to="/tickets/new" className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs md:text-sm flex items-center gap-1.5 shadow-sm">
              <PlusCircle className="w-4 h-4" /> New Ticket
            </Link>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
          <div className="flex gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
                placeholder="Search by title, ID, or category…"
                className="input pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary-500 w-full"
              />
            </div>
            <button
              onClick={() => setShowFilters((p) => !p)}
              className={cn(
                'px-4 py-2 rounded-xl border font-semibold text-xs flex items-center gap-2 flex-shrink-0 transition-colors',
                activeFilterCount > 0
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter Row */}
          {showFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 animate-slide-down">
              <select
                value={filters.status} onChange={(e) => setFilter('status', e.target.value)}
                className="input bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm w-auto flex-1 min-w-[140px] focus:border-primary-500"
              >
                <option value="" className="bg-white dark:bg-slate-900">All Statuses</option>
                {STATUSES.map((s) => <option key={s} value={s} className="bg-white dark:bg-slate-900">{STATUS_LABELS[s]}</option>)}
              </select>

              <select
                value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)}
                className="input bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm w-auto flex-1 min-w-[140px] focus:border-primary-500"
              >
                <option value="" className="bg-white dark:bg-slate-900">All Priorities</option>
                {PRIORITIES.map((p) => <option key={p} value={p} className="bg-white dark:bg-slate-900">{p}</option>)}
              </select>

              <select
                value={filters.category} onChange={(e) => setFilter('category', e.target.value)}
                className="input bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm w-auto flex-1 min-w-[140px] focus:border-primary-500"
              >
                <option value="" className="bg-white dark:bg-slate-900">All Categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c} className="bg-white dark:bg-slate-900">{c}</option>)}
              </select>

              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="px-3 py-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2.5 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Tickets List */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1,2,3,4].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <div className="skeleton w-2.5 h-2.5 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-1/3 rounded" />
                    <div className="skeleton h-3 w-2/3 rounded" />
                  </div>
                  <div className="skeleton h-6 w-20 rounded-lg flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Ticket className="w-7 h-7 text-slate-400" />
              </div>
              <h4 className="text-slate-900 dark:text-slate-200 font-bold mb-1">
                {filters.search || activeFilterCount > 0 ? 'No matching tickets' : 'No tickets yet'}
              </h4>
              <p className="text-slate-500 text-xs md:text-sm mb-4">
                {filters.search || activeFilterCount > 0
                  ? 'Try adjusting your search or filters.'
                  : 'Submit your first IT support ticket to get started.'}
              </p>
              {!filters.search && !activeFilterCount && (
                <Link to="/tickets/new" className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm">
                  <PlusCircle className="w-4 h-4" /> Create First Ticket
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table Header */}
              <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span>Priority</span>
                <span>Ticket</span>
                <span>Status</span>
                <span>SLA</span>
                <span></span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {tickets.map((ticket) => (
                  <Link
                    key={ticket._id}
                    to={`/tickets/${ticket.ticketId}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Priority Dot */}
                    <div className="flex-shrink-0">
                      <span className={cn('w-2.5 h-2.5 rounded-full block', PRIORITY_DOT[ticket.priority])} />
                    </div>

                    {/* Ticket Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-xs font-mono text-slate-400 dark:text-slate-500 font-semibold">{ticket.ticketId}</span>
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{ticket.category}</span>
                      </div>
                      <p className="text-slate-900 dark:text-slate-100 text-sm font-semibold truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {ticket.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 dark:text-slate-500 text-xs">{timeAgo(ticket.createdAt)}</span>
                        <span className="sm:hidden">
                          <span className={cn('px-2 py-0.5 rounded-md border text-[10px] font-semibold', STATUS_STYLE[ticket.status])}>
                            {STATUS_LABELS[ticket.status]}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Status (desktop/tablet) */}
                    <div className="flex-shrink-0 hidden sm:block">
                      <span className={cn('px-2.5 py-1 rounded-lg border text-xs font-semibold', STATUS_STYLE[ticket.status])}>
                        {STATUS_LABELS[ticket.status]}
                      </span>
                    </div>

                    {/* SLA */}
                    <div className="flex-shrink-0 hidden md:block">
                      <SLABadge ticket={ticket} />
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors flex-shrink-0" />
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                    Page {pagination.page} of {pagination.totalPages}
                    {' '}({pagination.total} total)
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
                      disabled={pagination.page <= 1}
                      className="btn-ghost btn-sm disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
                      disabled={!pagination.hasMore}
                      className="btn-ghost btn-sm disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
