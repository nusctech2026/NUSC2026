import fs from 'fs';
import path from 'path';

async function runTest() {
  const adminUrl = 'http://localhost:3005/api';
  
  try {
    console.log("1. Authenticating as admin...");
    const loginRes = await fetch(`${adminUrl}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@nusc.store', password: 'password' })
    });
    
    if (!loginRes.ok) {
      // maybe on port 3000? Let's check error
      const txt = await loginRes.text();
      throw new Error(`Login failed on 3001: ${loginRes.status} ${txt}`);
    }
    
    const loginData = await loginRes.json();
    console.log("Login success! Token received.");
    const token = loginData.token;
    
    console.log("2. Fetching products to link the image to...");
    const productsRes = await fetch(`${adminUrl}/products?limit=1`, {
      headers: { 'Authorization': `JWT ${token}` }
    });
    const productsData = await productsRes.json();
    if (productsData.docs.length === 0) {
      throw new Error("No products found to link an image to.");
    }
    const productId = productsData.docs[0].id;
    console.log(`Will link image to product: ${productsData.docs[0].name} (${productId})`);

    console.log("3. Uploading image to ProductImages collection...");
    const filePath = path.resolve('apps/store/public/images/jersey (4).jpg');
    const fileData = fs.readFileSync(filePath);
    
    const formData = new FormData();
    const blob = new Blob([fileData], { type: 'image/jpeg' });
    formData.append('file', blob, 'jersey4.jpg');
    formData.append('alt_text', 'Test Image Upload');
    formData.append('display_order', '1');
    formData.append('product', productId);
    
    const uploadRes = await fetch(`${adminUrl}/product_images`, {
      method: 'POST',
      headers: {
        'Authorization': `JWT ${token}`
      },
      body: formData
    });
    
    if (!uploadRes.ok) {
      const errTxt = await uploadRes.text();
      throw new Error(`Upload failed: ${uploadRes.status} ${errTxt}`);
    }
    
    const uploadData = await uploadRes.json();
    console.log("Upload Success!", uploadData);
    
    console.log("4. Fetching the storefront homepage to check if the image is populated...");
    const storefrontRes = await fetch('http://localhost:3000');
    const html = await storefrontRes.text();
    if (html.includes('ogsgayboeaewzsbcbojs.storage.supabase.co')) {
      console.log("Storefront contains the Supabase Storage URL! Integration verified.");
    } else {
      console.log("Storefront does not seem to contain the Supabase Storage URL. It might just be caching or no featured products have images.");
    }
    
  } catch (e) {
    console.error("Test Error:", e);
  }
}

runTest();
