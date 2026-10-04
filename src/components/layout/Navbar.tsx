"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { Menu, X, ShoppingCart } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useCart } from '@/context/CartContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileVotingOpen, setIsMobileVotingOpen] = useState(false);
  const { cartItemsCount } = useCart();
  const { data: session, status } = useSession();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/events', label: 'Events' },
    { href: '#voting', label: 'Voting' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/about', label: 'About Us' },
  ];

  return (
    <header className="fixed top-0 z-50 w-full px-3 pt-3">
      <div className="mx-auto flex items-center justify-between px-5 py-3 max-w-7xl rounded-2xl bg-background/80 backdrop-blur-md border border-border/60 shadow-sm relative">

        {/* Logo */}
        <div className="flex items-center">
          <Logo />
        </div>

        {/* Desktop Links (Centered) */}
        <nav className="hidden md:flex gap-1 absolute left-1/2 -translate-x-1/2">
          {navLinks.map((link) => (
            link.label === 'Voting' ? (
              <div key={link.label} className="relative group">
                <button className="text-sm font-medium px-4 py-2 rounded-lg hover:bg-muted/80 transition-colors text-foreground hover:text-primary flex items-center gap-1">
                  {link.label}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className="absolute top-full left-0 mt-2 w-48 bg-background border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <Link href="/coming-soon" className="block px-4 py-3 text-sm text-foreground hover:bg-secondary hover:text-primary rounded-t-xl transition-colors border-b border-border">
                    Voting
                  </Link>
                  <Link href="/coming-soon" className="block px-4 py-3 text-sm text-foreground hover:bg-secondary hover:text-primary rounded-b-xl transition-colors">
                    Nominations
                  </Link>
                </div>
              </div>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium px-4 py-2 rounded-lg hover:bg-muted/80 transition-colors text-foreground hover:text-primary"
              >
                {link.label}
              </Link>
            )
          ))}
        </nav>

        {/* CTAs and Mobile Menu Toggle */}
        <div className="flex items-center gap-1 sm:gap-3">
          
          <ThemeToggle />
          
          {/* Cart Icon */}
          <Link href="/cart" className="relative p-2 text-foreground hover:bg-muted rounded-full transition-colors flex items-center justify-center">
            <ShoppingCart className="w-5 h-5" />
            {cartItemsCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex items-center justify-center w-4 h-4 bg-primary text-[10px] font-bold text-white rounded-full ring-2 ring-background">
                {cartItemsCount}
              </span>
            )}
          </Link>

          {status === 'authenticated' ? (
            <>
              <Link href={session?.user?.role === 'ADMIN' ? '/admin' : session?.user?.role === 'ORGANIZER' ? '/organizer' : '/dashboard'} className="hidden sm:inline-flex text-sm font-medium px-5 py-2.5 rounded-full border border-border hover:border-primary/50 hover:bg-secondary transition-all text-foreground shadow-sm">
                Dashboard
              </Link>
            </>
          ) : (
            <Link href="/login" className="hidden sm:inline-flex text-sm font-medium px-5 py-2.5 rounded-full border border-border hover:border-primary/50 hover:bg-secondary transition-all text-foreground shadow-sm">
              Login
            </Link>
          )}

          {status === 'authenticated' && (session?.user as any)?.role !== 'ADMIN' && (
            <Link href="/organizer/events/create" className="hidden sm:inline-flex text-sm font-medium bg-primary text-primary-foreground px-5 py-2.5 rounded-full hover:bg-primary/90 transition-all shadow-md hover:shadow-lg">
              Create Event
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors ml-1"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden mx-3 mt-2 p-4 rounded-2xl bg-background shadow-lg border border-border">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              link.label === 'Voting' ? (
                <div key={link.label} className="flex flex-col border-b border-border">
                  <button 
                    onClick={() => setIsMobileVotingOpen(!isMobileVotingOpen)}
                    className="flex items-center justify-between w-full text-base font-medium px-2 py-4 text-foreground hover:text-primary transition-colors"
                  >
                    <span>{link.label}</span>
                    <svg 
                      className={`w-4 h-4 text-primary transition-transform duration-200 ${isMobileVotingOpen ? 'rotate-180' : ''}`} 
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Dropdown Items */}
                  {isMobileVotingOpen && (
                    <div className="flex flex-col bg-secondary/20 rounded-xl mb-3 overflow-hidden">
                      <Link
                        href="/coming-soon"
                        className="text-sm font-medium px-6 py-3.5 border-b border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Voting
                      </Link>
                      <Link
                        href="/coming-soon"
                        className="text-sm font-medium px-6 py-3.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Nominations
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-base font-medium px-2 py-4 border-b border-border text-foreground hover:text-primary transition-colors block"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              )
            ))}
            <div className="h-px bg-muted my-2" />

            {status === 'authenticated' ? (
              <>
                <Link
                  href={session?.user?.role === 'ADMIN' ? '/admin' : session?.user?.role === 'ORGANIZER' ? '/organizer' : '/dashboard'}
                  className="sm:hidden text-base font-medium px-4 py-3 rounded-lg hover:bg-secondary text-foreground"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="sm:hidden text-base font-medium px-4 py-3 rounded-lg hover:bg-secondary text-foreground"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="sm:hidden text-base font-medium px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 mt-2 text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}

          </nav>
        </div>
      )}
    </header>
  );
}
