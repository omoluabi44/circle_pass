import Link from "next/link";
import { Check } from "lucide-react";

export const metadata = {
  title: "Pricing | CirclePass",
  description: "Simple pricing. No surprises. Create and manage free events at no cost. For paid events, CirclePass charges a simple 5% service fee per paid ticket.",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 max-w-7xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold font-logo text-foreground mb-6">
          Simple pricing. No surprises.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-2">
          Create and manage free events at no cost.
        </p>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          For paid events, CirclePass charges a simple <span className="font-semibold text-foreground">5% service fee per paid ticket</span>.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 max-w-7xl mx-auto mb-20">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Tier */}
          <div className="bg-card text-card-foreground rounded-2xl p-8 border border-border shadow-sm flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Free Events</h2>
            <div className="mb-6">
              <span className="text-5xl font-bold font-logo text-primary">₦0</span>
              <span className="text-muted-foreground ml-2">Per ticket</span>
            </div>
            <p className="text-muted-foreground mb-8">
              Hosting a free event? You won't pay a CirclePass service fee. Create, publish, manage and check in attendees completely free.
            </p>

            <div className="flex-grow space-y-6">
              <div>
                <h3 className="font-semibold text-foreground mb-3">Event Types</h3>
                <ul className="space-y-3">
                  <li className="flex items-start"><Check className="h-5 w-5 text-success mr-2 shrink-0" /><span>Unlimited free events</span></li>
                  <li className="flex items-start"><Check className="h-5 w-5 text-success mr-2 shrink-0" /><span>Event discovery</span></li>
                  <li className="flex items-start"><Check className="h-5 w-5 text-success mr-2 shrink-0" /><span>Digital tickets</span></li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-3">Event Management</h3>
                <ul className="space-y-3">
                  <li className="flex items-start"><Check className="h-5 w-5 text-success mr-2 shrink-0" /><span>Event creation & publishing</span></li>
                  <li className="flex items-start"><Check className="h-5 w-5 text-success mr-2 shrink-0" /><span>Attendee management</span></li>
                  <li className="flex items-start"><Check className="h-5 w-5 text-success mr-2 shrink-0" /><span>QR-powered check-in</span></li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-3">Insights</h3>
                <ul className="space-y-3">
                  <li className="flex items-start"><Check className="h-5 w-5 text-success mr-2 shrink-0" /><span>Event analytics</span></li>
                </ul>
              </div>
            </div>

            <Link href="/organizer/events/create" className="mt-8 block w-full bg-secondary text-secondary-foreground text-center font-medium py-3 rounded-xl border border-border hover:bg-secondary/80 transition-colors">
              Create a Free Event
            </Link>
          </div>

          {/* Paid Tier */}
          <div className="bg-primary text-primary-foreground rounded-2xl p-8 shadow-lg flex flex-col relative overflow-hidden">
            <h2 className="text-2xl font-bold mb-4">Paid Events</h2>
            <div className="mb-6">
              <span className="text-5xl font-bold font-logo text-white">5%</span>
              <span className="text-primary-foreground/80 ml-2">Per paid ticket</span>
            </div>
            <p className="text-primary-foreground/90 mb-8">
              Sell tickets online and manage your event from setup to check-in, with a straightforward fee designed to keep your pricing simple.
            </p>

            <div className="flex-grow space-y-6">
              <div>
                <h3 className="font-semibold text-white mb-3">Selling Tickets</h3>
                <ul className="space-y-3">
                  <li className="flex items-start"><Check className="h-5 w-5 text-white mr-2 shrink-0" /><span>Multiple ticket types</span></li>
                  <li className="flex items-start"><Check className="h-5 w-5 text-white mr-2 shrink-0" /><span>Flexible ticket pricing</span></li>
                  <li className="flex items-start"><Check className="h-5 w-5 text-white mr-2 shrink-0" /><span>Card, bank transfer & USSD payments</span></li>
                  <li className="flex items-start"><Check className="h-5 w-5 text-white mr-2 shrink-0" /><span>Digital tickets & ticket wallet</span></li>
                  <li className="flex items-start"><Check className="h-5 w-5 text-white mr-2 shrink-0" /><span className="font-bold text-white">Instant payouts — no 24-hour wait</span></li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-3">Event Management</h3>
                <ul className="space-y-3">
                  <li className="flex items-start"><Check className="h-5 w-5 text-white mr-2 shrink-0" /><span>Event creation & publishing</span></li>
                  <li className="flex items-start"><Check className="h-5 w-5 text-white mr-2 shrink-0" /><span>Attendee management</span></li>
                  <li className="flex items-start"><Check className="h-5 w-5 text-white mr-2 shrink-0" /><span>Ticket inventory management</span></li>
                  <li className="flex items-start"><Check className="h-5 w-5 text-white mr-2 shrink-0" /><span>Announcements & automated emails</span></li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-3">Insights</h3>
                <ul className="space-y-3">
                  <li className="flex items-start"><Check className="h-5 w-5 text-white mr-2 shrink-0" /><span>Sales & revenue tracking</span></li>
                  <li className="flex items-start"><Check className="h-5 w-5 text-white mr-2 shrink-0" /><span>Event analytics</span></li>
                  <li className="flex items-start"><Check className="h-5 w-5 text-white mr-2 shrink-0" /><span>Check-in tracking</span></li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-3">Engagement</h3>
                <ul className="space-y-3">
                  <li className="flex items-start"><Check className="h-5 w-5 text-white mr-2 shrink-0" /><span>Smart waitlist</span></li>
                  <li className="flex items-start"><Check className="h-5 w-5 text-white mr-2 shrink-0" /><span>Event discovery</span></li>
                  <li className="flex items-start"><Check className="h-5 w-5 text-white mr-2 shrink-0" /><span>QR-powered check-in</span></li>
                </ul>
              </div>
            </div>

            <Link href="/organizer/events/create" className="mt-8 block w-full bg-white text-primary text-center font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors">
              Create Your Event
            </Link>
          </div>
        </div>
      </section>

      {/* Flexibility Section */}
      <section className="px-4 max-w-7xl mx-auto mb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold font-logo text-primary mb-4">You Choose Who Covers the Fee</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            CirclePass gives organizers flexibility over how the service fee is handled.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-card p-6 rounded-2xl border border-border">
            <h3 className="text-xl font-semibold mb-3">Organizer Pays</h3>
            <p className="text-muted-foreground">Absorb the <span className="font-medium text-foreground">5% CirclePass service fee</span> and keep the ticket price unchanged for your attendees.</p>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border">
            <h3 className="text-xl font-semibold mb-3">Attendee Pays</h3>
            <p className="text-muted-foreground">Pass the <span className="font-medium text-foreground">5% service fee</span> to the attendee during checkout.</p>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border">
            <h3 className="text-xl font-semibold mb-3">Get Paid Instantly</h3>
            <p className="text-muted-foreground">Access your available ticket revenue <span className="font-medium text-foreground">instantly after a successful ticket sale</span> — no 24-hour payout wait. Keep your cash flow moving while you focus on your event.</p>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border">
            <h3 className="text-xl font-semibold mb-3">Track & Analyse</h3>
            <p className="text-muted-foreground">Monitor sales, revenue, attendees and event activity with clear insights.</p>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border">
            <h3 className="text-xl font-semibold mb-3">Check In</h3>
            <p className="text-muted-foreground">Verify digital tickets with QR-powered check-in and keep track of attendance.</p>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border">
            <h3 className="text-xl font-semibold mb-3">Discover</h3>
            <p className="text-muted-foreground">Give your event an opportunity to be discovered by people looking for their next experience.</p>
          </div>
        </div>
      </section>

      {/* No Subscription Section */}
      <section className="bg-secondary/50 py-16 px-4 mb-20 border-y border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">No Monthly Subscription</h2>
          <p className="text-lg text-muted-foreground mb-4">
            There's no monthly subscription or setup fee to use CirclePass. You pay the CirclePass service fee when you sell paid tickets.
          </p>
          <p className="text-sm text-muted-foreground italic">
            Payment processing fees are inclusive.
          </p>
        </div>
      </section>

      {/* Custom Section */}
      <section className="px-4 max-w-7xl mx-auto">
        <div className="bg-card border border-border rounded-3xl p-8 md:p-12 max-w-5xl mx-auto flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            <h2 className="text-3xl font-bold font-logo text-primary mb-4">Need More for Your Event?</h2>
            <h3 className="text-xl font-medium mb-4">Let's build the right setup for you.</h3>
            <p className="text-muted-foreground mb-8">
              Some events need more than tickets. Whether you're planning a large-scale experience or need additional on-ground support, CirclePass can provide tailored solutions around your event.
            </p>

            <div className="mb-8">
              <h4 className="font-semibold text-foreground mb-3">Custom Event Support</h4>
              <ul className="space-y-2">
                <li className="flex items-center text-muted-foreground"><div className="w-1.5 h-1.5 rounded-full bg-primary mr-3"></div>Event wristbands & printing</li>
                <li className="flex items-center text-muted-foreground"><div className="w-1.5 h-1.5 rounded-full bg-primary mr-3"></div>On-site ticketing support</li>
                <li className="flex items-center text-muted-foreground"><div className="w-1.5 h-1.5 rounded-full bg-primary mr-3"></div>Custom event operations setup</li>
                <li className="flex items-center text-muted-foreground"><div className="w-1.5 h-1.5 rounded-full bg-primary mr-3"></div>Additional event support services</li>
              </ul>
            </div>
          </div>

          <div className="flex-1 bg-secondary rounded-2xl p-8 w-full">
            <h3 className="text-xl font-semibold mb-3">Tailored to Your Event</h3>
            <p className="text-muted-foreground mb-8">
              Tell us what you're planning, what you need, and the scale of your event. We'll work with you on the right solution and provide a tailored quote.
            </p>
            <a href="https://wa.me/2349135512889" target="_blank" rel="noopener noreferrer" className="block w-full bg-primary text-primary-foreground text-center font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors">
              Talk to Us
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
