import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { getAllUsers, updateUser, deleteUser } from '../../services/adminService';
import {
  Users, Search, Filter, CheckCircle, XCircle,
  Edit2, Trash2, ChevronLeft, ChevronRight, AlertTriangle, X, Shield
} from 'lucide-react';

const ROLE_CFG = {
  admin:    { label: 'Admin',    color: '#ef4444' },
  it_staff: { label: 'IT Staff', color: '#3b82f6' },
  user:     { label: 'User',     color: '#64748b' },
};

function RoleBadge({ role }) {
  const cfg = ROLE_CFG[role] || ROLE_CFG.user;
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{ color: cfg.color, background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    role:           user.role,
    isActive:       user.isActive,
    departmentName: user.departmentName || '',
    phone:          user.phone || '',
  });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const data = await updateUser(user._id, form);
      onSave(data.user);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update user.');
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
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit User</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
            {user.fullName?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.fullName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="edit-role-select" className="label text-slate-700 dark:text-slate-300">Role</label>
            <select
              id="edit-role-select"
              value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="input bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="user" className="bg-white dark:bg-slate-900">User</option>
              <option value="it_staff" className="bg-white dark:bg-slate-900">IT Staff</option>
              <option value="admin" className="bg-white dark:bg-slate-900">Admin</option>
            </select>
          </div>

          <div>
            <label htmlFor="edit-dept-input" className="label text-slate-700 dark:text-slate-300">Department</label>
            <input
              id="edit-dept-input"
              value={form.departmentName} onChange={e => setForm(f => ({ ...f, departmentName: e.target.value }))}
              placeholder="Department name"
              className="input bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="edit-phone-input" className="label text-slate-700 dark:text-slate-300">Phone</label>
            <input
              id="edit-phone-input"
              value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="Phone number"
              className="input bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              Account Active
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminUsersPage({ defaultRole = '', pageTitle = 'User Management' }) {
  const location = useLocation();
  const isStaffView = defaultRole === 'it_staff' || location.pathname === '/admin/staff';
  const initialRole = isStaffView ? 'it_staff' : defaultRole;
  const headingText = isStaffView ? 'IT Staff Management' : pageTitle;
  const HeaderIcon = isStaffView ? Shield : Users;

  const [users, setUsers]         = useState([]);
  const [pagination, setPagination] = useState({ total:0, page:1, totalPages:1 });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [success, setSuccess]     = useState(null);
  const [filters, setFilters]     = useState({ search:'', role: initialRole, isActive:'', page:1 });
  const [searchInput, setSearchInput] = useState('');
  const [editUser, setEditUser]   = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Sync filter role when route changes between /admin/users and /admin/staff
  useEffect(() => {
    const isStaff = location.pathname === '/admin/staff' || defaultRole === 'it_staff';
    setFilters(f => ({ ...f, role: isStaff ? 'it_staff' : defaultRole, page: 1 }));
  }, [location.pathname, defaultRole]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page: filters.page, limit: 15 };
      if (filters.search)   params.search   = filters.search;
      if (filters.role)     params.role     = filters.role;
      if (filters.isActive) params.isActive = filters.isActive;
      const data = await getAllUsers(params);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters(f => ({ ...f, search: searchInput, page: 1 }));
  };

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val, page: 1 }));

  const handleSaveUser = (updatedUser) => {
    setUsers(us => us.map(u => u._id === updatedUser._id ? updatedUser : u));
    setEditUser(null);
    setSuccess('User updated successfully.');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDelete = async (user) => {
    try {
      await deleteUser(user._id);
      setUsers(us => us.filter(u => u._id !== user._id));
      setPagination(p => ({ ...p, total: p.total - 1 }));
      setDeleteConfirm(null);
      setSuccess(`User "${user.fullName}" deactivated.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to delete user.');
    }
  };

  return (
    <MainLayout title={`Admin — ${headingText}`}>
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={handleSaveUser}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setDeleteConfirm(null)}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Deactivate User?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              This will deactivate <strong className="text-slate-900 dark:text-white">{deleteConfirm.fullName}</strong>. They will no longer be able to log in.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger flex-1">Deactivate</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
            <HeaderIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{headingText}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              {loading ? 'Loading…' : isStaffView ? `${pagination.total} IT support staff member${pagination.total !== 1 ? 's' : ''}` : `${pagination.total} users total`}
            </p>
          </div>
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
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text" placeholder="Search by name, email, department…" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              className="input pl-9 py-2 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <button type="submit" className="btn-primary btn-sm">Search</button>
        </form>

        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={filters.role} onChange={e => setFilter('role', e.target.value)}
          className="input text-xs w-auto py-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
        >
          <option value="" className="bg-white dark:bg-slate-900">All Roles</option>
          <option value="user" className="bg-white dark:bg-slate-900">User</option>
          <option value="it_staff" className="bg-white dark:bg-slate-900">IT Staff</option>
          <option value="admin" className="bg-white dark:bg-slate-900">Admin</option>
        </select>

        <select
          value={filters.isActive} onChange={e => setFilter('isActive', e.target.value)}
          className="input text-xs w-auto py-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
        >
          <option value="" className="bg-white dark:bg-slate-900">All Status</option>
          <option value="true" className="bg-white dark:bg-slate-900">Active</option>
          <option value="false" className="bg-white dark:bg-slate-900">Inactive</option>
        </select>

        {(filters.search || filters.role || filters.isActive) && (
          <button
            onClick={() => { setFilters({ search:'', role:'', isActive:'', page:1 }); setSearchInput(''); }}
            className="btn-ghost btn-sm text-red-600 dark:text-red-400"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading users…
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="p-3.5 px-4">User</th>
                  <th className="p-3.5 px-4">Email</th>
                  <th className="p-3.5 px-4">Role</th>
                  <th className="p-3.5 px-4">Department</th>
                  <th className="p-3.5 px-4">Status</th>
                  <th className="p-3.5 px-4">Joined</th>
                  <th className="p-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {users.map(u => (
                  <tr key={u._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {u.fullName?.[0] || '?'}
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-slate-200">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="p-3.5 px-4 text-slate-600 dark:text-slate-400">{u.email}</td>
                    <td className="p-3.5 px-4"><RoleBadge role={u.role} /></td>
                    <td className="p-3.5 px-4 text-slate-500 dark:text-slate-400">{u.departmentName || '—'}</td>
                    <td className="p-3.5 px-4">
                      {u.isActive ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold"><CheckCircle className="w-3.5 h-3.5" /> Active</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold"><XCircle className="w-3.5 h-3.5" /> Inactive</span>
                      )}
                    </td>
                    <td className="p-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    </td>
                    <td className="p-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditUser(u)}
                          className="btn-ghost btn-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(u)}
                          className="btn-ghost btn-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
