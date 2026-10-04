"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  BarChart, 
  ScanLine, 
  Megaphone, 
  Percent, 
  Settings 
} from "lucide-react";

export default function EventManageNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  
  const navItems = [
    { name: "Overview", href: `/organizer/events/${eventId}/overview`, icon: LayoutDashboard },
    { name: "Tickets", href: `/organizer/events/${eventId}/tickets`, icon: Ticket },
    { name: "Attendees", href: `/organizer/events/${eventId}/attendees`, icon: Users },
    { name: "PassControl", href: `/organizer/events/${eventId}/passcontrol`, icon: ScanLine },
    { name: "Discounts", href: `/organizer/events/${eventId}/discounts`, icon: Percent },
    { name: "Announcements", href: `/organizer/events/${eventId}/announcements`, icon: Megaphone },
    { name: "Analytics", href: `/organizer/events/${eventId}/analytics`, icon: BarChart },
    { name: "Settings", href: `/organizer/events/${eventId}/settings`, icon: Settings },
  ];

  return (
    <div className="px-4 md:px-8 border-t border-border/50 pt-2 pb-2">
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 transition-colors font-medium text-sm ${
                isActive 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
