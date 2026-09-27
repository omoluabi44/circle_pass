"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function AdminSignOutButton() {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: '/login' })} 
      className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-destructive/10 rounded-xl text-destructive text-sm font-bold transition-colors"
    >
      <LogOut className="w-5 h-5" />
      Sign Out
    </button>
  );
}
