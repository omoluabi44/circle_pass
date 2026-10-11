import type { Metadata } from "next";
import { Fredoka, Roboto } from "next/font/google";
import "./globals.css";
import StyledComponentsRegistry from "@/lib/registry";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://thecirclepass.com"),
  title: {
    default: "CirclePass | Your Pass to the Next Experience",
    template: "%s | CirclePass",
  },
  description: "Discover events, activate e-voting, get your digital pass & show up for experiences that matter. Event ticketing, management, and check-in platform.",
  openGraph: {
    title: "CirclePass | Your Pass to the Next Experience",
    description: "Discover events, activate e-voting, get your digital pass & show up for experiences that matter. Event ticketing, management, and check-in platform.",
    url: "https://thecirclepass.com",
    siteName: "CirclePass",
    images: [
      {
        url: "/preview.jpeg",
        width: 1200,
        height: 630,
        alt: "CirclePass - Your Pass to the Next Experience",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CirclePass | Your Pass to the Next Experience",
    description: "Discover events, activate e-voting, get your digital pass & show up for experiences that matter.",
    images: ["/preview.jpeg"],
  },
};

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { LayoutRouter } from "@/components/layout/LayoutRouter";
import { Toaster } from "react-hot-toast";
import { WhatsAppWidget } from "@/components/ui/WhatsAppWidget";
import { TawkChat } from "@/components/providers/TawkChat";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${roboto.variable} ${fredoka.variable} font-sans text-foreground bg-background flex flex-col min-h-screen overflow-x-hidden relative`}>
      <body className="flex flex-col min-h-screen overflow-x-hidden relative">
        <StyledComponentsRegistry>
          <AuthProvider>
            <CartProvider>
              <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                <LayoutRouter>
                  {children}
                </LayoutRouter>
                <TawkChat />
                <WhatsAppWidget />
                <Toaster position="top-center" />
              </ThemeProvider>
            </CartProvider>
          </AuthProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}


