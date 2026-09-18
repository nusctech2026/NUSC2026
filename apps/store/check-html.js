fetch('http://localhost:3000').then(r => r.text()).then(t => { 
  console.log('HTML classes:', t.match(/<html[^>]*class="([^"]+)"/)?.[1]); 
  console.log('Inline styles or variables:', t.match(/--font-barlow/g) ? 'FOUND' : 'NOT FOUND'); 
});
