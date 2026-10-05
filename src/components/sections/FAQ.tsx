"use client";

import { useState } from "react";
import { Plus, Minus, MessageCircle } from "lucide-react";
import Link from "next/link";

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "What is CirclePass?",
      a: "CirclePass is an event ticketing and management platform that helps organizers create, sell, manage, and deliver better event experiences."
    },
    {
      q: "Can organizers sell tickets on CirclePass?",
      a: "Yes. Organizers can create event pages, set ticket types and pricing, publish events, track sales, manage attendees, and communicate with guests."
    },
    {
      q: "How do attendees get their tickets?",
      a: "After completing a booking, attendees receive a digital ticket that they can access and present at the event."
    },
    {
      q: "What payment methods are supported?",
      a: "CirclePass supports card payments, bank transfers, and USSD through Paystack, where available."
    },
    {
      q: "How does event check-in work?",
      a: "Attendees present their digital QR tickets, which organizers can scan to verify tickets and manage entry."
    },
    {
      q: "How much does CirclePass charge?",
      a: "CirclePass applies a service fee to paid ticket transactions. Depending on the organisers settings, the fee may be absorbed by the organiser or passed on to the buyer. Payment processing charges are inclusive."
    }
  ];

  return (
    <section className="py-24 px-4 bg-secondary" id="faq">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground font-medium">
            Everything you need to know about the product and billing.
          </p>
        </div>

        <div className="space-y-4 mb-16">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className={`border border-border/60 rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'bg-card shadow-sm border-primary/20' : 'bg-transparent hover:bg-card/50'}`}
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between focus:outline-none gap-4"
                >
                  <span className={`font-bold text-[17px] transition-colors ${isOpen ? 'text-primary' : 'text-foreground'}`}>
                    {faq.q}
                  </span>
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </button>
                <div
                  className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-40 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <p className="text-muted-foreground leading-relaxed text-[15px] max-w-2xl pr-4">
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-primary/5 rounded-3xl p-8 md:p-10 text-center border border-primary/10 flex flex-col items-center">
          <MessageCircle className="w-12 h-12 text-primary mb-5" />
          <h3 className="text-xl font-bold text-foreground mb-2">Further questions?</h3>
          <p className="text-muted-foreground mb-8">We're here to help you get the most out of CirclePass.</p>
          <Link
            href="https://wa.me/2349135512889"
            target="_blank"
            className="inline-flex items-center justify-center bg-[#25D366] text-white font-extrabold py-3.5 px-8 rounded-xl hover:bg-[#1EBE5A] transition-colors shadow-sm w-full sm:w-auto"
          >
            Contact on WhatsApp
          </Link>
        </div>
      </div>
    </section>
  );
}
