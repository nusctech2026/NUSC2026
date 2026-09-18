fetch('http://localhost:3000').then(r => r.text()).then(t => { 
  const links = t.match(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g);
  console.log('CSS Links:', links);
});
