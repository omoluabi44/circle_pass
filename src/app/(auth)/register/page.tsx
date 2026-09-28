"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { InteractiveExperience } from "@/components/ui/InteractiveExperience";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ATTENDEE");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError("");
    setShowResend(false);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needsVerification) {
          setError(data.error);
          setShowResend(true);
        } else {
          setError(data.error || "Something went wrong");
        }
        setIsLoading(false);
      } else {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (isLoading || !email) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to resend verification email");
      } else {
        router.push(`/verify-email?email=${encodeURIComponent(email)}&resent=true`);
      }
    } catch (err) {
      setError("Failed to resend verification email. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] w-full">
      {/* Left Column: Interactive Experience */}
      <InteractiveExperience />

      {/* Right Column: Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-16 xl:p-24 bg-background z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <Image 
              src="/logo.png" 
              alt="CirclePass Logo" 
              width={100} 
              height={32} 
              className="mb-4 object-contain"
              priority
            />
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
              Create an account
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Join CirclePass and discover the next experience.
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="text-destructive text-sm bg-destructive/10 p-4 rounded-xl border border-destructive/20 text-center">
                <p className="font-medium">{error}</p>
                {showResend && (
                  <button 
                    type="button" 
                    onClick={handleResend}
                    className="block w-full mt-3 text-destructive hover:text-destructive/80 font-bold underline underline-offset-2"
                  >
                    Resend Verification Link
                  </button>
                )}
              </div>
            )}
            
            {/* Role Selection Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Attendee Box */}
              <button
                type="button"
                onClick={() => setRole("ATTENDEE")}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  role === "ATTENDEE" 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-border bg-background hover:border-primary/50 hover:bg-secondary/50"
                }`}
              >
                <div className="flex justify-center mb-3">
                  <div className={`p-2 rounded-full ${role === "ATTENDEE" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                </div>
                <h3 className="font-bold text-center text-foreground mb-1 text-sm">Attendee</h3>
                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  Discover events, get your pass & experience more.
                </p>
              </button>

              {/* Organizer Box */}
              <button
                type="button"
                onClick={() => setRole("ORGANIZER")}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  role === "ORGANIZER" 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-border bg-background hover:border-primary/50 hover:bg-secondary/50"
                }`}
              >
                <div className="flex justify-center mb-3">
                  <div className={`p-2 rounded-full ${role === "ORGANIZER" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                </div>
                <h3 className="font-bold text-center text-foreground mb-1 text-sm">Organizer</h3>
                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  Create your events, sell tickets & manage everything in one place.
                </p>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="sr-only">Username</label>
                <input
                  type="text"
                  required
                  className="block w-full rounded-xl border border-border bg-secondary/50 px-4 py-3.5 text-foreground placeholder-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all sm:text-sm"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="sr-only">Email address</label>
                <input
                  type="email"
                  required
                  className="block w-full rounded-xl border border-border bg-secondary/50 px-4 py-3.5 text-foreground placeholder-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="sr-only">Password</label>
                <input
                  type="password"
                  required
                  className="block w-full rounded-xl border border-border bg-secondary/50 px-4 py-3.5 text-foreground placeholder-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative flex w-full justify-center rounded-xl border border-transparent bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isLoading ? "Signing up..." : "Sign up"}
              </button>
            </div>
          </form>
          
          <div className="relative mt-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-4 text-muted-foreground font-medium">Or continue with</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="flex w-full justify-center items-center gap-3 rounded-xl border border-border bg-background px-4 py-3.5 text-sm font-bold text-foreground hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
          </div>

          <div className="text-sm text-center flex justify-center mt-8">
            <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
