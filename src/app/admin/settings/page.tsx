"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/context/AuthContext";
import {
  CreditCard, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, Loader2,
} from "lucide-react";
import {
  getPaymentGatewaySetting,
  updatePaymentGateway,
  type PaymentGatewayOption,
} from "@/lib/api/admin";

type Gateway = "PAYSTACK" | "NOMBA";

const GATEWAY_COPY: Record<Gateway, { blurb: string; hint: string }> = {
  PAYSTACK: {
    blurb: "Cards, bank transfer and USSD through the Paystack inline popup.",
    hint: "Existing Paystack payment links and webhooks keep working.",
  },
  NOMBA: {
    blurb: "Hosted Nomba Checkout — buyers are redirected to Nomba to pay.",
    hint: "Requires the Nomba credentials and webhook URL on the server.",
  },
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [active, setActive] = useState<Gateway>("PAYSTACK");
  const [selected, setSelected] = useState<Gateway>("PAYSTACK");
  const [options, setOptions] = useState<PaymentGatewayOption[]>([]);
  const [updatedAt, setUpdatedAt] = useState("");

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await getPaymentGatewaySetting(token);
      setActive(data.gateway);
      setSelected(data.gateway);
      setOptions(data.gateways || []);
      setUpdatedAt(data.updated_at || "");
    } catch (err: any) {
      setError(err.message || "Could not load payment settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const save = async () => {
    if (!token || selected === active) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const data = await updatePaymentGateway(token, selected);
      setActive(data.gateway);
      setOptions(data.gateways || options);
      setUpdatedAt(data.updated_at || "");
      setNotice(
        `${data.gateway === "NOMBA" ? "Nomba" : "Paystack"} is now the active gateway for new checkouts.`
      );
    } catch (err: any) {
      setError(err.message || "Could not switch the payment gateway.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Platform-wide controls for CirclePass. Only root admins can change these.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Payment gateway</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Choose which gateway processes new paid tickets. Both stay connected —
              switching only changes where new checkouts are sent.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {(["PAYSTACK", "NOMBA"] as Gateway[]).map((id) => {
            const option = options.find((o) => o.id === id) || {
              id,
              name: id === "NOMBA" ? "Nomba" : "Paystack",
              configured: false,
              active: active === id,
            };
            const isSelected = selected === id;
            const isActive = active === id;
            const unavailable = !option.configured;

            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSelected(id);
                  setNotice("");
                  setError("");
                }}
                disabled={saving || unavailable}
                className={`w-full text-left rounded-xl border p-5 transition focus:outline-none ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/40"
                } ${unavailable ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        isSelected ? "border-primary" : "border-muted-foreground/40"
                      }`}
                    >
                      {isSelected && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{option.name}</span>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        )}
                        {id === "NOMBA" && option.sandbox && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Sandbox
                          </span>
                        )}
                        {unavailable && (
                          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">
                            Not configured
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{GATEWAY_COPY[id].blurb}</p>
                      <p className="mt-1 text-xs text-muted-foreground/80">{GATEWAY_COPY[id].hint}</p>
                      {id === "NOMBA" && (
                        <p className="mt-2 text-xs text-muted-foreground/80">
                          Webhook: <span className="font-mono">/api/payments/nomba/webhook/</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-5 flex items-start gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="mt-5 flex items-start gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving || selected === active}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
          {selected === active && (
            <span className="text-sm text-muted-foreground">This is the current gateway.</span>
          )}
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-lg bg-secondary/60 px-4 py-3 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
          <p>
            Free (₦0) tickets never touch a gateway. Paid tickets are only fulfilled after
            the gateway confirms the payment server-side, so switching is safe.{" "}
            {updatedAt && (
              <>Last updated {new Date(updatedAt).toLocaleString("en-NG")}.</>
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
