import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function GoogleAuthButton({ onSuccessRedirect, onError }) {
  const { loginWithGoogle } = useAuth();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [configError, setConfigError] = useState(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isPlaceholderId = !clientId || clientId.includes('your-google-client-id');

  const handleGoogleSuccess = async (tokenResponse) => {
    setIsLoading(true);
    setConfigError(null);
    try {
      // Send token to backend for verification
      const credential = tokenResponse.credential || tokenResponse.access_token;
      await loginWithGoogle(credential);
      addToast({
        title: 'Authentication Successful',
        message: 'Signed in with your verified Google account.',
        type: 'success',
      });
      if (onSuccessRedirect) onSuccessRedirect();
    } catch (err) {
      const isMissingEndpoint = err.status === 404 || err.isNetworkError;
      const errorMsg = isMissingEndpoint
        ? 'FastAPI backend endpoint /api/auth/google is not running or not yet implemented.'
        : err.message || 'Google authentication failed';
      
      setConfigError({
        title: isMissingEndpoint ? 'Backend Endpoint Required' : 'Google Auth Error',
        message: errorMsg,
        details: isMissingEndpoint
          ? 'FastAPI must implement POST /api/auth/google to verify Google identity tokens using google-auth or httpx.'
          : null,
      });

      if (onError) onError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = (error) => {
    console.warn('[Google OAuth] Error response:', error);
    addToast({
      title: 'Google Login Cancelled',
      message: 'Google authentication was cancelled or encountered an error.',
      type: 'warning',
    });
  };

  // Google OAuth hook
  const triggerGoogleOAuth = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: handleGoogleError,
  });

  const handleClick = () => {
    if (isPlaceholderId) {
      setConfigError({
        title: 'Google Client ID Configuration Needed',
        message: 'VITE_GOOGLE_CLIENT_ID in your .env file is set to a placeholder.',
        details: 'To enable live Google login, register an OAuth 2.0 Web Client in Google Cloud Console, add http://localhost:5173 to Authorized JavaScript Origins, and paste the Client ID into .env.',
      });
      return;
    }
    triggerGoogleOAuth();
  };

  return (
    <div className="w-full space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-white dark:bg-[#19241C] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26]/40 text-[#17211B] dark:text-[#F0FDF4] text-xs font-semibold shadow-[0_1px_3px_rgba(21,128,61,0.04)] hover:border-[#15803D]/50 dark:hover:border-[#4ADE80]/50 transition-all duration-150 disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#15803D] dark:text-[#4ADE80]" />
        ) : (
          /* Official Google 'G' Logo */
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>{isLoading ? 'Verifying with Google...' : 'Continue with Google'}</span>
      </button>

      {/* Helpful Backend / Config Alert if needed */}
      {configError && (
        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-50/70 dark:bg-amber-950/20 text-xs text-[#17211B] dark:text-[#F0FDF4] space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-[#D97706] dark:text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{configError.title}</span>
          </div>
          <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6] leading-relaxed">
            {configError.message}
          </p>
          {configError.details && (
            <p className="text-[10px] font-mono text-[#15803D] dark:text-[#4ADE80] bg-white dark:bg-[#141D17] p-2 rounded-lg border border-[#E5EDE6] dark:border-[#29382D] mt-1 break-all">
              {configError.details}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
