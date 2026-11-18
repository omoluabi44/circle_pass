"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, MailX, TriangleAlert } from "lucide-react";
import { API_URL } from "@/lib/api/config";

type State = "loading" | "ready" | "invalid" | "done" | "error";

function UnsubscribeContent() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await fetch(
          `${API_URL}/email/unsubscribe/?token=${encodeURIComponent(token)}`
        );
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          setMessage(data.detail || "This unsubscribe link is invalid or has expired.");
          setState("invalid");
          return;
        }
        setEmail(data.email || "");
        setState(data.unsubscribed ? "done" : "ready");
      } catch {
        if (active) {
          setMessage("We could not reach CirclePass. Please try again.");
          setState("error");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const unsubscribe = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/email/unsubscribe/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail || "This unsubscribe link is invalid or has expired.");
        setState("invalid");
        return;
      }
      setEmail(data.email || email);
      setState("done");
    } catch {
      setMessage("We could not reach CirclePass. Please try again.");
      setState("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-[70vh] bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-sm text-center space-y-5">
        {state === "loading" && (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Checking your link…</p>
          </>
        )}

        {state === "ready" && (
          <>
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <MailX className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-extrabold text-foreground">Unsubscribe from emails?</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We&apos;ll stop sending you reminders and announcements at{" "}
              <span className="font-semibold text-foreground">{email}</span>. Ticket
              confirmations and receipts for tickets you buy are not affected.
            </p>
            <div className="flex flex-col gap-3 pt-1">
              <button
                type="button"
                onClick={unsubscribe}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {submitting ? "Unsubscribing…" : "Unsubscribe me"}
              </button>
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Keep my subscription
              </Link>
            </div>
          </>
        )}

        {state === "done" && (
          <>
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-foreground">You&apos;re unsubscribed</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {email ? <><span className="font-semibold text-foreground">{email}</span> will no longer receive reminders or announcements from CirclePass.</> : "This address will no longer receive reminders or announcements from CirclePass."}
            </p>
            <Link
              href="/"
              className="inline-block w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors"
            >
              Back to CirclePass
            </Link>
          </>
        )}

        {(state === "invalid" || state === "error") && (
          <>
            <div className="w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
              <TriangleAlert className="w-7 h-7 text-warning" />
            </div>
            <h1 className="text-2xl font-extrabold text-foreground">
              {state === "invalid" ? "Link not valid" : "Something went wrong"}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {message || "This unsubscribe link is invalid or has expired."}
            </p>
            <Link
              href="/"
              className="inline-block w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors"
            >
              Back to CirclePass
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[70vh] bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
