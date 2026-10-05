"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";

export function WhatsAppWidget() {
  // Replace with the actual WhatsApp number/link
  const whatsappUrl = "https://wa.me/2349135512889";

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50">
      <Link 
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-lg hover:scale-110 transition-transform duration-300 group relative"
        aria-label="Chat with us on WhatsApp"
      >
        <MessageCircle className="w-8 h-8" />
        
        {/* Tooltip */}
        <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black/80 text-white text-xs font-medium rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          24/7 Support
        </span>
      </Link>
    </div>
  );
}
