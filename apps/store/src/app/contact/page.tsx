import Link from "next/link";
import "../legal/legal.css";

export const metadata = {
  title: 'Contact Us',
};

export default function ContactPage() {
  return (
    <div className="legal-container">
      <main className="legal-content">
        <h1 className="legal-title">Contact Us</h1>
        <div className="legal-prose">
          <p>Have a question or need assistance with your order? Our support team is here to help.</p>
          
          <h2>Customer Support</h2>
          <p>
            <strong>Email:</strong> support@nusctech.com<br />
            <strong>Phone:</strong> +1 (555) 123-4567<br />
            <strong>Hours:</strong> Monday - Friday, 9:00 AM to 5:00 PM (EST)
          </p>
          
          <h2>Mailing Address</h2>
          <p>
            NUSC Technology<br />
            123 Innovation Drive<br />
            Tech City, TC 90210
          </p>

          <h2>Frequently Asked Questions</h2>
          <p>
            Before reaching out, you might find the answer to your question in our <Link href="/legal/shipping">Shipping Policy</Link> or <Link href="/legal/returns">Returns & Refunds Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
