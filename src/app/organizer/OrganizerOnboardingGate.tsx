"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Phone } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSession } from "@/context/AuthContext";
import { API_URL } from "@/lib/api/config";

/**
 * Blocking post-sign-up profile popup for organizers.
 *
 * It cannot be dismissed or closed: the organizer must supply a full name and a
 * phone number before they can reach the dashboard. Once submitted the server
 * marks onboarding complete and the name is locked permanently.
 */
export default function OrganizerOnboardingGate() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [visible, setVisible] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = (session as any)?.accessToken;
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/organizer/onboarding/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return; // Not an organizer account — stay out of the way.
        const data = await res.json();
        if (cancelled || !data?.needs_onboarding) return;
        setFullName(data.full_name || "");
        setPhone(data.phone_number || "");
        setVisible(true);
      } catch {
        // Network hiccup: never block the dashboard over it.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken, status]);

  // Keep the page behind the popup still while it is open.
  useEffect(() => {
    if (!visible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (saving) return;

    const trimmedName = fullName.trim().replace(/\s+/g, " ");
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setError("Enter your full name.");
      return;
    }
    if (trimmedName.split(" ").length < 2) {
      setError("Enter your first and last name.");
      return;
    }
    if (!trimmedPhone) {
      setError("Enter your phone number.");
      return;
    }
    if (trimmedPhone.replace(/\D/g, "").length < 7) {
      setError("Enter a valid phone number.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/organizer/onboarding/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${(session as any)?.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: trimmedName,
          phone_number: trimmedPhone,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.detail || "Could not save your details.");
      }
      setVisible(false);
      toast.success("Profile complete. Welcome to CirclePass!");
      router.replace("/organizer");
    } catch (err: any) {
      setError(err.message || "Could not save your details.");
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="CirclePass"
            width={132}
            height={40}
            className="h-9 w-auto object-contain"
            priority
          />
          <div className="w-full border-t border-border mt-5 pt-5">
            <h2 id="onboarding-title" className="text-2xl font-bold text-foreground">
              Complete Your Profile
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Just a few details to get your organizer account ready.
            </p>
          </div>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">
              Full Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoFocus
              placeholder="e.g. John Doe"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Please use your correct name. It is saved permanently.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">
              Phone Number <span className="text-destructive">*</span>
            </label>
            <div className="flex items-stretch rounded-xl border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/40">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 08012345678"
                className="w-full bg-transparent px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none"
              />
              <span className="flex items-center px-3 text-[#25D366]">
                <Phone className="w-5 h-5" />
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              WhatsApp number preferred.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                Continue <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
