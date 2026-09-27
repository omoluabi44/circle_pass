import Link from "next/link";
import { RoleSwitcher } from "@/components/ui/RoleSwitcher";
import { 
  Activity, ShieldAlert, Users, CreditCard, Settings, FileText, 
  Calendar, Ticket, Banknote, ScanLine, BarChart3, Mail, HeartHandshake, ShieldCheck, LogOut
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { signOut } from "next-auth/react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-secondary text-foreground min-h-screen flex font-sans">
      <aside className="w-72 bg-background border-r border-border flex flex-col h-screen sticky top-0 overflow-hidden">
        <div className="p-5 border-b border-border/50 shrink-0">
          <div className="text-2xl font-bold text-logo mb-4 px-2 font-logo flex items-center">
            CirclePass <span className="text-sm font-normal text-muted-foreground ml-2 px-2 py-0.5 bg-secondary rounded-full border border-border">Admin</span>
          </div>
          <div className="px-1">
            <RoleSwitcher />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 custom-scrollbar">
          
          {/* OVERVIEW */}
          <div className="space-y-1">
            <h4 className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Overview</h4>
            <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-foreground font-medium">
              <Activity className="w-5 h-5 text-primary" />
              Dashboard
            </Link>
          </div>

          {/* PLATFORM */}
          <div className="space-y-1">
            <h4 className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Platform</h4>
            <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
              <Users className="w-5 h-5" />
              Users & Organizers
            </Link>
            <Link href="/admin/events" className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
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
            <Link href="/admin/tickets" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
              <Ticket className="w-5 h-5" />
              Tickets & Orders
            </Link>
            <Link href="/admin/transactions" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
              <Banknote className="w-5 h-5" />
              Transactions
            </Link>
            <Link href="/admin/payouts" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
              <CreditCard className="w-5 h-5" />
              Payouts
            </Link>
          </div>

          {/* OPERATIONS */}
          <div className="space-y-1">
            <h4 className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Operations</h4>
            <Link href="/admin/passcontrol" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
              <ScanLine className="w-5 h-5" />
              PassControl
            </Link>
            <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-50 cursor-not-allowed text-muted-foreground">
              <Mail className="w-5 h-5" />
              Communications
            </Link>
            <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-50 cursor-not-allowed text-muted-foreground">
              <HeartHandshake className="w-5 h-5" />
              Support
            </Link>
          </div>

          {/* INSIGHTS */}
          <div className="space-y-1">
            <h4 className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Insights</h4>
            <Link href="/admin/analytics" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
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
            <Link href="/admin/audit" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
              <FileText className="w-5 h-5" />
              Audit Logs
            </Link>
            <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
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
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-destructive/10 rounded-xl text-destructive text-sm font-bold transition-colors">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>
      
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
