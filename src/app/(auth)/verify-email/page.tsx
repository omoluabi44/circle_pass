"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { InteractiveExperience } from "@/components/ui/InteractiveExperience";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { API_URL } from "@/lib/api/config";
import toast from "react-hot-toast";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");
  
  const [code, setCode] = useState(["", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // On mount focus first input
  useEffect(() => {
    if (inputRefs[0].current) {
      inputRefs[0].current.focus();
    }
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pasted = value.slice(0, 4).split("");
      const newCode = [...code];
      for (let i = 0; i < pasted.length; i++) {
        newCode[i] = pasted[i];
      }
      setCode(newCode);
      if (pasted.length < 4) {
        inputRefs[pasted.length].current?.focus();
      } else {
        inputRefs[3].current?.focus();
      }
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-advance
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 4) {
      toast.error("Please enter the 4-digit code");
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/verify-code/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Invalid code");
      }
      
      toast.success("Email verified successfully!");
      
      // Auto login using the tokens returned from our backend
      const result = await signIn("credentials", {
        redirect: false,
        access_token: data.access,
        refresh_token: data.refresh,
        user_data: JSON.stringify(data.user)
      });
      
      if (result?.error) {
        toast.error("Verified successfully, but couldn't log in automatically. Please login.");
        router.push("/login?verified=true");
      } else {
        // Redirect to dashboard as requested!
        router.push("/dashboard/tickets");
      }
      
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      const res = await fetch(`${API_URL}/auth/users/resend_activation/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        toast.success("New code sent!");
      } else {
        toast.error("Failed to resend code");
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] w-full">
      <InteractiveExperience />

      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-16 xl:p-24 bg-background z-10">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="flex flex-col items-center">
            <Image 
              src="/logo.png" 
              alt="CirclePass Logo" 
              width={100} 
              height={32} 
              className="mb-8 object-contain"
              priority
            />
            
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6">
              <Mail className="w-10 h-10" />
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
              Verify your email
            </h2>
            
            <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
              We've sent a 4-digit code to<br/>
              <span className="font-bold text-foreground">{email || "your email address"}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            <div className="flex justify-center gap-4">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={inputRefs[i]}
                  type="text"
                  maxLength={4}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-14 h-16 text-center text-2xl font-bold rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isLoading || code.join("").length !== 4}
              className="flex w-full justify-center items-center gap-2 rounded-xl bg-primary px-4 py-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Continue"}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-8">
            <p className="text-sm text-muted-foreground">
              Didn't receive the code?{" "}
              <button onClick={handleResend} className="font-bold text-primary hover:underline bg-transparent border-none cursor-pointer">
                Resend code
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
