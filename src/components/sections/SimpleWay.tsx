import Link from 'next/link';

export function SimpleWay() {
  return (
    <section 
      className="relative py-24 px-4 text-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url("/circlepass_bg.png")' }}
    >
      {/* Light overlay with a very light primary color tint */}
      <div className="absolute inset-0 bg-background/85 z-0" />
      <div className="absolute inset-0 bg-primary/10 z-0" />
      
      <div className="container mx-auto max-w-3xl relative z-10 text-primary">
        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-balance text-foreground">
          The Simple Way to Experience Events
        </h2>
        <p className="text-xl mb-10 opacity-90 text-balance text-foreground">
          CirclePass makes it easy to discover events, get your pass and get in easily.
        </p>
        <Link href="/how-it-works" className="inline-block px-8 py-4 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:bg-primary/90 transition-all shadow-xl hover:scale-105">
          See how it works
        </Link>
      </div>
    </section>
  );
}
