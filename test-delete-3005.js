

async function runTest() {
  const adminUrl = 'http://localhost:3005/api'; // using 3005 for testing server
  
  try {
    console.log("1. Authenticating as admin...");
    const loginRes = await fetch(`${adminUrl}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@nusc.store', password: 'password' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    
    console.log("2. Sending DELETE request...");
    const res = await fetch(`${adminUrl}/products/b4dd5fc4-b6d2-4ae5-a65f-1a2f3e3f8ab6`, {
      method: 'DELETE',
      headers: { 'Authorization': `JWT ${token}` }
    });
    
    console.log("Status:", res.status);
    const txt = await res.text();
    console.log("Response:", txt);
    
  } catch (e) {
    console.error("Test Error:", e);
  }
}
runTest();
