"use client";

import React from "react";
import Link from "next/link";
import { ShoppingCart, ArrowRight, Trash2, Calendar, MapPin } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { cartItems, removeFromCart } = useCart();

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background py-16 px-4">
        <div className="max-w-2xl mx-auto text-center mt-12">
          <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-12 h-12" />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Your Cart is Empty
          </h1>
          
          <p className="text-muted-foreground mb-8 text-lg">
            Looks like you haven't added any events to your cart yet. Discover upcoming events and secure your tickets!
          </p>

          <Link 
            href="/events"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
          >
            Discover Events
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8 flex items-center gap-3">
          <ShoppingCart className="w-8 h-8 text-primary" />
          Your Cart
        </h1>

        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {cartItems.map((item) => (
              <div key={item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                
                {/* Event Image */}
                <div className="w-full sm:w-32 h-32 shrink-0 rounded-xl overflow-hidden bg-muted">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                </div>

                {/* Event Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2">
                    {item.title}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-primary" />
                      {item.date}
                    </span>
                    <span className="flex items-center gap-1.5 line-clamp-1">
                      <MapPin className="w-4 h-4 text-primary" />
                      {item.location}
                    </span>
                  </div>
                  
                  <p className="text-sm font-medium text-foreground">
                    Starting from: <span className="font-bold text-primary">{item.price}</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="w-full sm:w-auto flex sm:flex-col items-center justify-between gap-3 sm:items-end shrink-0 pt-4 sm:pt-0 border-t border-border sm:border-t-0">
                  <Link
                    href={`/events/${item.slug}/checkout`}
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors w-full sm:w-auto text-center shadow-sm"
                  >
                    Select Tickets
                  </Link>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="sm:hidden">Remove</span>
                  </button>
                </div>
                
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 p-6 bg-primary/5 rounded-2xl border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm flex-1 text-center sm:text-left">
            <strong>Note:</strong> CirclePass processes ticket orders per-event. Please proceed to the ticket selection page for each event to configure your tickets and complete your purchase.
          </p>
        </div>
      </div>
    </div>
  );
}
