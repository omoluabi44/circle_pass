"use client";

import { useState } from "react";
import { Mail, CheckCircle, ArrowRight } from "lucide-react";

export function Newsletter() {
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
      setStatus("success");
      setMessage(data.message || "Successfully subscribed!");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <section className="py-20 px-4 bg-primary">
      <div className="container mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-primary-foreground font-bold px-4 py-2 rounded-full text-sm mb-6 border border-white/20">
          <Mail className="w-4 h-4" />
          Stay Updated
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-primary-foreground mb-4">
          Never miss an experience.
        </h2>
        <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
          Get the latest events, features, and CirclePass updates delivered to your inbox.
        </p>

        {status === "success" ? (
          <div className="flex items-center justify-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <CheckCircle className="w-6 h-6 text-white" />
            <span className="text-primary-foreground font-bold">{message}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 px-5 py-3.5 rounded-xl bg-white/10 backdrop-blur-sm text-primary-foreground placeholder-primary-foreground/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent text-sm font-medium"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="px-6 py-3.5 bg-white text-primary rounded-xl font-bold text-sm hover:bg-white/90 transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {status === "loading" ? "Subscribing..." : (
                <>Subscribe <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="text-red-200 text-sm mt-4">{message}</p>
        )}
      </div>
    </section>
  );
}
