"use client";

import { useState } from "react";
import { Mail, CheckCircle } from "lucide-react";

export function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setStatus("loading");
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
      const res = await fetch(`${API}/newsletter/subscribe/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "Successfully subscribed!");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Subscription failed.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Network error occurred.");
    }
    
    // Reset status after a few seconds
    setTimeout(() => {
        if (status !== "success") setStatus("idle");
    }, 3000);
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-[13px] sm:text-base md:text-lg text-foreground">Stay Updated</h4>
      <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground leading-relaxed">
        Subscribe to our newsletter for the latest events, features, and platform updates.
      </p>
      
      {status === "success" ? (
        <div className="flex items-center gap-2 text-success bg-success/10 p-3 rounded-lg border border-success/20">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{message}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email" 
              className="w-full bg-background/50 border border-border/80 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              required
              disabled={status === "loading"}
            />
          </div>
          <button 
            type="submit" 
            disabled={status === "loading"}
            className="w-full bg-primary text-primary-foreground font-bold rounded-lg px-3 py-2.5 text-sm hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
          >
            {status === "loading" ? "Subscribing..." : "Subscribe"}
          </button>
          {status === "error" && (
            <p className="text-destructive text-xs mt-1">{message}</p>
          )}
        </form>
      )}
    </div>
  );
}
