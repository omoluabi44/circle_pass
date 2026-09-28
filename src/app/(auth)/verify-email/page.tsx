"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { InteractiveExperience } from "@/components/ui/InteractiveExperience";
import { CheckCircle2, Mail } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

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
              Check your email
            </h2>
            
            <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
              We've sent a verification link to<br/>
              <span className="font-bold text-foreground">{email || "your email address"}</span>
            </p>
          </div>

          <div className="bg-secondary/50 rounded-2xl p-6 border border-border mt-8 text-left">
            <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              What to do next
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2 mt-4 list-disc list-inside">
              <li>Open the email from CirclePass</li>
              <li>Click the verification link inside</li>
              <li>Return here to log in</li>
            </ul>
          </div>

          <div className="mt-8 space-y-4">
            <Link 
              href="/login"
              className="flex w-full justify-center items-center rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-md"
            >
              Go to Login
            </Link>
            
            <p className="text-sm text-muted-foreground">
              Didn't receive the email?{" "}
              <Link href="/register" className="font-bold text-primary hover:underline">
                Try registering again
              </Link>
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
