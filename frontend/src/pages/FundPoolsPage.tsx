import { useState } from 'react';
import { Link } from 'react-router-dom';

type FundCategory = 'DOMESTIC' | 'FOREIGN' | 'CSR' | '80G';

const CATEGORIES: FundCategory[] = ['DOMESTIC', 'FOREIGN', 'CSR', '80G'];

export default function FundPoolsPage() {
  const [activeFilter, setActiveFilter] = useState<FundCategory | null>(null);

  return (
    <div>
      <h1>Fund Pools</h1>

      <div>
        <strong>Filter: </strong>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveFilter(activeFilter === cat ? null : cat)}
            aria-pressed={activeFilter === cat}
          >
            {cat}
          </button>
        ))}
        {activeFilter && (
          <span> — showing: <code>{activeFilter}</code></span>
        )}
      </div>

      <br />

      <div>
        <h2>Fund Pool List</h2>
        <ul>
          <li>[placeholder — fund pool entry 1]</li>
          <li>[placeholder — fund pool entry 2]</li>
          <li>[placeholder — fund pool entry 3]</li>
        </ul>
      </div>

      <br />
      <Link to="/staff/disbursements">Next: Disbursements →</Link>
    </div>
  );
}
