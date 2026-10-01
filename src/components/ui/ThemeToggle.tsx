"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9" />; // Placeholder to avoid layout shift
  }

  const isDark = theme === "dark" || (theme === "system" && resolvedTheme === "dark");

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground h-9 w-9 p-0"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-[1.2rem] w-[1.2rem] transition-all text-yellow-500" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] transition-all text-slate-700" />
      )}
    </button>
  );
}
