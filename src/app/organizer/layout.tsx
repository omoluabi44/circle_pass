"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { 
  LayoutDashboard, CalendarDays, Wallet, ScanLine, Users, Inbox, 
  BarChart3, UserPlus, Settings, LifeBuoy, Menu, X, LogOut 
} from "lucide-react";
import { signOut } from "next-auth/react";
import { RoleSwitcher } from "@/components/ui/RoleSwitcher";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainNav = [
    { name: "Dashboard", href: "/organizer", icon: LayoutDashboard },
    { name: "Events", href: "/organizer/events", icon: CalendarDays },
    { name: "Wallet", href: "/organizer/wallet", icon: Wallet },
    { name: "PassControl", href: "/organizer/passcontrol", icon: ScanLine },
    { name: "Contacts", href: "/organizer/contacts", icon: Users },
    { name: "Inbox", href: "/organizer/inbox", icon: Inbox },
    { name: "Analytics", href: "/organizer/analytics", icon: BarChart3 },
  ];

  const orgNav = [
    { name: "Account", href: "/organizer/account", icon: Settings },
  ];

  const supportNav = [
    { name: "Support", href: "/organizer/support", icon: LifeBuoy },
  ];

  const NavItem = ({ item }: { item: any }) => {
    const isActive = pathname === item.href || (item.href !== '/organizer' && pathname.startsWith(item.href));
    const Icon = item.icon;
    return (
      <Link 
        href={item.href} 
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
          isActive 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "hover:bg-muted text-muted-foreground hover:text-foreground"
        }`}
      >
        <Icon className="w-5 h-5" />
        {item.name}
      </Link>
    );
  };

  return (
    <div className="bg-secondary/30 text-foreground min-h-screen flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-background border-r border-border flex flex-col hidden lg:flex h-screen sticky top-0">
        <div className="p-6 border-b border-border">
          <Link href="/" className="flex items-center mb-4">
            <img src="/logo.png" alt="CirclePass Logo" className="h-8 w-auto object-contain" />
          </Link>
          <div className="mb-2">
            <RoleSwitcher />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide">
          {/* Main */}
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-3 px-4">Main</h3>
            <nav className="space-y-1">
              {mainNav.map(item => <NavItem key={item.name} item={item} />)}
            </nav>
          </div>

          {/* Organization */}
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-3 px-4">Organization</h3>
            <nav className="space-y-1">
              {orgNav.map(item => <NavItem key={item.name} item={item} />)}
            </nav>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-3 px-4">Support</h3>
            <nav className="space-y-1">
              {supportNav.map(item => <NavItem key={item.name} item={item} />)}
            </nav>
          </div>
        </div>
        <div className="p-4 border-t border-border mt-auto shrink-0 bg-background space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-medium text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-destructive/10 rounded-xl text-destructive text-sm font-bold transition-colors">
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </aside>
      
      {/* Mobile Top Nav */}
      <div className="lg:hidden bg-background border-b border-border p-4 flex justify-between items-center fixed top-0 w-full z-40">
        <Link href="/">
          <img src="/logo.png" alt="CirclePass Logo" className="h-8 w-auto object-contain" />
        </Link>
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 bg-secondary rounded-lg">
          <Menu className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-64 max-w-sm bg-background h-full flex flex-col overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-border flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center">
                  <img src="/logo.png" alt="CirclePass Logo" className="h-8 w-auto object-contain" />
                </Link>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2">
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>
              <div className="mb-2">
                <RoleSwitcher />
              </div>
            </div>
            <div className="p-4 space-y-8">
              <div>
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-3 px-4">Main</h3>
                <nav className="space-y-1" onClick={() => setMobileMenuOpen(false)}>
                  {mainNav.map(item => <NavItem key={item.name} item={item} />)}
                </nav>
              </div>
              <div>
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-3 px-4">Organization</h3>
                <nav className="space-y-1" onClick={() => setMobileMenuOpen(false)}>
                  {orgNav.map(item => <NavItem key={item.name} item={item} />)}
                </nav>
              </div>
              <div>
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-3 px-4">Support</h3>
                <nav className="space-y-1">
                  <div onClick={() => setMobileMenuOpen(false)}>
                    {supportNav.map(item => <NavItem key={item.name} item={item} />)}
                  </div>
                </nav>
              </div>
            </div>
            <div className="p-4 border-t border-border mt-auto shrink-0 bg-background space-y-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-medium text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
              <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-destructive/10 rounded-xl text-destructive text-sm font-bold transition-colors">
                <LogOut className="w-5 h-5" />
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full pt-16 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
