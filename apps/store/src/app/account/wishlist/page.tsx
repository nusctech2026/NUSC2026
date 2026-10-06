import Image from "next/image";

export default function WishlistPage() {
  const wishlistItems = [
    {
      id: 1,
      name: "NUSC Home Jersey 2026/27",
      price: "₹ 1,499",
      image: "/images/jersey (4).jpg",
    },
    {
      id: 2,
      name: "NUSC Away Jersey 2026/27",
      price: "₹ 1,499",
      image: "/images/jersey (5).jpg",
    }
  ];

  return (
    <>
      <h1 className="account-section-title">My Wishlist</h1>
      <p className="account-section-desc">
        Items you've saved for later.
      </p>

      <div className="account-cards-grid">
        {wishlistItems.map(item => (
          <div key={item.id} style={{ border: '1px solid var(--line-l)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '300px', position: 'relative', background: 'var(--paper)' }}>
              <Image src={item.image} alt={item.name} fill style={{ objectFit: 'cover' }} />
            </div>
            <div style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: 'var(--navy-900)' }}>{item.name}</h3>
              <div style={{ fontWeight: 600, marginBottom: '16px' }}>{item.price}</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <select style={{ padding: '12px', border: '1px solid var(--line-l)', borderRadius: '4px', width: '100%', fontFamily: 'inherit', background: 'white' }}>
                  <option value="">Select Size</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                </select>
                <button style={{ padding: '12px', background: 'var(--navy-900)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', width: '100%' }}>Add to Cart</button>
                <button style={{ padding: '12px', background: 'white', color: 'var(--red)', border: '1px solid var(--line-l)', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', width: '100%' }}>Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
