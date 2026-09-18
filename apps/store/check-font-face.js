fetch('http://localhost:3000/_next/static/chunks/%5Broot-of-the-server%5D__03l19no._.css').then(r => r.text()).then(t => { 
  console.log('Includes @font-face for Barlow?', t.includes('@font-face') && t.includes('Barlow Condensed'));
  if(t.includes('@font-face')) {
    const matches = t.match(/@font-face\{[^}]+\}/g);
    console.log('Font faces:', matches ? matches.length : 0);
    if (matches) {
       matches.forEach(m => {
          if (m.includes('Barlow Condensed')) console.log(m.substring(0, 100) + '...');
       });
    }
  }
});
