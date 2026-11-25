
import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';

import '../DonorTracePage.css';

export default function DonorTracePage() {
  // Temporary demonstration data.
  // Replace with the verified API response during backend integration.
  const receipt = {
    amount: '₹25,000',
    fundPool: 'DOMESTIC / CSR',
    recipient: 'Awaiting recipient data',
    ledgerSequence: 'Awaiting ledger data',
    activityHash: 'Awaiting SHA-256 evidence hash',
    ledgerHash: 'Awaiting Ed25519 ledger hash',
    transactionHash: 'Awaiting SHA-256 transaction hash',
    anchorProof: 'Awaiting anchor block proof',
    reference: 'TEST123',
  };

  const [activityImage, setActivityImage] = useState<string | null>(null);
  const [showImage, setShowImage] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copiedField, setCopiedField] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const verificationUrl =
    typeof window !== 'undefined' ? window.location.href : '';

  const hashItems = [
    {
      label: 'SHA-256 Evidence Hash',
      value: receipt.activityHash,
      description: 'Integrity proof for uploaded activity evidence',
    },
    {
      label: 'Ed25519 Ledger Hash',
      value: receipt.ledgerHash,
      description: 'Digital signature associated with the ledger record',
    },
    {
      label: 'Transaction Hash',
      value: receipt.transactionHash,
      description: 'SHA-256 transaction reference',
    },
    {
      label: 'Anchor Block / Proof',
      value: receipt.anchorProof,
      description: 'Reference to the public ledger anchor',
    },
  ];

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      window.setTimeout(() => setCopiedField(''), 1800);
    } catch {
      alert('Unable to copy. Please copy the text manually.');
    }
  };

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setActivityImage((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return imageUrl;
    });
  };

  const downloadReceipt = () => {
    const pdf = new jsPDF();

    pdf.setFillColor(0, 106, 113);
    pdf.rect(0, 0, 210, 42, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(23);
    pdf.text('LoveAll', 18, 20);

    pdf.setFontSize(10);
    pdf.text('TRANSPARENCY THROUGH TRUST', 18, 29);

    pdf.setFontSize(17);
    pdf.text('Contribution Receipt', 18, 58);

    pdf.setTextColor(100, 100, 100);
    pdf.setFontSize(9);
    pdf.text('DEMONSTRATION COPY - NOT A LIVE VERIFIED RECEIPT', 18, 66);

    pdf.setDrawColor(220, 220, 220);
    pdf.line(18, 74, 192, 74);

    pdf.setTextColor(30, 50, 50);
    pdf.setFontSize(11);

    const details = [
      ['Receipt Reference', receipt.reference],
      ['Contribution Amount', 'INR 25,000'],
      ['Fund Pool', receipt.fundPool],
      ['Recipient / Vendor', receipt.recipient],
      ['Ledger Sequence', receipt.ledgerSequence],
    ];

    let y = 88;

    details.forEach(([label, value]) => {
      pdf.setTextColor(110, 110, 110);
      pdf.text(label, 18, y);

      pdf.setTextColor(30, 50, 50);
      pdf.text(value, 105, y, { maxWidth: 85 });

      y += 13;
    });

    y += 5;
    pdf.setDrawColor(220, 220, 220);
    pdf.line(18, y, 192, y);

    y += 14;
    pdf.setFontSize(13);
    pdf.setTextColor(0, 106, 113);
    pdf.text('Cryptographic Audit Information', 18, y);

    y += 11;
    pdf.setFontSize(9);

    hashItems.forEach((item) => {
      pdf.setTextColor(60, 60, 60);
      pdf.text(item.label, 18, y);
      y += 5;

      pdf.setTextColor(110, 110, 110);
      const lines = pdf.splitTextToSize(item.value, 170);
      pdf.text(lines, 18, y);
      y += lines.length * 5 + 7;
    });

    pdf.setTextColor(130, 130, 130);
    pdf.setFontSize(9);
    pdf.text(
      'All receipt and verification values shown are demonstration data.',
      18,
      275,
      { maxWidth: 174 }
    );

    pdf.save(`LoveAll-Receipt-${receipt.reference}.pdf`);
  };

  return (
    <main className="trace-page">
      {/* Header */}
      <header className="trace-header">
        <a className="trace-brand" href="/" aria-label="LoveAll home">
          <span className="brand-mark">L</span>
          <span>
            <strong>LoveAll</strong>
            <small>TRANSPARENCY THROUGH TRUST</small>
          </span>
        </a>

        <div className="public-verification">
          <span className="public-dot" />
          PUBLIC VERIFICATION
        </div>
      </header>

      <div className="trace-wrapper">
        {/* Page introduction */}
        <section className="trace-intro">
          <div className="eyebrow">
            <span /> DONORTRACE / RECEIPT DETAILS
          </div>

          <h1>
            Your contribution,
            <br />
            <span>accounted for.</span>
          </h1>

          <p>
            A transparent record of your contribution, fund allocation
            and verification information.
          </p>
        </section>

        {/* Premium receipt card */}
        <article className="receipt-card">
          <div className="receipt-topline">
            <div>
              <span className="receipt-label">LOVEALL DONORTRACE</span>
              <h2>Contribution Receipt</h2>
            </div>

            <span className="demo-badge">
              <span /> DEMO PREVIEW
            </span>
          </div>

          <div className="receipt-amount-panel">
            <span className="amount-label">CONTRIBUTION AMOUNT</span>

            <div className="contribution-amount">
              {receipt.amount}
            </div>

            <div className="amount-bottom">
              <span>Fund Pool</span>
              <strong>{receipt.fundPool}</strong>
            </div>
          </div>

          <div className="receipt-meta-grid">
            <div>
              <span>RECEIPT REFERENCE</span>
              <strong>{receipt.reference}</strong>
            </div>

            <div>
              <span>PAYMENT STATUS</span>
              <strong className="pending-text">
                <span className="status-dot" /> Demo / Not verified
              </strong>
            </div>
          </div>

          <div className="receipt-actions">
            <button
              className="primary-action"
              onClick={downloadReceipt}
              type="button"
            >
              <span>↓</span> Download Receipt
            </button>

            <button
              className="secondary-action"
              onClick={() =>
                copyText(verificationUrl, 'receipt-link')
              }
              type="button"
            >
              {copiedField === 'receipt-link' ? 'Copied!' : 'Copy Receipt Link'}
            </button>
          </div>

          <div className="receipt-watermark">
            DEMONSTRATION DATA · NOT A LIVE VERIFIED RECEIPT
          </div>
        </article>

        {/* Allocation timeline */}
        <section className="trace-section">
          <div className="section-heading">
            <div className="section-icon">01</div>
            <div>
              <span className="section-kicker">FUND MOVEMENT</span>
              <h2>Allocation &amp; Disbursement</h2>
              <p>Follow the journey of your contribution.</p>
            </div>
          </div>

          <div className="detail-card">
            <div className="recipient-panel">
              <div>
                <span className="detail-label">RECIPIENT / VENDOR</span>
                <strong>{receipt.recipient}</strong>
              </div>

              <div>
                <span className="detail-label">LEDGER SEQUENCE</span>
                <strong>{receipt.ledgerSequence}</strong>
              </div>
            </div>

            <div className="allocation-timeline">
              {[
                {
                  title: 'Contribution received',
                  description: 'Payment record awaiting backend confirmation',
                },
                {
                  title: 'Fund allocation',
                  description: 'Allocation information not yet available',
                },
                {
                  title: 'Recipient assigned',
                  description: 'Recipient details are pending',
                },
                {
                  title: 'Disbursement completed',
                  description: 'Disbursement proof is pending',
                },
              ].map((step, index) => (
                <div className="timeline-item" key={step.title}>
                  <div className="timeline-marker">
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  <div className="timeline-content">
                    <div className="timeline-title-row">
                      <strong>{step.title}</strong>
                      <span className="small-pending">PENDING</span>
                    </div>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Activity evidence */}
        <section className="trace-section">
          <div className="section-heading">
            <div className="section-icon">02</div>
            <div>
              <span className="section-kicker">SUPPORTING DOCUMENTATION</span>
              <h2>Verified Activity &amp; Proof</h2>
              <p>Visual evidence associated with the contribution.</p>
            </div>
          </div>

          <div className="detail-card evidence-card">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="visually-hidden"
              onChange={handleImageUpload}
            />

            <div className="evidence-preview">
              {activityImage ? (
                <button
                  className="evidence-image-button"
                  type="button"
                  onClick={() => setShowImage(true)}
                  aria-label="View activity evidence image"
                >
                  <img src={activityImage} alt="Uploaded activity evidence" />
                  <span>VIEW IMAGE ↗</span>
                </button>
              ) : (
                <div className="evidence-empty">
                  <div className="evidence-image-icon">▧</div>
                  <strong>No activity image available</strong>
                  <span>Evidence image will appear here when uploaded.</span>
                </div>
              )}
            </div>

            <div className="evidence-info">
              <div>
                <span className="detail-label">ACTIVITY EVIDENCE</span>
                <strong>
                  {activityImage ? 'Image preview available' : 'Awaiting evidence upload'}
                </strong>
              </div>

              <button
                className="upload-button"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                + {activityImage ? 'Change Image' : 'Preview an Image'}
              </button>
            </div>

            <div className="hash-preview">
              <div className="hash-heading">
                <span>SHA-256 EVIDENCE HASH</span>
                <span className="small-pending">PENDING</span>
              </div>

              <code>{receipt.activityHash}</code>
            </div>

            <p className="evidence-note">
              Uploaded images are local previews only. They are not
              authenticated or stored on the public ledger.
            </p>
          </div>
        </section>

        {/* Cryptographic audit */}
        <section className="trace-section">
          <div className="section-heading">
            <div className="section-icon">03</div>
            <div>
              <span className="section-kicker">DATA INTEGRITY</span>
              <h2>Cryptographic Auditing</h2>
              <p>Technical proofs associated with the receipt.</p>
            </div>
          </div>

          <div className="audit-grid">
            {hashItems.map((item, index) => (
              <article className="audit-card" key={item.label}>
                <div className="audit-card-top">
                  <span className="audit-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="small-pending">PENDING</span>
                </div>

                <h3>{item.label}</h3>
                <p>{item.description}</p>

                <div className="audit-hash">
                  <code>{item.value}</code>
                </div>

                <button
                  className="copy-button"
                  type="button"
                  onClick={() => copyText(item.value, item.label)}
                >
                  {copiedField === item.label ? '✓ Copied' : 'Copy value ↗'}
                </button>
              </article>
            ))}
          </div>
        </section>

        {/* Public ledger verification */}
        <section className="ledger-card">
          <div className="ledger-symbol">⌁</div>

          <div className="ledger-copy">
            <span className="section-kicker">PUBLIC RECORD</span>
            <h2>Public Ledger Verification</h2>
            <p>
              The public ledger record and cryptographic verification
              details will appear here once available.
            </p>
            <span className="ledger-status">
              <span /> VERIFICATION PENDING
            </span>
          </div>
        </section>

        {/* QR verification */}
        <section className="trace-section qr-section">
          <div className="section-heading">
            <div className="section-icon">04</div>
            <div>
              <span className="section-kicker">SHARE &amp; VERIFY</span>
              <h2>Receipt QR Verification</h2>
              <p>Scan the QR code to open this public receipt URL.</p>
            </div>
          </div>

          <div className="detail-card qr-card">
            <div className="qr-visual">
              <QRCodeSVG
                value={verificationUrl}
                size={156}
                level="H"
                includeMargin
                fgColor="#006A71"
                bgColor="#FFFFFF"
              />
            </div>

            <div className="qr-info">
              <span className="detail-label">PUBLIC RECEIPT LINK</span>
              <strong>LoveAll DonorTrace</strong>
              <p>
                This QR code points to the current page URL. Public
                access and receipt verification depend on your deployed
                route and backend.
              </p>

              <button
                className="secondary-action qr-button"
                type="button"
                onClick={() => setShowQR(!showQR)}
              >
                {showQR ? 'Hide QR details' : 'View QR details'}
              </button>

              {showQR && (
                <code className="qr-url">{verificationUrl}</code>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="trace-footer">
          <div className="footer-brand">LoveAll</div>
          <p>TRANSPARENCY THROUGH TRUST</p>
          <span>DONORTRACE · PUBLIC RECEIPT</span>
        </footer>
      </div>

      {/* Activity image lightbox */}
      {showImage && activityImage && (
        <div
          className="image-lightbox"
          onClick={() => setShowImage(false)}
          role="presentation"
        >
          <button
            className="lightbox-close"
            type="button"
            onClick={() => setShowImage(false)}
            aria-label="Close image preview"
          >
            ×
          </button>

          <img
            src={activityImage}
            alt="Enlarged activity evidence"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}
