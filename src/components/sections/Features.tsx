"use client";

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Ticket, Users, Smartphone, Bell, Star, QrCode, Calendar, Users as UsersIcon, CheckSquare, Send, CheckCircle2 } from 'lucide-react';

export function Features() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollPosition = scrollRef.current.scrollLeft;
    const cardWidth = scrollRef.current.children[0].clientWidth;
    const newIndex = Math.round(scrollPosition / cardWidth);
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  };

  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.children[0].clientWidth;
    scrollRef.current.scrollTo({ left: index * cardWidth, behavior: 'smooth' });
  };

  const cards = [
    {
      num: "01",
      icon: <Ticket className="w-5 h-5" />,
      title: <>More Than<br/>Ticketing</>,
      desc: "CirclePass goes beyond selling tickets  bringing event creation, ticketing, attendee management, and check-in into one experience.",
      img: <img src="/image-folders/why-circlepass/card1-ui.png" alt="CirclePass Event Management" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] max-w-none h-auto" />
    },
    {
      num: "02",
      icon: <Users className="w-5 h-5" />,
      title: <>Smart<br/>Waitlist</>,
      desc: "When tickets are sold out, interested attendees can join a waitlist instead of simply missing out.",
      img: <img src="/image-folders/why-circlepass/card2-ui.jpg" alt="CirclePass Smart Waitlist" className="w-full h-full object-contain scale-[1.05]" />
    },
    {
      num: "03",
      icon: <Smartphone className="w-5 h-5" />,
      title: <>Digital Ticket<br/>Wallet</>,
      desc: "Attendees can keep their tickets in one place, making it easier to access their passes whenever they need them.",
      img: <img src="/image-folders/why-circlepass/card3-ui.jpg" alt="CirclePass Digital Ticket Wallet" className="w-full h-full object-contain scale-[1.05]" />
    },
    {
      num: "04",
      icon: <Bell className="w-5 h-5" />,
      title: <>Keep Everyone<br/>in the Loop.</>,
      desc: "Send announcements and important updates directly to your attendees  from event changes and reminders to last-minute information.",
      img: <img src="/image-folders/why-circlepass/card4-ui.jpg" alt="CirclePass Event Notifications" className="w-full h-full object-contain scale-[1.05]" />
    },
    {
      num: "05",
      icon: <Star className="w-5 h-5" />,
      title: <>Beyond Tickets,<br/>Beyond Events.</>,
      desc: "CirclePass isn't limited to ticketed experiences. Its voting and nomination capabilities can power elections, awards, competitions, and other campaigns.",
      img: <img src="/image-folders/why-circlepass/card5-ui.png" alt="CirclePass Live Voting" className="w-full h-full object-contain scale-[1.05]" />
    }
  ];

  return (
    <section className="relative w-full py-24 md:py-32 bg-background overflow-hidden">
      {/* Abstract Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[50%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto max-w-[1400px] relative z-10 px-4">
        
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
          <h3 className="text-primary font-bold tracking-widest text-xl md:text-2xl uppercase mb-3">
            WHY CIRCLEPASS?
          </h3>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground leading-tight tracking-tight">
            More than a ticket.<br />
            More possibilities.
          </h2>
        </div>

        {/* Carousel / Grid Container */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-6 md:pb-0 md:grid md:grid-cols-2 lg:grid-cols-5 md:overflow-visible hide-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {cards.map((card, i) => (
            <div key={i} className="min-w-[85vw] md:min-w-0 snap-center shrink-0 flex flex-col">
              <div className="bg-card rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/50 flex flex-col h-full hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">{card.num}</span>
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">{card.icon}</div>
                </div>
                <h4 className="text-xl font-bold text-foreground mb-3 leading-tight">{card.title}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5 flex-grow">
                  {card.desc}
                </p>
                
                {/* Mock UI Image */}
                <div className="mt-auto w-full h-[180px] relative rounded-2xl overflow-hidden flex items-center justify-center bg-secondary/20">
                  {card.img}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Navigation Controls */}
        <div className="flex flex-col items-center mt-6 md:hidden">
          <div className="flex items-center gap-4 mb-4">
            <button 
              onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${activeIndex === 0 ? 'border-border text-muted-foreground opacity-50' : 'border-border bg-card shadow-sm text-foreground hover:bg-secondary'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => scrollToIndex(Math.min(cards.length - 1, activeIndex + 1))}
              disabled={activeIndex === cards.length - 1}
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${activeIndex === cards.length - 1 ? 'border-border text-muted-foreground opacity-50' : 'border-border bg-card shadow-sm text-foreground hover:bg-secondary'}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          {/* Dots */}
          <div className="flex gap-2 justify-center">
            {cards.map((_, i) => (
              <div 
                key={i} 
                className={`h-2 rounded-full transition-all duration-300 ${activeIndex === i ? 'w-6 bg-primary' : 'w-2 bg-primary/30'}`} 
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}