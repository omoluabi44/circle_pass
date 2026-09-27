<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CirclePass — Product Requirements & Developer Agent Rules

## 1. Product Overview & Core Principle
- **Product Name:** CirclePass
- **Tagline:** *"Your Pass to the Next Experience"*
- **Purpose:** A complete event-experience platform for event discovery, ticketing, event management, digital tickets, PassControl check-in, promotions, payments, analytics, social content, and community experiences.
- **Architectural Directive:** Must be engineered as an original product built from scratch with a scalable production architecture (not a clone of an existing website).
- **Core Value Chain:**
  `Users → Events → Tickets → Orders → Payments → Digital Tickets → PassControl → Attendance → Wallet → Payouts → Analytics`
  Extended with: `Featured Events, Social Posts, Blog, Organizers, Promoters, Notifications`
  And Launch 2: `Nominations → Nominees → Voting → Results → Awards`
- **Strict Scope Exclusion:** No refund-policy module or refund-policy content is part of this product specification.

---

## 2. Brand & Design System
- **Direction:** Premium, modern, mature, professional, technology/event-focused, and clean. Avoid childish visuals, excessive gradients, excessive animation, clutter, and generic templates.
- **Color Tokens:**
  - **Primary Color:** `#6366f1`
  - **Secondary Color:** `#F9FAFB`
  - **Logo Color:** `#5046E5`
- **Font Family:** `Roboto` (Project wide)
- **Logo Font:** `Fredoka`
- **Responsive Target:** Mobile-first, approximately 360px and upward (mobile, tablet, desktop).
- **Frontend Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, Framer Motion, Lucide React Icons.
- **Backend Stack:** Python (Django), MySQL.
- **Database Engine (Strict Rule):** This project strictly uses **MySQL** for all environments (local development, staging, production). Ignore any leftover `db.sqlite3` files in the workspace. All database interactions and queries must be written assuming a full MySQL environment (e.g., `select_for_update()` row locking is fully supported and active).

---

## 3. Settled Product & Business Rules (Critical Guardrails)
1. **Free Tickets (Strict Rule):**
   - Free ticket price is **₦0**.
   - **Never redirect to Paystack** or request card, bank, or payment details for free tickets.
   - Registration/order completes immediately as `₦0 / Payment Not Required`.
   - Ticket is issued immediately upon registration.
   - **No limit** like "one free event per organizer per month".
   - Free tickets still consume inventory, create attendee/ticket records, and receive digital tickets with secure QR codes for PassControl check-in.
   - The 5% paid ticketing fee **must not** be charged on free tickets.
2. **Paid Tickets & Fees:**
   - CirclePass ticketing fee is **5%**.
   - Organizer selects per-event whether the organizer absorbs the fee or the buyer pays it.
   - Checkout must clearly display: Subtotal, Discount, CirclePass Service Fee, and Total.
   - Financial values must always be stored as **integer kobo** in the database, never floating-point numbers.
3. **Payment Processing (Paystack):**
   - Paystack is the production processor for paid tickets.
   - Backend initializes payment, generates reference, and verifies payments server-side.
   - Webhooks must be verified with secret signatures and processed **idempotently**.
   - **Never issue a paid ticket solely from frontend success signals.** Backend verification is mandatory.
4. **Authoritative Backend:**
   - The backend is the sole source of truth for pricing, inventory, payment status, ticket validity, event status, role permissions, check-in validation, and wallet/payout eligibility.
   - Atomic operations must be used for inventory decrements and check-in scans to prevent overselling and duplicate entries.
5. **Digital Tickets & QR Security:**
   - QR codes must contain a secure signed/unique token, **never** raw database IDs or sensitive user data.
   - Ticket statuses: `Pending`, `Issued`, `Active`, `Used`, `Expired`, `Invalidated`.
   - QR scanner results: `Valid`, `Already Used`, `Invalid`, `Wrong Event`, `Expired`, `Invalidated`.
6. **AI Event Screening:**
   - Automates low-risk screening (content quality, duplicate detection, date/venue sanity, prohibited indicators).
   - Outcomes: `Auto-Approve`, `Changes Required`, `Human Admin Review`.
   - Admin override is required; confidence scores and internal flags must not be exposed to attendees.
7. **Personalized DP (Launch 2):**
   - Event-level toggle managed by organizer.
   - Free for attendees of paid events; charges a configurable fee to the organizer for free events.
   - Uses slugged URL format: `https://getdp.co/{event-slug}`.

---

## 4. User Roles & Permission Matrix
- **Attendee:** Discover events, search/filter, register/buy tickets, buy for others, access digital tickets & QR codes, order history, save events, follow organizers, notifications, calendar integration (Google Calendar, ICS).
- **Organizer:** Profile verification, create/manage events (Physical, Online, Hybrid), ticket configuration, discount codes, waitlists, announcements, promoters/affiliates, PassControl check-in, event analytics, wallet balances & payout requests.
- **Super Admin:** Manage users, organizers, and verification statuses; approve/reject/override events; feature events on homepage; manage CMS (Social Posts, Blog); transactions, payouts, categories, platform settings, and audit logs.

---

## 5. Event & Verification Lifecycles
- **Organizer Verification Lifecycle:**
  `Unverified → Verification Submitted → Under Review → Verified / Rejected / Suspended`
  *(Organizer verification is distinct and decoupled from individual event approvals).*
- **Event Lifecycle:**
  `Draft → Submitted → AI Screening → Under Review → Approved / Changes Required / Human Review / Rejected → Published → Live → Completed → Archived`
  *(Operational states: Rescheduled, Cancelled).*
- **PassControl Check-In Lifecycle:**
  Atomic check-in via QR scan or manual search (ticket code, name, email, phone). Status transitions to `Used`.
- **Wallet & Payouts Lifecycle:**
  Balances tracked: `Pending Balance`, `Available Balance`, `Total Earnings`, `Total Payouts`, `Pending Payouts`.
  Payout statuses: `Pending → Processing → Completed / Failed / Rejected`.

---

## 6. Route Map & API Architecture
### Route Structure
- **Public:** `/`, `/events`, `/events/[slug]`, `/categories/[slug]`, `/organizers/[slug]`, `/login`, `/register`, `/forgot-password`, `/find-ticket`, `/blog`, `/blog/[slug]`
- **Attendee:** `/dashboard`, `/dashboard/tickets`, `/dashboard/orders`, `/dashboard/saved`, `/dashboard/following`, `/dashboard/notifications`, `/dashboard/profile`, `/dashboard/settings`
- **Organizer:** `/organizer`, `/organizer/events`, `/organizer/events/create`, `/organizer/events/[id]`, `/organizer/orders`, `/organizer/attendees`, `/organizer/check-in`, `/organizer/promoters`, `/organizer/analytics`, `/organizer/wallet`, `/organizer/payouts`, `/organizer/settings`
- **Admin:** `/admin`, `/admin/users`, `/admin/organizers`, `/admin/events`, `/admin/tickets`, `/admin/transactions`, `/admin/payments`, `/admin/payouts`, `/admin/categories`, `/admin/blog`, `/admin/social-posts`, `/admin/analytics`, `/admin/settings`, `/admin/audit-logs`
- **Launch 2 Routes:** `/voting`, `/voting/[id]`, awards, nominations, and advanced multi-gate PassControl.

### API Namespaces
- `/api/auth/*` — Authentication, sessions, password reset, Google OAuth
- `/api/events/*` — Event CRUD, screening, discovery, categories
- `/api/tickets/*` — Ticket tiers, issuance, download, secure QR tokens
- `/api/orders/*` — Order creation, checkout summary, guest checkout
- `/api/payments/*` — Paystack initialization, webhooks, verification
- `/api/check-in/*` — PassControl QR scanning, manual check-in, live stats
- `/api/organizer/*` — Organizer profile, verification submission, wallet, payouts
- `/api/admin/*` — Moderation, approvals, user management, CMS, audit logs
- `/api/blog/*` & `/api/content/*` — Social posts and blog CMS
- `/api/voting/*` — Launch 2 voting campaigns, packages, nominations

---

## 7. Launch Phases
- **Launch 1 (Core Platform):**
  - Homepage & Event Discovery (Hero, Featured, Near You, Trending, Selling Fast, Categories, Organizers, Social Posts, Blog)
  - Free and paid ticketing (Paystack for paid; ₦0 instant checkout for free)
  - PassControl check-in with atomic verification
  - Orders, Find My Ticket, Attendee/Organizer/Admin Dashboards
  - Organizer verification workflow & AI automated event screening
  - Promoter/affiliate tracking, discounts, and waitlists
  - Wallet balances, payout workflows, and email/calendar notifications
- **Launch 2 (Expansion):**
  - Voting campaigns, vote packages (7% voting fee), nominee pages & nominations (5% commission)
  - Advanced PassControl: multi-gate, staff roles/permissions, offline mode, device sync
  - Personalized DP integration (`https://getdp.co/...`)

---

## 8. Agent Behavior & Planning
- **Mandatory PRD Review:** Whenever the user asks you to plan a feature or implementation, you MUST read the Product Requirements Document (PRD) located in the project root (`CirclePass_Product_Requirements_Developer_Handoff.pdf` or `.docx`) to gather requirements before writing the plan. Do not ask questions if the answers are already in the PRD.

