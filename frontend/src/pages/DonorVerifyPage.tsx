import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Search } from 'lucide-react';

export default function DonorVerifyPage() {
  const [token, setToken] = useState('');
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (token.trim()) {
      navigate(`/donor/trace/${encodeURIComponent(token.trim())}`);
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface rounded-2xl border border-default p-8 shadow-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-100 text-brand-600 mb-4">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-semibold text-ink">LoveAll</h1>
          <p className="text-sm text-muted mt-1">Transparency Ledger</p>
        </div>

        <h2 className="text-2xl font-bold text-ink text-center">Verify Your Donation</h2>

        <p className="text-muted text-center mt-3 mb-6">
          Enter your public receipt token to trace your donation.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="receipt-token"
              className="label"
            >
              Public Receipt Token
            </label>
            <input
              id="receipt-token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your receipt token"
              className="input"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-3"
          >
            <Search className="w-4 h-4" />
            Verify & Trace Donation
          </button>
        </form>

        <p className="text-xs text-muted/50 text-center mt-6">
          Secure and transparent donation tracking.
        </p>

      </div>
    </div>
  );
}