const fs = require('fs');
let content = fs.readFileSync('src/app/about/page.tsx', 'utf8');

const startIdx = content.indexOf('{/* Why CirclePass */}');
const endIdx = content.indexOf('{/* What we believe */}');

if (startIdx !== -1 && endIdx !== -1) {
  let oldSection = content.substring(startIdx, endIdx);
  let newSection = oldSection.replace('max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center py-24 border-t border-border/50', 'w-full py-24 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url(\'/background_A.jpg\')" }}><div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center');
  
  // Replace text colors
  newSection = newSection.replace('text-foreground', 'text-white').replace('text-foreground', 'text-white').replace('text-foreground', 'text-white').replace('text-foreground', 'text-white');
  newSection = newSection.replace('text-muted-foreground', 'text-white/80').replace('text-muted-foreground', 'text-white/80').replace('text-muted-foreground', 'text-white/80');
  
  // Close the div
  newSection = newSection.replace('</section>', '</div></section>');
  
  // Make image background transparentish
  newSection = newSection.replace('bg-secondary/30', 'bg-white/10 border-white/20');
  
  content = content.substring(0, startIdx) + newSection + content.substring(endIdx);
  fs.writeFileSync('src/app/about/page.tsx', content, 'utf8');
}
