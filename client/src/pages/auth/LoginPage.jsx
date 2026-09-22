import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Monitor, Mail, Lock, Eye, EyeOff, AlertCircle, Loader, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const from       = location.state?.from?.pathname || null;

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email || !form.password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      toast.success(`Welcome back, ${data.user.fullName.split(' ')[0]}! 👋`);

      // Redirect to where they came from, or role dashboard
      if (from) {
        navigate(from, { replace: true });
      } else {
        const dashMap = { admin: '/admin', it_staff: '/staff', user: '/dashboard' };
        navigate(dashMap[data.user.role] || '/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    const creds = {
      admin:    { email: 'admin@smartcampus.edu', password: 'Admin@1234' },
      staff:    { email: 'ravi.itstaff@smartcampus.edu', password: 'Staff@1234' },
      student:  { email: 'teststudent@smartcampus.edu', password: 'Test@1234' },
    };
    setForm(creds[role]);
    setError('');
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-950">
      {/* ── Left Panel ─────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 bg-gradient-to-br from-primary-900 via-indigo-950 to-slate-950 p-12 border-r border-slate-200 dark:border-primary-900/30">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-glow">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">SmartCampus</p>
            <p className="text-primary-400 text-xs font-medium">ITCare System</p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-6 my-auto py-8">
          <div>
            <span className="px-3 py-1 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30 text-xs font-semibold">
              ✨ Intelligent Campus Ticketing
            </span>
            <h1 className="text-3xl font-black text-white mt-4 leading-tight">
              Automated IT Support for your Campus
            </h1>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              Real-time ticket routing, AI priority detection, SLA monitoring & self-help knowledge base for students, staff & IT teams.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              '🤖 Smart Ticket Categorization & SLA Deadline Calculations',
              '⚡ Socket.IO Live Updates & Real-time Notifications',
              '📊 Interactive Analytics Dashboard for Admins & Staff',
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300">
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-slate-500 text-xs">
          © {new Date().getFullYear()} SmartCampus ITCare. All rights reserved.
        </p>
      </div>

      {/* ── Right Panel: Form ────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md animate-enter">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-glow">
              <Monitor className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-slate-900 dark:text-white font-bold text-base leading-tight">SmartCampus</p>
              <p className="text-primary-600 dark:text-primary-400 text-xs">ITCare System</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sign in to your account</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 dark:text-primary-400 hover:underline font-medium transition-colors">
                Create one
              </Link>
            </p>
          </div>

          {/* Demo Credentials */}
          <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-medium uppercase tracking-wide">Demo Accounts</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: '🛡 Admin', role: 'admin', color: 'bg-purple-50 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50' },
                { label: '🔧 IT Staff', role: 'staff', color: 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50' },
                { label: '🎓 Student', role: 'student', color: 'bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50' },
              ].map(({ label, role, color }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => fillDemo(role)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:scale-105 ${color}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
              <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="form-group">
              <label htmlFor="login-email" className="label text-slate-700 dark:text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@smartcampus.edu"
                  className="input pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="login-password" className="label text-slate-700 dark:text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  id="login-password"
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="input pl-10 pr-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="w-full btn-primary btn-lg mt-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-8">
            By signing in, you agree to the SmartCampus ITCare{' '}
            <span className="text-slate-500">Terms of Service</span> and{' '}
            <span className="text-slate-500">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
