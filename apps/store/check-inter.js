fetch('http://localhost:3000/_next/static/chunks/%5Broot-of-the-server%5D__03l19no._.css').then(r => r.text()).then(t => { 
  const match = t.match(/--font-inter:[^;]+;/);
  console.log('Inter Value:', match ? match[0] : 'not found');
});
