import { useState, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { getActivityLog } from '../../services/adminService';
import {
  ShieldAlert, Search, Filter, Loader, Clock, User,
  ChevronLeft, ChevronRight, Activity, Terminal
} from 'lucide-react';
import { timeAgo, formatDateTime, cn } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function AdminActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getActivityLog({ page, limit: 15, action: actionFilter });
      setLogs(data.logs || []);
      setPagination(data.pagination || {});
    } catch (err) {
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const ACTIONS = [
    'TICKET_CREATED',
    'STATUS_CHANGED',
    'TICKET_ASSIGNED',
    'TICKET_CLOSED',
    'USER_REGISTERED',
    'USER_LOGIN',
    'FEEDBACK_SUBMITTED',
  ];

  return (
    <MainLayout title="Activity Logs">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">System Activity Logs</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Audit trail of system actions, security events, and user operations</p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="">All Audit Actions</option>
            {ACTIONS.map((act) => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Terminal className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
            <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">No activity logs found</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Action</th>
                    <th className="px-5 py-3.5">Performed By</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5">IP Address</th>
                    <th className="px-5 py-3.5 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="font-semibold text-xs text-slate-900 dark:text-white">{log.user?.fullName || 'System'}</p>
                            <p className="text-[10px] text-slate-400">{log.user?.email || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-700 dark:text-slate-300 max-w-md truncate">
                        {log.description}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-mono text-slate-400">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">
                        {timeAgo(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
