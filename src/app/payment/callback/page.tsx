"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, Ticket, ArrowLeft } from "lucide-react";
import { verifyPayment } from "@/lib/api/payments";
import { useSession } from "@/context/AuthContext";

type State = "verifying" | "pending" | "success" | "failed";

const MAX_ATTEMPTS = 8;
const POLL_MS = 4000;

function CallbackContent() {
  const params = useSearchParams();
  const { data: session } = useSession();
  const reference =
    params.get("orderReference") || params.get("reference") || params.get("trxref") || "";

  const [state, setState] = useState<State>("verifying");
  const [detail, setDetail] = useState<string>("");
  const [ticketCount, setTicketCount] = useState(0);
  const attempts = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const check = useCallback(async () => {
    if (!reference) {
      setState("failed");
      setDetail("We could not find a payment reference in the link.");
      return;
    }

    try {
      const result = await verifyPayment(reference);

      if (result.status === "SUCCESS") {
        setTicketCount(Array.isArray(result.tickets) ? result.tickets.length : 0);
        setState("success");
        return;
      }

      if (result.status === "FAILED") {
        setState("failed");
        setDetail("This payment was not completed.");
        return;
      }

      attempts.current += 1;
      if (attempts.current >= MAX_ATTEMPTS) {
        setState("pending");
        setDetail("Your payment is still being confirmed. Your tickets will appear in your account as soon as it clears.");
        return;
      }

      setState("verifying");
      timer.current = setTimeout(check, POLL_MS);
    } catch (error: any) {
      attempts.current += 1;
      if (attempts.current >= MAX_ATTEMPTS) {
        setState("pending");
        setDetail(error?.message || "We could not confirm the payment right now.");
        return;
      }
      timer.current = setTimeout(check, POLL_MS);
    }
  }, [reference]);

  useEffect(() => {
    check();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [check]);

  const ticketsHref = session ? "/dashboard/tickets" : "/find-ticket";

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
        {state === "verifying" && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Confirming your payment</h1>
            <p className="mt-3 text-muted-foreground">
              This usually takes a few seconds. Please keep this page open.
            </p>
          </>
        )}

        {state === "pending" && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <Loader2 className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Payment still processing</h1>
            <p className="mt-3 text-muted-foreground">{detail}</p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={() => {
                  attempts.current = 0;
                  setState("verifying");
                  check();
                }}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition"
              >
                Check again
              </button>
              <Link href={ticketsHref} className="text-sm font-medium text-muted-foreground hover:text-primary">
                Go to my tickets
              </Link>
            </div>
          </>
        )}

        {state === "success" && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Payment successful</h1>
            <p className="mt-3 text-muted-foreground">
              {ticketCount > 0
                ? `${ticketCount} ticket${ticketCount === 1 ? "" : "s"} issued and ready.`
                : "Your order has been confirmed and your tickets are ready."}
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href={ticketsHref}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition"
              >
                <Ticket className="h-4 w-4" />
                View my tickets
              </Link>
              <Link href="/events" className="text-sm font-medium text-muted-foreground hover:text-primary">
                Browse more events
              </Link>
            </div>
          </>
        )}

        {state === "failed" && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-600">
              <AlertCircle className="h-9 w-9" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Payment not completed</h1>
            <p className="mt-3 text-muted-foreground">{detail}</p>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/events"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to events
              </Link>
            </div>
          </>
        )}

        {reference && (
          <p className="mt-8 break-all text-xs text-muted-foreground">
            Reference: {reference}
          </p>
        )}
      </div>
    </main>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
