const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'index.html');
const cssPath = path.join(__dirname, 'apps', 'web', 'src', 'app', 'globals.css');
const componentsDir = path.join(__dirname, 'apps', 'web', 'src', 'components', 'sections');

// Ensure directory exists
if (!fs.existsSync(componentsDir)) {
  fs.mkdirSync(componentsDir, { recursive: true });
}

let html = fs.readFileSync(htmlPath, 'utf-8');

// Extract CSS
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
  let cssContent = styleMatch[1];
  // There are some font-faces in index.html, we keep them in globals.css.
  fs.writeFileSync(cssPath, cssContent.trim());
  console.log('Extracted CSS to globals.css');
} else {
  console.log('No style block found');
}

// Basic JSX conversion
function toJSX(str) {
  return str
    .replace(/class=/g, 'className=')
    .replace(/tabindex=/g, 'tabIndex=')
    .replace(/stroke-width=/g, 'strokeWidth=')
    .replace(/stroke-linecap=/g, 'strokeLinecap=')
    .replace(/stroke-linejoin=/g, 'strokeLinejoin=')
    .replace(/fill-rule=/g, 'fillRule=')
    .replace(/clip-rule=/g, 'clipRule=')
    .replace(/viewbox=/gi, 'viewBox=')
    .replace(/autoplay/g, 'autoPlay')
    .replace(/playsinline/g, 'playsInline')
    .replace(/<img([^>]*[^\/])>/g, '<img$1 />')
    .replace(/<br>/g, '<br />')
    .replace(/<source([^>]*[^\/])>/g, '<source$1 />')
    .replace(/<input([^>]*[^\/])>/g, '<input$1 />')
    .replace(/<!--[\s\S]*?-->/g, (match) => `{/* ${match.replace(/<!--|-->/g, '')} */}`);
}

// Extract sections
const sectionRegexes = [
  { name: 'Nav', regex: /<nav class="nav" id="nav" aria-label="Primary">([\s\S]*?)<\/nav>/ },
  { name: 'Hero', regex: /<header class="hero" id="home">([\s\S]*?)<\/header>/ },
  { name: 'Snapshot', regex: /<section class="snapshot" aria-label="Club snapshot">([\s\S]*?)<\/section>/ },
  { name: 'Club', regex: /<section class="sect" id="club">([\s\S]*?)<\/section>/ },
  { name: 'Journey', regex: /<section class="sect dark" id="journey">([\s\S]*?)<\/section>/ },
  { name: 'Honours', regex: /<section class="champ" id="honours">([\s\S]*?)<\/section>/ },
  { name: 'Pathway', regex: /<section class="sect pathway" id="pathway">([\s\S]*?)<\/section>/ },
  { name: 'Players', regex: /<section class="sect players">([\s\S]*?)<\/section>\s*<section class="sect iis">([\s\S]*?)<\/section>\s*<section class="sect repnag">([\s\S]*?)<\/section>/ },
  { name: 'Community', regex: /<section class="sect" id="community">([\s\S]*?)<\/section>/ },
  { name: 'Partners', regex: /<section class="sect partners" id="partners">([\s\S]*?)<\/section>/ },
  { name: 'Careers', regex: /<section class="sect careers" id="careers">([\s\S]*?)<\/section>\s*<section class="support" aria-label="Support NUSC">([\s\S]*?)<\/section>/ },
  { name: 'Footer', regex: /<footer id="contact">([\s\S]*?)<\/footer>/ },
];

sectionRegexes.forEach(s => {
  const match = html.match(s.regex);
  if (match) {
    let jsxContent = '';
    if (s.name === 'Players') {
        jsxContent = `
          <section className="sect players">
            ${toJSX(match[1])}
          </section>
          <section className="sect iis">
            ${toJSX(match[2])}
          </section>
          <section className="sect repnag">
            ${toJSX(match[3])}
          </section>
        `;
    } else if (s.name === 'Careers') {
        jsxContent = `
          <section className="sect careers" id="careers">
            ${toJSX(match[1])}
          </section>
          <section className="support" aria-label="Support NUSC">
            ${toJSX(match[2])}
          </section>
        `;
    } else {
        const tagName = s.name === 'Nav' ? 'nav' : s.name === 'Hero' ? 'header' : s.name === 'Footer' ? 'footer' : 'section';
        // Reconstruct the tag with its attributes (approximate for now)
        let tagOpen = match[0].substring(0, match[0].indexOf('>') + 1);
        tagOpen = toJSX(tagOpen);
        jsxContent = `
          ${tagOpen}
            ${toJSX(match[1])}
          </${tagName}>
        `;
    }

    const componentContent = `import React from 'react';

export function ${s.name}() {
  return (
    <>
      ${jsxContent}
    </>
  );
}
`;
    fs.writeFileSync(path.join(componentsDir, `${s.name}.tsx`), componentContent);
    console.log(`Created ${s.name}.tsx`);
  } else {
    console.log(`Could not find section ${s.name}`);
  }
});
