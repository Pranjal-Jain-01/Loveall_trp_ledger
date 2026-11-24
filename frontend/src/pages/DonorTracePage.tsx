

import './DonorTracePage.css';

export default function DonorTracePage() {


  // Temporary demonstration data.
  // Replace with actual API response when backend integration is ready.
  const receipt = {
    amount: '₹25,000',
    fundPool: 'DOMESTIC / CSR',
    recipient: 'Awaiting recipient data',
    ledgerSequence: 'Awaiting ledger data',
    activityHash: 'Awaiting SHA-256 evidence hash',
    ledgerHash: 'Awaiting Ed25519 ledger hash',
    transactionHash: 'Awaiting SHA-256 transaction hash',
    anchorProof: 'Awaiting anchor block proof',
  };

  return (
    <main className="trace-page">

      {/* Top Header */}
      <header className="trace-header">
        <div className="trace-brand">
          <h1>LoveAll</h1>
        </div>

        <div className="public-verification">
          PUBLIC VERIFICATION
        </div>
      </header>

      {/* Main Receipt */}
      <div className="trace-wrapper">

        <article className="receipt-card">

          {/* Receipt Heading */}
          <div className="receipt-heading">
            <h2>Receipt Verification</h2>

            <span className="verification-badge">
              ✓ DEMO PREVIEW
            </span>
          </div>

          <div className="receipt-divider" />

          {/* Contribution Details */}
          <section className="contribution-section">

            <h3 className="section-title">
              CONTRIBUTION DETAILS
            </h3>

            <div className="contribution-amount">
              {receipt.amount}
            </div>

            <p className="amount-caption">
              Contribution Amount
            </p>

            <div className="fund-pool-box">
              <h3>Fund Pool</h3>
              <p>{receipt.fundPool}</p>
            </div>

          </section>

          {/* Allocation and Disbursement */}
          <section className="allocation-section">

            <h2 className="main-section-heading">
              Allocation &amp; Disbursement
            </h2>

            <div className="allocation-box">

              <div className="allocation-item">
                <span>Recipient / Vendor Detail</span>
                <strong>{receipt.recipient}</strong>
              </div>

              <div className="allocation-item">
                <span>Ledger Sequence #</span>
                <strong>{receipt.ledgerSequence}</strong>
              </div>

              <div className="allocation-note">
                Allocation and disbursement information
                will be displayed here.
              </div>

            </div>

          </section>

          {/* Verified Activity and Proof */}
          <section className="activity-section">

            <h2 className="main-section-heading">
              Verified Activity &amp; Proof
            </h2>

            <div className="activity-proof-box">

              <div className="activity-image-placeholder">
                <svg
                  viewBox="0 0 64 64"
                  className="activity-icon"
                  aria-hidden="true"
                >
                  <rect
                    x="9"
                    y="9"
                    width="46"
                    height="46"
                    rx="5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <circle
                    cx="42"
                    cy="23"
                    r="4"
                    fill="currentColor"
                  />
                  <path
                    d="M13 47 L26 33 L35 42 L41 36 L52 48"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <p>Activity Photo / Verification</p>
              </div>

              <div className="activity-hash">
                <span>SHA-256 EVIDENCE HASH</span>
                <code>{receipt.activityHash}</code>
              </div>

            </div>

          </section>

          {/* Cryptographic Auditing */}
          <section className="audit-section">

            <h2 className="main-section-heading">
              Cryptographic Auditing
            </h2>

            <div className="audit-list">

              <div className="audit-item">
                <div className="audit-icon">✓</div>
                <div className="audit-content">
                  <span>Ed25519 Ledger Hash</span>
                  <code>{receipt.ledgerHash}</code>
                </div>
              </div>

              <div className="audit-item">
                <div className="audit-icon">✓</div>
                <div className="audit-content">
                  <span>Transaction Hash (SHA-256)</span>
                  <code>{receipt.transactionHash}</code>
                </div>
              </div>

              <div className="audit-item">
                <div className="audit-icon">✓</div>
                <div className="audit-content">
                  <span>Anchor Block / Proof</span>
                  <code>{receipt.anchorProof}</code>
                </div>
              </div>

            </div>

          </section>

          {/* Ledger Footer */}
          <div className="ledger-verification">
            <span className="ledger-check">✓</span>
            <span>Public Ledger Verification Pending</span>
          </div>

          <div className="demo-notice">
            DEMONSTRATION DATA · NOT A LIVE VERIFIED RECEIPT
          </div>

        </article>

        {/* Page Footer */}
        <footer className="trace-footer">
          LOVEALL · TRANSPARENCY THROUGH TRUST
        </footer>

      </div>

    </main>
  );
}
