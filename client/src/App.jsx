import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute, GuestRoute } from './routes/ProtectedRoute';

// Auth Pages
import LoginPage          from './pages/auth/LoginPage';
import RegisterPage       from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// User Dashboard
import UserDashboard  from './pages/dashboard/UserDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import StaffDashboard from './pages/dashboard/StaffDashboard';

// Ticket Pages
import CreateTicketPage    from './pages/tickets/CreateTicketPage';
import MyTicketsPage       from './pages/tickets/MyTicketsPage';
import TicketDetailPage    from './pages/tickets/TicketDetailPage';

// Staff Pages
import AvailableTicketsPage   from './pages/staff/AvailableTicketsPage';
import AssignedTicketsPage    from './pages/staff/AssignedTicketsPage';
import StaffTicketDetailPage  from './pages/staff/StaffTicketDetailPage';

// Admin Pages
import AdminUsersPage        from './pages/admin/AdminUsersPage';
import AdminTicketsPage      from './pages/admin/AdminTicketsPage';
import AdminDepartmentsPage  from './pages/admin/AdminDepartmentsPage';
import AdminCategoriesPage   from './pages/admin/AdminCategoriesPage';
import AdminReportsPage      from './pages/admin/AdminReportsPage';
import AdminActivityLogsPage from './pages/admin/AdminActivityLogsPage';
import SLADashboardPage      from './pages/admin/SLADashboardPage';

// Shared Pages
import KnowledgeBasePage    from './pages/knowledge/KnowledgeBasePage';
import ProfilePage          from './pages/profile/ProfilePage';

/**
 * App – Main routing component for SmartCampus ITCare.
 */
function App() {
  const { user } = useAuth();

  const RootRedirect = () => {
    if (!user) return <Navigate to="/login" replace />;
    const dashMap = { admin: '/admin', it_staff: '/staff', user: '/dashboard' };
    return <Navigate to={dashMap[user.role] || '/dashboard'} replace />;
  };

  return (
    <Routes>
      {/* ── Root ─────────────────────────────────────────── */}
      <Route path="/" element={<RootRedirect />} />

      {/* ── Auth (Guest Only) ─────────────────────────────── */}
      <Route path="/login"           element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register"        element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />

      {/* ── User Routes ───────────────────────────────────── */}
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['user']}><UserDashboard /></ProtectedRoute>} />
      <Route path="/tickets"   element={<ProtectedRoute allowedRoles={['user']}><MyTicketsPage /></ProtectedRoute>} />
      <Route path="/tickets/new" element={<ProtectedRoute allowedRoles={['user']}><CreateTicketPage /></ProtectedRoute>} />
      <Route path="/tickets/:id" element={<ProtectedRoute allowedRoles={['user', 'it_staff', 'admin']}><TicketDetailPage /></ProtectedRoute>} />

      {/* ── IT Staff Routes ─────────────────────────────────── */}
      <Route path="/staff"                      element={<ProtectedRoute allowedRoles={['it_staff', 'admin']}><StaffDashboard /></ProtectedRoute>} />
      <Route path="/staff/available"            element={<ProtectedRoute allowedRoles={['it_staff', 'admin']}><AvailableTicketsPage /></ProtectedRoute>} />
      <Route path="/staff/tickets/available"    element={<ProtectedRoute allowedRoles={['it_staff', 'admin']}><AvailableTicketsPage /></ProtectedRoute>} />
      <Route path="/staff/tickets"              element={<ProtectedRoute allowedRoles={['it_staff', 'admin']}><AssignedTicketsPage /></ProtectedRoute>} />
      <Route path="/staff/tickets/assigned"     element={<ProtectedRoute allowedRoles={['it_staff', 'admin']}><AssignedTicketsPage /></ProtectedRoute>} />
      <Route path="/staff/tickets/:id"          element={<ProtectedRoute allowedRoles={['it_staff', 'admin']}><StaffTicketDetailPage /></ProtectedRoute>} />

      {/* ── Admin Routes ──────────────────────────────────────── */}
      <Route path="/admin"              element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users"        element={<ProtectedRoute allowedRoles={['admin']}><AdminUsersPage defaultRole="" pageTitle="User Management" /></ProtectedRoute>} />
      <Route path="/admin/staff"        element={<ProtectedRoute allowedRoles={['admin']}><AdminUsersPage defaultRole="it_staff" pageTitle="IT Staff Management" /></ProtectedRoute>} />
      <Route path="/admin/tickets"      element={<ProtectedRoute allowedRoles={['admin']}><AdminTicketsPage /></ProtectedRoute>} />
      <Route path="/admin/departments"  element={<ProtectedRoute allowedRoles={['admin']}><AdminDepartmentsPage /></ProtectedRoute>} />
      <Route path="/admin/categories"   element={<ProtectedRoute allowedRoles={['admin']}><AdminCategoriesPage /></ProtectedRoute>} />
      <Route path="/admin/reports"      element={<ProtectedRoute allowedRoles={['admin']}><AdminReportsPage /></ProtectedRoute>} />
      <Route path="/admin/logs"         element={<ProtectedRoute allowedRoles={['admin']}><AdminActivityLogsPage /></ProtectedRoute>} />
      <Route path="/admin/sla"          element={<ProtectedRoute allowedRoles={['admin', 'it_staff']}><SLADashboardPage /></ProtectedRoute>} />
      {/* ── Shared Routes (all authenticated) ─────────────── */}
      <Route path="/profile"        element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/knowledge-base" element={<ProtectedRoute><KnowledgeBasePage /></ProtectedRoute>} />

      {/* ── 404 ───────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
