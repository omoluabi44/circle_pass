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
  title: "CirclePass | Your Pass to the Next Experience",
  description: "Discover events, activate e-voting, get your digital pass & show up for experiences that matter. Event ticketing, management, and check-in platform.",
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
    <html lang="en" suppressHydrationWarning className={`${roboto.variable} ${fredoka.variable} font-sans text-foreground bg-background flex flex-col min-h-screen`}>
      <body className="flex flex-col min-h-screen">
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
