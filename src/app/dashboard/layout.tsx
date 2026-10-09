"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, CircleUserRound, Ticket, UserCircle, LogOut, Bookmark, Users } from "lucide-react";
import Image from "next/image";
import { RoleSwitcher } from "@/components/ui/RoleSwitcher";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { API_URL } from "@/lib/api/config";

export default function AttendeeDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [hasStaffAccess, setHasStaffAccess] = useState(false);

  useEffect(() => {
    if (session) {
      const token = (session as any)?.accessToken;
      fetch(`${API_URL}/user/team-roles/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setHasStaffAccess(true);
        }
      })
      .catch(() => {});
    }
  }, [session]);

  const navItems = [
    { name: "Discover", href: "/events", icon: Compass },
    { name: "My Circle", href: "/dashboard", icon: CircleUserRound },
    { name: "Tickets", href: "/dashboard/tickets", icon: Ticket },
    ...(hasStaffAccess ? [{ name: "Staff Access", href: "/dashboard/staff", icon: Users }] : []),
    { name: "Profile", href: "/dashboard/profile", icon: UserCircle },
  ];

  return (
    <div className="bg-secondary/30 text-foreground min-h-screen flex flex-col md:flex-row font-sans">
      {/* Sidebar (Desktop) / Bottom Nav (Mobile) */}
      <aside className="w-full md:w-64 bg-background border-r border-border flex flex-col h-screen sticky top-0 hidden md:flex">
        <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
          <Link href="/">
            <img src="/logo.png" alt="CirclePass Logo" className="h-8 w-auto object-contain mb-4 mx-4" />
          </Link>
          <div className="px-2 mb-2">
            <RoleSwitcher />
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link 
                  key={item.name}
                  href={item.href} 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
            <div className="pt-4 mt-4 border-t border-border">
              <h4 className="px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">My Network</h4>
              <Link
                href="/dashboard/saved"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  pathname === '/dashboard/saved'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bookmark className="w-5 h-5" />
                Saved Events
              </Link>
              <Link
                href="/dashboard/following"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  pathname === '/dashboard/following'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="w-5 h-5" />
                Following
              </Link>
            </div>
          </nav>
        </div>
        <div className="p-4 border-t border-border mt-auto shrink-0 bg-background space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-medium text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-destructive/10 rounded-xl text-destructive text-sm font-bold transition-colors">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="md:hidden bg-background border-b border-border p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="w-10"></div>
          <Link href="/"><img src="/logo.png" alt="CirclePass Logo" className="h-8 w-auto object-contain" /></Link>
          <div className="w-10 flex justify-end">
            <ThemeToggle />
          </div>
        </div>
        <div>
          <RoleSwitcher />
        </div>
      </div>
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border flex justify-around p-3 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link 
              key={item.name}
              href={item.href} 
              className={`flex flex-col items-center gap-1 p-2 rounded-lg ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-bold">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
