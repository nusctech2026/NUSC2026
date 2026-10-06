export const metadata = {
  title: 'Returns & Refunds',
};

export default function ReturnsPage() {
  return (
    <>
      <h1 className="legal-title">Returns & Refunds</h1>
      <div className="legal-prose">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2>1. Return Policy</h2>
        <p>We offer a 30-day return policy for all unworn, unwashed, and undamaged items with original tags still attached. If 30 days have gone by since your purchase, unfortunately, we can’t offer you a refund or exchange.</p>
        
        <h2>2. Non-returnable Items</h2>
        <p>Several types of goods are exempt from being returned, including:</p>
        <ul>
          <li>Personalized or customized jerseys</li>
          <li>Gift cards</li>
          <li>Sale items marked as "Final Sale"</li>
        </ul>

        <h2>3. Refunds</h2>
        <p>Once your return is received and inspected, we will send you an email to notify you that we have received your returned item. We will also notify you of the approval or rejection of your refund. If approved, your refund will be processed, and a credit will automatically be applied to your credit card or original method of payment, within a certain amount of days.</p>

        <h2>4. Exchanges</h2>
        <p>We only replace items if they are defective or damaged. If you need to exchange it for the same item, send us an email at support@nusctech.com.</p>
      </div>
    </>
  );
}
