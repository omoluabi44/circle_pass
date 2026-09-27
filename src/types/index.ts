// Ticket tier options
export type TicketTier = 'FREE' | 'EARLY_BIRD' | 'REGULAR' | 'VIP' | 'VVIP' | 'CUSTOM';

export interface TicketType {
  id: number;
  tier: TicketTier;
  name: string;
  description: string;
  price: number; // kobo
  quantity: number;
  quantity_sold: number;
  quantity_remaining: number;
  is_sold_out: boolean;
  sale_start: string | null;
  sale_end: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Event {
  id: number;
  organizer: number;
  organizer_name: string;
  category: number | null;
  venue: number | null;
  title: string;
  slug: string;
  description: string;
  cover_image?: string | null;
  capacity: number;
  is_online: boolean;
  status: string;
  absorb_fees: boolean;
  start_time: string;
  end_time: string;
  ticket_types: TicketType[];
}

export interface OrderItem {
  id: number;
  ticket_type: number;
  ticket_type_name: string;
  ticket_type_tier: TicketTier;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Order {
  id: number;
  event: number;
  subtotal: number;
  discount_amount: number;
  fee_amount: number;
  total_amount: number;
  status: string;
  items: OrderItem[];
  created_at: string;
}

export interface Ticket {
  id: number;
  ticket_type_name: string;
  ticket_type_tier: TicketTier;
  event_title: string;
  attendee_name: string;
  attendee_email: string;
  status: string;
  qr_token: string;
  issued_at: string | null;
  created_at: string;
}

export interface CheckoutItem {
  ticket_type_id: number;
  quantity: number;
}

export interface CheckoutRequest {
  event_id: number;
  items: CheckoutItem[];
  guest_name?: string;
  guest_email?: string;
}

export interface CheckoutResponse {
  detail: string;
  payment_required: boolean;
  order: Order;
  tickets?: Ticket[];
  paystack?: {
    amount: number;
    email: string;
    reference: string;
  };
}

// ==========================================
// WALLET & PAYOUTS
// ==========================================
export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REJECTED';
export type WalletTransactionType = 'CREDIT' | 'RELEASE' | 'PAYOUT' | 'REVERSAL';

export interface OrganizerWallet {
  pending_balance: number;
  available_balance: number;
  total_earnings: number;
  total_payouts: number;
  updated_at: string;
}

export interface WalletTransaction {
  id: number;
  type: WalletTransactionType;
  amount: number;
  balance_after: number;
  reference: string;
  description: string;
  created_at: string;
}

export interface Payout {
  id: number;
  amount: number;
  status: PayoutStatus;
  reference: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  rejection_reason?: string;
  requested_at: string;
  processed_at: string | null;
}

export interface PayoutRequest {
  amount: number;
  bank_code: string;
  account_number: string;
  account_name: string;
  bank_name: string;
}

// ==========================================
// FIND TICKET
// ==========================================
export interface FindTicketRequest {
  reference?: string;
  email?: string;
  phone?: string;
}

export interface FindTicketResult {
  event_title: string;
  ticket_type_name: string;
  attendee_name_masked: string;
  attendee_email_masked: string;
  status: string;
  order_reference: string;
  ticket_count: number;
}

// ==========================================
// ENGAGEMENT (Save / Follow)
// ==========================================
export interface SavedEvent {
  id: number;
  event: Event;
  saved_at: string;
}

export interface FollowedOrganizer {
  id: number;
  organizer_id: number;
  company_name: string;
  is_verified: boolean;
  follower_count: number;
  upcoming_event_count: number;
  followed_at: string;
}
