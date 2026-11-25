import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, Lock, Mail, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function StaffLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipMfa, setSkipMfa] = useState(false);
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 'credentials') {
      if (!email || !password) {
        setError('Please enter both email and password');
        return;
      }
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsLoading(false);
      if (skipMfa) {
        navigate('/staff/workspaces');
      } else {
        setStep('mfa');
      }
    } else {
      if (!mfaCode || mfaCode.length !== 6) {
        setError('Please enter a valid 6-digit MFA code');
        return;
      }
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsLoading(false);
      navigate('/staff/workspaces');
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setMfaCode('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo & Brand */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 mb-6" aria-label="LoveAll Transparency Ledger Home">
            <svg className="h-10 w-10 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-2xl font-semibold text-ink">LoveAll</span>
          </Link>
          <p className="text-muted text-sm">Transparency Ledger</p>
        </div>

        {/* Login Card */}
        <div className="bg-surface border border-default rounded-2xl p-8 shadow-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-100 text-brand-600 mb-4">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-semibold text-ink">Staff Sign In</h1>
            <p className="mt-2 text-sm text-muted">
              Access your organisation workspace
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-error-50 border border-error-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-error-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-error-800">Sign in failed</p>
                <p className="text-sm text-error-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {step === 'credentials' && (
              <>
                {/* Email */}
                <div>
                  <label htmlFor="email" className="label">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" aria-hidden="true" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="staff@organisation.org"
                      required
                      autoComplete="email"
                      disabled={isLoading}
                      className="input input-icon"
                      aria-describedby="email-hint"
                    />
                  </div>
                  <p id="email-hint" className="form-hint">Your organisation email address</p>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="label">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" aria-hidden="true" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      disabled={isLoading}
                      className="input input-icon pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Skip MFA Option */}
                <div className="flex items-center gap-2 p-3 bg-brand-50 border border-brand-100 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipMfa}
                      onChange={(e) => setSkipMfa(e.target.checked)}
                      className="w-4 h-4 text-brand-600 border-brand-300 rounded focus:ring-brand-500 focus:ring-2"
                    />
                    <span className="text-sm text-secondary">Skip MFA for this session</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="btn-primary w-full py-3"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying…
                    </>
                  ) : skipMfa ? (
                    'Sign In (Skip MFA)'
                  ) : (
                    'Continue with MFA'
                  )}
                </button>
              </>
            )}

            {step === 'mfa' && (
              <>
                {/* MFA Info */}
                <div className="p-4 bg-brand-50 border border-brand-100 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-brand-700">MFA Required</p>
                      <p className="text-sm text-secondary mt-1">
                        Enter the 6-digit code from your authenticator app.
                        We've sent a push notification to your registered device.
                      </p>
                    </div>
                  </div>
                </div>

                {/* MFA Code Input */}
                <div>
                  <label htmlFor="mfa-code" className="label">
                    Authenticator Code
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" aria-hidden="true" />
                    <input
                      id="mfa-code"
                      type="text"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      autoComplete="one-time-code"
                      disabled={isLoading}
                      className="input input-icon text-center text-2xl font-mono tracking-widest"
                    />
                  </div>
                </div>

                {/* MFA Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={isLoading || !mfaCode || mfaCode.length !== 6}
                    className="btn-primary flex-1 py-3"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Signing in…
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleBackToCredentials}
                    disabled={isLoading}
                    className="btn-secondary flex-1 py-3"
                  >
                    Back
                  </button>
                </div>
              </>
            )}
          </form>

          {/* Footer Links */}
          <div className="mt-8 pt-6 border-t border-default space-y-3">
            <Link
              to="/donor/verify"
              className="btn-ghost w-full justify-center text-sm"
            >
              <span>←</span> Back to Public Verification
            </Link>
            <p className="text-center text-xs text-muted">
              Need help? Contact your organisation administrator
            </p>
          </div>
        </div>

        {/* Compliance Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted max-w-sm mx-auto">
            <strong>LoveAll Transparency Ledger</strong> — All access is logged and auditable.
            Multi-factor authentication is mandatory for staff accounts.
          </p>
        </div>
      </div>
    </div>
  );
}