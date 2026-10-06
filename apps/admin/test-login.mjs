async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@nusc.store', password: 'Password123!' })
    });
    console.log(res.status, await res.text());
  } catch(e) {
    console.error(e);
  }
}

run();
