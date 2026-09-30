"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Ticket, Minus, Plus, AlertCircle, CheckCircle2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { checkout } from "@/lib/api/checkout";
import { API_URL } from "@/lib/api/config";
import { usePaystack } from "@/hooks/usePaystack";

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

  const [selections, setSelections] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [successData, setSuccessData] = useState<any>(null);
  const router = useRouter();

  // Guest checkout state
  const [guestStep, setGuestStep] = useState(false);
  const [guestData, setGuestData] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  // Compute event availability states
  const isSalesPaused = Boolean((event as any).sales_paused);
  const totalCapacity = useMemo(() => {
    return event?.ticket_types?.reduce((acc: number, t: any) => acc + (t.quantity || 0), 0) || 0;
  }, [event.ticket_types]);
  const totalSold = useMemo(() => {
    return event?.ticket_types?.reduce((acc: number, t: any) => acc + (t.quantity_sold || 0), 0) || 0;
  }, [event.ticket_types]);
  const allSoldOut = useMemo(() => {
    return Boolean(
      event?.ticket_types &&
      event?.ticket_types?.length > 0 &&
      (
        (totalCapacity > 0 && totalSold >= totalCapacity) ||
        event?.ticket_types?.every(t => t.is_sold_out || ((t as any).quantity > 0 && ((t as any).quantity_sold ?? 0) >= (t as any).quantity))
      )
    );
  }, [event.ticket_types, totalCapacity, totalSold]);
  
  const isWaitlistActive = Boolean(event?.waitlist_enabled && allSoldOut);

  // Timer logic
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  
  React.useEffect(() => {
    if (!event || success || isWaitlistActive || allSoldOut || isSalesPaused) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleClose();
          alert("Checkout time limit reached. Please start again.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  
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
<div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {success ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6"
                >
                <CheckCircle2 className="w-8 h-8" />
                </motion.div>

                {successData?.isGuest ? (
                <>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    Registration Complete!
                  </h3>
                  <p className="text-muted-foreground mb-2">
                    We've sent a confirmation to <strong>{successData.guestEmail || guestData.email}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground mb-8">
                    Click the link in your email to verify your account and sign in to view your ticket. Your digital pass will be visible 3 hours before the event.
                  </p>
                </>
                ) : (
                <>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    {successData?.payment_required ? "Payment Required" : successData?.message ? "You're on the list!" : "Registration Complete!"}
                  </h3>
                  <p className="text-muted-foreground mb-8">
                    {successData?.payment_required 
                      ? "Redirecting you to complete your payment..." 
                      : successData?.message 
                        ? "We'll notify you if tickets become available."
                        : "We've emailed your tickets to you. See you there!"}
                  </p>
                </>
                )}
                <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                Close
                </button>
              </div>
            ) : isSalesPaused ? (
              <div className="py-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Sales Paused</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                Ticket sales for this event are temporarily paused by the organizer. Please check back later.
                </p>
                <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-secondary text-foreground font-medium rounded-lg hover:bg-secondary/80 transition-colors"
                >
                Close
                </button>
              </div>
            ) : isWaitlistActive ? (
              <div className="py-6 flex flex-col items-center">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2 text-center">Event Sold Out</h3>
                <p className="text-muted-foreground mb-8 text-center max-w-sm">
                Tickets are currently sold out. Join the waitlist to be notified if spots open up.
                </p>
                
                <form onSubmit={handleJoinWaitlist} className="w-full max-w-sm space-y-4">
                <div>
                  <input 
                    type="text" 
                    required
                    placeholder="Your Name" 
                    value={waitlistName}
                    onChange={(e) => setWaitlistName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <div>
                  <input 
                    type="email" 
                    required
                    placeholder="Your Email" 
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isLoading ? "Joining..." : "Join Waitlist"}
                </button>
                </form>
              </div>
            ) : allSoldOut ? (
              <div className="py-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-muted text-muted-foreground rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Sold Out</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                All tickets for this event are currently sold out.
                </p>
                <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-secondary text-foreground font-medium rounded-lg hover:bg-secondary/80 transition-colors"
                >
                Close
                </button>
              </div>
            ) : guestStep && !session ? (
              /* Guest Details Form — shown AFTER ticket selection */
              <div className="space-y-4">
                <button
                onClick={() => { setGuestStep(false); setError(null); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                >
                <ArrowLeft className="w-4 h-4" /> Back to tickets
                </button>

                <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-foreground">Your Details</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Fill in your details to complete your purchase
                </p>
                </div>

                <input type="text" placeholder="Full Name" required
                value={guestData.name}
                onChange={(e) => setGuestData(prev => ({...prev, name: e.target.value}))}
                className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
                <input type="email" placeholder="Email address" required
                value={guestData.email}
                onChange={(e) => setGuestData(prev => ({...prev, email: e.target.value}))}
                className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
                <input type="tel" placeholder="Phone number" required
                value={guestData.phone}
                onChange={(e) => setGuestData(prev => ({...prev, phone: e.target.value}))}
                className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="Create a password" required
                  value={guestData.password}
                  onChange={(e) => setGuestData(prev => ({...prev, password: e.target.value}))}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-secondary/50 text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                An account will be created with these details. You'll receive an email to verify and access your ticket.
                </p>

                <button
                onClick={handleGuestCheckout}
                disabled={isLoading}
                className={`w-full py-3.5 px-4 rounded-xl font-medium text-white shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                  ${total === 0 
                    ? "bg-green-600 hover:bg-green-700 shadow-green-600/20" 
                    : "bg-primary hover:bg-primary/90 shadow-primary/20"
                  }`}
                >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : total === 0 ? (
                  "Complete Registration"
                ) : (
                  `Pay ${formatNaira(total)}`
                )}
                </button>
              </div>
            ) : (
              /* Ticket Selection — shown to EVERYONE (logged in or not) */
              <div className="space-y-4">
                {(event?.ticket_types || []).map((ticket) => {
                const selected = selections[ticket.id] || 0;
                const isDisabled = ticket.is_sold_out || !ticket.is_active;

                return (
                  <div
                    key={ticket.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                      selected > 0
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    } ${isDisabled ? "opacity-60 bg-muted/50" : ""}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground">
                        {ticket.name}
                        </h4>
                        {isDisabled && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground rounded-full">
                          Sold Out
                        </span>
                        )}
                      </div>
                      {ticket.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {ticket.description}
                        </p>
                      )}
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="font-medium text-foreground">
                        {ticket.price === 0 ? "Free" : formatNaira(ticket.price)}
                        </span>
                        {!isDisabled && (
                        <>
                          <span>&bull;</span>
                          <span>{ticket.quantity_remaining} remaining</span>
                        </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="flex items-center bg-background border border-border rounded-lg h-10">
                        <button
                        onClick={() => handleQuantityChange(ticket.id, -1, ticket.quantity_remaining)}
                        disabled={isDisabled || selected === 0 || isLoading}
                        className="w-10 h-full flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                        >
                        <Minus className="w-4 h-4" />
                        </button>
                        <div className="w-10 text-center font-medium text-foreground">
                        {selected}
                        </div>
                        <button
                        onClick={() => handleQuantityChange(ticket.id, 1, ticket.quantity_remaining)}
                        disabled={isDisabled || selected >= Math.min(10, ticket.quantity_remaining) || isLoading}
                        className="w-10 h-full flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                        >
                        <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            )}
          </div>

          {/* Footer Summary — shown for ticket selection (logged in or guest, before guest step) */}
          {!success && !isWaitlistActive && !allSoldOut && !isSalesPaused && !(guestStep && !session) && (
            <div className="p-4 sm:p-6 border-t border-border bg-card">
              
              {/* Discount Code Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="Promo Code" 
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  disabled={!!appliedDiscount || applyingDiscount}
                  className="flex-1 px-4 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50"
                />
                {!appliedDiscount ? (
                  <button 
                    onClick={handleApplyDiscount}
                    disabled={applyingDiscount || !discountCode.trim()}
                    className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
                  >
                    {applyingDiscount ? "..." : "Apply"}
                  </button>
                ) : (
                  <button 
                    onClick={() => { setAppliedDiscount(null); setDiscountCode(""); }}
                    className="px-4 py-2 bg-destructive/10 text-destructive text-sm font-medium rounded-lg hover:bg-destructive/20 transition-colors"
                  >
                    Remove
                  </button>
                )}
                </div>
                {discountError && <p className="text-destructive text-xs mt-1.5">{discountError}</p>}
                {appliedDiscount && <p className="text-success text-xs mt-1.5 font-medium">Promo code {appliedDiscount.code} applied!</p>}
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal ({totalQuantity} tickets)</span>
                <span className="font-medium text-foreground">{formatNaira(subtotal)}</span>
                </div>
                
                {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Discount Saved</span>
                  <span className="font-medium">-{formatNaira(discountAmount)}</span>
                </div>
                )}
                
                {subtotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service Fee</span>
                  {event?.absorb_fees ? (
                    <span className="text-green-600 font-medium">Absorbed by organizer</span>
                  ) : (
                    <span className="font-medium text-foreground">{formatNaira(fee)}</span>
                  )}
                </div>
                )}

                <div className="flex justify-between text-lg font-bold text-foreground pt-3 border-t border-border/50">
                <span>Total</span>
                <span>{formatNaira(total)}</span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={totalQuantity === 0 || isLoading || isVerifying}
                className={`w-full py-3.5 px-4 rounded-xl font-medium text-white shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed
                ${total === 0 
                  ? "bg-green-600 hover:bg-green-700 shadow-green-600/20" 
                  : "bg-primary hover:bg-primary/90 shadow-primary/20"
                }`}
              >
                {isLoading || isVerifying ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isVerifying ? "Verifying Payment..." : "Processing..."}
                </span>
                ) : total === 0 ? (
                "Complete Registration"
                ) : (
                `Pay ${formatNaira(total)}`
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
