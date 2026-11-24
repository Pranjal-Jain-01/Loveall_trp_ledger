export default function DisbursementsPage() {
  return (
    <div>
      <h1>Disbursements</h1>

      <div>
        <h2>Impact Evidence (SHA-256)</h2>
        <pre>[placeholder — SHA-256 impact evidence hash]</pre>
      </div>

      <div>
        <h2>Supervisor Attestation</h2>
        <pre>[placeholder — attestation status: PENDING / APPROVED / REJECTED]</pre>
      </div>

      <div>
        <h2>Disbursement &amp; Tax Basis</h2>
        <pre>[placeholder — disbursement amount and tax basis fields]</pre>
      </div>

      <div>
        <h2>Compliance / Double-Entry Status</h2>
        <pre>[placeholder — compliance check and double-entry accounting status]</pre>
      </div>

      <div>
        <h2>Actions</h2>
        <button type="button" onClick={() => alert('Propose action (placeholder)')}>
          Propose
        </button>{' '}
        <button type="button" onClick={() => alert('Approve action (placeholder)')}>
          Approve
        </button>{' '}
        <button type="button" onClick={() => alert('Verify action (placeholder)')}>
          Verify
        </button>{' '}
        <button type="button" onClick={() => alert('Sign & Post action (placeholder)')}>
          Sign &amp; Post
        </button>
      </div>
    </div>
  );
}
