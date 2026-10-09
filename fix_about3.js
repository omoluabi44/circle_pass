const fs = require('fs');
let content = fs.readFileSync('src/app/about/page.tsx', 'utf8');

const startIdx = content.indexOf('{/* Why CirclePass */}');
const endIdx = content.indexOf('{/* What we believe */}');

if (startIdx !== -1 && endIdx !== -1) {
  let oldSection = content.substring(startIdx, endIdx);
  
  // Apply text-white globally in this block
  oldSection = oldSection.replace('tracking-tight">', 'tracking-tight text-white">');
  oldSection = oldSection.replace('border border-border', 'border border-white/20 shadow-2xl');
  
  content = content.substring(0, startIdx) + oldSection + content.substring(endIdx);
  fs.writeFileSync('src/app/about/page.tsx', content, 'utf8');
}
