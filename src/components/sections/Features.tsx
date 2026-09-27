import { Ticket, Users, Smartphone, ScanLine, Star, FileEdit, UserPlus, Bell, Megaphone, ChevronRight } from 'lucide-react';

export function Features() {
  const features = [
    {
      num: "01",
      title: "More Than Ticketing",
      description: "CirclePass goes beyond selling tickets, bringing event creation, ticketing, attendee management, and check-in into one experience.",
      icon: <Ticket className="w-6 h-6 text-foreground" />,
      mockup: (
        <div className="bg-card p-3 xl:p-4 rounded-2xl border border-border/50 shadow-sm flex flex-col sm:flex-row xl:flex-col 2xl:flex-row gap-4 h-full w-full">
          <div className="bg-black text-white p-4 rounded-xl flex-1 flex flex-col min-h-[200px]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-full bg-card/20 flex items-center justify-center text-[10px]">C</div>
              <span className="font-semibold text-xs">CirclePass</span>
            </div>
            <div className="text-xs font-bold mb-1 leading-tight">Music & Culture Fest</div>
            <div className="text-[10px] text-white/70 mb-4">Sat, Nov 22, 2025 • Lagos</div>
            <div className="bg-card p-1.5 rounded-lg mt-auto mx-auto inline-block">
              <div className="w-14 h-14 bg-gray-200/50 rounded flex flex-wrap gap-0.5 p-0.5">
                {/* Fake QR pattern */}
                {[...Array(16)].map((_, i) => <div key={i} className={`w-3 h-3 ${Math.random() > 0.4 ? 'bg-black' : 'bg-transparent'}`}></div>)}
              </div>
            </div>
            <div className="text-[10px] text-center mt-2">General Admission</div>
            <div className="bg-green-500/20 text-green-400 text-[10px] text-center py-1 rounded-full mt-2 flex items-center justify-center gap-1 font-medium">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div> Valid
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-4 xl:gap-3 py-2">
            {[
              { icon: FileEdit, text: "Create Event" },
              { icon: Ticket, text: "Sell Tickets" },
              { icon: UserPlus, text: "Manage Attendees" },
              { icon: ScanLine, text: "Check In" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs font-medium text-foreground whitespace-nowrap">
                <item.icon className="w-4 h-4 text-primary shrink-0" /> {item.text}
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      num: "02",
      title: "Smart Waitlist",
      description: "When tickets are sold out, interested attendees can join a waitlist instead of simply missing out.",
      icon: <Users className="w-6 h-6 text-foreground" />,
      mockup: (
        <div className="bg-card p-3 xl:p-4 rounded-2xl border border-border/50 shadow-sm h-full flex flex-col w-full">
          <div className="h-28 bg-black rounded-xl relative overflow-hidden mb-5">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-900/60 to-primary/40"></div>
            <div className="absolute top-2 right-2 bg-card/20 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-full font-medium border border-white/20">Sold Out</div>
          </div>
          <h4 className="font-bold text-sm mb-1">Join the Waitlist</h4>
          <p className="text-[11px] text-muted-foreground mb-6 leading-relaxed">Be the first to know when tickets become available.</p>
          <button className="mt-auto w-full bg-primary text-primary-foreground text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-1 hover:bg-primary/90 transition-colors">
            Join Waitlist <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )
    },
    {
      num: "03",
      title: "Digital Ticket Wallet",
      description: "Attendees can keep their tickets in one place, making it easier to access their passes whenever they need them.",
      icon: <Smartphone className="w-6 h-6 text-foreground" />,
      mockup: (
        <div className="bg-muted/40 p-4 rounded-3xl h-full flex items-center justify-center overflow-hidden w-full min-h-[250px]">
          <div className="w-[150px] h-[300px] bg-black rounded-[28px] p-1.5 shadow-2xl relative border-[6px] border-gray-900 flex flex-col shrink-0">
            <div className="bg-[#0a0a0a] flex-1 rounded-[18px] flex flex-col p-3 overflow-hidden text-white relative">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-gray-900 rounded-b-xl z-10"></div>
              <div className="text-[9px] text-center text-white/50 mb-3 mt-3">9:41</div>
              <h4 className="text-sm font-bold mb-4 px-1">My Tickets</h4>
              <div className="flex bg-card/10 rounded-full p-0.5 mb-5 mx-1">
                <div className="flex-1 bg-card text-foreground text-[9px] font-bold text-center py-1.5 rounded-full">Upcoming</div>
                <div className="flex-1 text-white/70 text-[9px] font-bold text-center py-1.5 rounded-full">Past</div>
              </div>
              <div className="bg-card text-foreground rounded-xl p-2 h-28 relative overflow-hidden mx-1 shadow-md">
                <div className="h-12 bg-gradient-to-r from-purple-600 to-primary rounded-lg mb-2 overflow-hidden relative">
                   <div className="absolute inset-0 bg-[url('/cat_music.jpg')] bg-cover bg-center opacity-70 mix-blend-overlay"></div>
                </div>
                <div className="text-[9px] font-bold leading-tight mb-1">Sunset Live Concert</div>
                <div className="text-[7px] text-gray-500 font-medium">Sat, Nov 22, 2025 • 7:00 PM</div>
                <div className="text-[7px] text-gray-500 mt-0.5">The Palms, Lagos</div>
                <div className="absolute right-2 bottom-2 w-5 h-5 bg-black/10 rounded-sm"></div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      num: "04",
      title: "Faster, Smarter Check-in",
      description: "QR-powered entry helps organizers verify tickets and get attendees through the gate with less stress.",
      icon: <ScanLine className="w-6 h-6 text-foreground" />,
      mockup: (
        <div className="flex flex-col gap-4 h-full w-full justify-center bg-card/50 p-2 rounded-2xl">
          <div className="bg-card p-4 rounded-xl border border-border/50 shadow-sm relative">
            <div className="flex items-center gap-2 mb-2.5">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold">Event Updates</span>
              <span className="text-[10px] text-muted-foreground ml-auto">2m ago</span>
            </div>
            <div className="text-[11px] font-semibold mb-1 text-foreground">We can't wait to see you!</div>
            <div className="text-[10px] text-muted-foreground leading-relaxed">Doors open at 6 PM. Please arrive early for a smooth check-in experience.</div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border/50 shadow-sm relative">
            <div className="flex items-center gap-2 mb-2.5">
              <Megaphone className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold">Important Update</span>
              <span className="text-[10px] text-muted-foreground ml-auto">1h ago</span>
            </div>
            <div className="text-[10px] text-muted-foreground leading-relaxed">The venue has been updated to Landmark Event Centre, Victoria Island. See you soon!</div>
          </div>
        </div>
      )
    },
    {
      num: "05",
      title: "Beyond Tickets, Beyond Events.",
      description: "CirclePass isn't limited to ticketed experiences. Its voting and nomination capabilities can power elections, awards, competitions, and other campaigns.",
      icon: <Star className="w-6 h-6 text-foreground" />,
      mockup: (
        <div className="bg-card p-4 xl:p-5 rounded-2xl border border-border/50 shadow-sm h-full flex flex-col w-full">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-sm">Live Voting</h4>
            <div className="bg-green-500/10 text-green-500 text-[10px] font-bold px-2.5 py-1 rounded-full border border-green-500/20">Live</div>
          </div>
          <p className="text-[11px] text-muted-foreground mb-6 leading-relaxed">Cast your vote for your favourite nominee.</p>
          
          <div className="flex flex-col gap-4 mt-auto">
            {[
              { label: "Nominee A", percent: "42%", width: "w-[42%]" },
              { label: "Nominee B", percent: "34%", width: "w-[34%]" },
              { label: "Nominee C", percent: "24%", width: "w-[24%]" },
            ].map((nom, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] font-medium">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${i === 0 ? 'border-primary' : 'border-muted-foreground/30'}`}>
                      {i === 0 && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                    </div>
                    <span className={i === 0 ? 'text-foreground' : 'text-muted-foreground'}>{nom.label}</span>
                  </div>
                  <span className={i === 0 ? 'text-primary font-bold' : 'text-muted-foreground'}>{nom.percent}</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className={`h-full bg-primary rounded-full ${nom.width}`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
  ];

  return (
    <section className="py-24 px-4 bg-background border-t border-border/60">
      <div className="container mx-auto max-w-[1400px]">
        {/* Section Header */}
        <div className="mb-16 md:mb-24 text-left">
          <h3 className="text-primary font-bold tracking-[0.2em] text-base md:text-lg uppercase mb-4">
            Why CirclePass?
          </h3>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.1] tracking-tight">
            More than a ticket.<br />
            More possibilities.
          </h2>
        </div>
        
        {/* Horizontal Flow Container */}
        <div className="relative">
          {/* Connecting Line (Desktop only) */}
          <div className="hidden lg:block absolute top-[22px] left-[22px] right-[22px] h-[1px] bg-border z-0"></div>
          
          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-4 relative z-10">
            {features.map((feature, idx) => (
              <div key={idx} className="flex flex-col">
                {/* Number Indicator */}
                <div className="flex justify-start mb-5">
                  <div className="w-11 h-11 rounded-full bg-background border border-border flex items-center justify-center text-sm font-bold text-foreground relative z-10 shrink-0 shadow-sm">
                    {feature.num}
                  </div>
                </div>
                
                {/* Icon & Title */}
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="text-foreground shrink-0 [&>svg]:!w-5 [&>svg]:!h-5">
                    {feature.icon}
                  </div>
                  <h3 className="text-sm md:text-base font-bold text-foreground leading-tight">{feature.title}</h3>
                </div>

                {/* Description (Hidden on desktop to match the clean stepper look of the reference image) */}
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-6 lg:hidden">
                  {feature.description}
                </p>

                {/* UI Mockup Container (Scaled down as requested) */}
                <div className="mt-auto w-full lg:scale-90 lg:origin-top-left transition-transform duration-300">
                  {feature.mockup}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
