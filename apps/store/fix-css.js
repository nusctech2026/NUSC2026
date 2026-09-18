const fs = require('fs');
const file = 'd:/projects/NUSC/apps/store/src/app/globals.css';
let css = fs.readFileSync(file, 'utf8');

// Replace Impact fallbacks
css = css.replace(/font-family:\s*var\(--font-barlow\),\s*"Barlow Condensed",\s*Impact,\s*sans-serif;/g, 'font-family: var(--font-barlow);');

// Replace Inter fallbacks
css = css.replace(/font-family:\s*var\(--font-inter\),\s*Inter,\s*sans-serif;/g, 'font-family: var(--font-inter);');
css = css.replace(/font-family:\s*var\(--font-inter\),\s*Inter;/g, 'font-family: var(--font-inter);');

// Replace other Barlow fallbacks
css = css.replace(/font-family:\s*var\(--font-barlow\),\s*"Barlow Condensed";/g, 'font-family: var(--font-barlow);');

// Just to be absolutely sure that the browser has a way to get Barlow Condensed if next/font fails:
const importStmt = `@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap');\n`;
if (!css.includes('@import url')) {
  css = importStmt + css;
}

// In case Next.js variable is not working, we add it to the fallback stack of the variable usages!
// Wait, the variable itself is var(--font-barlow). So if we replace var(--font-barlow); with var(--font-barlow, 'Barlow Condensed', sans-serif);
css = css.replace(/font-family:\s*var\(--font-barlow\);/g, "font-family: var(--font-barlow, 'Barlow Condensed', sans-serif);");
css = css.replace(/font-family:\s*var\(--font-inter\);/g, "font-family: var(--font-inter, 'Inter', sans-serif);");

fs.writeFileSync(file, css);
console.log('globals.css updated');
