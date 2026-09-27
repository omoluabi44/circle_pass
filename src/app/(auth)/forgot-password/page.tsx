"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/reset_password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("====================================");
        console.log("PASSWORD RESET LINK:");
        console.log(data.reset_url);
        console.log("====================================");
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch (err) {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center p-4 sm:p-8 bg-secondary">
        <div className="w-full max-w-md p-6 sm:p-8 bg-background rounded-xl shadow-md text-foreground flex flex-col items-center text-center">
          <Image src="/logo.png" alt="CirclePass Logo" width={80} height={26} className="mb-4 object-contain" priority />
          <h2 className="text-xl sm:text-2xl font-bold text-primary mb-2">Check your email</h2>
          <p className="mb-6">If an account exists for {email}, you will receive a password reset link shortly.</p>
          <Link href="/login" className="text-primary hover:underline font-medium">Return to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center p-4 sm:p-8 bg-secondary">
      <div className="w-full max-w-md p-6 sm:p-8 bg-background rounded-xl shadow-md text-foreground flex flex-col items-center">
        <Image src="/logo.png" alt="CirclePass Logo" width={80} height={26} className="mb-4 object-contain" priority />
        <h2 className="text-xl sm:text-2xl font-bold text-center text-primary mb-6">Reset Password</h2>
        <form className="space-y-4 w-full" onSubmit={handleSubmit}>
          {status === "error" && <p className="text-destructive text-sm text-center">Something went wrong. Please try again.</p>}
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address" 
            className="w-full border rounded px-3 py-2" 
            required 
          />
          <button 
            type="submit" 
            disabled={status === "loading"}
            className="w-full bg-primary-primary-foreground py-2 rounded font-medium disabled:opacity-50"
          >
            {status === "loading" ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
}
