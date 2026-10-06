export const metadata = {
  title: 'Shipping Policy',
};

export default function ShippingPage() {
  return (
    <>
      <h1 className="legal-title">Shipping Policy</h1>
      <div className="legal-prose">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2>1. Order Processing Time</h2>
        <p>All orders are processed within 1-3 business days. Orders are not shipped or delivered on weekends or holidays. If we are experiencing a high volume of orders, shipments may be delayed by a few days.</p>
        
        <h2>2. Shipping Rates & Delivery Estimates</h2>
        <p>Shipping charges for your order will be calculated and displayed at checkout.</p>
        <ul>
          <li><strong>Standard Shipping:</strong> 5-7 business days</li>
          <li><strong>Express Shipping:</strong> 2-3 business days</li>
          <li><strong>Next Day Delivery:</strong> 1 business day (order before 12 PM)</li>
        </ul>

        <h2>3. International Shipping</h2>
        <p>We currently ship to select international countries. Your order may be subject to import duties and taxes (including VAT), which are incurred once a shipment reaches your destination country. We are not responsible for these charges if they are applied and are your responsibility as the customer.</p>

        <h2>4. Order Tracking</h2>
        <p>You will receive a Shipment Confirmation email once your order has shipped containing your tracking number(s). The tracking number will be active within 24 hours.</p>
      </div>
    </>
  );
}
