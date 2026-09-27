---
name: circlepass-spec
description: >-
  Comprehensive reference for the CirclePass Product Requirements & Developer Handoff.
  Use whenever implementing or reviewing CirclePass features, database schemas, API routes,
  ticketing, checkout, Paystack integration, PassControl check-in, organizer payouts, or UI components.
---

# CirclePass Product Requirements & Developer Handoff

## 1. Product Overview & Core Principle
- **Tagline:** Your Pass to the Next Experience
- **Type:** A complete event-experience platform for event discovery, ticketing, event management, digital tickets, PassControl check-in, promotions, payments, analytics, social content, and community experiences.
- **Principle:** Build from scratch with a scalable production architecture as an original product (not a clone).
- **Core Value Chain:**
  Users -> Events -> Tickets -> Orders -> Payments -> Digital Tickets -> PassControl -> Attendance -> Wallet -> Payouts -> Analytics, plus Featured Events, Social Posts, Blog, Organizers, Promoters, Notifications; with Launch 2 extending through Nominations -> Nominees -> Voting -> Results -> Awards.
- **Exclusion:** No refund-policy module or refund-policy content is part of this product specification.

---

## 2. Design System & UI/UX Tokens
- **Direction:** Premium, modern, mature, professional, technology/event-focused, clean. Avoid childish visuals, excessive gradients, excessive animation, clutter, and generic templates.
- **Design Tokens:**
  - **Primary Color:** `#6366f1`
  - **Secondary Color:** `#F9FAFB`
- **Font Family:** `Fredoka`
- **Responsive Target:** Approximately 360px and upward (mobile, tablet, and desktop layouts).
- **Frontend Core Components:**
  - Navbar, Footer, EventCard, EventGrid, EventSearch, EventFilter, CategoryCard, OrganizerCard
  - TicketCard, TicketSelector, CheckoutSummary, PaymentStatus, QRCodeTicket
  - DashboardCard, AnalyticsChart, NotificationItem
  - Modal, Drawer, DataTable, EmptyState, LoadingState, ErrorState, StatusBadge
  - Button, Input, Select, DatePicker, FileUploader
- **Backend Stack:** Python (Django), MySQL

---

## 3. Scope by Launch Phase

### Launch 1 - Core Platform
- **Discovery:** Homepage hero with strong search, Featured / Major Events (Admin-controlled), Events Near You, Trending, Selling Fast, Browse by Category, New Events, Discover Organizers, Social / What's Happening, Blog, Bring Them Back personalized discovery.
- **Auth & Profiles:** Attendee and organizer accounts, Email auth + Continue with Google (account linking on matching verified email).
- **Organizer Verification:** Separate from event approval. Lifecycle: Unverified -> Verification Submitted -> Under Review -> Verified, Rejected, Suspended.
- **Event Creation & Types:** Physical, Online (protected private links for ticket holders), Hybrid. Full metadata (venue/Google Maps, timing, capacity, dress code, age limits, emergency contact, draft/save).
- **AI Automated Event Screening:** Completeness, title/description quality, category & date/time consistency, venue & ticket check, spam/duplicate detection, prohibited content flags. Outcomes: Auto-Approve, Changes Required, Human Admin Review. Admins can override; internal scores hidden from attendees.
- **Ticketing & Inventory:**
  - Types: Free, Early Bird, Regular, VIP, VVIP, Student, Custom.
  - Backend authoritative for inventory (atomic transactions to prevent race conditions/overselling).
  - **FREE TICKETS - STRICT BUSINESS RULE:** Price is 0 NGN. Never redirect to Paystack or collect card/bank details. Completed immediately as 0 NGN / Payment Not Required. Instant ticket issuance. No one-free-event-per-organizer-per-month limit. Free tickets consume inventory, generate QR codes, and support PassControl. No 5% fee on free tickets.
  - **PAID TICKETS & FEES:** 5% ticketing fee. Organizer can choose per-event whether organizer absorbs fee or buyer pays. Checkout clearly displays subtotal, discount, fee, and total.
- **Payment Architecture (Paystack):**
  - Paystack processor for paid tickets only.
  - Backend initializes payment, generates reference, verifies server-side.
  - Store financial amounts as integer kobo (never float).
  - Webhooks verified with secret signatures and processed idempotently. Never issue paid tickets on frontend-only signals.
- **Digital Tickets & QR Security:**
  - QR codes contain secure unique signed tokens (never sensitive DB IDs).
  - Statuses: Pending, Issued, Active, Used, Expired, Invalidated.
  - Accessible via web dashboard, PDF download, and email.
- **PassControl Check-In:**
  - QR scanner + manual lookup (code, name, email, phone).
  - Scan results: Valid, Already Used, Invalid, Wrong Event, Expired, Invalidated.
  - Atomic check-in prevents concurrent double use. Live check-in stats dashboard.
- **Orders, Discounts, Waitlists & Promoters:**
  - Order management, Find My Ticket (secure lookup via email/phone/reference).
  - Discounts (percentage or fixed amount, codes, usage limits, date ranges).
  - Waitlist for sold-out events with restock notifications and purchase windows.
  - Promoters/affiliates (campaigns, unique links, commission tracking, fraud controls).
- **Wallets & Payouts:**
  - Balances: Pending, Available, Total Earnings, Total Payouts, Pending Payouts.
  - Statuses: Pending, Processing, Completed, Failed, Rejected.
- **Notifications & Calendars:** Branded emails, email logs, calendar sync (Google Calendar, ICS).
- **CMS & Moderation:** Featured Events selection, Social Posts CMS, Blog CMS (/blog and /blog/[slug]), Admin audit logs.

### Launch 2 - Expansion
- **Voting & Awards:** Campaigns, categories, nominees, vote packages, anti-abuse, vote audit results.
  - 7% voting fee where applicable (payer configurable).
- **Nominations:** Nominee submission forms, admin approval, public nominee pages, 5% nomination commission.
- **Advanced PassControl:** Multi-gate management, staff permissions, offline mode, device sync.
- **Personalized DP (Profile Picture):** Organizer toggle per event. Free for attendees of paid events; charges organizer fee for free events. Dedicated URL pattern: https://getdp.co/{event-slug}.

---

## 4. Database / Domain Model

| Domain | Entities |
| :--- | :--- |
| **Auth** | Users, Roles, UserRoles, Sessions, EmailVerificationTokens, PasswordResetTokens |
| **Profiles** | AttendeeProfiles, OrganizerProfiles |
| **Events** | Events, EventCategories, EventSettings, Venues, EventScreening, OrganizerVerification |
| **Tickets** | TicketTypes, TicketPerks, Tickets, TicketHolders |
| **Orders** | Orders, OrderItems |
| **Payments** | Payments, PaymentEvents |
| **Discounts** | Discounts, DiscountRedemptions |
| **Engagement** | SavedEvents, FollowedOrganizers, Notifications, EmailLogs |
| **Operations** | CheckIns, CheckInEvents, EventAnnouncements |
| **Finance** | OrganizerWallets, Payouts, Commissions |
| **Promoters** | Promoters, PromoterCampaigns, PromoterLinks |
| **Content** | FeaturedEvents, SocialPosts, BlogPosts, BlogCategories, BlogTags, Authors |
| **Security** | AuditLogs |
| **Launch 2** | VotingCampaigns, VotingCategories, Nominations, Nominees, VotePackages, Votes, VotingTransactions, VotingResults |

### Core Entity Relationships:
- Organizer -> Events -> TicketTypes -> Tickets
- Attendee -> Orders -> OrderItems -> Tickets
- Payment -> Order
- Ticket -> Event / TicketType / TicketHolder
- CheckIn -> Ticket / Event
- Promoter -> Campaign -> Tracking Links -> Commission
- Voting Campaign -> Categories -> Nominees -> Votes -> Voting Transaction

---

## 5. Route Map

### Public Routes
- / - Homepage
- /events - Discovery, filter, search
- /events/[slug] - Event details & ticketing
- /categories/[slug] - Category listing
- /organizers/[slug] - Organizer profile & events
- /login, /register, /forgot-password - Authentication
- /find-ticket - Ticket retrieval tool
- /blog, /blog/[slug] - Content blog

### Attendee Routes (/dashboard/*)
- /dashboard - Overview
- /dashboard/tickets - Digital tickets with QR
- /dashboard/orders - Order history
- /dashboard/saved - Saved events
- /dashboard/following - Followed organizers
- /dashboard/notifications - Activity alerts
- /dashboard/profile & /dashboard/settings - Attendee account

### Organizer Routes (/organizer/*)
- /organizer - Organizer dashboard & metrics
- /organizer/events & /organizer/events/create - Event list & creation wizard
- /organizer/events/[id] - Event management
- /organizer/orders & /organizer/attendees - Attendee roster
- /organizer/check-in - PassControl scanner interface
- /organizer/promoters - Affiliate campaign setup
- /organizer/analytics - Revenue & attendance charts
- /organizer/wallet & /organizer/payouts - Balances and withdrawal requests
- /organizer/settings - Verification submission & preferences

### Super Admin Routes (/admin/*)
- /admin - System overview
- /admin/users & /admin/organizers - User & organizer verification review
- /admin/events - Event approvals & screening overrides
- /admin/tickets, /admin/transactions, /admin/payments, /admin/payouts - Financial operations
- /admin/categories - Taxonomy management
- /admin/blog & /admin/social-posts - CMS
- /admin/analytics, /admin/settings, /admin/audit-logs - Platform governance

---

## 6. QA & Acceptance Test Criteria
- **Critical Free-Ticket Test:** Selecting a free ticket must complete registration immediately, create an order record, issue a digital ticket with QR code, and transition to confirmation without initiating Paystack or asking for financial credentials.
- **Inventory Concurrency:** Simultaneous orders at inventory limits must never oversell; atomic database transactions must reject purchases once allocated tickets reach capacity.
- **Webhook Idempotency:** Duplicate Paystack webhook notifications for the same payment reference must not create duplicate orders or multiple ticket issuances.
- **PassControl Check-in Integrity:** Scanning a ticket twice must return Already Used on the second attempt and prevent concurrent double check-in.
- **Online/Hybrid Event Privacy:** Protected stream/meeting links must only be accessible to attendees with verified, valid tickets.
