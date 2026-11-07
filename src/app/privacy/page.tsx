import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | CirclePass",
  description:
    "How BIG CIRCLE BG (operating as CirclePass) collects, uses, protects, and retains your personal information.",
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

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last Updated: October 2026
          </p>
        </header>

        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 mb-12">
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            CirclePass respects your privacy and is committed to protecting your
            personal information. This policy explains how{" "}
            <strong className="text-foreground">BIG CIRCLE BG</strong>,
            operating as CirclePass, collects, uses, and protects information
            when you use our website and services.
          </p>
        </div>

        <div className="space-y-12">
          <Section title="Information We Collect">
            <p>
              We may collect your name, email address, phone number, account
              details, ticket purchases, event activity, payment references, and
              payment status. We may also collect verification documents from
              organisers, information you provide when contacting support, and
              device or usage information where applicable.
            </p>
          </Section>

          <Section title="How We Use and Share Information">
            <p>
              We use your information to manage accounts, process ticket
              purchases and payments, issue digital tickets, support QR
              check-in through PassControl, help organisers manage events,
              provide customer support, improve security, prevent fraud, and
              meet legal obligations.
            </p>
            <p>
              We may share relevant information with event organisers, payment
              processors, technology providers, and authorities where required
              or permitted by law. Organisers may receive attendee information
              needed to manage their events and must handle it responsibly.
            </p>
            <p className="font-semibold text-foreground">
              We do not sell your personal information.
            </p>
          </Section>

          <Section title="Cookies, Security and Data Retention">
            <p>
              We may use cookies and similar technologies to maintain sessions,
              remember preferences, support security, and improve our services.
              You can manage cookies through your browser settings.
            </p>
            <p>
              We use reasonable measures to protect personal information and
              retain it only for as long as reasonably necessary to provide our
              services, meet legal obligations, maintain records, and resolve
              disputes. However, no system can be guaranteed completely secure.
            </p>
          </Section>

          <Section title="Your Privacy Rights and Third-Party Services">
            <p>
              Subject to applicable law, you may request access to, correction
              of, or deletion of your personal information. You may also have
              rights to withdraw consent, object to certain processing, or
              request a copy of your information. We may verify your identity
              before handling a request.
            </p>
            <p>
              Third-party services linked to or integrated with CirclePass may
              have their own privacy policies. Where service providers process
              information outside Nigeria, we take appropriate steps to protect
              it in accordance with applicable requirements.
            </p>
            <p>
              Our handling of personal information is subject to applicable data
              protection laws, including the Nigeria Data Protection Act 2023
              where applicable.
            </p>
          </Section>

          <Section title="Children, Updates and Contact">
            <p>
              Users must meet the age requirements stated in our Terms of
              Service. Organisers and payout recipients must be at least 18 years
              old, and individual events may have additional age restrictions.
            </p>
            <p>
              We may update this policy when our services or legal obligations
              change. Revised versions will be published on our website.
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
            Operated by BIG CIRCLE BG, a business registered in Nigeria.
          </p>
        </section>
      </div>
    </main>
  );
}
