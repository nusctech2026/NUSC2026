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
            <strong>Email:</strong> <a href="mailto:connect@nagalandunited.com">connect@nagalandunited.com</a><br />
            <strong>Phone / WhatsApp:</strong> <a href="tel:+918837459822">+91 8837459822</a><br />
            <strong>Hours:</strong> Monday – Saturday, 10:00 AM to 5:00 PM (IST)
          </p>
          
          <h2>Mailing &amp; Registered Address</h2>
          <p>
            Nagaland United Sports Club (NUSC)<br />
            Opposite Cricket Stadium<br />
            Chumukedima Main Road<br />
            Sovima Village 6th Mile<br />
            PIN: 797103, Nagaland, India<br />
            Reg. No. HOME/SRC-7926
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
