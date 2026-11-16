import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import GoogleAuthButton from '../components/auth/GoogleAuthButton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // If redirected from a specific protected route, retain it; otherwise redirect to /dashboard
  const redirectPath =
    location.state?.from?.pathname && location.state.from.pathname !== '/'
      ? location.state.from.pathname
      : '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      addToast({
        title: 'Inspector Signed In',
        message: 'Welcome back to the PCCIS compliance portal.',
        type: 'success',
      });
      navigate(redirectPath, { replace: true });
    } catch (err) {
      const isConnectionIssue = err.isNetworkError || err.status === 404;
      setError(
        isConnectionIssue
          ? 'FastAPI backend is offline or /api/auth/login is unreachable at http://127.0.0.1:8000.'
          : err.message || 'Invalid email or password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FAF7] dark:bg-[#101713] flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Back to Home Link */}
        <div className="mb-6 flex justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#647067] dark:text-[#A3B3A6] hover:text-[#15803D] dark:hover:text-[#4ADE80] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to PCCIS Home</span>
          </Link>
        </div>

        {/* Brand Header */}
        <Link to="/" className="flex items-center justify-center gap-3 group">
          <div className="w-11 h-11 rounded-2xl bg-[#15803D] dark:bg-[#22C55E] flex items-center justify-center text-white dark:text-[#101713] shadow-md shadow-[#15803D]/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] leading-none">
              PCCIS
            </h1>
            <p className="text-[10px] uppercase font-semibold text-[#15803D] dark:text-[#4ADE80] tracking-wider mt-1">
              Legal Metrology Inspection Suite
            </p>
          </div>
        </Link>

        <h2 className="mt-6 text-center text-xl font-bold tracking-tight text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
          Inspector Sign In
        </h2>
        <p className="mt-1 text-center text-xs text-[#647067] dark:text-[#A3B3A6]">
          Enter your authorized credentials to access statutory inspection records.
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-[#19241C] py-8 px-6 sm:px-10 rounded-3xl border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_4px_20px_rgba(21,128,61,0.04)] space-y-5">
          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-50/70 dark:bg-red-950/20 text-xs text-[#DC2626] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4] mb-1.5">
                Inspector Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#647067] dark:text-[#A3B3A6] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@legalmetrology.gov.in"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#141D17] text-[#17211B] dark:text-[#F0FDF4] focus:outline-none focus:border-[#15803D] dark:focus:border-[#4ADE80] transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4]">
                  Password
                </label>
                <a
                  href="#reset"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Please contact your Directorate Administrator to reset authorized inspector credentials.');
                  }}
                  className="text-[11px] font-medium text-[#15803D] dark:text-[#4ADE80] hover:underline"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#647067] dark:text-[#A3B3A6] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#141D17] text-[#17211B] dark:text-[#F0FDF4] focus:outline-none focus:border-[#15803D] dark:focus:border-[#4ADE80] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#15803D] hover:bg-[#166534] dark:bg-[#22C55E] dark:hover:bg-[#16A34A] text-white dark:text-[#101713] text-xs font-semibold shadow-md shadow-[#15803D]/20 hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#E5EDE6] dark:border-[#29382D] w-full" />
            <span className="bg-white dark:bg-[#19241C] px-3 text-[10px] font-semibold uppercase tracking-wider text-[#647067] dark:text-[#A3B3A6] shrink-0">
              OR CONTINUE WITH
            </span>
            <div className="border-t border-[#E5EDE6] dark:border-[#29382D] w-full" />
          </div>

          {/* Google OAuth Button */}
          <GoogleAuthButton
            onSuccessRedirect={() => navigate(redirectPath, { replace: true })}
            onError={(msg) => setError(msg)}
          />

          {/* Switch to Signup */}
          <p className="text-center text-xs text-[#647067] dark:text-[#A3B3A6] pt-1">
            New inspecting officer?{' '}
            <Link
              to="/signup"
              className="font-semibold text-[#15803D] dark:text-[#4ADE80] hover:underline"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
