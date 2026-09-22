import { useState, useEffect, useCallback } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../services/adminService';
import { Building, Plus, Edit2, Trash2, X, CheckCircle, AlertTriangle } from 'lucide-react';

// ─── Department Form Modal ────────────────────────────────────────────────────
function DeptModal({ dept, onClose, onSaved }) {
  const isEdit = !!dept;
  const [form, setForm] = useState({
    name:        dept?.name        || '',
    description: dept?.description || '',
    headName:    dept?.headName    || '',
    location:    dept?.location    || '',
    phone:       dept?.phone       || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Department name is required.'); return; }
    try {
      setSaving(true);
      setError(null);
      let data;
      if (isEdit) {
        data = await updateDepartment(dept._id, form);
      } else {
        data = await createDepartment(form);
      }
      onSaved(data.department, isEdit);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save department.');
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key:'name',        label:'Department Name *', placeholder:'e.g. Computer Science' },
    { key:'description', label:'Description',       placeholder:'Brief description…' },
    { key:'headName',    label:'Head of Dept (HOD)', placeholder:'Name of HOD' },
    { key:'location',    label:'Location',          placeholder:'e.g. Block A, Room 201' },
    { key:'phone',       label:'Contact Phone',     placeholder:'Phone number' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{isEdit ? 'Edit Department' : 'New Department'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {fields.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label htmlFor={`dept-input-${key}`} className="label text-slate-700 dark:text-slate-300">{label}</label>
              {key === 'description' ? (
                <textarea
                  id={`dept-input-${key}`}
                  value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder} rows={3}
                  className="input bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
                />
              ) : (
                <input
                  id={`dept-input-${key}`}
                  value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="input bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Create Department'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);
  const [modal, setModal]       = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchDepts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDepartments();
      setDepartments(data.departments);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load departments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDepts(); }, [fetchDepts]);

  const handleSaved = (dept, isEdit) => {
    if (isEdit) {
      setDepartments(ds => ds.map(d => d._id === dept._id ? { ...d, ...dept } : d));
      setSuccess('Department updated.');
    } else {
      setDepartments(ds => [...ds, { ...dept, memberCount: 0, openTickets: 0 }]);
      setSuccess('Department created.');
    }
    setModal(null);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDelete = async (dept) => {
    try {
      await deleteDepartment(dept._id);
      setDepartments(ds => ds.filter(d => d._id !== dept._id));
      setDeleteConfirm(null);
      setSuccess(`Department "${dept.name}" deleted.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to delete department.');
    }
  };

  const DEPT_COLORS = ['#3b82f6','#a855f7','#06b6d4','#22c55e','#f97316','#ef4444','#eab308','#ec4899'];

  return (
    <MainLayout title="Admin — Departments">
      {modal && <DeptModal dept={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={handleSaved} />}

      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setDeleteConfirm(null)}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Department?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Delete <strong className="text-slate-900 dark:text-white">{deleteConfirm.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Departments</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs">{departments.length} departments in system</p>
          </div>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Department
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

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : departments.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
          <Building className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-xs">No departments yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((d, i) => {
            const color = DEPT_COLORS[i % DEPT_COLORS.length];
            return (
              <div
                key={d._id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}18`, border: `1px solid ${color}30` }}
                    >
                      <Building className="w-5 h-5" style={{ color }} />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">{d.name}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setModal(d)}
                      className="btn-ghost p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(d)}
                      className="btn-ghost p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {d.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{d.description}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center border border-slate-100 dark:border-slate-800">
                    <p className="text-lg font-extrabold text-slate-900 dark:text-white">{d.memberCount}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Members</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center border border-slate-100 dark:border-slate-800">
                    <p className={`text-lg font-extrabold ${d.openTickets > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{d.openTickets}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Open Tickets</p>
                  </div>
                </div>

                {/* Details */}
                <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                  {d.headName && <p><span className="font-semibold text-slate-700 dark:text-slate-300">HOD:</span> {d.headName}</p>}
                  {d.location && <p><span className="font-semibold text-slate-700 dark:text-slate-300">Location:</span> {d.location}</p>}
                  {d.phone    && <p><span className="font-semibold text-slate-700 dark:text-slate-300">Phone:</span> {d.phone}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MainLayout>
  );
}
