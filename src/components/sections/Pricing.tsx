import { CheckSquare } from 'lucide-react';
import Link from 'next/link';

export function Pricing() {
  const features = [
    "Free events are free",
    "Ticketed events are 5%",
    "Instant payout to your account",
    "No monthly subscription & set up fee",
    "Additional services are purchased separately"
  ];

  return (
    <section 
      className="relative py-24 px-4 bg-cover bg-center bg-no-repeat" 
      id="pricing"
      style={{ backgroundImage: 'url("/pricing_section.JPG")' }}
    >
      <div className="container mx-auto max-w-4xl text-center relative z-10">
        
        {/* Tag */}
        <div className="inline-block border-2 border-primary text-primary font-bold px-6 py-2 rounded-lg mb-8 tracking-wider uppercase">
          Pricing
        </div>
        
        {/* Header */}
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-16 tracking-tight">
          Simple pricing, No hidden fees.
        </h2>
        
        {/* Content Card */}
        <div className="max-w-xl mx-auto bg-card border border-border/50 rounded-3xl p-8 md:p-12 shadow-sm text-left">
          <ul className="space-y-6 mb-12">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-4 text-lg md:text-xl font-medium text-foreground">
                <CheckSquare className="w-6 h-6 md:w-7 md:h-7 text-primary shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          
          <div className="text-center pt-6 border-t border-border/50">
            <Link 
              href="/pricing" 
              className="inline-flex items-center justify-center bg-transparent border-2 border-primary text-primary font-bold py-3.5 px-8 rounded-xl hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm text-lg w-full md:w-auto"
            >
              See detailed Pricing
            </Link>
          </div>
        </div>
        
      </div>
    </section>
  );
}
