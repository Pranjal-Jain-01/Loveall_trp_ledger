import { Link } from 'react-router-dom';

const ROLES = [
  'Org Admin',
  'Finance Officer',
  'Field Worker',
  'Supervisor',
  'Verifier',
  'Auditor',
] as const;

export default function RoleWorkspacePage() {
  return (
    <div>
      <h1>Role Workspaces</h1>
      <p>Switch to a role view:</p>
      <nav>
        <ul>
          {ROLES.map((role) => (
            <li key={role}>
              <a href="#" onClick={(e) => e.preventDefault()}>
                {role}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <br />
      <Link to="/staff/fund-pools">Go to Fund Pools →</Link>
    </div>
  );
}
