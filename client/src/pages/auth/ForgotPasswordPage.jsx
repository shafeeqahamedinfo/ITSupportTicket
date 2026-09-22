import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Monitor, Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import api from '../../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md animate-enter">
        {/* Card */}
        <div className="card p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-glow">
              <Monitor className="w-4 h-4 text-white" />
            </div>
            <p className="text-slate-900 dark:text-white font-bold text-sm">SmartCampus ITCare</p>
          </div>

          {!sent ? (
            <>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Forgot your password?</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                Enter your registered email and we'll send you a reset link.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-group">
                  <label htmlFor="forgot-email" className="label text-slate-700 dark:text-slate-300">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      id="forgot-email" type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@smartcampus.edu"
                      className="input pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full btn-primary btn-lg">
                  {loading ? 'Sending…' : <><Send className="w-4 h-4" /> Send Reset Link</>}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4 animate-enter">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Check your inbox</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                If an account with <span className="text-slate-900 dark:text-white font-semibold">{email}</span> exists, a password reset link has been sent.
              </p>
              <p className="text-slate-500 dark:text-slate-500 text-xs mt-3">
                Didn't receive it? Check your spam folder or try again.
              </p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Link to="/login" className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
