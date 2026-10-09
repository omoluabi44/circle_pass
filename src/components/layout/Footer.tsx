import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { Music2 } from 'lucide-react';
import { FooterNewsletter } from '@/components/layout/FooterNewsletter';


const InstagramIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export function Footer() {
  return (
    <footer 
      className="relative border-t py-12 mt-20 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url("/circlepass_bg.png")' }}
    >
      {/* Light overlay with a very light primary color tint */}
      <div className="absolute inset-0 bg-background/90 z-0" />
      <div className="absolute inset-0 bg-primary/10 z-0" />

      <div className="relative z-10">
        <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-6">
          
          <div className="lg:col-span-6 flex flex-col lg:flex-row gap-4 lg:gap-6">
            <div className="lg:w-1/2 space-y-0 lg:space-y-4 pr-0 lg:pr-4">
              <Logo className="flex items-center space-x-2" />
              <p className="text-muted-foreground text-sm max-w-xs hidden lg:block mt-4">
                Your Pass to the next experience. Discover events, activate Voting, get your digital pass & show up for experiences that matter.
              </p>
            </div>
            
            <div className="lg:w-1/2 flex flex-col gap-4 mt-2 lg:mt-0">
              <FooterNewsletter />
              <div className="flex gap-4">
                <Link href="https://www.instagram.com/circle.pass?stkn=MW1kMzhucnZ5enN1aQ==" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 font-medium">
                  <InstagramIcon className="w-4 h-4" /> Instagram
                </Link>
                <Link href="https://www.tiktok.com/@circle.pass?_r=1&_t=ZS-99xQ4N6hnPO" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 font-medium">
                  <Music2 className="w-4 h-4" /> TikTok
                </Link>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-6 grid grid-cols-3 gap-2 sm:gap-4 md:gap-8 mt-4 lg:mt-0">
            <div className="space-y-3 md:space-y-4">
              <h4 className="font-semibold text-[13px] sm:text-base md:text-lg text-foreground">Explore</h4>
              <ul className="space-y-2 text-[11px] sm:text-xs md:text-sm text-muted-foreground">
                <li><Link href="/events" className="hover:text-primary transition-colors">Browse events</Link></li>
                <li><Link href="/coming-soon" className="hover:text-primary transition-colors">Voting</Link></li>
                <li><Link href="/coming-soon" className="hover:text-primary transition-colors">Nominations</Link></li>
                <li><Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                <li><Link href="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
              </ul>
            </div>

            <div className="space-y-3 md:space-y-4">
              <h4 className="font-semibold text-[13px] sm:text-base md:text-lg text-foreground">Organisers</h4>
              <ul className="space-y-2 text-[11px] sm:text-xs md:text-sm text-muted-foreground">
                <li><Link href="/organizer" className="hover:text-primary transition-colors">For organisers</Link></li>
                <li><Link href="/organizer/events/create" className="hover:text-primary transition-colors">Create event</Link></li>
              </ul>
            </div>

            <div className="space-y-3 md:space-y-4">
              <h4 className="font-semibold text-[13px] sm:text-base md:text-lg text-foreground">Company</h4>
              <ul className="space-y-2 text-[11px] sm:text-xs md:text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-primary transition-colors">About</Link></li>
                <li><Link href="/how-it-works" className="hover:text-primary transition-colors">How it works</Link></li>
                <li><Link href="/#faq" className="hover:text-primary transition-colors">FAQ</Link></li>
                <li><Link href="/about" className="hover:text-primary transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-black/10 text-sm text-muted-foreground text-center flex flex-col md:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} CirclePass. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-primary transition-colors">Legal Terms</Link>
            <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
