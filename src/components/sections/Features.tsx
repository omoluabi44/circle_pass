"use client";

import { Ticket, Users, Smartphone, Bell, Star, QrCode, Calendar, Users as UsersIcon, CheckSquare, Send, CheckCircle2 } from 'lucide-react';

export function Features() {
  return (
    <section className="relative py-24 px-4 bg-[#F8FAFC] overflow-hidden border-t border-border/50">
      
      {/* Abstract Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[50%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto max-w-[1400px] relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
          <h3 className="text-primary font-bold tracking-widest text-xl md:text-2xl uppercase mb-3">
            WHY CIRCLEPASS?
          </h3>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#0B1021] leading-tight tracking-tight">
            More than a ticket.<br />
            More possibilities.
          </h2>
        </div>

        {/* 5-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          
          {/* Card 1: More Than Ticketing */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/50 flex flex-col h-full hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">01</span>
              <div className="p-2 bg-primary/10 rounded-xl text-primary"><Ticket className="w-5 h-5" /></div>
            </div>
            <h4 className="text-xl font-bold text-[#0B1021] mb-3 leading-tight">More Than<br/>Ticketing</h4>
            <p className="text-muted-foreground text-sm leading-relaxed mb-5 flex-grow">
              CirclePass goes beyond selling tickets — bringing event creation, ticketing, attendee management, and check-in into one experience.
            </p>
            {/* Mock UI: App Interface Image */}
            <div className="mt-auto w-full h-[180px] relative rounded-2xl overflow-hidden bg-[#F8FAFC]">
              <img 
                src="/image-folders/why-circlepass/card1-ui.png" 
                alt="CirclePass Event Management" 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] max-w-none h-auto"
              />
            </div>
          </div>

          {/* Card 2: Smart Waitlist */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/50 flex flex-col h-full hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">02</span>
              <div className="p-2 bg-primary/10 rounded-xl text-primary"><Users className="w-5 h-5" /></div>
            </div>
            <h4 className="text-xl font-bold text-[#0B1021] mb-3 leading-tight">Smart<br/>Waitlist</h4>
            <p className="text-muted-foreground text-sm leading-relaxed mb-5 flex-grow">
              When tickets are sold out, interested attendees can join a waitlist instead of simply missing out.
            </p>
            
            {/* Mock UI: Waitlist Image */}
            <div className="mt-auto w-full h-[180px] relative rounded-2xl overflow-hidden flex items-center justify-center bg-[#F8FAFC]">
              <img 
                src="/image-folders/why-circlepass/card2-ui.jpg" 
                alt="CirclePass Smart Waitlist" 
                className="w-full h-full object-contain scale-[1.05]"
              />
            </div>
          </div>

          {/* Card 3: Digital Ticket Wallet */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/50 flex flex-col h-full hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">03</span>
              <div className="p-2 bg-primary/10 rounded-xl text-primary"><Smartphone className="w-5 h-5" /></div>
            </div>
            <h4 className="text-xl font-bold text-[#0B1021] mb-3 leading-tight">Digital Ticket<br/>Wallet</h4>
            <p className="text-muted-foreground text-sm leading-relaxed mb-5 flex-grow">
              Attendees can keep their tickets in one place, making it easier to access their passes whenever they need them.
            </p>
            
            {/* Mock UI: Phone Frame Image */}
            <div className="mt-auto w-full h-[180px] relative rounded-2xl overflow-hidden flex items-center justify-center bg-[#F8FAFC]">
              <img 
                src="/image-folders/why-circlepass/card3-ui.jpg" 
                alt="CirclePass Digital Ticket Wallet" 
                className="w-full h-full object-contain scale-[1.05]"
              />
            </div>
          </div>

          {/* Card 4: Keep Everyone in the Loop */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/50 flex flex-col h-full hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">04</span>
              <div className="p-2 bg-primary/10 rounded-xl text-primary"><Bell className="w-5 h-5" /></div>
            </div>
            <h4 className="text-xl font-bold text-[#0B1021] mb-3 leading-tight">Keep Everyone<br/>in the Loop.</h4>
            <p className="text-muted-foreground text-sm leading-relaxed mb-5 flex-grow">
              Send announcements and important updates directly to your attendees — from event changes and reminders to last-minute information.
            </p>
            
            {/* Mock UI: Notifications Image */}
            <div className="mt-auto w-full h-[180px] relative rounded-2xl overflow-hidden flex items-center justify-center bg-[#F8FAFC]">
              <img 
                src="/image-folders/why-circlepass/card4-ui.jpg" 
                alt="CirclePass Event Notifications" 
                className="w-full h-full object-contain scale-[1.05]"
              />
            </div>
          </div>

          {/* Card 5: Beyond Tickets */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/50 flex flex-col h-full hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">05</span>
              <div className="p-2 bg-primary/10 rounded-xl text-primary"><Star className="w-5 h-5" /></div>
            </div>
            <h4 className="text-xl font-bold text-[#0B1021] mb-3 leading-tight">Beyond Tickets,<br/>Beyond Events.</h4>
            <p className="text-muted-foreground text-sm leading-relaxed mb-5 flex-grow">
              CirclePass isn't limited to ticketed experiences. Its voting and nomination capabilities can power elections, awards, competitions, and other campaigns.
            </p>
            
            {/* Mock UI: Voting Poll Image */}
            <div className="mt-auto w-full h-[180px] relative rounded-2xl overflow-hidden flex items-center justify-center bg-[#F8FAFC]">
              <img 
                src="/image-folders/why-circlepass/card5-ui.png" 
                alt="CirclePass Live Voting" 
                className="w-full h-full object-contain scale-[1.05]"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
