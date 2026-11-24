import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export default function StaffLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const navigate = useNavigate();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    navigate('/staff/workspaces');
  }

  return (
    <div>
      <h1>Staff Login</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <br />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@organisation.org"
            required
          />
        </div>
        <br />
        <div>
          <label htmlFor="password">Password</label>
          <br />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <br />
        <div>
          <label htmlFor="mfa-code">MFA Code</label>
          <br />
          <input
            id="mfa-code"
            type="text"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            placeholder="6-digit code"
            inputMode="numeric"
            maxLength={6}
          />
        </div>
        <br />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
