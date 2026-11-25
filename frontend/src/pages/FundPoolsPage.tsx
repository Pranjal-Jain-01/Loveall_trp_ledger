import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Plus } from 'lucide-react';

type FundCategory = 'DOMESTIC' | 'FOREIGN' | 'CSR' | '80G';

const CATEGORIES: FundCategory[] = ['DOMESTIC', 'FOREIGN', 'CSR', '80G'];

export default function FundPoolsPage() {
  const [activeFilter, setActiveFilter] = useState<FundCategory | null>(null);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="container py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-ink tracking-tight">Fund Pools</h1>
            <p className="mt-1 text-sm text-muted">Manage fund pools across all sources</p>
          </div>
          <button className="btn-primary" disabled>
            <Plus className="w-4 h-4" />
            Create Fund Pool
          </button>
        </div>

        <div className="mb-6">
          <strong className="text-sm text-muted mr-3">Filter:</strong>
          <div className="inline-flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveFilter(activeFilter === cat ? null : cat)}
                aria-pressed={activeFilter === cat}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  activeFilter === cat
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-surface text-muted hover:bg-brand-50 hover:text-ink border border-default'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          {activeFilter && (
            <span className="ml-3 text-sm text-muted">— showing: <code className="bg-neutral-100 px-1 rounded">{activeFilter}</code></span>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-ink mb-4">Fund Pool List</h2>
          <ul className="space-y-3">
            <li className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-brand-100 text-brand-600">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-ink">General Domestic Pool</p>
                  <p className="text-sm text-muted">DOMESTIC • ₹50,00,000 available</p>
                </div>
              </div>
              <span className="badge-success">Active</span>
            </li>
            <li className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-brand-100 text-brand-600">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-ink">FCRA Foreign Pool</p>
                  <p className="text-sm text-muted">FOREIGN • ₹25,00,000 available</p>
                </div>
              </div>
              <span className="badge-success">Active</span>
            </li>
            <li className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning-100 text-warning-600">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-ink">CSR Pool - Education</p>
                  <p className="text-sm text-muted">CSR • ₹10,00,000 available</p>
                </div>
              </div>
              <span className="badge-warning">Low Balance</span>
            </li>
          </ul>
        </div>

        <div className="mt-6">
          <Link to="/staff/disbursements" className="btn-ghost">
            <span>→</span> Go to Disbursements
          </Link>
        </div>
      </div>
    </div>
  );
}