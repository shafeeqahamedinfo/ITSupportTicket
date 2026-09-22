import { useState, useEffect, useCallback } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { getSLAConfigs, updateSLAConfig, getSLAReports, getBreachedTickets, escalateTicket } from '../../services/slaService';
import { ShieldAlert, Clock, AlertTriangle, CheckCircle, Save, ArrowUpRight, RefreshCw, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SLADashboardPage() {
  const [configs, setConfigs] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [breachedTickets, setBreachedTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPriority, setEditingPriority] = useState(null);
  const [editForm, setEditForm] = useState({ responseTimeHours: '', resolutionTimeHours: '', escalateAfterBreachHours: '' });
  const [escalatingId, setEscalatingId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, rptRes, brkRes] = await Promise.all([
        getSLAConfigs(),
        getSLAReports(),
        getBreachedTickets(),
      ]);
      setConfigs(cfgRes.configs || []);
      setMetrics(rptRes.metrics || null);
      setBreachedTickets(brkRes.tickets || []);
    } catch (err) {
      toast.error('Failed to load SLA performance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditClick = (config) => {
    setEditingPriority(config.priority);
    setEditForm({
      responseTimeHours: config.responseTimeHours,
      resolutionTimeHours: config.resolutionTimeHours,
      escalateAfterBreachHours: config.escalateAfterBreachHours || 2,
    });
  };

  const handleSaveConfig = async (priority) => {
    try {
      await updateSLAConfig(priority, editForm);
      toast.success(`SLA thresholds updated for ${priority}`);
      setEditingPriority(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update SLA config');
    }
  };

  const handleEscalate = async (ticketId) => {
    setEscalatingId(ticketId);
    try {
      await escalateTicket(ticketId, 'Manual escalation triggered from SLA Control Center');
      toast.success('Ticket escalated to CRITICAL priority!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to escalate ticket');
    } finally {
      setEscalatingId(null);
    }
  };

  const getPriorityColor = (p) => {
    switch (p) {
      case 'CRITICAL': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'HIGH':     return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'MEDIUM':   return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:         return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              SLA Tracking & Escalation Engine
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Monitor Service Level Agreements, configure response deadlines, and enforce ticket escalations.
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition font-medium text-sm gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh SLAs
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">SLA Compliance</span>
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {metrics?.complianceRate ?? 100}%
              </span>
              <p className="text-xs text-slate-400 mt-1">Target: &gt; 95.0%</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Breaches</span>
              <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
                {metrics?.breachedTicketsCount ?? 0}
              </span>
              <p className="text-xs text-slate-400 mt-1">Requires immediate attention</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg Resolution</span>
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {metrics?.avgResolutionHours ?? 0}h
              </span>
              <p className="text-xs text-slate-400 mt-1">Average time to resolve</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Monitored Tickets</span>
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                <Zap className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {metrics?.totalTickets ?? 0}
              </span>
              <p className="text-xs text-slate-400 mt-1">Across all departments</p>
            </div>
          </div>
        </div>

        {/* SLA Threshold Policy Configurator */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Priority SLA Target Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {configs.map((config) => {
              const isEditing = editingPriority === config.priority;
              return (
                <div
                  key={config.priority}
                  className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getPriorityColor(config.priority)}`}>
                        {config.priority}
                      </span>
                      {!isEditing && (
                        <button
                          onClick={() => handleEditClick(config)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 mt-2">
                        <div>
                          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">First Response (Hours)</label>
                          <input
                            type="number"
                            min="0.5"
                            value={editForm.responseTimeHours}
                            onChange={(e) => setEditForm({ ...editForm, responseTimeHours: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Resolution Target (Hours)</label>
                          <input
                            type="number"
                            min="1"
                            value={editForm.resolutionTimeHours}
                            onChange={(e) => setEditForm({ ...editForm, resolutionTimeHours: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleSaveConfig(config.priority)}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-1.5 rounded-md transition flex items-center justify-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" /> Save
                          </button>
                          <button
                            onClick={() => setEditingPriority(null)}
                            className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-md transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 mt-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">First Response:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{config.responseTimeHours}h</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">Resolution Target:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{config.resolutionTimeHours}h</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700/50">
                          <span>Auto Escalate:</span>
                          <span>{config.escalateAfterBreachHours || 2}h post-breach</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Breached & Near Breach Tickets Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Breached & Near-Breach Tickets
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tickets that have missed SLA deadlines or are within 1 hour of breaching.
              </p>
            </div>
            <span className="px-3 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full text-xs font-semibold">
              {breachedTickets.length} Action Needed
            </span>
          </div>

          {breachedTickets.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
              <p className="text-slate-600 dark:text-slate-300 font-medium">All SLA Deadlines Satisfied!</p>
              <p className="text-slate-400 text-xs mt-1">No tickets are currently breached or near SLA deadline.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-semibold uppercase bg-slate-50/50 dark:bg-slate-800/50">
                    <th className="p-3">Ticket ID</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Assigned To</th>
                    <th className="p-3">SLA Due Date</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {breachedTickets.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="p-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400">{t.ticketId}</td>
                      <td className="p-3 font-medium text-slate-900 dark:text-white max-w-xs truncate">{t.title}</td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">{t.department?.name || 'Unassigned'}</td>
                      <td className="p-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getPriorityColor(t.priority)}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">{t.assignedTo?.fullName || 'Unassigned'}</td>
                      <td className="p-3">
                        <span className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {t.slaDueDate ? new Date(t.slaDueDate).toLocaleString() : 'N/A'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleEscalate(t._id)}
                          disabled={escalatingId === t._id || t.priority === 'CRITICAL'}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          {escalatingId === t._id ? 'Escalating...' : t.priority === 'CRITICAL' ? 'Escalated' : 'Force Escalate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
