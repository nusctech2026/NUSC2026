import Link from "next/link";
import "../legal/legal.css";

export const metadata = {
  title: 'Frequently Asked Questions',
};

export default function FAQsPage() {
  return (
    <div className="legal-container">
      <main className="legal-content">
        <h1 className="legal-title">Frequently Asked Questions</h1>
        
        <div className="legal-prose">
          <h2>Shipping & Delivery</h2>
          <p><strong>How long will it take to receive my order?</strong><br/>
          Standard shipping typically takes 3-5 business days. Express shipping is available at checkout for 1-2 business day delivery. See our <Link href="/legal/shipping">Shipping Policy</Link> for more details.</p>

          <p><strong>Do you ship internationally?</strong><br/>
          Yes! We ship worldwide. International shipping times vary between 7-14 business days depending on the destination.</p>

          <h2>Returns & Exchanges</h2>
          <p><strong>What is your return policy?</strong><br/>
          We accept returns within 30 days of purchase for items in their original, unworn condition with tags attached. Customized kits cannot be returned unless faulty. Please read our full <Link href="/legal/returns">Returns & Refunds Policy</Link>.</p>

          <p><strong>How do I start a return?</strong><br/>
          You can initiate a return by going to your <Link href="/account/orders">Orders</Link> page, selecting the specific order, and clicking "Return Items."</p>

          <h2>Products & Sizing</h2>
          <p><strong>How do I know what size to order?</strong><br/>
          Please refer to our <Link href="/size-guide">Size Guide</Link> for detailed measurements of all our apparel. Our kits generally fit true to size, but training wear may have a more athletic fit.</p>

          <h2>NUSC Memberships</h2>
          <p><strong>How do I use my NUSC Points?</strong><br/>
          You can view your available points and redeem them for match tickets, experiences, and discounts on your <Link href="/account/benefits">Member Benefits</Link> dashboard.</p>
        </div>
      </main>
    </div>
  );
}
