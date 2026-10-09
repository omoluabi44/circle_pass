import re

with open("src/components/sections/Features.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the huge images with contained images
cards_start = content.find("const cards = [")
cards_end = content.find("];\n\n  return (") + 2

new_cards = """const cards = [
    {
      num: "01",
      icon: <Ticket className="w-4 h-4 md:w-5 md:h-5" />,
      title: <>More Than<br/>Ticketing</>,
      desc: "CirclePass goes beyond selling tickets bringing event creation, ticketing, attendee management, and check-in into one experience.",
      img: <img src="/image-folders/why-circlepass/card1-ui.png" alt="CirclePass Event Management" className="w-full h-full object-contain object-bottom" />
    },
    {
      num: "02",
      icon: <Users className="w-4 h-4 md:w-5 md:h-5" />,
      title: <>Smart<br/>Waitlist</>,
      desc: "When tickets are sold out, interested attendees can join a waitlist instead of simply missing out.",
      img: <img src="/image-folders/why-circlepass/card2-ui.jpg" alt="CirclePass Smart Waitlist" className="w-full h-full object-contain object-bottom rounded-b-2xl" />
    },
    {
      num: "03",
      icon: <Smartphone className="w-4 h-4 md:w-5 md:h-5" />,
      title: <>Digital Ticket<br/>Wallet</>,
      desc: "Attendees can keep their tickets in one place, making it easier to access their passes whenever they need them.",
      img: <img src="/image-folders/why-circlepass/card3-ui.jpg" alt="CirclePass Digital Ticket Wallet" className="w-full h-full object-contain object-bottom rounded-b-2xl" />
    },
    {
      num: "04",
      icon: <Bell className="w-4 h-4 md:w-5 md:h-5" />,
      title: <>Keep Everyone<br/>in the Loop.</>,
      desc: "Send announcements and important updates directly to your attendees from event changes and reminders to last-minute information.",
      img: <img src="/image-folders/why-circlepass/card4-ui.jpg" alt="CirclePass Event Notifications" className="w-full h-full object-contain object-bottom rounded-b-2xl" />
    },
    {
      num: "05",
      icon: <Star className="w-4 h-4 md:w-5 md:h-5" />,
      title: <>Beyond Tickets,<br/>Beyond Events.</>,
      desc: "CirclePass isn't limited to ticketed experiences. Its voting and nomination capabilities can power elections, awards, competitions, and other campaigns.",
      img: <img src="/image-folders/why-circlepass/card5-ui.png" alt="CirclePass Live Voting" className="w-full h-full object-contain object-bottom rounded-b-2xl" />
    }
  ];"""

content = content[:cards_start] + new_cards + content[cards_end:]

# Fix the card container sizing and padding
content = content.replace("min-w-[85vw]", "min-w-[300px]")
content = content.replace("bg-card rounded-3xl p-6", "bg-card rounded-3xl p-5 md:p-6")
content = content.replace("mt-auto w-full h-[180px] relative rounded-2xl overflow-hidden flex items-center justify-center bg-secondary/20", "mt-auto w-full h-[160px] md:h-[180px] relative flex items-end justify-center pt-4")
content = content.replace("w-6 h-6 rounded-full", "w-6 h-6 md:w-7 md:h-7 rounded-full")
content = content.replace("text-xl font-bold text-foreground mb-3 leading-tight", "text-lg md:text-xl font-bold text-foreground mb-2 md:mb-3 leading-tight")
content = content.replace("text-muted-foreground text-sm leading-relaxed mb-5 flex-grow", "text-muted-foreground text-[13px] md:text-sm leading-relaxed mb-4 md:mb-5 flex-grow")
content = content.replace("h-2 rounded-full", "h-1.5 md:h-2 rounded-full")

with open("src/components/sections/Features.tsx", "w", encoding="utf-8") as f:
    f.write(content)
