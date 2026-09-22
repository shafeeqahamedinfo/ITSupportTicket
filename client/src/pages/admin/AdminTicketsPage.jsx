import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { getAllTickets, assignTicket, closeTicket, getStaffList } from '../../services/adminService';
import { exportTicketsCSV } from '../../services/ticketService';
import {
  Ticket, Search, Filter, UserCheck, X, AlertTriangle,
  CheckCircle, ChevronLeft, ChevronRight, Lock, Download
} from 'lucide-react';
import toast from 'react-hot-toast';

const PRIORITY_CFG = {
  CRITICAL: { color:'#ef4444' },
  HIGH:     { color:'#f97316' },
  MEDIUM:   { color:'#eab308' },
  LOW:      { color:'#22c55e' },
};

const STATUS_CFG = {
  NEW:              { color:'#3b82f6', label:'New'           },
  ASSIGNED:         { color:'#8b5cf6', label:'Assigned'      },
  IN_PROGRESS:      { color:'#6366f1', label:'In Progress'   },
  WAITING_FOR_USER: { color:'#f59e0b', label:'Waiting'       },
  RESOLVED:         { color:'#10b981', label:'Resolved'      },
  CLOSED:           { color:'#64748b', label:'Closed'        },
  REOPENED:         { color:'#f43f5e', label:'Reopened'      },
};

function PriorityBadge({ p }) {
  const cfg = PRIORITY_CFG[p] || { color:'#94a3b8' };
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
  const cfg = STATUS_CFG[s] || { color:'#94a3b8', label: s };
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────
function AssignModal({ ticket, staffList, onClose, onAssigned }) {
  const [selectedStaff, setSelectedStaff] = useState(ticket.assignedTo?._id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const handleAssign = async () => {
    try {
      setSaving(true);
      setError(null);
      const data = await assignTicket(ticket._id, selectedStaff || null);
      onAssigned(data.ticket);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to assign ticket.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Assign Ticket</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Ticket</p>
          <p className="text-sm font-bold font-mono text-primary-600 dark:text-primary-400 mt-0.5">{ticket.ticketId}</p>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate mt-1">{ticket.title}</p>
          <div className="flex gap-2 mt-2">
            <PriorityBadge p={ticket.priority} />
            <StatusBadge s={ticket.status} />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="assign-staff-select" className="label text-slate-700 dark:text-slate-300">Assign To Staff</label>
          <select
            id="assign-staff-select"
            value={selectedStaff}
            onChange={e => setSelectedStaff(e.target.value)}
            className="input bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          >
            <option value="" className="bg-white dark:bg-slate-900">Unassign (remove assignment)</option>
            {staffList.map(s => (
              <option key={s._id} value={s._id} className="bg-white dark:bg-slate-900">
                {s.fullName} — {s.activeTickets} active ticket{s.activeTickets !== 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleAssign} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Assigning…' : selectedStaff ? 'Assign' : 'Unassign'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Close Modal ──────────────────────────────────────────────────────────────
function CloseModal({ ticket, onClose, onClosed }) {
  const [resolution, setResolution] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const handleClose = async () => {
    try {
      setSaving(true);
      setError(null);
      const data = await closeTicket(ticket._id, resolution);
      onClosed(data.ticket);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to close ticket.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Force Close Ticket</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs">
          <p className="font-bold text-red-600 dark:text-red-400">⚠ Admin Override</p>
          <p className="text-slate-700 dark:text-slate-300 mt-1">
            Closing <strong className="text-slate-900 dark:text-white">{ticket.ticketId}</strong>: {ticket.title}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="close-resolution-note" className="label text-slate-700 dark:text-slate-300">Resolution Note (optional)</label>
          <textarea
            id="close-resolution-note"
            value={resolution}
            onChange={e => setResolution(e.target.value)}
            rows={3}
            placeholder="Describe why the ticket is being closed…"
            className="input bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleClose} disabled={saving} className="btn-danger flex-1">
            {saving ? 'Closing…' : 'Force Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets]         = useState([]);
  const [pagination, setPagination]   = useState({ total:0, page:1, totalPages:1 });
  const [staffList, setStaffList]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [success, setSuccess]         = useState(null);
  const [filters, setFilters]         = useState({ search:'', status:'', priority:'', assignedTo:'', slaBreached:'', page:1 });
  const [searchInput, setSearchInput] = useState('');
  const [assignModal, setAssignModal] = useState(null);
  const [closeModal, setCloseModal]   = useState(null);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page: filters.page, limit: 15 };
      if (filters.search)      params.search      = filters.search;
      if (filters.status)      params.status      = filters.status;
      if (filters.priority)    params.priority    = filters.priority;
      if (filters.assignedTo)  params.assignedTo  = filters.assignedTo;
      if (filters.slaBreached) params.slaBreached = filters.slaBreached;
      const data = await getAllTickets(params);
      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (e) { setError(e.response?.data?.message || 'Failed to load tickets.'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);
  useEffect(() => { getStaffList().then(d => setStaffList(d.staff)).catch(() => {}); }, []);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val, page: 1 }));

  const handleAssigned = (updatedTicket) => {
    setTickets(ts => ts.map(t => t._id === updatedTicket._id ? updatedTicket : t));
    setAssignModal(null);
    setSuccess(`Ticket ${updatedTicket.ticketId} assignment updated.`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleClosed = (updatedTicket) => {
    setTickets(ts => ts.map(t => t._id === updatedTicket._id ? updatedTicket : t));
    setCloseModal(null);
    setSuccess(`Ticket ${updatedTicket.ticketId} closed.`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const blob = await exportTicketsCSV();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SmartCampus_All_Tickets_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('All tickets exported to CSV!');
    } catch (err) {
      toast.error('Failed to export tickets CSV');
    } finally {
      setExporting(false);
    }
  };

  return (
    <MainLayout title="Admin — All Tickets">
      {assignModal && <AssignModal ticket={assignModal} staffList={staffList} onClose={() => setAssignModal(null)} onAssigned={handleAssigned} />}
      {closeModal  && <CloseModal  ticket={closeModal}  onClose={() => setCloseModal(null)}  onClosed={handleClosed} />}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">All Tickets</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs">{loading ? 'Loading…' : `${pagination.total} tickets total`}</p>
          </div>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs md:text-sm flex items-center gap-2 shadow-md transition"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Exporting...' : 'Export CSV Report'}
        </button>
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

      {/* Filters */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 mb-6 flex flex-wrap items-center gap-3 shadow-sm">
        <form onSubmit={e => { e.preventDefault(); setFilter('search', searchInput); }} className="flex gap-2 flex-1 min-w-[220px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text" placeholder="Search ID or title…" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              className="input pl-9 py-2 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <button type="submit" className="btn-primary btn-sm">Search</button>
        </form>

        <Filter className="w-4 h-4 text-slate-400" />
        {[
          { key:'status', options:[{v:'',l:'All Status'},{v:'NEW',l:'New'},{v:'ASSIGNED',l:'Assigned'},{v:'IN_PROGRESS',l:'In Progress'},{v:'WAITING_FOR_USER',l:'Waiting'},{v:'RESOLVED',l:'Resolved'},{v:'CLOSED',l:'Closed'}] },
          { key:'priority', options:[{v:'',l:'All Priority'},{v:'CRITICAL',l:'Critical'},{v:'HIGH',l:'High'},{v:'MEDIUM',l:'Medium'},{v:'LOW',l:'Low'}] },
          { key:'assignedTo', options:[{v:'',l:'All Assigned'},{v:'null',l:'Unassigned'}] },
          { key:'slaBreached', options:[{v:'',l:'All SLA'},{v:'true',l:'SLA Breached'}] },
        ].map(({ key, options }) => (
          <select
            key={key} value={filters[key]} onChange={e => setFilter(key, e.target.value)}
            className="input text-xs w-auto py-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          >
            {options.map(o => <option key={o.v} value={o.v} className="bg-white dark:bg-slate-900">{o.l}</option>)}
          </select>
        ))}
      </div>

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
            <p className="text-xs">No tickets match your filters.</p>
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
                  <th className="p-3.5 px-4">Assigned To</th>
                  <th className="p-3.5 px-4">Created</th>
                  <th className="p-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {tickets.map(t => {
                  const slaDiff = t.slaDeadline ? new Date(t.slaDeadline) - new Date() : null;
                  const done = ['RESOLVED','CLOSED'].includes(t.status);
                  return (
                    <tr
                      key={t._id}
                      onClick={() => navigate(`/tickets/${t.ticketId}`)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="p-3.5 px-4 font-mono font-bold text-primary-600 dark:text-primary-400">{t.ticketId}</td>
                      <td className="p-3.5 px-4 text-slate-900 dark:text-slate-200 max-w-[180px] truncate font-medium">{t.title}</td>
                      <td className="p-3.5 px-4 text-slate-500 dark:text-slate-400">{t.category}</td>
                      <td className="p-3.5 px-4"><PriorityBadge p={t.priority} /></td>
                      <td className="p-3.5 px-4"><StatusBadge s={t.status} /></td>
                      <td className="p-3.5 px-4">
                        {t.slaBreached ? <span className="text-red-600 dark:text-red-400 font-bold">⚠ Breached</span>
                          : done ? <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Done</span>
                          : slaDiff != null ? <span className={slaDiff < 0 ? 'text-red-500 font-bold' : slaDiff < 7200000 ? 'text-orange-500 font-bold' : 'text-emerald-500 font-bold'}>{slaDiff < 0 ? 'OVR' : `${Math.floor(slaDiff/3600000)}h`}</span>
                          : '—'}
                      </td>
                      <td className="p-3.5 px-4 text-slate-600 dark:text-slate-400">{t.createdBy?.fullName}</td>
                      <td className="p-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {t.assignedTo?.fullName || <span className="text-slate-400 italic">Unassigned</span>}
                      </td>
                      <td className="p-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                      </td>
                      <td className="p-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setAssignModal(t)}
                            className="btn-ghost btn-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Assign
                          </button>
                          {!done && (
                            <button
                              onClick={() => setCloseModal(t)}
                              className="btn-ghost btn-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Lock className="w-3.5 h-3.5" /> Close
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
