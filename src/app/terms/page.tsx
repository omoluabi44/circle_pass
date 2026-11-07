import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | CirclePass",
  description:
    "The terms that govern your use of CirclePass — accounts, tickets, payments, organisers, privacy and liability.",
};

const CONTACT_EMAIL = "officialCirclepass@circlepass.gmail.com";

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">
        {title}
      </h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-background text-foreground pb-24">
      <div className="mx-auto max-w-3xl px-4 pt-28">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to CirclePass
        </Link>

        <header className="mt-8 mb-12">
          <span className="inline-block px-5 py-1.5 border border-border rounded-full text-xs font-bold tracking-widest text-muted-foreground uppercase">
            Legal
          </span>
          <h1 className="mt-6 text-3xl md:text-5xl font-extrabold tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last Updated: October 2026
          </p>
        </header>

        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 mb-12">
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Welcome to CirclePass, an event discovery, ticketing, and management
            platform operated by <strong className="text-foreground">BIG CIRCLE BG</strong>,
            a business registered in Nigeria. By accessing or using CirclePass,
            you agree to these Terms of Service.
          </p>
        </div>

        <div className="space-y-12">
          <Section title="Accounts and Eligibility">
            <p>
              Users must provide accurate information and keep their account
              details secure. Attendees may use CirclePass subject to applicable
              laws and event-specific age restrictions. Users under 18 must
              obtain any legally required parental or guardian consent.
              Organisers and payout recipients must be at least 18 and meet our
              verification requirements.
            </p>
            <p>
              Fraud, fake tickets, unauthorised transactions, and attempts to
              compromise the platform are prohibited.
            </p>
          </Section>

          <Section title="Events and Organisers">
            <p>
              CirclePass enables users to discover events, purchase tickets,
              access digital passes, and receive event updates. Organisers are
              responsible for accurate event information, necessary permissions,
              event delivery, entry conditions, and communicating cancellations
              or changes.
            </p>
            <p>
              CirclePass provides the platform but does not guarantee the
              delivery or quality of events organised by third parties.
            </p>
          </Section>

          <Section title="Tickets, Payments and Fees">
            <p>
              Ticket prices and applicable charges will be displayed before
              checkout. CirclePass charges a 5% platform service fee on eligible
              ticket transactions. Depending on the event&apos;s arrangement, the
              organiser or attendee pays this fee, with any attendee charge
              disclosed before payment.
            </p>
            <p>
              Purchases are confirmed only after successful payment and ticket
              or purchase confirmation. Organiser payouts are subject to
              verification, applicable fees, refunds, reversals, disputes, and
              payment processing. We may review or delay payouts where
              reasonably necessary for security, verification, dispute
              resolution, or legal compliance.
            </p>
          </Section>

          <Section title="Cancellations and Refunds">
            <p>
              Cancellations, postponements, rescheduling, and refund requests
              are governed by the applicable event policy and relevant laws.
              Organisers are responsible for communicating event changes and
              fulfilling their obligations to ticket holders. Refunds are
              subject to the applicable policy and legal requirements.
            </p>
          </Section>

          <Section
            id="privacy"
            title="Tickets, Privacy and Intellectual Property"
          >
            <p>
              Users must keep digital tickets secure and comply with the stated
              entry conditions. Invalid, duplicated, cancelled, or refunded
              tickets may be rejected.
            </p>
            <p>
              CirclePass&apos;s branding, software, and platform materials belong
              to BIG CIRCLE BG or their respective owners. Users retain
              ownership of content they submit but grant CirclePass permission
              to use it as reasonably necessary to operate and promote the
              platform and relevant events.
            </p>
            <p>
              We collect and share personal information as necessary to provide
              ticketing and event services, support organisers, process
              payments, and meet legal obligations. Relevant attendee
              information may be shared with event organisers. Our data
              practices and applicable user rights under relevant data
              protection laws apply to how we handle personal information.
            </p>
          </Section>

          <Section title="Liability, Disputes and Contact">
            <p>
              We may restrict access to CirclePass for breaches of these Terms,
              suspected fraud, security concerns, or legal requirements. We aim
              to maintain a reliable service but cannot guarantee uninterrupted
              access. To the extent permitted by law, we are not responsible for
              an independent organiser&apos;s failure to deliver an event or for
              third-party actions. Liability that cannot legally be excluded
              remains unaffected.
            </p>
            <p>
              These Terms are governed by the laws of the Federal Republic of
              Nigeria. Disputes should first be addressed through good-faith
              communication, without limiting either party&apos;s legal rights.
            </p>
            <p>
              We may update these Terms when necessary and publish the revised
              version on our website.
            </p>
          </Section>
        </div>

        <section className="mt-14 rounded-2xl border border-border bg-card p-6 md:p-8">
          <h2 className="text-xl font-bold text-foreground mb-3">
            Contact CirclePass
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-[15px]">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2 text-primary hover:underline break-all"
            >
              <Mail className="w-4 h-4 shrink-0" />
              {CONTACT_EMAIL}
            </a>
            <a
              href="https://thecirclepass.com"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              https://thecirclepass.com
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            CirclePass is operated by BIG CIRCLE BG, a business registered in
            Nigeria.
          </p>
        </section>
      </div>
    </main>
  );
}
