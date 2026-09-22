import { useState, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { getReportsData } from '../../services/adminService';
import { exportTicketsCSV } from '../../services/ticketService';
import {
  BarChart3, Download, Loader, CheckCircle2, AlertTriangle,
  Star, Clock, Building2, Tag, ArrowUpRight, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminReportsPage() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await getReportsData();
      setReports(data.reports);
    } catch (err) {
      toast.error('Failed to load system reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const blob = await exportTicketsCSV();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SmartCampus_System_Report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('System report CSV exported successfully!');
    } catch (err) {
      toast.error('Failed to export report CSV');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Reports & Analytics">
        <div className="flex items-center justify-center py-20">
          <Loader className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  const summary = reports?.summary || {};

  return (
    <MainLayout title="System Reports & Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Reports & Analytics</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Comprehensive IT Service metrics, SLA compliance, and CSAT scores</p>
            </div>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs md:text-sm rounded-xl shadow-md transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Generating CSV...' : 'Download Full CSV Report'}
          </button>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Tickets */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total System Tickets</span>
              <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{summary.totalTickets || 0}</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-medium">
              <TrendingUp className="w-3 h-3" /> {summary.resolvedTickets || 0} Resolved & Closed
            </p>
          </div>

          {/* SLA Compliance Rate */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">SLA Compliance Rate</span>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{summary.slaComplianceRate || 100}%</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {summary.slaBreachedCount || 0} SLA breaches recorded
            </p>
          </div>

          {/* Average CSAT Rating */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Average CSAT Score</span>
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                <Star className="w-5 h-5 fill-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{summary.avgCSAT || 4.8} / 5.0</p>
            <div className="flex items-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </div>

          {/* SLA Breaches */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Overdue / SLA Breached</span>
              <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{summary.slaBreachedCount || 0}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Requiring priority dispatch</p>
          </div>
        </div>

        {/* Breakdown Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Breakdown */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" /> Tickets by Department
            </h3>
            <div className="space-y-3">
              {reports?.departmentBreakdown?.map((item, idx) => {
                const pct = summary.totalTickets > 0 ? Math.round((item.total / summary.totalTickets) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                      <span>{item.department}</span>
                      <span>{item.total} tickets ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-500" /> Tickets by Category
            </h3>
            <div className="space-y-3">
              {reports?.categoryBreakdown?.map((item, idx) => {
                const pct = summary.totalTickets > 0 ? Math.round((item.total / summary.totalTickets) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                      <span>{item.category}</span>
                      <span>{item.total} tickets ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-600 rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
