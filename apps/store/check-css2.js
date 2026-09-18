fetch('http://localhost:3000/_next/static/chunks/%5Broot-of-the-server%5D__03l19no._.css').then(r => r.text()).then(t => { 
  console.log('Is --font-barlow defined?', t.includes('--font-barlow'));
  if (t.includes('--font-barlow')) {
    const match = t.match(/--font-barlow:[^;]+;/);
    console.log('Value:', match ? match[0] : 'not found');
  }
});
