import type { Metadata } from 'next'
import Link from 'next/link'
import JerseyInterestForm from './JerseyInterestForm'

export const metadata: Metadata = {
  title: 'NUSC Jersey Interest | Nagaland United Sports Club',
  description: 'Register your interest in a future NUSC jersey. This is not an order; jersey details and price are not confirmed.',
}

export default function JerseyInterestPage() {
  return (
    <main className="jersey-interest-page">
      <section className="jersey-interest-intro" aria-labelledby="jersey-interest-heading">
        <Link href="/" className="jersey-interest-brand" aria-label="Nagaland United Sports Club home">
          <span className="jersey-interest-crest" role="img" aria-label="NUSC logo" />
          <span>NAGALAND UNITED<br /><strong>SPORTS CLUB</strong></span>
        </Link>
        <div className="jersey-interest-copy">
          <p className="jersey-interest-eyebrow">NUSC JERSEY</p>
          <h1 id="jersey-interest-heading">Wear your NUSC pride.</h1>
          <p>Interested in one? Join the list and we’ll share the design, price, and availability once they’re confirmed.</p>
          <div className="jersey-interest-notice">
            <span className="jersey-interest-notice-icon" aria-hidden="true">i</span>
            <p><strong>No order just yet.</strong> We’re still working out the details. Signing up lets us know you’re interested; it doesn’t reserve a jersey or commit you to buy.</p>
          </div>
          <ul className="jersey-interest-points">
            <li><span aria-hidden="true">01</span> Tell us how many you might want</li>
            <li><span aria-hidden="true">02</span> Share your usual jersey size</li>
            <li><span aria-hidden="true">03</span> We’ll keep you posted</li>
          </ul>
        </div>
        <div className="jersey-interest-footer">Rise Together.</div>
      </section>

      <section className="jersey-interest-panel" aria-labelledby="jersey-interest-form-title">
        <div className="jersey-interest-panel-inner">
          <span className="jersey-interest-form-kicker">GET JERSEY UPDATES</span>
          <h2 id="jersey-interest-form-title">Keep me posted</h2>
          <p className="jersey-interest-form-intro">Leave your details and we’ll get in touch when there’s more to share.</p>
          <JerseyInterestForm />
          <Link href="/" className="jersey-interest-back">← Back to NUSC</Link>
        </div>
      </section>
    </main>
  )
}
