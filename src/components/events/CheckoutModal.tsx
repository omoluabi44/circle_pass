"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Ticket, Minus, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { checkout } from "@/lib/api/checkout";
import { API_URL } from "@/lib/api/config";
import { usePaystack } from "@/hooks/usePaystack";

interface TicketType {
  id: number;
  tier: string;
  name: string;
  price: number; // kobo
  quantity_remaining: number;
  is_sold_out: boolean;
  is_active: boolean;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: number;
    title: string;
    absorb_fees: boolean;
    start_time: string;
    waitlist_enabled?: boolean;
    ticket_types: TicketType[];
  };
}

const formatNaira = (kobo: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(kobo / 100);
};

export default function CheckoutModal({ isOpen, onClose, event }: CheckoutModalProps) {
  const { data: session } = useSession();
  const [selections, setSelections] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [successData, setSuccessData] = useState<any>(null);
  const router = useRouter();

  // Sign-up / Login state
  const [signupData, setSignupData] = useState({ username: '', email: '', password: '', phone_number: '' });
  const [signupError, setSignupError] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  const handleSignUp = async () => {
    const { username, email, password, phone_number } = signupData;
    if (!username || !email || !password || !phone_number) {
      setSignupError("Please fill in all fields.");
      return;
    }
    setSignupError('');
    setIsSigningUp(true);

    try {
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, phone_number, role: "ATTENDEE" }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.error || "Registration failed");

      const loginRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (loginRes?.error) {
        throw new Error("Account created! Please verify your email, then log in to complete checkout.");
      }
    } catch (err: any) {
      setSignupError(err.message || "Something went wrong.");
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleLogin = async () => {
    const { email, password } = loginData;
    if (!email || !password) {
      setSignupError("Please fill in all fields.");
      return;
    }
    setSignupError('');
    setIsSigningUp(true);

    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        throw new Error("Invalid email or password.");
      }
    } catch (err: any) {
      setSignupError(err.message);
    } finally {
      setIsSigningUp(false);
    }
  };

  // Timer logic
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  
  React.useEffect(() => {
    if (!isOpen || success || isWaitlistActive || !session) return;
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
    return () => clearInterval(interval);
  }, [isOpen, success]);

  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string, type: string, value: number } | null>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState("");

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setApplyingDiscount(true);
    setDiscountError("");
    try {
      const res = await fetch(`${API_URL}/events/${event.id}/discounts/validate/?code=${encodeURIComponent(discountCode)}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Invalid discount code.");
      }
      
      setAppliedDiscount({ code: data.code, type: data.type, value: data.value });
    } catch (e: any) {
      setDiscountError(e.message || "Failed to apply discount.");
      setAppliedDiscount(null);
    } finally {
      setApplyingDiscount(false);
    }
  };

  // Compute financial values
  const { subtotal, totalQuantity } = useMemo(() => {
    let sub = 0;
    let qty = 0;
    event.ticket_types.forEach((ticket) => {
      const selected = selections[ticket.id] || 0;
      sub += selected * ticket.price;
      qty += selected;
    });
    return { subtotal: sub, totalQuantity: qty };
  }, [selections, event.ticket_types]);

  const fee = event.absorb_fees ? 0 : Math.floor(subtotal * 0.05);
  
  let discountAmount = 0;
  if (appliedDiscount) {
    if (appliedDiscount.type === 'PERCENTAGE') {
      discountAmount = Math.floor(subtotal * (appliedDiscount.value / 100));
    } else {
      discountAmount = Math.min(appliedDiscount.value, subtotal);
    }
  }
  const total = Math.max(0, subtotal - discountAmount) + fee;

  const allSoldOut = event.ticket_types.length > 0 && event.ticket_types.every(t => t.is_sold_out);
  const isWaitlistActive = event.waitlist_enabled || allSoldOut;

  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistName, setWaitlistName] = useState("");

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail || !waitlistName) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/events/${event.id}/waitlist/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: waitlistEmail, name: waitlistName }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to join waitlist.");
      }
      setSuccessData({ message: "Joined waitlist successfully!" });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to join waitlist.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantityChange = (ticketId: number, delta: number, max: number) => {
    setSelections((prev) => {
      const current = prev[ticketId] || 0;
      const next = Math.max(0, Math.min(current + delta, Math.min(10, max)));
      
      const newSelections = { ...prev, [ticketId]: next };
      if (next === 0) {
        delete newSelections[ticketId];
      }
      return newSelections;
    });
  };

  const handleClose = () => {
    if (!isLoading) {
      const wasSuccess = success;
      const data = successData;
      
      setSelections({});
      setError(null);
      setSuccess(false);
      setSuccessData(null);
      onClose();
      
      if (wasSuccess) {
        if (data?.tickets && data.tickets.length > 0) {
          router.push(`/dashboard/tickets/${data.tickets[0].qr_token}`);
        } else {
          router.push(`/dashboard/tickets`);
        }
      }
    }
  };

  const { initialize: initializePaystack, isVerifying } = usePaystack();

  const handleSubmit = async () => {
    if (totalQuantity === 0) return;
    
    setError(null);
    setIsLoading(true);

    try {
      const token = (session as any)?.accessToken;
      if (!token) {
        throw new Error("You must be logged in to purchase tickets.");
      }

      const tickets = Object.entries(selections).map(([id, quantity]) => ({
        ticket_type_id: Number(id),
        quantity,
      }));

      const referral_code = window.location.search.includes('ref=') 
        ? new URLSearchParams(window.location.search).get('ref') || "" 
        : "";

      const response = await checkout(
        {
          event_id: event.id,
          items: tickets,
          referral_code: referral_code,
          discount_code: appliedDiscount?.code || "",
        } as any,
        token
      );

      if (response.payment_required && (response as any).paystack?.access_code) {
        // Trigger Paystack inline popup
        initializePaystack({
          accessCode: (response as any).paystack.access_code,
          onSuccess: (verificationResult) => {
            setSuccessData(verificationResult);
            setSuccess(true);
            setIsLoading(false);
          },
          onClose: () => {
            setError("Payment was cancelled. You can resume it from your dashboard.");
            setIsLoading(false);
          },
          onError: (err) => {
            setError("Payment verification failed. Please check your order history.");
            setIsLoading(false);
          }
        });
      } else {
        // Free ticket success
        setSuccessData(response);
        setSuccess(true);
        setIsLoading(false);
      }
      
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during checkout.");
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-background rounded-2xl shadow-xl overflow-hidden border border-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border bg-card/50">
              <div className="pr-8">
                <h2 className="text-xl font-semibold text-foreground line-clamp-1">
                  {event.title}
                </h2>
                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1.5"><Ticket className="w-4 h-4" /> Select Tickets</span>
                  {!isWaitlistActive && !success && (
                    <span className="flex items-center gap-1.5 text-warning font-medium">
                      Time left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="absolute right-4 top-4 sm:right-6 sm:top-6 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {error && (
                <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {!session ? (
                showLogin ? (
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-bold text-foreground">Log In</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Sign in to continue with your purchase
                      </p>
                    </div>

                    {signupError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p>{signupError}</p>
                      </div>
                    )}

                    <input type="email" placeholder="Email address" required
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({...prev, email: e.target.value}))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                    <input type="password" placeholder="Password" required
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({...prev, password: e.target.value}))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />

                    <button onClick={handleLogin} disabled={isSigningUp}
                      className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                      {isSigningUp ? "Signing in..." : "Continue to Tickets"}
                    </button>

                    <p className="text-center text-sm text-muted-foreground">
                      Don't have an account?{" "}
                      <button onClick={() => setShowLogin(false)} className="text-primary font-bold hover:underline">
                        Sign up
                      </button>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-bold text-foreground">Quick Sign Up</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create an account to continue with your purchase
                      </p>
                    </div>

                    {signupError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p>{signupError}</p>
                      </div>
                    )}

                    <input type="text" placeholder="Username" required
                      value={signupData.username}
                      onChange={(e) => setSignupData(prev => ({...prev, username: e.target.value}))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                    <input type="email" placeholder="Email address" required
                      value={signupData.email}
                      onChange={(e) => setSignupData(prev => ({...prev, email: e.target.value}))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                    <input type="password" placeholder="Password" required
                      value={signupData.password}
                      onChange={(e) => setSignupData(prev => ({...prev, password: e.target.value}))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                    <input type="tel" placeholder="Phone number" required
                      value={signupData.phone_number}
                      onChange={(e) => setSignupData(prev => ({...prev, phone_number: e.target.value}))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />

                    <button onClick={handleSignUp} disabled={isSigningUp}
                      className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                      {isSigningUp ? "Creating account..." : "Continue to Tickets"}
                    </button>

                    <p className="text-center text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <button onClick={() => setShowLogin(true)} className="text-primary font-bold hover:underline">
                        Log in
                      </button>
                    </p>
                  </div>
                )
              ) : success ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6"
                  >
                    <CheckCircle2 className="w-8 h-8" />
                  </motion.div>
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
                  <button
                    onClick={handleClose}
                    className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : isWaitlistActive ? (
                <div className="py-6 flex flex-col items-center">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2 text-center">Tickets Unavailable</h3>
                  <p className="text-muted-foreground mb-8 text-center max-w-sm">
                    {allSoldOut ? "This event is currently sold out." : "Tickets are not available right now."} Join the waitlist to be notified if spots open up.
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
              ) : (
                <div className="space-y-4">
                  {event.ticket_types.map((ticket) => {
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

            {/* Footer Summary */}
            {session && !success && !isWaitlistActive && (
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
                      {event.absorb_fees ? (
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
