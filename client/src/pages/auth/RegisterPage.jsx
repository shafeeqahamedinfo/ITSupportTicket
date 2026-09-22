import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Monitor, User, Mail, Lock, Eye, EyeOff, Phone, Hash,
  Building2, AlertCircle, Loader, CheckCircle, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const USER_TYPES = [
  { value: 'student',    label: 'Student',       icon: '🎓' },
  { value: 'faculty',    label: 'Faculty',        icon: '👨‍🏫' },
  { value: 'staff',      label: 'Staff',          icon: '👔' },
  { value: 'it_support', label: 'IT Support',     icon: '🔧' },
];

const DEPARTMENTS = [
  'Computer Science', 'Information Technology', 'Mechanical Engineering',
  'Civil Engineering', 'Electrical Engineering', 'Electronics Engineering',
  'Administration', 'Library', 'Hostel', 'Accounts', 'Other',
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    userType: 'student', departmentName: '', phone: '', employeeId: '',
  });
  const [showPwd, setShowPwd]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [step, setStep]               = useState(1); // 2-step form

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const passwordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 6)  score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const pwdScore = passwordStrength(form.password);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][pwdScore];
  const strengthColor = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-emerald-400'][pwdScore];

  const validateStep1 = () => {
    if (!form.fullName.trim()) return 'Full name is required';
    if (!form.email.trim()) return 'Email is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return 'Please enter a valid email';
    if (!form.password) return 'Password is required';
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleNextStep = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.userType) { setError('Please select your user type'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await register(form);
      toast.success('Account created! Welcome to SmartCampus ITCare 🎉');
      const dashMap = { admin: '/admin', it_staff: '/staff', user: '/dashboard' };
      navigate(dashMap[data.user.role] || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-950">
      {/* ── Left Branding Panel ─────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 bg-gradient-to-br from-primary-950 via-indigo-950 to-slate-950 p-12 border-r border-primary-900/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-glow">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">SmartCampus</p>
            <p className="text-primary-400 text-xs font-medium">ITCare System</p>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-white leading-tight">
            Join SmartCampus<br />
            <span className="text-primary-400">IT Support</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Create your account to start submitting and tracking IT support tickets across campus.
          </p>
          <div className="mt-6 space-y-3">
            {[
              { num: '01', text: 'Fill in your personal details' },
              { num: '02', text: 'Select your department and role' },
              { num: '03', text: 'Start submitting support tickets' },
            ].map(({ num, text }) => (
              <div key={num} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-primary-900/60 border border-primary-700/50 text-primary-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {num}
                </span>
                <span className="text-slate-300 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-xs">
          SmartCampus ITCare v1.0 · B.E. CSE Final Year Project · 2026
        </p>
      </div>

      {/* ── Right: Registration Form ─────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-8 animate-enter">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <p className="text-slate-900 dark:text-white font-bold">SmartCampus ITCare</p>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create your account</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:underline font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  step >= s
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-600'
                }`}>
                  {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                <span className={`text-xs font-medium ${step >= s ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500 dark:text-slate-600'}`}>
                  {s === 1 ? 'Account Info' : 'Personal Details'}
                </span>
                {s < 2 && <div className={`flex-1 h-0.5 w-12 ${step > s ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-800'}`} />}
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
              <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* ── STEP 1 ── */}
            {step === 1 && (
              <div className="space-y-4 animate-enter">
                {/* Full Name */}
                <div className="form-group">
                  <label htmlFor="reg-fullName" className="label text-slate-700 dark:text-slate-300">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      id="reg-fullName" name="fullName" type="text" autoComplete="name"
                      value={form.fullName} onChange={handleChange}
                      placeholder="e.g. Arun Kumar S"
                      className="input pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="form-group">
                  <label htmlFor="reg-email" className="label text-slate-700 dark:text-slate-300">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      id="reg-email" name="email" type="email" autoComplete="email"
                      value={form.email} onChange={handleChange}
                      placeholder="you@smartcampus.edu"
                      className="input pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="form-group">
                  <label htmlFor="reg-password" className="label text-slate-700 dark:text-slate-300">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      id="reg-password" name="password" type={showPwd ? 'text' : 'password'}
                      autoComplete="new-password" value={form.password} onChange={handleChange}
                      placeholder="Min. 6 characters"
                      className="input pl-10 pr-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary-500"
                    />
                    <button type="button" onClick={() => setShowPwd((p) => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map((i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= pwdScore ? strengthColor : 'bg-slate-200 dark:bg-slate-800'}`} />
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${pwdScore >= 4 ? 'text-emerald-600 dark:text-emerald-400' : pwdScore >= 2 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                        {strengthLabel}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="form-group">
                  <label htmlFor="reg-confirmPassword" className="label text-slate-700 dark:text-slate-300">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      id="reg-confirmPassword" name="confirmPassword"
                      type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
                      value={form.confirmPassword} onChange={handleChange}
                      placeholder="Re-enter your password"
                      className={`input pl-10 pr-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary-500 ${
                        form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-500' : ''
                      }`}
                    />
                    <button type="button" onClick={() => setShowConfirm((p) => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="error-text">Passwords do not match</p>
                  )}
                </div>

                <button type="button" onClick={handleNextStep} className="w-full btn-primary btn-lg mt-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <div className="space-y-4 animate-enter">
                {/* User Type */}
                <div className="form-group">
                  <label className="label text-slate-700 dark:text-slate-300">I am a…</label>
                  <div className="grid grid-cols-2 gap-2">
                    {USER_TYPES.map(({ value, label, icon }) => (
                      <button
                        key={value} type="button"
                        onClick={() => setForm((p) => ({ ...p, userType: value }))}
                        className={`p-3 rounded-xl border-2 text-left transition-all flex items-center gap-2.5 ${
                          form.userType === value
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-slate-900 dark:text-white font-semibold'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <span className="text-lg">{icon}</span>
                        <span className="text-sm font-semibold">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Department */}
                <div className="form-group">
                  <label htmlFor="reg-dept" className="label text-slate-700 dark:text-slate-300">Department</label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                    <select
                      id="reg-dept" name="departmentName" value={form.departmentName} onChange={handleChange}
                      className="input pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-white dark:bg-slate-900">Select your department</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d} className="bg-white dark:bg-slate-900">{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label htmlFor="reg-phone" className="label text-slate-700 dark:text-slate-300">Phone Number <span className="text-slate-400 text-xs">(optional)</span></label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      id="reg-phone" name="phone" type="tel"
                      value={form.phone} onChange={handleChange}
                      placeholder="+91 9876543210"
                      className="input pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Employee/Student ID */}
                <div className="form-group">
                  <label htmlFor="reg-id" className="label text-slate-700 dark:text-slate-300">Student / Employee ID <span className="text-slate-400 text-xs">(optional)</span></label>
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      id="reg-id" name="employeeId" type="text"
                      value={form.employeeId} onChange={handleChange}
                      placeholder="e.g. CS2023001"
                      className="input pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => { setStep(1); setError(''); }}
                    className="btn-secondary flex-1">
                    Back
                  </button>
                  <button type="submit" id="register-submit" disabled={loading} className="btn-primary flex-1">
                    {loading ? (
                      <><Loader className="w-4 h-4 animate-spin" /> Creating…</>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /> Create Account</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
