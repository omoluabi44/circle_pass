"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function VerifyEmailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (!params.uid || !params.token) return;
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    const verifyAccount = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/activation/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: params.uid,
            token: params.token,
          }),
        });

        // 204 No Content is Djoser's success response for activation
        if (res.ok) {
          setStatus("success");
        } else if (res.status === 403) {
          // If the token is stale (403), it usually means they are already verified
          setStatus("success"); 
        } else {
          setStatus("error");
        }
      } catch (err) {
        setStatus("error");
      }
    };

    verifyAccount();
  }, [params.uid, params.token]);

  const loginHref = next 
    ? `/login?callbackUrl=${encodeURIComponent(next)}` 
    : '/login';

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-secondary">
      <div className="w-full max-w-md space-y-6 sm:space-y-8 bg-background p-6 sm:p-8 rounded-xl shadow-md text-center text-foreground flex flex-col items-center">
        <Image src="/logo.png" alt="CirclePass Logo" width={80} height={26} className="mb-3 object-contain" priority />
        
        {status === "loading" && (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-primary">Verifying...</h2>
            <p className="text-sm sm:text-base">Please wait while we verify your email address.</p>
          </>
        )}

        {status === "success" && (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-success">Account Verified!</h2>
            <p className="text-sm sm:text-base">Your email has been successfully verified. Sign in to view your ticket.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your digital pass will be visible 3 hours before the event starts.
            </p>
            <Link href={loginHref} className="inline-block mt-4 w-full bg-primary text-primary-foreground py-2 rounded font-medium hover:bg-primary/90 transition-colors">
              Sign In to View Ticket
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-destructive">Verification Failed</h2>
            <p className="text-sm sm:text-base">The verification link is invalid or has expired.</p>
            <Link href="/register" className="inline-block mt-4 text-primary hover:underline font-medium">
              Try registering again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
