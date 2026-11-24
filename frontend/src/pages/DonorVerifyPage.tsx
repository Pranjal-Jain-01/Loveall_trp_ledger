import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DonorVerifyPage() {
  const [token, setToken] = useState('');
  const navigate = useNavigate();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (token.trim()) {
      navigate(`/donor/trace/${encodeURIComponent(token.trim())}`);
    }
  }

  return (
    <div>
      <h1>Verify Public Receipt</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="receipt-token">Public Receipt Token</label>
          <br />
          <input
            id="receipt-token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter your receipt token"
            required
          />
        </div>
        <br />
        <button type="submit">Trace Donation</button>
      </form>
    </div>
  );
}
