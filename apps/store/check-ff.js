fetch('http://localhost:3000/_next/static/chunks/%5Broot-of-the-server%5D__03l19no._.css').then(r => r.text()).then(t => { 
  const matches = t.match(/@font-face\s*{[^}]*Barlow[^}]*}/g);
  if (matches) {
     console.log('Found fonts:');
     matches.forEach(m => console.log(m));
  } else {
     console.log('No matches');
  }
});
