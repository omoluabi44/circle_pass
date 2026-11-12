"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export interface BankOption {
  code: string;
  name: string;
}

interface BankSelectProps {
  banks: BankOption[];
  /** Selected bank code. */
  value: string;
  /** Called with the bank code and display name. */
  onChange: (code: string, name: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Searchable bank picker.
 *
 * A native <select> renders as a full-screen radio list on Android, which makes
 * picking from hundreds of Nigerian banks an endless scroll. This keeps the
 * list in place, filters as you type, and supports the keyboard.
 */
export function BankSelect({
  banks,
  value,
  onChange,
  placeholder = "Search or select a bank",
  disabled = false,
  className = "",
  id,
}: BankSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => banks.find((bank) => bank.code === value) || null,
    [banks, value]
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return banks;
    return banks.filter(
      (bank) =>
        bank.name.toLowerCase().includes(term) || bank.code.includes(term)
    );
  }, [banks, query]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Focus the search box and reset the highlight each time it opens
  useEffect(() => {
    if (!open) return;
    setQuery("");
    const index = banks.findIndex((bank) => bank.code === value);
    setHighlight(index >= 0 ? index : 0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the highlighted option in view
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${highlight}"]`
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [highlight, open, filtered.length]);

  const choose = (bank: BankOption) => {
    onChange(bank.code, bank.name);
    setOpen(false);
    setQuery("");
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const bank = filtered[highlight];
      if (bank) choose(bank);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        dir="ltr"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-3 bg-background border border-border rounded-xl px-4 py-3 text-left text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-60"
      >
        <span
          className={`truncate ${selected ? "text-foreground font-medium" : "text-muted-foreground"}`}
        >
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-border bg-background shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlight(0);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Type to search banks"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none py-1"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div
            ref={listRef}
            role="listbox"
            className="max-h-64 overflow-y-auto overscroll-contain"
          >
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                No bank matches “{query}”.
              </p>
            ) : (
              filtered.map((bank, index) => {
                const isSelected = bank.code === value;
                return (
                  <button
                    type="button"
                    key={bank.code}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => choose(bank)}
                    onMouseEnter={() => setHighlight(index)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors ${
                      index === highlight ? "bg-primary/5" : ""
                    } ${isSelected ? "text-primary font-semibold" : "text-foreground"}`}
                  >
                    <span className="truncate">{bank.name}</span>
                    {isSelected && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
            {filtered.length} of {banks.length} banks
          </div>
        </div>
      )}
    </div>
  );
}

export default BankSelect;
