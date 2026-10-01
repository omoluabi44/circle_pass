"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9" />; // Placeholder to avoid layout shift
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9 p-0"
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? (
        <Moon className="h-[1.2rem] w-[1.2rem] transition-all" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem] transition-all" />
      )}
    </button>
  );
}
