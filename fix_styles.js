const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'apps', 'web', 'src', 'components', 'sections');

function fixStyles(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Very basic regex to fix simple inline styles.
  // style="color:#ffd9db" -> style={{color: '#ffd9db'}}
  // style="justify-content:center" -> style={{justifyContent: 'center'}}
  // style="color:#c6d3e6" -> style={{color: '#c6d3e6'}}
  // style="justify-content:center;color:#fff" -> style={{justifyContent: 'center', color: '#fff'}}
  
  content = content.replace(/style="color:#ffd9db"/g, "style={{color: '#ffd9db'}}");
  content = content.replace(/style="color:#fff"/g, "style={{color: '#fff'}}");
  content = content.replace(/style="justify-content:center"/g, "style={{justifyContent: 'center'}}");
  content = content.replace(/style="color:#c6d3e6"/g, "style={{color: '#c6d3e6'}}");
  content = content.replace(/style="justify-content:center;color:#fff"/g, "style={{justifyContent: 'center', color: '#fff'}}");
  content = content.replace(/style="padding-block:clamp\(64px,7vw,110px\)"/g, "style={{paddingBlock: 'clamp(64px,7vw,110px)'}}");
  content = content.replace(/style="position:absolute;top:16px;left:18px;z-index:3;font-size:\.56rem;letter-spacing:\.14em;text-transform:uppercase;color:#8ea3c2;border:1px dashed rgba\(255,255,255,\.28\);padding:5px 9px;border-radius:20px"/g, "style={{position: 'absolute', top: '16px', left: '18px', zIndex: 3, fontSize: '.56rem', letterSpacing: '.14em', textTransform: 'uppercase', color: '#8ea3c2', border: '1px dashed rgba(255,255,255,.28)', padding: '5px 9px', borderRadius: '20px'}}");

  fs.writeFileSync(filePath, content);
}

fs.readdirSync(componentsDir).forEach(file => {
  if (file.endsWith('.tsx')) {
    fixStyles(path.join(componentsDir, file));
  }
});
