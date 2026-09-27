"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Tawk_API?: Record<string, unknown>;
    Tawk_LoadStart?: Date;
  }
}

export function TawkChat() {
  useEffect(() => {
    // Tawk.to integration — replace the placeholder IDs with your actual Tawk.to property ID and widget ID
    // Get these from: https://dashboard.tawk.to → Administration → Channels → Chat Widget
    const TAWK_PROPERTY_ID = "YOUR_PROPERTY_ID"; // e.g., "6123456789abcdef01234567"
    const TAWK_WIDGET_ID = "default"; // Usually "default" or "1abc2def3"

    if (TAWK_PROPERTY_ID === "YOUR_PROPERTY_ID") {
      // Don't load Tawk.to if no property ID is configured yet
      return;
    }

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://embed.tawk.to/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount
      try {
        document.head.removeChild(script);
      } catch {
        // Script may have already been removed
      }
    };
  }, []);

  return null; // Tawk.to renders its own widget
}
