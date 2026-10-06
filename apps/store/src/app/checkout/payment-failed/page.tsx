import Link from "next/link";
import { XCircle, RefreshCcw, HeadphonesIcon, ArrowRight } from "lucide-react";

export default function PaymentFailedPage() {
  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <Link href="/" className="checkout-logo">NUSC STORE</Link>
      </div>

      <div className="success-container">
        <div className="success-icon-wrapper" style={{ color: "var(--red)" }}>
          <XCircle size={64} className="success-icon" />
        </div>
        
        <h1 className="success-title">Payment Failed</h1>
        <p className="success-subtitle" style={{ color: "var(--ink)" }}>
          We couldn't process your payment. Please check your card details or try a different payment method.
        </p>
        
        <div className="success-details-grid" style={{ marginBottom: "40px" }}>
          <div className="success-detail-box">
            <span className="detail-label">Reason</span>
            <span className="detail-value" style={{ color: "var(--red)" }}>Card Declined</span>
          </div>
          <div className="success-detail-box">
            <span className="detail-label">Order Reference</span>
            <span className="detail-value">#NUSC-847291</span>
          </div>
        </div>

        <div className="success-actions" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/checkout" className="checkout-submit-btn" style={{ background: "var(--red)", borderColor: "var(--red)", color: "white" }}>
            <RefreshCcw size={20} style={{ marginRight: '8px' }} />
            TRY AGAIN
          </Link>
          <Link href="/help" className="checkout-submit-btn" style={{ background: "transparent", borderColor: "var(--line-l)", color: "var(--navy-900)" }}>
            <HeadphonesIcon size={20} style={{ marginRight: '8px' }} />
            CONTACT SUPPORT
          </Link>
        </div>
        
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <Link href="/search" style={{ color: 'var(--navy-900)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            Return to Store <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
