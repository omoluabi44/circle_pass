"use client";

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

export function Hero() {
  const [activeVideo, setActiveVideo] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    // When activeVideo changes, play the corresponding video and pause the other
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === activeVideo) {
          video.play().catch(e => console.error("Video play failed:", e));
        } else {
          // Keep the previous video paused at the end or reset it
          setTimeout(() => {
            if (videoRefs.current[index]) {
              videoRefs.current[index]!.pause();
              videoRefs.current[index]!.currentTime = 0;
            }
          }, 1000); // wait for crossfade transition before resetting
        }
      }
    });
  }, [activeVideo]);

  const handleVideoEnd = () => {
    setActiveVideo((prev) => (prev === 0 ? 1 : 0));
  };

  return (
    <section className="relative py-20 md:py-32 lg:py-48 text-center px-4 overflow-hidden min-h-[80vh] flex items-center justify-center mt-[-80px] pt-[80px]">
      {/* Background Videos */}
      <div className="absolute inset-0 z-0 bg-black">
        <div className="absolute inset-0 bg-black/60 z-10" /> {/* Overlay to make text readable */}
        <video
          ref={(el) => { videoRefs.current[0] = el; }}
          src="/video1.mp4"
          poster="/hero_event_pass.jpg"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
            activeVideo === 0 ? 'opacity-100' : 'opacity-0'
          }`}
          muted
          playsInline
          loop={false}
          onEnded={handleVideoEnd}
        />
        <video
          ref={(el) => { videoRefs.current[1] = el; }}
          src="/video2.mp4"
          poster="/hero_event_pass.jpg"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
            activeVideo === 1 ? 'opacity-100' : 'opacity-0'
          }`}
          muted
          playsInline
          loop={false}
          onEnded={handleVideoEnd}
        />
      </div>

      <div className="container mx-auto max-w-4xl relative z-20">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-balance text-primary-foreground drop-shadow-sm">
          Your Pass to the <span className="text-primary drop-shadow-md">Next Experience.</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto text-balance drop-shadow">
          Discover events, activate e-voting, get your digital pass & show up for experiences that matter.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="#events" className="px-8 py-4 bg-primary text-primary-foreground rounded-full font-medium text-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
            Explore Events
          </Link>
          <Link href="/organizer/events/create" className="px-8 py-4 bg-white/10 backdrop-blur-sm text-primary-foreground border border-primary-foreground/30 rounded-full font-medium text-lg hover:bg-white/20 transition-colors shadow-lg">
            Create Event
          </Link>
        </div>
      </div>
    </section>
  );
}
