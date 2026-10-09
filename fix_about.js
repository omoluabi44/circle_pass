const fs = require('fs');
let content = fs.readFileSync('src/app/about/page.tsx', 'utf8');

const startIdx = content.indexOf('{/* Why CirclePass */}');
const endIdx = content.indexOf('{/* What we believe */}');

if (startIdx !== -1 && endIdx !== -1) {
  const newWhy =       {/* Why CirclePass */}
      <section 
        className="w-full py-24 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/background_A.jpg')" }}
      >
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="bg-white/10 rounded-3xl aspect-[4/3] flex items-center justify-center border border-white/20 overflow-hidden relative shadow-2xl">
            <Image
              src="/image-folders/why circlepass.PNG"
              alt="Event crowd"
              fill
              className="object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-black/10" />
          </div>

          <div className="space-y-8 pl-0 md:pl-8">
            <h3 className="text-4xl font-extrabold tracking-tight text-white">Why CirclePass?</h3>
            <div className="space-y-4 text-lg text-white/80 leading-relaxed">
              <p className="font-semibold text-white text-xl">Because getting to an experience shouldn't be complicated.</p>
              <p>
                Organizers have a lot to manage - tickets, attendees, payments, communication, and check-in.
              </p>
              <p>
                Attendees have their own journey - finding something worth going to, securing a ticket, keeping track of their pass, and getting through the door.
              </p>
              <p>
                We believe these pieces should work better together.
              </p>
              <p className="font-bold text-white mt-6 text-xl">
                So we're bringing more of the event journey into one place.
              </p>
            </div>
          </div>
        </div>
      </section>\n\n      ;
  
  content = content.substring(0, startIdx) + newWhy + content.substring(endIdx);
  fs.writeFileSync('src/app/about/page.tsx', content, 'utf8');
}
