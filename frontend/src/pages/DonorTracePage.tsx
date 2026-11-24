import { useParams } from 'react-router-dom';

export default function DonorTracePage() {
  const { token } = useParams<{ token: string }>();

  return (
    <div>
      <h1>Donation Trace</h1>
      <p>Token: <code>{token}</code></p>

      <div>
        <h2>Contribution Amount</h2>
        <pre>[placeholder — contribution amount]</pre>
      </div>

      <div>
        <h2>Fund Pool Classification</h2>
        <pre>[placeholder — fund pool classification]</pre>
      </div>

      <div>
        <h2>Allocation &amp; Disbursement</h2>
        <pre>[placeholder — allocation and disbursement details]</pre>
      </div>

      <div>
        <h2>Verified Activity Proof (SHA-256)</h2>
        <pre>[placeholder — SHA-256 activity proof hash]</pre>
      </div>

      <div>
        <h2>Ed25519 Ledger Hash</h2>
        <pre>[placeholder — Ed25519 ledger hash]</pre>
      </div>
    </div>
  );
}
