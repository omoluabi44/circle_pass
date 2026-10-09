const fs = require('fs');
let content = fs.readFileSync('src/app/about/page.tsx', 'utf8');

const oldMockupStart = content.indexOf('{/* Mockup / Graphic side */}');
const oldMockupEnd = content.indexOf('</section>', oldMockupStart);

if (oldMockupStart !== -1 && oldMockupEnd !== -1) {
    const newMockup = `{/* Mockup / Graphic side */}
        <div className="relative w-full aspect-[4/3] md:aspect-square md:h-[500px] rounded-3xl overflow-hidden border border-border shadow-2xl">
          <Image
            src="/image-folders/about us page/mock_up.jpg"
            alt="CirclePass Mockup"
            fill
            className="object-cover"
          />
        </div>
      `;
      
    content = content.substring(0, oldMockupStart) + newMockup + content.substring(oldMockupEnd);
    fs.writeFileSync('src/app/about/page.tsx', content, 'utf8');
}
