import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div>
      <h1>LoveAll Transparency Ledger</h1>
      <nav>
        <ul>
          <li>
            <Link to="/donor/verify">Public Donor</Link>
          </li>
          <li>
            <Link to="/staff/login">Organisation Staff</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
