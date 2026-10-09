"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { RoleSwitcher } from "@/components/ui/RoleSwitcher";
import { 
  Activity, ShieldAlert, Users, CreditCard, Settings, FileText, 
  Calendar, Ticket, Banknote, ScanLine, BarChart3, Mail, HeartHandshake, ShieldCheck,
  Menu, X
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AdminSignOutButton } from "@/components/ui/AdminSignOutButton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="bg-secondary/30 text-foreground min-h-screen flex font-sans">
      <aside className="w-72 bg-background border-r border-border flex flex-col h-screen sticky top-0 self-start overflow-hidden hidden lg:flex">
        <div className="p-5 border-b border-border/50 shrink-0">
          <Link href="/" className="text-2xl font-bold text-logo mb-4 px-2 font-logo flex items-center hover:opacity-80 transition-opacity">
            CirclePass <span className="text-sm font-normal text-muted-foreground ml-2 px-2 py-0.5 bg-secondary rounded-full border border-border">Admin</span>
          </Link>
          <div className="px-1">
            <RoleSwitcher />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 custom-scrollbar">
          
          {/* OVERVIEW */}
          <div className="space-y-1">
            <h4 className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Overview</h4>
            <Link href="/admin" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${pathname === '/admin' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}>
              <Activity className="w-5 h-5" />
              Dashboard
            </Link>
          </div>

          {/* PLATFORM */}
          <div className="space-y-1">
            <h4 className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Platform</h4>
            <Link href="/admin/users" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname.startsWith('/admin/users') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
              <Users className="w-5 h-5" />
              Users & Organizers
            </Link>
            <Link href="/admin/events" className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${pathname.startsWith('/admin/events') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5" />
                Events
              </div>
              <span className="bg-destructive text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-bold">12</span>
            </Link>
          </div>

          {/* COMMERCE */}
          <div className="space-y-1">
            <h4 className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Commerce</h4>
            <Link href="/admin/tickets" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname.startsWith('/admin/tickets') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
              <Ticket className="w-5 h-5" />
              Tickets & Orders
            </Link>
            <Link href="/admin/transactions" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname.startsWith('/admin/transactions') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
              <Banknote className="w-5 h-5" />
              Transactions
            </Link>
            <Link href="/admin/payouts" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname.startsWith('/admin/payouts') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
              <CreditCard className="w-5 h-5" />
              Payouts
            </Link>
          </div>

          {/* OPERATIONS */}
          <div className="space-y-1">
            <h4 className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Operations</h4>
            <Link href="/admin/support" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname.startsWith('/admin/support') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
              <HeartHandshake className="w-5 h-5" />
              Support
            </Link>
          </div>

          {/* INSIGHTS */}
          <div className="space-y-1">
            <h4 className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Insights</h4>
            <Link href="/admin/analytics" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname.startsWith('/admin/analytics') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
              <BarChart3 className="w-5 h-5" />
              Analytics
            </Link>
          </div>

          {/* ADMINISTRATION */}
          <div className="space-y-1 pb-4">
            <h4 className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Administration</h4>
            <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-50 cursor-not-allowed text-muted-foreground">
              <ShieldCheck className="w-5 h-5" />
              Admin Team
            </Link>
            <Link href="/admin/audit" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname.startsWith('/admin/audit') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
              <FileText className="w-5 h-5" />
              Audit Logs
            </Link>
            <Link href="/admin/settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname.startsWith('/admin/settings') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
              <Settings className="w-5 h-5" />
              Settings
            </Link>
          </div>

        </div>
        <div className="p-4 border-t border-border mt-auto shrink-0 bg-background space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-medium text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <AdminSignOutButton />
        </div>
      </aside>
      
      {/* Mobile Top Nav */}
      <div className="lg:hidden bg-background border-b border-border p-4 flex justify-between items-center fixed top-0 w-full z-40">
        <Link href="/" className="text-xl font-bold text-logo font-logo flex items-center hover:opacity-80 transition-opacity">
          CirclePass
        </Link>
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 bg-secondary rounded-lg">
          <Menu className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-72 bg-background h-full flex flex-col overflow-y-auto shadow-xl">
            <div className="p-5 border-b border-border/50 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-bold text-logo font-logo flex items-center hover:opacity-80 transition-opacity">
                  CirclePass
                </Link>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2">
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>
              <div className="px-1 mb-2">
                <RoleSwitcher />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8" onClick={() => setMobileMenuOpen(false)}>
              <div className="space-y-1">
                <h4 className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Overview</h4>
                <Link href="/admin" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${pathname === '/admin' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}>
                  <Activity className="w-5 h-5" /> Dashboard
                </Link>
              </div>
              <div className="space-y-1">
                <h4 className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Platform</h4>
                <Link href="/admin/users" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname.startsWith('/admin/users') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
                  <Users className="w-5 h-5" /> Users & Organizers
                </Link>
                <Link href="/admin/events" className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${pathname.startsWith('/admin/events') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
                  <div className="flex items-center gap-3"><Calendar className="w-5 h-5" /> Events</div>
                  <span className="bg-destructive text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-bold">12</span>
                </Link>
              </div>
              <div className="space-y-1">
                <h4 className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Commerce</h4>
                <Link href="/admin/tickets" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname.startsWith('/admin/tickets') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
                  <Ticket className="w-5 h-5" /> Tickets & Orders
                </Link>
                <Link href="/admin/transactions" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname.startsWith('/admin/transactions') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
                  <Banknote className="w-5 h-5" /> Transactions
                </Link>
                <Link href="/admin/payouts" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname.startsWith('/admin/payouts') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
                  <CreditCard className="w-5 h-5" /> Payouts
                </Link>
              </div>
              <div className="space-y-1">
                <h4 className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Operations</h4>
                <Link href="/admin/support" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname.startsWith('/admin/support') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
                  <HeartHandshake className="w-5 h-5" /> Support
                </Link>
              </div>
              <div className="space-y-1">
                <h4 className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Insights</h4>
                <Link href="/admin/analytics" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname.startsWith('/admin/analytics') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
                  <BarChart3 className="w-5 h-5" /> Analytics
                </Link>
              </div>
              <div className="space-y-1 pb-4">
                <h4 className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Administration</h4>
                <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-50 cursor-not-allowed text-muted-foreground">
                  <ShieldCheck className="w-5 h-5" /> Admin Team
                </Link>
                <Link href="/admin/audit" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname.startsWith('/admin/audit') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
                  <FileText className="w-5 h-5" /> Audit Logs
                </Link>
                <Link href="/admin/settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname.startsWith('/admin/settings') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
                  <Settings className="w-5 h-5" /> Settings
                </Link>
              </div>
            </div>
            <div className="p-4 border-t border-border mt-auto shrink-0 bg-background space-y-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-medium text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
              <AdminSignOutButton />
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto w-full pt-16 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}

