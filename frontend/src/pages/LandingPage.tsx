import { Link } from 'react-router-dom';
import { Shield, ArrowRight, CheckCircle, Users, Search, BarChart2, Lock, Globe, Heart } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Navigation */}
      <header className="border-b border-default bg-surface/80 backdrop-blur-sm sticky top-0 z-40">
        <nav className="container" aria-label="Main navigation">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2" aria-label="LoveAll Transparency Ledger Home">
                <svg className="h-8 w-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-xl font-semibold text-ink">LoveAll</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/donor/verify" className="btn-secondary hidden sm:inline-flex">
                Verify a Receipt
              </Link>
              <Link to="/staff/login" className="btn-primary">
                Staff Login
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden section-lg" aria-labelledby="hero-heading">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700 mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                </span>
                Live on Mainnet • Transparent & Auditable
              </span>
              <h1 id="hero-heading" className="heading-1 mb-6">
                Every Donation
                <br />
                <span className="text-brand-600">Traceable. Verifiable. Trusted.</span>
              </h1>
              <p className="text-lead mb-8 max-w-2xl mx-auto">
                LoveAll Transparency Ledger brings radical transparency to charitable giving.
                Donors verify exactly where their money goes. Organisations prove impact with cryptographic receipts.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/donor/verify" className="btn-primary w-full sm:w-auto text-base px-6 py-3">
                  Verify a Receipt
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link to="/staff/login" className="btn-secondary w-full sm:w-auto text-base px-6 py-3">
                  Organisation Dashboard
                </Link>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="p-4">
                <div className="text-3xl sm:text-4xl font-bold text-brand-600 tabular-nums">100%</div>
                <div className="text-sm text-muted mt-1">On-chain Transparency</div>
              </div>
              <div className="p-4">
                <div className="text-3xl sm:text-4xl font-bold text-brand-600 tabular-nums">0</div>
                <div className="text-sm text-muted mt-1">Hidden Fees</div>
              </div>
              <div className="p-4">
                <div className="text-3xl sm:text-4xl font-bold text-brand-600 tabular-nums">∞</div>
                <div className="text-sm text-muted mt-1">Traceable Hops</div>
              </div>
              <div className="p-4">
                <div className="text-3xl sm:text-4xl font-bold text-brand-600 tabular-nums">24/7</div>
                <div className="text-sm text-muted mt-1">Public Verification</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="section-lg bg-surface" aria-labelledby="features-heading">
          <div className="container">
            <div className="text-center mb-16">
              <h2 id="features-heading" className="heading-2 mb-4">
                Built for <span className="text-brand-600">Trust</span> at Every Layer
              </h2>
              <p className="text-lead max-w-2xl mx-auto">
                From fund receipt to final disbursement, every movement is recorded, verified, and publicly auditable.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <article className="card-interactive p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-100 text-brand-600 mb-4">
                  <Shield className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">Immutable Ledger</h3>
                <p className="text-muted mb-4">Every transaction recorded on an append-only SHA-256 hash chain with Ed25519 signatures.</p>
                <ul className="space-y-2 text-sm text-secondary">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-brand-500" /> Cryptographic hash chain</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-brand-500" /> Digital signatures</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-brand-500" /> Public anchor proofs</li>
                </ul>
              </article>

              {/* Feature 2 */}
              <article className="card-interactive p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-100 text-brand-600 mb-4">
                  <Search className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">Public Verification</h3>
                <p className="text-muted mb-4">Donors verify receipts instantly via QR code or reference number — no login required.</p>
                <ul className="space-y-2 text-sm text-secondary">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-brand-500" /> QR code verification</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-brand-500" /> Receipt reference lookup</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-brand-500" /> PDF audit receipts</li>
                </ul>
              </article>

              {/* Feature 3 */}
              <article className="card-interactive p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-100 text-brand-600 mb-4">
                  <Lock className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">Compliance Guardrails</h3>
                <p className="text-muted mb-4">Database-enforced rules prevent regulatory violations before they happen.</p>
                <ul className="space-y-2 text-sm text-secondary">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-brand-500" /> FCRA foreign→partner block</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-brand-500" /> Verified agreement gate</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-brand-500" /> UTR payment reference required</li>
                </ul>
              </article>

              {/* Feature 4 */}
              <article className="card-interactive p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-100 text-brand-600 mb-4">
                  <Users className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">Role-Based Workspaces</h3>
                <p className="text-muted mb-4">Tailored interfaces for admins, finance officers, field workers, supervisors, verifiers, and auditors.</p>
                <ul className="space-y-2 text-sm text-secondary">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-brand-500" /> Granular permissions</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-brand-500" /> Audit trails per role</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-brand-500" /> Conditional release workflows</li>
                </ul>
              </article>

              {/* Feature 5 */}
              <article className="card-interactive p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-100 text-brand-600 mb-4">
                  <Globe className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">Multi-Source Fund Pools</h3>
                <p className="text-muted mb-4">Manage Domestic, Foreign, CSR, and 80G pools with distinct compliance rules per source.</p>
                <ul className="space-y-2 text-sm text-secondary">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-brand-500" /> Source-origin tracking</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-brand-500" /> Purpose categorization</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-brand-500" /> Real-time balance monitoring</li>
                </ul>
              </article>

              {/* Feature 6 */}
              <article className="card-interactive p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-100 text-brand-600 mb-4">
                  <BarChart2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">Programme & Agreement Management</h3>
                <p className="text-muted mb-4">Link disbursements to programmes and funding agreements with conditional release support.</p>
                <ul className="space-y-2 text-sm text-secondary">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-brand-500" /> Milestone-based releases</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-brand-500" /> Independent verification</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-brand-500" /> Full audit trail</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="section-lg bg-canvas" aria-labelledby="how-heading">
          <div className="container">
            <div className="text-center mb-16">
              <h2 id="how-heading" className="heading-2 mb-4">
                How It <span className="text-brand-600">Works</span>
              </h2>
              <p className="text-lead max-w-2xl mx-auto">
                A seamless flow from contribution to verified impact.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                {
                  number: '01',
                  title: 'Donor Contributes',
                  description: 'Donor makes a contribution via any channel. Organisation records it in the appropriate fund pool.',
                  icon: Heart,
                },
                {
                  number: '02',
                  title: 'Fund Allocation',
                  description: 'Funds are allocated to programmes per funding agreements. Compliance rules are checked at DB layer.',
                  icon: Shield,
                },
                {
                  number: '03',
                  title: 'Disbursement Execution',
                  description: 'Org admin proposes, approves, and executes disbursements with UTR payment references recorded.',
                  icon: ArrowRight,
                },
                {
                  number: '04',
                  title: 'Public Verification',
                  description: 'Donor scans QR or enters reference to see full audit trail — immutable, signed, and anchored.',
                  icon: Search,
                },
              ].map((step) => (
                <article key={step.number} className="relative card-interactive p-6">
                  <div className="absolute -top-3 left-6 w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold">
                    {step.number}
                  </div>
                  <div className="pt-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-100 text-brand-600 mb-4">
                      <step.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-semibold text-ink mb-2">{step.title}</h3>
                    <p className="text-muted text-sm">{step.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance Highlight */}
        <section className="section-lg bg-surface border-y border-default" aria-labelledby="compliance-heading">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 id="compliance-heading" className="heading-2 mb-6">
                  Compliance <span className="text-brand-600">Enforced at Source</span>
                </h2>
                <p className="text-lead mb-8">
                  Unlike traditional systems where compliance is checked manually after the fact, LoveAll encodes regulatory rules
                  directly into the database layer. Violations are prevented before they can occur.
                </p>
                <div className="space-y-4">
                  {[
                    { code: 'ER-01', label: 'FCRA Foreign→Partner Block', desc: 'Foreign-sourced funds cannot be sub-granted to partner NGOs. Enforced via CHECK constraint.' },
                    { code: 'ER-02', label: 'Verified Agreement Gate', desc: 'Conditional releases require a VERIFIED funding agreement with explicit conditional disbursement permission.' },
                    { code: 'ER-03', label: 'UTR Payment Reference Required', desc: 'No disbursement can be marked PAID without a valid UTR/NEFT/RTGS/UPI reference number.' },
                  ].map((rule) => (
                    <div key={rule.code} className="flex gap-4 p-4 bg-brand-50 border border-brand-100 rounded-xl">
                      <div className="shrink-0 w-20 text-center">
                        <span className="text-xs font-mono text-brand-600 bg-brand-100 px-2 py-1 rounded">{rule.code}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-ink">{rule.label}</h4>
                        <p className="text-sm text-muted mt-1">{rule.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square max-w-md mx-auto bg-gradient-to-br from-brand-100 to-brand-50 rounded-2xl border border-brand-200 flex items-center justify-center">
                  <svg viewBox="0 0 200 200" className="w-full h-full max-w-xs" aria-hidden="true">
                    <defs>
                      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#9ACBD0" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#48A6A7" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>
                    <path d="M100 10 L190 35 L190 100 Q190 140 100 190 Q10 140 10 100 L10 35 Z" fill="url(#shieldGrad)" stroke="#006A71" strokeWidth="2" />
                    <circle cx="100" cy="100" r="40" fill="none" stroke="#006A71" strokeWidth="1.5" strokeDasharray="8 4" />
                    <circle cx="100" cy="100" r="60" fill="none" stroke="#48A6A7" strokeWidth="1" strokeDasharray="4 8" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#9ACBD0" strokeWidth="0.5" />
                    <text x="100" y="105" textAnchor="middle" fill="#006A71" fontSize="14" fontWeight="bold" fontFamily="system-ui">VERIFIED</text>
                    <text x="100" y="120" textAnchor="middle" fill="#48A6A7" fontSize="10" fontFamily="system-ui">SHA-256 • Ed25519</text>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="section-lg bg-canvas" aria-labelledby="cta-heading">
          <div className="container text-center">
            <h2 id="cta-heading" className="heading-2 mb-4">
              Ready to Bring <span className="text-brand-600">Transparency</span> to Your Giving?
            </h2>
            <p className="text-lead mb-8 max-w-2xl mx-auto">
              Join organisations worldwide using LoveAll to prove impact and build donor trust.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/staff/login" className="btn-primary text-base px-8 py-3">
                Get Started Free
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/donor/verify" className="btn-secondary text-base px-8 py-3">
                Try Verification Demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-default py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4" aria-label="LoveAll Transparency Ledger Home">
                <svg className="h-8 w-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-xl font-semibold text-ink">LoveAll</span>
              </Link>
              <p className="text-muted text-sm max-w-xs">
                Transparency Through Trust. Building a world where every donation is traceable, verifiable, and trusted.
              </p>
            </div>
            <nav aria-label="Product links">
              <h4 className="font-semibold text-ink mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li><Link to="/donor/verify" className="text-link">Verify Receipt</Link></li>
                <li><Link to="/staff/login" className="text-link">Staff Dashboard</Link></li>
                <li><Link to="#features" className="text-link">Features</Link></li>
                <li><Link to="#compliance" className="text-link">Compliance</Link></li>
              </ul>
            </nav>
            <nav aria-label="Resources links">
              <h4 className="font-semibold text-ink mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li><a href="#" className="text-link">Documentation</a></li>
                <li><a href="#" className="text-link">API Reference</a></li>
                <li><a href="#" className="text-link">Compliance Guide</a></li>
                <li><a href="#" className="text-link">Blog</a></li>
              </ul>
            </nav>
          </div>
          <div className="pt-8 border-t border-default flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted">
              © {new Date().getFullYear()} LoveAll Foundation. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted">
              <a href="#" className="text-link">Privacy Policy</a>
              <a href="#" className="text-link">Terms of Service</a>
              <a href="#" className="text-link">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}