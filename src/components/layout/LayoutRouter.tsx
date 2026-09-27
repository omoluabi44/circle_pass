"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useTheme } from "next-themes";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const DASHBOARD_PREFIXES = ["/dashboard", "/organizer", "/admin"];

export function LayoutRouter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const isDashboard = DASHBOARD_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    if (!isDashboard) {
      setTheme("light");
    }
  }, [isDashboard, setTheme]);

  if (isDashboard) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-grow pt-20">{children}</main>
      <Footer />
    </>
  );
}
