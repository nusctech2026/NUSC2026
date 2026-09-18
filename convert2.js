const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'index.html');
const componentsDir = path.join(__dirname, 'apps', 'web', 'src', 'components', 'sections');

let html = fs.readFileSync(htmlPath, 'utf-8');

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

function extractSection(regex, tagName) {
  const match = html.match(regex);
  if (match) {
    let tagOpen = match[0].substring(0, match[0].indexOf('>') + 1);
    tagOpen = toJSX(tagOpen);
    return `${tagOpen}\n${toJSX(match[1])}\n</${tagName}>`;
  }
  return '';
}

let playersContent = extractSection(/<section class="sect players">([\s\S]*?)<\/section>/, 'section') + '\n' +
                     extractSection(/<section class="sect iis">([\s\S]*?)<\/section>/, 'section') + '\n' +
                     extractSection(/<section class="sect repnag">([\s\S]*?)<\/section>/, 'section');

if (playersContent.trim()) {
    const componentContent = `import React from 'react';

export function Players() {
  return (
    <>
      ${playersContent}
    </>
  );
}
`;
    fs.writeFileSync(path.join(componentsDir, `Players.tsx`), componentContent);
    console.log(`Created Players.tsx`);
}

let careersContent = extractSection(/<section class="sect careers" id="careers">([\s\S]*?)<\/section>/, 'section') + '\n' +
                     extractSection(/<section class="support" aria-label="Support NUSC">([\s\S]*?)<\/section>/, 'section');

if (careersContent.trim()) {
    const componentContent = `import React from 'react';

export function Careers() {
  return (
    <>
      ${careersContent}
    </>
  );
}
`;
    fs.writeFileSync(path.join(componentsDir, `Careers.tsx`), componentContent);
    console.log(`Created Careers.tsx`);
}
