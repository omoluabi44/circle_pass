import os

modal_path = r"c:\Users\adeta\OneDrive\Desktop\circlepass\src\components\events\CheckoutModal.tsx"
out_path = r"c:\Users\adeta\OneDrive\Desktop\circlepass\src\app\events\[slug]\checkout\page.tsx"

with open(modal_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace imports
new_imports = """"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Ticket, Minus, Plus, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { checkout } from "@/lib/api/checkout";
import { API_URL } from "@/lib/api/config";
import { usePaystack } from "@/hooks/usePaystack";
"""

content = content.split('import { usePaystack } from "@/hooks/usePaystack";\n')[1]

# Replace component definition
new_comp = """
export default function CheckoutPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: session } = useSession();
  
  const [event, setEvent] = useState<any>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`${API_URL}/events/?slug=${slug}`, { cache: 'no-store' });
        if (!res.ok) throw new Error("Event not found");
        const data = await res.json();
        const eventData = Array.isArray(data) ? data[0] : (data.results ? data.results[0] : data);
        if (!eventData) throw new Error("Event not found");
        setEvent(eventData);
      } catch (err: any) {
        setEventError(err.message);
      } finally {
        setLoadingEvent(false);
      }
    };
    fetchEvent();
  }, [slug]);

"""

# find the body of the component, which starts at `const [selections`
body = content.split("const [selections, setSelections] = useState<Record<number, number>>({});")[1]
body = "  const [selections, setSelections] = useState<Record<number, number>>({});" + body

# Replace event capacity computations which use event.ticket_types (which might be null initially)
body = body.replace(
    "event.ticket_types?.reduce",
    "event?.ticket_types?.reduce"
)
body = body.replace(
    "event.ticket_types &&",
    "event?.ticket_types &&"
)
body = body.replace(
    "event.ticket_types.length",
    "event?.ticket_types?.length"
)
body = body.replace(
    "event.ticket_types.every",
    "event?.ticket_types?.every"
)
body = body.replace(
    "event.waitlist_enabled",
    "event?.waitlist_enabled"
)
body = body.replace(
    "event.sales_paused",
    "event?.sales_paused"
)
body = body.replace(
    "event.id",
    "event?.id"
)
body = body.replace(
    "event.absorb_fees",
    "event?.absorb_fees"
)
body = body.replace(
    "event.ticket_types.forEach",
    "(event?.ticket_types || []).forEach"
)
body = body.replace(
    "event.ticket_types.map",
    "(event?.ticket_types || []).map"
)
body = body.replace(
    "event.title",
    "event?.title"
)


# Replace handleClose
body = body.replace(
    "onClose();",
    "router.back();"
)

# Remove isOpen logic in useEffect
body = body.replace(
    "if (!isOpen || success || isWaitlistActive || allSoldOut || isSalesPaused) return;",
    "if (!event || success || isWaitlistActive || allSoldOut || isSalesPaused) return;"
)
body = body.replace(
    "[isOpen, success, isWaitlistActive, allSoldOut, isSalesPaused]",
    "[event, success, isWaitlistActive, allSoldOut, isSalesPaused]"
)

# Adjust the return UI. The modal has a AnimatePresence and fixed overlay.
# We want to change it to a standard page layout.
return_idx = body.find("  return (")
before_return = body[:return_idx]
after_return = body[return_idx:]

new_ui = """
  if (loadingEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-secondary/30">
        <h1 className="text-2xl font-bold text-foreground mb-4">Event Not Found</h1>
        <p className="text-muted-foreground mb-8">The event you are looking for does not exist or has been removed.</p>
        <button onClick={() => router.back()} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition mb-6">
          <ArrowLeft className="w-5 h-5" /> Back to Event
        </button>
        
        <div className="bg-card rounded-2xl shadow-xl overflow-hidden border border-border">
          {/* Header */}
          <div className="flex items-center justify-between p-6 sm:p-8 border-b border-border bg-card/50">
            <div className="pr-8">
              <h1 className="text-2xl font-bold text-foreground">
                {event.title}
              </h1>
              <div className="text-sm text-muted-foreground mt-2 flex items-center gap-3">
                <span className="flex items-center gap-1.5 font-medium">
                  {guestStep && !session ? (
                    <><AlertCircle className="w-4 h-4" /> Your Details</>
                  ) : (
                    <><Ticket className="w-4 h-4" /> Checkout</>
                  )}
                </span>
                {!isWaitlistActive && !allSoldOut && !isSalesPaused && !success && !guestStep && (
                  <span className="flex items-center gap-1.5 text-warning font-semibold bg-warning/10 px-2 py-0.5 rounded-md">
                    Time left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>
            </div>
          </div>
"""

# Now we extract the inner content of the modal and replace it
# The modal inner content starts around `<div className="flex-1 overflow-y-auto p-4 sm:p-6">`
inner_content_start = after_return.find('<div className="flex-1 overflow-y-auto p-4 sm:p-6">')
inner_content = after_return[inner_content_start:]

# Remove the AnimatePresence wrappers and closing tags from the bottom
# Just find the end of the JSX
inner_content = inner_content.replace('</motion.div>', '')
inner_content = inner_content.replace('</div>\n      )}\n    </AnimatePresence>', '')
inner_content = inner_content.replace('          ', '        ')

# Finally assemble
final_file = new_imports + new_comp + before_return + new_ui + inner_content + "\n"

with open(out_path, 'w', encoding='utf-8') as f:
    f.write(final_file)
