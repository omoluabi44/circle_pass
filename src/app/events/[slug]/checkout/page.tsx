"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Ticket, Minus, Plus, AlertCircle, CheckCircle2, ArrowLeft, Users } from "lucide-react";
import { useSession, signOut } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { checkout } from "@/lib/api/checkout";
import { API_URL } from "@/lib/api/config";
import { usePaystack } from "@/hooks/usePaystack";
import { useCart } from "@/context/CartContext";

type AttendeeFormState = {
  first_name: string;
  last_name: string;
  email: string;
  use_default_name: boolean;
};

const EMPTY_ATTENDEE: AttendeeFormState = {
  first_name: '',
  last_name: '',
  email: '',
  use_default_name: false,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function CheckoutPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { data: session } = useSession();
  const { removeFromCart } = useCart();

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

  // Fetch event custom fields (public endpoint)
  useEffect(() => {
    if (!event?.id) return;
    fetch(`${API_URL}/events/${event.id}/custom-fields/public/`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setCustomFields(data); })
      .catch(() => {});
  }, [event?.id]);

  const [selections, setSelections] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [successData, setSuccessData] = useState<any>(null);

  const [guestStep, setGuestStep] = useState(false);
  const [guestData, setGuestData] = useState({ name: '', email: '', phone: '', password: '' });

  // Per-ticket attendee details ("Send Tickets to different email addresses?")
  const [sendToAttendees, setSendToAttendees] = useState(false);
  const [attendeeForms, setAttendeeForms] = useState<Record<string, AttendeeFormState>>({});
  const [attendeeErrors, setAttendeeErrors] = useState<Record<string, string>>({});

  // Waitlist Claim State (When user clicks link in acceptance email)
  const [waitlistToken, setWaitlistToken] = useState<string | null>(null);
  const [waitlistClaimData, setWaitlistClaimData] = useState<any>(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Waitlist Registration Form State
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistName, setWaitlistName] = useState("");
  const [waitlistPhone, setWaitlistPhone] = useState("");
  const [waitlistTicketType, setWaitlistTicketType] = useState<number | string>("");
  const [waitlistQuantity, setWaitlistQuantity] = useState<number>(1);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("waitlist_token");
      if (token) setWaitlistToken(token);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      if (session.user.email && !waitlistEmail) setWaitlistEmail(session.user.email);
      if (session.user.name && !waitlistName) setWaitlistName(session.user.name);
    }
    if (event?.ticket_types && event.ticket_types.length > 0 && !waitlistTicketType) {
      setWaitlistTicketType(event.ticket_types[0].id);
    }
  }, [event, waitlistTicketType]);

  useEffect(() => {
    if (!event || !waitlistToken) return;
    const verifyClaim = async () => {
      setClaimLoading(true);
      try {
        const res = await fetch(`${API_URL}/events/${event.id}/waitlist/claim/?token=${encodeURIComponent(waitlistToken)}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || "Unable to claim waitlist reservation.");
        }
        setWaitlistClaimData(data);
        if (data.ticket_type_id && data.quantity) {
          setSelections({ [data.ticket_type_id]: data.quantity });
        }
        if (data.attendee_name || data.attendee_email) {
          setGuestData(prev => ({
            ...prev,
            name: data.attendee_name || prev.name,
            email: data.attendee_email || prev.email,
            phone: data.attendee_phone || prev.phone,
          }));
        }
      } catch (err: any) {
        setClaimError(err.message || "Failed to load reserved ticket.");
      } finally {
        setClaimLoading(false);
      }
    };
    verifyClaim();
  }, [event, waitlistToken]);

  const isSalesPaused = Boolean(event?.sales_paused);
  const totalCapacity = useMemo(() => {
    return event?.ticket_types?.reduce((acc: number, t: any) => acc + (t.quantity || 0), 0) || 0;
  }, [event?.ticket_types]);
  const totalSold = useMemo(() => {
    return event?.ticket_types?.reduce((acc: number, t: any) => acc + (t.quantity_sold || 0), 0) || 0;
  }, [event?.ticket_types]);
  const allSoldOut = useMemo(() => {
    const now = new Date();
    return Boolean(
      event?.ticket_types &&
      event?.ticket_types.length > 0 &&
      (
        (totalCapacity > 0 && totalSold >= totalCapacity) ||
        event.ticket_types.every((t: any) => {
          const isSaleEnded = Boolean(t.sale_end && now > new Date(t.sale_end));
          return t.is_sold_out || isSaleEnded || (t.quantity > 0 && (t.quantity_sold ?? 0) >= t.quantity);
        })
      )
    );
  }, [event?.ticket_types, totalCapacity, totalSold]);

  const isClaimingWaitlist = Boolean(waitlistClaimData && waitlistClaimData.status === 'ACCEPTED');
  const isPast = event ? new Date() > new Date(event.end_time) : false;
  const isWaitlistActive = Boolean(!isClaimingWaitlist && event?.waitlist_enabled && (allSoldOut || isPast));

  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    if (!event || success || isWaitlistActive || (allSoldOut && !isClaimingWaitlist) || isSalesPaused) return;
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
  }, [event, success, isWaitlistActive, allSoldOut, isClaimingWaitlist, isSalesPaused]);

  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string, type: string, value: number } | null>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState("");

  // Custom checkout fields
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  const handleApplyDiscount = async () => {
    if (!discountCode.trim() || !event) return;
    setApplyingDiscount(true);
    setDiscountError("");
    try {
      const res = await fetch(`${API_URL}/events/${event.id}/discounts/validate/?code=${encodeURIComponent(discountCode)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid discount code.");
      setAppliedDiscount({ code: data.code, type: data.type, value: data.value });
    } catch (e: any) {
      setDiscountError(e.message || "Failed to apply discount.");
      setAppliedDiscount(null);
    } finally {
      setApplyingDiscount(false);
    }
  };

  const { subtotal, totalQuantity } = useMemo(() => {
    let sub = 0;
    let qty = 0;
    (event?.ticket_types || []).forEach((ticket: any) => {
      const selected = selections[ticket.id] || 0;
      sub += selected * ticket.price;
      qty += selected;
    });
    return { subtotal: sub, totalQuantity: qty };
  }, [selections, event?.ticket_types]);



  let discountAmount = 0;
  if (appliedDiscount) {
    if (appliedDiscount.type === 'PERCENTAGE') {
      discountAmount = Math.floor(subtotal * (appliedDiscount.value / 100));
    } else {
      discountAmount = Math.min(appliedDiscount.value, subtotal);
    }
  }
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const fee = event?.absorb_fees ? 0 : Math.floor(discountedSubtotal * 0.05);
  const total = discountedSubtotal + fee;

  // ── Per-ticket attendees ("Send Tickets to different email addresses?") ──
  const buyerName = (session?.user?.name || guestData.name || '').trim();

  // One slot per ticket, in ticket-tier order, so the forms track quantities.
  const ticketSlots = useMemo(() => {
    const slots: { key: string; ticketTypeId: number; ticketName: string }[] = [];
    (event?.ticket_types || []).forEach((ticket: any) => {
      const qty = selections[ticket.id] || 0;
      for (let i = 0; i < qty; i++) {
        slots.push({
          key: `${ticket.id}-${i}`,
          ticketTypeId: ticket.id,
          ticketName: ticket.name,
        });
      }
    });
    return slots;
  }, [selections, event?.ticket_types]);

  // Turning the toggle off when nothing is selected avoids stale forms.
  useEffect(() => {
    if (totalQuantity === 0 && sendToAttendees) setSendToAttendees(false);
  }, [totalQuantity, sendToAttendees]);

  const getAttendeeForm = (key: string): AttendeeFormState =>
    attendeeForms[key] || EMPTY_ATTENDEE;

  const updateAttendeeForm = (key: string, patch: Partial<AttendeeFormState>) => {
    setAttendeeForms((prev) => {
      const current = prev[key] || EMPTY_ATTENDEE;
      const next = { ...current, ...patch };
      // Checking "use default name" mirrors the buyer's name into the form.
      if (patch.use_default_name && buyerName) {
        const parts = buyerName.split(/\s+/);
        next.first_name = parts[0] || '';
        next.last_name = parts.slice(1).join(' ');
      }
      return { ...prev, [key]: next };
    });
    setAttendeeErrors((prev) => {
      if (!Object.keys(prev).length) return prev;
      const next = { ...prev };
      Object.keys(next).forEach((errKey) => {
        if (errKey.startsWith(`${key}:`)) delete next[errKey];
      });
      return next;
    });
  };

  const validateAttendees = (): boolean => {
    if (!sendToAttendees) return true;

    const errors: Record<string, string> = {};
    ticketSlots.forEach((slot) => {
      const form = getAttendeeForm(slot.key);
      // A checked "use default name" is always valid: logged-in buyers already
      // have a name, and guests supply theirs on the payment step.
      const usesDefaultName = form.use_default_name;

      if (!usesDefaultName && !form.first_name.trim()) {
        errors[`${slot.key}:first_name`] = 'First name is required';
      }

      const email = form.email.trim();
      if (!email) {
        errors[`${slot.key}:email`] = 'Email is required';
      } else if (!EMAIL_PATTERN.test(email)) {
        errors[`${slot.key}:email`] = 'Enter a valid email address';
      }
    });

    setAttendeeErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Please complete the attendee details for every ticket.');
      return false;
    }
    return true;
  };

  const buildAttendees = () => {
    if (!sendToAttendees) return [];
    const fallbackName = (buyerName || guestData.name || '').trim();
    return ticketSlots.map((slot) => {
      const form = getAttendeeForm(slot.key);
      const useDefault = form.use_default_name && !!fallbackName;
      const parts = fallbackName.split(/\s+/);
      const first_name = useDefault ? (parts[0] || '') : form.first_name.trim();
      const last_name = useDefault
        ? parts.slice(1).join(' ')
        : form.last_name.trim();
      return {
        ticket_type_id: slot.ticketTypeId,
        first_name,
        last_name,
        email: form.email.trim(),
      };
    });
  };

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail || !waitlistName || !event) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/events/${event.id}/waitlist/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: waitlistEmail,
          name: waitlistName,
          phone: waitlistPhone,
          ticket_type_id: waitlistTicketType,
          quantity: waitlistQuantity
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to join waitlist.");
      }
      setSuccessData({
        isWaitlist: true,
        message: data.detail || "You've been added to the waitlist! We will notify you if your request is accepted."
      });
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
      if (next === 0) delete newSelections[ticketId];
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
      setGuestStep(false);
      setGuestData({ name: '', email: '', phone: '', password: '' });
      setSendToAttendees(false);
      setAttendeeForms({});
      setAttendeeErrors({});
      if (wasSuccess) {
        const buyerAccountEmail = (
          session?.user?.email || data?.guestEmail || ''
        ).toLowerCase();
        const tickets = data?.tickets || [];
        const ownTicket = tickets.find(
          (t: any) => (t.attendee_email || '').toLowerCase() === buyerAccountEmail
        );

        // When tickets were issued to other people, the buyer may own none of
        // them and would be blocked by pass access control.
        if (ownTicket) {
          router.push(
            data?.isGuest
              ? `/t/${ownTicket.qr_token}`
              : `/dashboard/tickets/${ownTicket.qr_token}`
          );
        } else if (data?.isGuest) {
          router.push('/find-ticket');
        } else {
          router.push('/dashboard/orders');
        }
      } else {
        router.back();
      }
    }
  };

  const { initialize: initializePaystack, isVerifying } = usePaystack();

  const handleGuestCheckout = async () => {
    const { name, email, phone } = guestData;
    if (!name || !email || !phone) {
      setError("Please fill in all fields.");
      return;
    }
    for (const f of customFields) {
      if (f.required && !customFieldValues[f.id]?.trim()) {
        setError(`Please enter ${f.label}.`);
        return;
      }
    }
    if (!validateAttendees()) return;
    setError(null);
    setIsLoading(true);
    try {
      const tickets = Object.entries(selections).map(([id, quantity]) => ({
        ticket_type_id: Number(id), quantity,
      }));
      const referral_code = window.location.search.includes('ref=') ? new URLSearchParams(window.location.search).get('ref') || "" : "";

      const response = await checkout({
        event_id: event.id, items: tickets, guest_name: name, guest_email: email, guest_phone: phone, referral_code, discount_code: appliedDiscount?.code || "", waitlist_token: waitlistToken || "",
        attendees: buildAttendees(),
        custom_field_responses: {
          ...customFieldValues,
        },
      } as any);

      if (response.payment_required && response.gateway === 'NOMBA' && response.nomba?.checkout_link) {
        removeFromCart(event.id);
        window.location.href = response.nomba.checkout_link;
        return;
      }

      if (response.payment_required && (response as any).paystack?.access_code) {
        initializePaystack({
          accessCode: (response as any).paystack.access_code,
          reference: (response as any).paystack.reference,
          onSuccess: (verificationResult) => {
            setSuccessData({ ...verificationResult, isGuest: true, guestEmail: email });
            setSuccess(true);
            removeFromCart(event.id);
            setIsLoading(false);
          },
          onClose: () => {
            setError("Payment was cancelled. Please try again.");
            setIsLoading(false);
          },
          onError: () => {
            setError("Payment verification failed. Please try again.");
            setIsLoading(false);
          }
        });
      } else {
        setSuccessData({ ...response, isGuest: true, guestEmail: email });
        setSuccess(true);
        removeFromCart(event.id);
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (totalQuantity === 0) return;
    setError(null);
    if (!session) {
      if (!validateAttendees()) return;
      setGuestStep(true);
      return;
    }
    for (const f of customFields) {
      if (f.required && !customFieldValues[f.id]?.trim()) {
        setError(`Please enter ${f.label}.`);
        return;
      }
    }
    if (!validateAttendees()) return;
    setIsLoading(true);
    try {
      const token = (session as any)?.accessToken;
      const tickets = Object.entries(selections).map(([id, quantity]) => ({
        ticket_type_id: Number(id), quantity,
      }));
      const referral_code = window.location.search.includes('ref=') ? new URLSearchParams(window.location.search).get('ref') || "" : "";

      const response = await checkout({
        event_id: event.id, items: tickets, referral_code, discount_code: appliedDiscount?.code || "", waitlist_token: waitlistToken || "",
        attendees: buildAttendees(),
        custom_field_responses: {
          ...customFieldValues,
        },
      } as any, token);

      if (response.payment_required && response.gateway === 'NOMBA' && response.nomba?.checkout_link) {
        removeFromCart(event.id);
        window.location.href = response.nomba.checkout_link;
        return;
      }

      if (response.payment_required && (response as any).paystack?.access_code) {
        initializePaystack({
          accessCode: (response as any).paystack.access_code,
          reference: (response as any).paystack.reference,
          onSuccess: (verificationResult) => {
            setSuccessData(verificationResult);
            setSuccess(true);
            removeFromCart(event.id);
            setIsLoading(false);
          },
          onClose: () => {
            setError("Payment was cancelled. You can resume it from your dashboard.");
            setIsLoading(false);
          },
          onError: () => {
            setError("Payment verification failed. Please check your order history.");
            setIsLoading(false);
          }
        });
      } else {
        setSuccessData(response);
        setSuccess(true);
        removeFromCart(event.id);
        setIsLoading(false);
      }
    } catch (err: any) {
      if (err.message && err.message.includes("session has expired")) {
          setError(err.message);
          setTimeout(() => { signOut({ callbackUrl: '/login' }); }, 3000);
      } else {
          setError(err.message || "An unexpected error occurred during checkout.");
      }
      setIsLoading(false);
    }
  };

  const formatNaira = (kobo: number) => {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2 }).format(kobo / 100);
  };

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

  let imageUrl = event?.cover_image || '/image-folders/event-images/photo_2026-09-17_16-13-26.jpg';
  if (typeof imageUrl === 'string') {
    if (imageUrl.startsWith('http://localhost:')) {
      imageUrl = imageUrl.replace('http://localhost:', 'http://127.0.0.1:');
    } else if (imageUrl.startsWith('/media/')) {
      const baseUrl = API_URL.replace('/api', '');
      imageUrl = `${baseUrl}${imageUrl}`;
    } else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
      const baseUrl = API_URL.replace('/api', '');
      imageUrl = `${baseUrl}/media/${imageUrl}`;
    }
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition mb-6">
          <ArrowLeft className="w-5 h-5" /> Back to Event
        </button>

        <div className="bg-card rounded-2xl shadow-xl overflow-hidden border border-border">
          {/* Header with Background Image */}
          <div className="relative h-48 sm:h-56 w-full bg-muted overflow-hidden">
            <img src={imageUrl} alt={event.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

            <div className="absolute bottom-0 left-0 w-full p-6 sm:p-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-white line-clamp-2 drop-shadow-md">
                {event.title}
              </h1>
              <div className="text-sm text-gray-200 mt-3 flex items-center gap-4">
                <span className="flex items-center gap-1.5 font-medium">
                  {guestStep && !session ? (
                    <><AlertCircle className="w-4 h-4" /> Your Details</>
                  ) : (
                    <><Ticket className="w-4 h-4" /> Checkout</>
                  )}
                </span>
                {!isWaitlistActive && !allSoldOut && !isSalesPaused && !success && !guestStep && (
                  <span className="flex items-center gap-1.5 font-semibold bg-white/20 px-2.5 py-1 rounded-md backdrop-blur-sm">
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
                      You're in the Circle! 🎉
                    </h3>
                    <p className="text-muted-foreground mb-2">
                      {sendToAttendees
                        ? "Your tickets are confirmed. Each attendee has been emailed their own pass."
                        : "Your ticket is confirmed and has been sent to your email."}
                    </p>
                    <p className="text-muted-foreground mb-8">
                      See you at the experience!
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      {successData?.payment_required ? "Payment Required" : successData?.message ? "You're on the list!" : "You're in the Circle! 🎉"}
                    </h3>
                    <p className="text-muted-foreground mb-8 text-balance">
                      {successData?.payment_required
                        ? "Redirecting you to complete your payment..."
                        : successData?.message
                          ? "We'll notify you if tickets become available."
                          : sendToAttendees
                            ? "Your tickets are confirmed. Each attendee has been emailed their own pass."
                            : "Your ticket is confirmed and has been sent to your email. You can also access it anytime from My Circle on your attendee dashboard. See you at the experience!"}
                    </p>
                  </>
                )}
                <div className="flex items-center gap-3 justify-center">
                  {!successData?.isGuest && !successData?.payment_required && !successData?.message && (
                    <button
                      onClick={handleClose}
                      className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-md"
                    >
                      {sendToAttendees ? "View My Orders" : "View My Ticket"}
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/events/${slug}`)}
                    className="px-6 py-2.5 bg-secondary text-foreground font-medium rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    Close
                  </button>
                </div>
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
                  Go Back
                </button>
              </div>
            ) : isWaitlistActive ? (
              <div className="py-6 flex flex-col items-center">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-5">
                  <Ticket className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-1.5 text-center">
                  {isPast ? "Event Ended" : "Event Sold Out"}
                </h3>
                <p className="text-muted-foreground mb-6 text-center max-w-sm text-sm">
                  {isPast
                    ? "This event has ended. Join the waitlist to be notified if tickets open up."
                    : "All tickets are currently sold out. Select your preferred tier and quantity to join the waitlist."}
                </p>

                {claimError && (
                  <div className="w-full max-w-md mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{claimError}</span>
                  </div>
                )}

                <form onSubmit={handleJoinWaitlist} className="w-full max-w-md space-y-4 text-left">
                  {/* Ticket Category Selector */}
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                      Ticket Category
                    </label>
                    <select
                      value={waitlistTicketType}
                      onChange={(e) => setWaitlistTicketType(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
                      required
                    >
                      {event?.ticket_types?.map((tt: any) => (
                        <option key={tt.id} value={tt.id}>
                          {tt.name} — {tt.price === 0 ? "Free" : `₦${(tt.price / 100).toLocaleString()}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity Selector */}
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                      Quantity
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setWaitlistQuantity((q) => Math.max(1, q - 1))}
                        disabled={waitlistQuantity <= 1}
                        className="w-11 h-11 flex items-center justify-center rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground disabled:opacity-40 transition"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={waitlistQuantity}
                        onChange={(e) => setWaitlistQuantity(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                        className="flex-1 text-center py-2.5 rounded-xl border border-border bg-background text-foreground font-bold text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setWaitlistQuantity((q) => Math.min(10, q + 1))}
                        disabled={waitlistQuantity >= 10}
                        className="w-11 h-11 flex items-center justify-center rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground disabled:opacity-40 transition"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={waitlistName}
                      onChange={(e) => setWaitlistName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="jane@example.com"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                    />
                  </div>

                  {/* Phone (Optional) */}
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                      Phone Number <span className="text-muted-foreground font-normal lowercase">(optional)</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="+234 800 000 0000"
                      value={waitlistPhone}
                      onChange={(e) => setWaitlistPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                    />
                  </div>

                  {/* Explainer / Transparency Card */}
                  <div className="p-3.5 bg-secondary/60 rounded-xl border border-border/80 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      <strong>No payment required now.</strong> You do not need to enter card details. If the organizer accepts your request and tickets become available, you will receive an email to complete payment.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
                  >
                    {isLoading ? "Submitting Request..." : "Submit Waitlist Request"}
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
                  Go Back
                </button>
              </div>
            ) : guestStep && !session ? (
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
                  onChange={(e) => setGuestData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
                <input type="email" placeholder="Email address" required
                  value={guestData.email}
                  onChange={(e) => setGuestData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
                <input type="tel" placeholder="Phone number" required
                  value={guestData.phone}
                  onChange={(e) => setGuestData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />

                {customFields.map((field) => (
                  <div key={field.id}>
                    {field.field_type === 'select' ? (
                      <select
                        value={customFieldValues[field.id] || ""}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      >
                        <option value="">{field.label} ({field.required ? 'Required' : 'Optional'})</option>
                        {(field.options || []).map((opt: string, i: number) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.field_type === 'number' ? 'number' : 'text'}
                        placeholder={`${field.label} (${field.required ? 'Required' : 'Optional'})`}
                        value={customFieldValues[field.id] || ""}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      />
                    )}
                  </div>
                ))}

                <p className="text-xs text-muted-foreground leading-relaxed">
                  You'll receive an email with your ticket details.
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
              <div className="space-y-4">
                {isClaimingWaitlist && (
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-3 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-foreground text-sm">Waitlist Reservation Confirmed! 🎉</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Your request for {waitlistClaimData.quantity}x {waitlistClaimData.ticket_type_name} ticket(s) has been accepted and reserved. Complete your checkout below.
                      </p>
                    </div>
                  </div>
                )}

                {event.ticket_types?.map((ticket: any) => {
                  const isReservedTicket = isClaimingWaitlist && waitlistClaimData?.ticket_type_id === ticket.id;
                  const selected = selections[ticket.id] || 0;
                  const now = new Date();
                  const saleStart = ticket.sale_start ? new Date(ticket.sale_start) : null;
                  const saleEnd = ticket.sale_end ? new Date(ticket.sale_end) : null;
                  const isNotStarted = Boolean(saleStart && now < saleStart);
                  const isSaleEnded = Boolean(saleEnd && now > saleEnd);
                  const isTierSoldOut = Boolean(
                    ticket.is_sold_out ||
                    isSaleEnded ||
                    (ticket.quantity > 0 && (ticket.quantity_sold ?? 0) >= ticket.quantity)
                  );
                  const isDisabled = (isTierSoldOut && !isReservedTicket) || isNotStarted || !ticket.is_active;
                  const formatSaleDate = (d: Date) =>
                    d.toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    });

                  return (
                    <div
                      key={ticket.id}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${selected > 0
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                        } ${isDisabled ? "opacity-60 bg-muted/50" : ""}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground">
                            {ticket.name}
                          </h4>
                          {isReservedTicket && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-primary/10 text-primary rounded-full">
                              Reserved for You
                            </span>
                          )}
                          {isTierSoldOut && !isReservedTicket && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground rounded-full">
                              Sold Out
                            </span>
                          )}
                          {!isTierSoldOut && isNotStarted && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full">
                              Sales Not Started
                            </span>
                          )}
                        </div>
                        {ticket.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {ticket.description}
                          </p>
                        )}
                        <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">
                            {ticket.price === 0 ? "Free" : formatNaira(ticket.price)}
                          </span>
                          {!isDisabled && (
                            <>
                              <span>&bull;</span>
                              <span>{ticket.quantity_remaining} remaining</span>
                            </>
                          )}
                          {!isTierSoldOut && isNotStarted && saleStart && (
                            <>
                              <span>&bull;</span>
                              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                Sales start: {formatSaleDate(saleStart)}
                              </span>
                            </>
                          )}
                          {!isTierSoldOut && !isNotStarted && saleEnd && (
                            <>
                              <span>&bull;</span>
                              <span className="text-xs font-medium text-muted-foreground">
                                Sales end: {formatSaleDate(saleEnd)}
                              </span>
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
                          <div className="w-10 text-center font-medium text-foreground flex items-center justify-center">
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

            {/* Per-ticket attendee details */}
            {!success && !isWaitlistActive && (!allSoldOut || isClaimingWaitlist) && !isSalesPaused && !(guestStep && !session) && totalQuantity > 0 && (
              <div className="mt-4 rounded-xl border border-border p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">
                      Send Tickets to different email addresses?
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      If left blank all tickets will be sent to the email used for payment.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={sendToAttendees}
                    aria-label="Send tickets to different email addresses"
                    onClick={() => {
                      setSendToAttendees((v) => !v);
                      setAttendeeErrors({});
                      setError(null);
                    }}
                    disabled={isLoading}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                      sendToAttendees ? "bg-primary" : "bg-muted border border-border"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        sendToAttendees ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {sendToAttendees && (
                  <div className="mt-5 space-y-5">
                    {ticketSlots.map((slot, index) => {
                      const form = getAttendeeForm(slot.key);
                      const usesDefaultName = form.use_default_name;
                      const firstNameError = attendeeErrors[`${slot.key}:first_name`];
                      const emailError = attendeeErrors[`${slot.key}:email`];

                      return (
                        <div
                          key={slot.key}
                          className="pt-5 first:pt-0 border-t first:border-t-0 border-border/60"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Users className="w-4 h-4 text-primary shrink-0" />
                            <h5 className="font-semibold text-foreground text-sm">
                              Attendee {index + 1} - {slot.ticketName}
                            </h5>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">
                                First Name
                              </label>
                              <input
                                type="text"
                                value={form.first_name}
                                onChange={(e) =>
                                  updateAttendeeForm(slot.key, { first_name: e.target.value })
                                }
                                placeholder="Your name..."
                                disabled={usesDefaultName || isLoading}
                                className={`w-full px-4 py-2.5 text-sm rounded-xl border bg-secondary/50 text-foreground placeholder-muted-foreground outline-none focus:ring-1 focus:ring-primary transition-all disabled:opacity-60 ${
                                  firstNameError ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"
                                }`}
                              />
                              {firstNameError && (
                                <p className="text-destructive text-xs mt-1">{firstNameError}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Last Name
                              </label>
                              <input
                                type="text"
                                value={form.last_name}
                                onChange={(e) =>
                                  updateAttendeeForm(slot.key, { last_name: e.target.value })
                                }
                                placeholder="Last name"
                                disabled={usesDefaultName || isLoading}
                                className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-secondary/50 text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-60"
                              />
                            </div>
                          </div>

                          <div className="mt-3">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              value={form.email}
                              onChange={(e) =>
                                updateAttendeeForm(slot.key, { email: e.target.value })
                              }
                              placeholder="attendee@example.com"
                              autoComplete="email"
                              disabled={isLoading}
                              className={`w-full px-4 py-2.5 text-sm rounded-xl border bg-secondary/50 text-foreground placeholder-muted-foreground outline-none focus:ring-1 focus:ring-primary transition-all ${
                                emailError ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"
                              }`}
                            />
                            {emailError && (
                              <p className="text-destructive text-xs mt-1">{emailError}</p>
                            )}
                          </div>

                          <label className="mt-3 flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.use_default_name}
                              onChange={(e) =>
                                updateAttendeeForm(slot.key, {
                                  use_default_name: e.target.checked,
                                })
                              }
                              disabled={isLoading}
                              className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            />
                            <span className="text-xs text-muted-foreground leading-relaxed">
                              Use the default name provided above for payment for this ticket
                              {form.use_default_name && !buyerName
                                ? " — we'll use the name you enter on the payment step."
                                : ""}
                            </span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {!success && !isWaitlistActive && (!allSoldOut || isClaimingWaitlist) && !isSalesPaused && !(guestStep && !session) && (
            <div className="p-4 sm:p-6 border-t border-border bg-card">
              <div className="mb-6 space-y-3">
                {customFields.map((field) => (
                  <div key={field.id}>
                    {field.field_type === 'select' ? (
                      <select
                        value={customFieldValues[field.id] || ""}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-secondary/50 text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      >
                        <option value="">{field.label} ({field.required ? 'Required' : 'Optional'})</option>
                        {(field.options || []).map((opt: string, i: number) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.field_type === 'number' ? 'number' : 'text'}
                        placeholder={`${field.label} (${field.required ? 'Required' : 'Optional'})`}
                        value={customFieldValues[field.id] || ""}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-secondary/50 text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      />
                    )}
                  </div>
                ))}
              </div>
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
        </div>
      </div>
    </div>
  );
}

