import React, { useState } from 'react';
import { KeyRound, Mail, ShieldAlert, ArrowLeft, Loader2, Sparkles } from 'lucide-react';

interface LoginFormProps {
  onNavigate: (path: string) => void;
  onLoginSuccess: (user: any, token: string) => void;
}

export default function LoginForm({ onNavigate, onLoginSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      let resData: any = null;
      const contentType = response.headers.get('content-type');
      let isJson = contentType && contentType.includes('application/json');

      if (isJson) {
        try {
          resData = await response.json();
        } catch (parseErr) {
          isJson = false;
        }
      }

      if (!isJson) {
        if (response.status === 403) {
          throw new Error('Your account has been suspended by system administrators.');
        } else if (response.status === 401) {
          throw new Error('Invalid email or password.');
        } else {
          throw new Error(`Authentication failed with status code ${response.status}.`);
        }
      }

      if (!response.ok || !resData || !resData.success) {
        throw new Error(resData?.error?.message || 'Authentication failed. Please check credentials.');
      }

      const { user, token } = resData.data;
      onLoginSuccess(user, token);

      // Redirect depending on role
      if (user.role === 'CITIZEN') {
        onNavigate('/portal/citizen/dashboard');
      } else if (user.role === 'DEPARTMENT_OFFICER') {
        onNavigate('/portal/officer/dashboard');
      } else if (user.role === 'ADMIN') {
        onNavigate('/portal/admin/dashboard');
      }

    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setErrorMsg(null);
  };

  return (
    <div className="bg-slate-50 min-h-screen flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden relative">
        
        {/* Banner */}
        <div className="bg-slate-900 text-white px-8 py-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-transparent opacity-50"></div>
          <button
            onClick={() => onNavigate('/')}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Back to Landing Page"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold font-sans">Sign In to Platform</h2>
          <p className="text-xs text-slate-400 mt-1">CommunityComrade Civic Portal</p>
        </div>

        {/* Login Form */}
        <div className="p-8">
          {errorMsg && (
            <div className="mb-6 p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-sm flex items-start gap-2.5 rounded-r-lg">
              <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
              <div>
                <p className="font-semibold">Sign In Failed</p>
                <p className="text-rose-600 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-800 font-medium"
                  placeholder="name@municipal.org"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <input
                  id="login-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-800 font-medium"
                  placeholder="••••••••••••"
                  required
                />
              </div>
            </div>

            <button
              id="submit-login-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-lg shadow-teal-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Quick-Fill Testing Panel */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles className="w-4 h-4 text-teal-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Interactive Testing Sandbox
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-normal">
              Select a quick-fill role payload to test the complete validation, endorsement, or approval workflows instantly.
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => fillCredentials('admin@communitycomrade.org', 'Admin123!')}
                className="px-2 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center"
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('citizen.verified@gmail.com', 'Citizen123!')}
                className="px-2 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center"
                title="Fill mock citizen account"
              >
                Mock Citizen
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('officer.pending@gov.in', 'Officer123!')}
                className="px-2 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center"
                title="Officer waiting for admin review"
              >
                Officer (Pending)
              </button>
            </div>
          </div>

          {/* Account Creation Options */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs space-y-2">
            <div className="text-slate-500">
              New Citizen?{' '}
              <button
                onClick={() => onNavigate('/register/citizen')}
                className="text-teal-600 font-semibold hover:underline cursor-pointer"
              >
                Create Account
              </button>
            </div>
            <div className="text-slate-500">
              Department Officer?{' '}
              <button
                onClick={() => onNavigate('/register/officer')}
                className="text-teal-600 font-semibold hover:underline cursor-pointer"
              >
                Register Here
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
