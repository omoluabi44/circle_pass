"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ChevronDown } from "lucide-react";
import { toast } from "react-hot-toast";
import { createEventDiscount, updateEventDiscount } from "@/lib/api/events";

type Props = {
  token?: string;
  eventId: string;
  ticketClasses: any[];
  /** Present when editing an existing code; omitted when creating one. */
  discount?: any;
  onSaved?: () => void;
};

/** ISO timestamp -> the value a datetime-local input expects (local time). */
function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/**
 * The single discount form. Used by both the create and edit pages, so the
 * fields, order and validation live in exactly one place.
 */
export default function DiscountForm({
  token,
  eventId,
  ticketClasses,
  discount,
  onSaved,
}: Props) {
  const router = useRouter();
  const editing = Boolean(discount?.id);

  const initialType =
    (discount?.type || discount?.discount_type) === "FIXED" ? "FIXED" : "PERCENTAGE";
  const initialValue = discount
    ? initialType === "FIXED"
      ? String(Number(discount.value || 0) / 100)
      : String(discount.value ?? "")
    : "";

  const [code, setCode] = useState(discount?.code || "");
  const [type, setType] = useState(initialType);
  const [value, setValue] = useState(initialValue);
  const [usageLimit, setUsageLimit] = useState(
    discount ? String(discount.usage_limit ?? 0) : "0",
  );
  // Empty = every ticket class
  const [ticketTypeIds, setTicketTypeIds] = useState<number[]>(
    Array.isArray(discount?.ticket_type_ids) ? discount.ticket_type_ids : [],
  );
  const [allowMultiple, setAllowMultiple] = useState(
    discount?.allow_multiple_per_user === false ? "no" : "yes",
  );
  const [expiry, setExpiry] = useState(toLocalInput(discount?.valid_until));
  const [submitting, setSubmitting] = useState(false);

  const goBack = () =>
    router.push(
      editing
        ? `/organizer/events/${eventId}/promotions/discounts/${discount.id}`
        : `/organizer/events/${eventId}/promotions/discounts`,
    );

  const handleSave = async () => {
    const trimmedCode = code.trim().toUpperCase();
    const numericValue = Number(value);

    if (!trimmedCode) {
      toast.error("Enter a discount code name.");
      return;
    }
    if (!value || Number.isNaN(numericValue) || numericValue <= 0) {
      toast.error("Enter a discount value greater than zero.");
      return;
    }
    if (type === "PERCENTAGE" && numericValue > 95) {
      toast.error("Percentage discount cannot exceed 95%.");
      return;
    }
    if (expiry && Number.isNaN(new Date(expiry).getTime())) {
      toast.error("Enter a valid expiry date and time.");
      return;
    }

    const payload = {
      code: trimmedCode,
      type,
      value:
        type === "FIXED" ? Math.round(numericValue * 100) : Math.round(numericValue),
      usage_limit: usageLimit ? Number(usageLimit) : 0,
      ticket_type_ids: ticketTypeIds,
      allow_multiple_per_user: allowMultiple === "yes",
      valid_until: expiry ? new Date(expiry).toISOString() : null,
    };

    setSubmitting(true);
    try {
      if (editing) {
        await updateEventDiscount(token as string, eventId, discount.id, payload);
        toast.success("Discount updated successfully");
      } else {
        await createEventDiscount(token as string, eventId, payload);
        toast.success("Discount created successfully");
      }
      if (onSaved) onSaved();
      else
        router.push(
          editing
            ? `/organizer/events/${eventId}/promotions/discounts/${discount.id}`
            : `/organizer/events/${eventId}/promotions/discounts`,
        );
    } catch (err: any) {
      toast.error(
        err.message || (editing ? "Failed to update discount" : "Failed to create discount"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 max-w-lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Discount Code Name
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="e.g. SUMMER50"
          />
          {editing && (
            <p className="mt-1 text-xs text-muted-foreground">
              Changing the code means buyers can no longer use the old one.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Discount Type
          </label>
          <div className="relative">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full appearance-none bg-background border border-border rounded-xl pl-3 pr-10 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Amount</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            {type === "PERCENTAGE" ? "Discount Percentage (%)" : "Discount Amount (₦)"}
          </label>
          <div className="flex items-stretch rounded-xl border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/40">
            <span className="flex items-center px-3 text-sm font-semibold text-foreground bg-secondary border-r border-border">
              {type === "PERCENTAGE" ? "%" : "₦"}
            </span>
            <input
              type="number"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-transparent px-3 py-2 text-foreground focus:outline-none"
              placeholder={type === "PERCENTAGE" ? "20" : "5000"}
            />
          </div>
          {type === "PERCENTAGE" && (
            <p className="mt-1 text-xs text-muted-foreground">Maximum 95%.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            What ticket classes does this apply to?
          </label>
          <div className="space-y-1.5 rounded-xl border border-border bg-background p-2">
            <label className={`flex items-center gap-3 cursor-pointer rounded-lg px-2.5 py-2 transition-colors ${ticketTypeIds.length === 0 ? 'bg-primary/10' : 'hover:bg-secondary'}`}>
              <input
                type="checkbox"
                checked={ticketTypeIds.length === 0}
                onChange={() => setTicketTypeIds([])}
                className="w-4 h-4 accent-primary rounded"
              />
              <span className="text-sm font-medium text-foreground">All Ticket Classes</span>
            </label>
            {ticketClasses.map((cls: any) => (
              <label
                key={cls.id}
                className={`flex items-center gap-3 cursor-pointer rounded-lg px-2.5 py-2 transition-colors ${ticketTypeIds.includes(cls.id) ? 'bg-primary/10' : 'hover:bg-secondary'}`}
              >
                <input
                  type="checkbox"
                  checked={ticketTypeIds.includes(cls.id)}
                  onChange={() => {
                    setTicketTypeIds(prev =>
                      prev.includes(cls.id)
                        ? prev.filter(t => t !== cls.id)
                        : [...prev, cls.id]
                    );
                  }}
                  className="w-4 h-4 accent-primary rounded"
                />
                <span className="text-sm text-foreground">{cls.name}</span>
              </label>
            ))}
            {ticketClasses.length === 0 && (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">
                No ticket classes created for this event yet.
              </p>
            )}
          </div>
          {ticketTypeIds.length === 0 && ticketClasses.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Applies to every ticket class. Tick a class to limit the code.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Max Usage Count (0 for unlimited)
          </label>
          <input
            type="number"
            min="0"
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Enable Multiple Usage Per User
          </label>
          <div className="relative">
            <select
              value={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.value)}
              className="w-full appearance-none bg-background border border-border rounded-xl pl-3 pr-10 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Expiry Date &amp; Time
          </label>
          <div className="flex items-stretch rounded-xl border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/40">
            <span className="flex items-center px-3 bg-secondary border-r border-border">
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </span>
            <input
              type="datetime-local"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full bg-transparent px-3 py-2 text-foreground focus:outline-none"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Leave empty for no expiry.</p>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={goBack}
          disabled={submitting}
          className="px-4 py-2 text-muted-foreground hover:bg-secondary rounded-xl transition-colors text-sm font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={submitting}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {submitting
            ? (editing ? "Saving..." : "Creating...")
            : (editing ? "Save changes" : "Create")}
        </button>
      </div>
    </div>
  );
}
