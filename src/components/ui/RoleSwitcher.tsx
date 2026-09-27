"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export function RoleSwitcher() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = (session?.user as any)?.role || "ATTENDEE";

  if (role === "ATTENDEE") return null;

  const tabs = [];
  if (role === "ADMIN") {
    tabs.push({ label: "Admin", href: "/admin", match: "/admin" });
  }
  if (role === "ADMIN" || role === "ORGANIZER") {
    tabs.push({ label: "Organizer", href: "/organizer", match: "/organizer" });
  }
  tabs.push({ label: "Attendee", href: "/dashboard", match: "/dashboard" });

  return (
    <div className="flex gap-1.5 bg-secondary p-1.5 rounded-xl w-full mb-6 mt-2 border border-border">
      {tabs.map((tab) => {
        const isTabActive = pathname.startsWith(tab.match);
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex-1 text-center text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold py-2.5 rounded-lg transition-all ${
              isTabActive
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
