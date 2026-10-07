import Link from "next/link";
import { Mail } from "lucide-react";
import Image from "next/image";
import { InstagramIcon } from "@/components/ui/InstagramIcon";

export default function AboutUsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground pb-20">

      {/* Header */}
      <header className="pt-24 pb-8 text-center px-4">
        <h1 className="inline-block px-8 py-2 border border-border rounded-full text-sm font-bold tracking-widest text-muted-foreground uppercase">
          About Us
        </h1>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center py-16">
        <div className="space-y-6">
          <h2 className="text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight">
            The ticket is only <br />
            the beginning.
          </h2>
          <p className="text-xl text-muted-foreground max-w-lg">
            Events are more than a ticket. They're the people, the places, the energy, and the moments that stay with you.
          </p>
        </div>

        {/* Mockup / Graphic side */}
        <div className="bg-secondary/30 border border-border rounded-3xl p-8 lg:p-12 aspect-square md:aspect-auto md:h-[500px] flex flex-col justify-center items-center text-center relative overflow-hidden group">
          <div className="absolute -left-6 top-10 rotate-[-12deg] w-40 h-56 bg-background rounded-xl border border-border shadow-2xl flex items-center justify-center p-4 transition-transform duration-500 group-hover:rotate-[-5deg]">
            <span className="text-sm font-bold text-muted-foreground">Site Mockup</span>
          </div>

          <div className="z-10 ml-auto mr-4 space-y-6 text-right">
            <ul className="space-y-4 text-lg font-semibold text-foreground">
              <li className="flex items-center justify-end gap-3">
                Create your event
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">1</div>
              </li>
              <li className="flex items-center justify-end gap-3">
                Publish your event
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">2</div>
              </li>
              <li className="flex items-center justify-end gap-3">
                Sell your tickets
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">3</div>
              </li>
            </ul>
            <div className="text-primary font-black text-xl italic mt-6">
              3 easy steps
            </div>
          </div>
        </div>
      </section>

      {/* Why CirclePass */}
      <section className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center py-24 border-t border-border/50">
        <div className="bg-secondary/30 rounded-3xl aspect-[4/3] flex items-center justify-center border border-border overflow-hidden relative">
          <Image
            src="/image-folders/why circlepass.PNG"
            alt="Event crowd"
            fill
            className="object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <div className="space-y-8 pl-0 md:pl-8">
          <h3 className="text-4xl font-extrabold tracking-tight">Why CirclePass?</h3>
          <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground text-xl">Because getting to an experience shouldn't be complicated.</p>
            <p>
              Organizers have a lot to manage — tickets, attendees, payments, communication, and check-in.
            </p>
            <p>
              Attendees have their own journey — finding something worth going to, securing a ticket, keeping track of their pass, and getting through the door.
            </p>
            <p>
              We believe these pieces should work better together.
            </p>
            <p className="font-bold text-foreground mt-6 text-xl">
              So we're bringing more of the event journey into one place.
            </p>
          </div>
        </div>
      </section>

      {/* What we believe */}
      <section className="max-w-7xl mx-auto px-4 py-24 border-t border-border/50 text-center">
        <h3 className="text-3xl font-extrabold tracking-tight mb-16">WHAT WE BELIEVE</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-background border border-border hover:border-primary/50 transition-colors rounded-2xl aspect-square flex flex-col p-8 text-left group shadow-sm">
            <h4 className="font-bold text-xl mb-4 group-hover:text-primary transition-colors">Experience First</h4>
            <p className="text-muted-foreground text-sm">The ticket is part of the journey, not the whole journey. Everything we build starts with the experience.</p>
          </div>
          <div className="bg-background border border-border hover:border-primary/50 transition-colors rounded-2xl aspect-square flex flex-col p-8 text-left group shadow-sm">
            <h4 className="font-bold text-xl mb-4 group-hover:text-primary transition-colors">Simple by Design</h4>
            <p className="text-muted-foreground text-sm">The important things shouldn't feel complicated. From creating an event to getting through the door, we keep the journey clear.</p>
          </div>
          <div className="bg-background border border-border hover:border-primary/50 transition-colors rounded-2xl aspect-square flex flex-col p-8 text-left group shadow-sm">
            <h4 className="font-bold text-xl mb-4 group-hover:text-primary transition-colors">Built for Both Sides</h4>
            <p className="text-muted-foreground text-sm">Great events need great organizers and great experiences for attendees. We build with both in mind.</p>
          </div>
          <div className="bg-background border border-border hover:border-primary/50 transition-colors rounded-2xl aspect-square flex flex-col p-8 text-left group shadow-sm">
            <h4 className="font-bold text-xl mb-4 group-hover:text-primary transition-colors">Always Evolving</h4>
            <p className="text-muted-foreground text-sm">We listen, learn, improve, and keep building around what people actually need.</p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="w-full bg-cover bg-center bg-no-repeat relative py-24 px-4" style={{ backgroundImage: "url(\'/your_next_experience_section_in_about_us.PNG\')" }}>
        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
        <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight">YOUR NEXT EXPERIENCE IS WAITING.</h3>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Whether you're creating something worth showing up for or looking for what's next, CirclePass brings you closer to the experience.
        </p>
        <p className="font-bold text-2xl">Find it. Create it. Be part of it.</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link
            href="/events"
            className="w-full sm:w-auto px-10 py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors text-lg"
          >
            Explore Events
          </Link>
          <Link
            href="/organizer/events/create"
            className="w-full sm:w-auto px-10 py-4 bg-background text-foreground border-2 border-border font-bold rounded-xl hover:bg-secondary hover:border-foreground transition-colors text-lg"
          >
            Create an Event
          </Link>
        </div>
      </section>

      {/* Footer / Contact */}
      <section className="max-w-5xl mx-auto px-4 py-16 border-t border-border/50">
        <div className="text-center space-y-2 mb-12">
          <h4 className="font-bold text-2xl">Contact / ways to reach us.</h4>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <a href="mailto:hello@circlepass.co" className="bg-background border border-border rounded-2xl py-10 flex flex-col items-center justify-center gap-4 hover:border-primary transition-all hover:-translate-y-1 hover:shadow-md group">
            <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Mail className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm">Email Us</span>
          </a>

          <a href="https://wa.me/2349135512889" target="_blank" rel="noopener noreferrer" className="bg-background border border-border rounded-2xl py-10 flex flex-col items-center justify-center gap-4 hover:border-[#25D366] transition-all hover:-translate-y-1 hover:shadow-md group">
            <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center group-hover:bg-[#25D366] group-hover:text-white transition-colors">
              {/* WhatsApp Icon SVG */}
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
            </div>
            <span className="font-bold text-sm">WhatsApp</span>
          </a>

          <a href="https://instagram.com/circle.pass" target="_blank" rel="noopener noreferrer" className="bg-background border border-border rounded-2xl py-10 flex flex-col items-center justify-center gap-4 hover:border-[#E1306C] transition-all hover:-translate-y-1 hover:shadow-md group">
            <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center group-hover:bg-[#E1306C] group-hover:text-white transition-colors">
              <InstagramIcon className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm">Instagram</span>
          </a>

          <a href="https://tiktok.com/@circle.pass" target="_blank" rel="noopener noreferrer" className="bg-background border border-border rounded-2xl py-10 flex flex-col items-center justify-center gap-4 hover:border-foreground transition-all hover:-translate-y-1 hover:shadow-md group">
            <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-colors">
              {/* TikTok Icon SVG */}
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.04.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.78-1.15 5.54-3.33 7.32-1.95 1.61-4.74 2.34-7.28 1.93-2.71-.43-5.22-2.12-6.52-4.57-1.1-2.1-1.22-4.67-.47-6.87.69-2.02 2.3-3.66 4.31-4.48 1.95-.79 4.22-.88 6.22-.32v4.13c-1.32-.42-2.88-.41-4.08.31-1.26.75-1.92 2.21-1.74 3.65.17 1.34 1.08 2.5 2.31 3.03 1.33.56 2.95.42 4.13-.39 1.18-.81 1.91-2.22 1.94-3.67.04-3.13.01-6.27.02-9.4.01-4.25.01-8.5.01-12.75l.02-.02Z" /></svg>
            </div>
            <span className="font-bold text-sm">TikTok</span>
          </a>
        </div>
      </section>

    </main>
  );
}
