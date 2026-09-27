"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useAnimation, useInView } from "framer-motion";
import { Calendar, MapPin, Ticket, Star, Sparkles } from "lucide-react";

export function InteractiveExperience() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Calculate mouse position relative to the center of the container
      const x = (e.clientX - rect.left - rect.width / 2) / 25;
      const y = (e.clientY - rect.top - rect.height / 2) / 25;
      
      setMousePosition({ x, y });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="hidden lg:flex w-1/2 relative bg-secondary/20 overflow-hidden items-center justify-center border-r border-border/50"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--primary)_0%,transparent_70%)] opacity-[0.03]" />
      
      {/* Central Identity - The 'C' */}
      <motion.div 
        animate={{ 
          x: mousePosition.x * 0.5, 
          y: mousePosition.y * 0.5,
        }}
        transition={{ type: "spring", stiffness: 150, damping: 15 }}
        className="relative z-20 w-48 h-48 rounded-full border-[16px] border-primary flex items-center justify-center shadow-2xl bg-background/50 backdrop-blur-sm"
      >
        <span className="text-6xl font-logo font-bold text-primary">C</span>
      </motion.div>

      {/* Floating Element 1 - Event Card */}
      <motion.div 
        animate={{ 
          x: mousePosition.x * -1.5, 
          y: mousePosition.y * -1.5,
          rotate: mousePosition.x * 0.5
        }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="absolute top-[20%] left-[15%] z-10 w-48 bg-background rounded-xl p-3 shadow-xl border border-border group hover:scale-105 hover:z-30 transition-transform cursor-default"
      >
        <div className="w-full h-24 bg-primary/20 rounded-lg mb-3 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/40 to-transparent mix-blend-overlay"></div>
        </div>
        <h4 className="font-bold text-sm mb-1 truncate">Lagos Tech Fest 2026</h4>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <Calendar className="w-3 h-3" /> 24 Oct, 2026
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" /> Eko Convention Center
        </div>
      </motion.div>

      {/* Floating Element 2 - Ticket */}
      <motion.div 
        animate={{ 
          x: mousePosition.x * 2, 
          y: mousePosition.y * -1,
          rotate: mousePosition.y * -0.5 + 12
        }}
        transition={{ type: "spring", stiffness: 120, damping: 15 }}
        className="absolute top-[30%] right-[20%] z-10 w-40 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-lg p-4 shadow-xl border border-primary-foreground/20 group hover:scale-110 hover:z-30 transition-transform"
      >
        <div className="flex justify-between items-start mb-4 border-b border-primary-foreground/20 pb-2">
          <Ticket className="w-5 h-5" />
          <span className="font-bold text-xs uppercase tracking-wider">VIP Pass</span>
        </div>
        <div className="text-xs opacity-80">Admit One</div>
        <div className="font-mono text-sm mt-1 font-bold">#CP-84920</div>
      </motion.div>

      {/* Floating Element 3 - Mini Stat/Info */}
      <motion.div 
        animate={{ 
          x: mousePosition.x * -1, 
          y: mousePosition.y * 2,
        }}
        transition={{ type: "spring", stiffness: 90, damping: 25 }}
        className="absolute bottom-[25%] left-[25%] z-10 bg-background rounded-full py-2 px-4 shadow-lg border border-border flex items-center gap-2"
      >
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        <span className="text-xs font-semibold">2,401 attending</span>
      </motion.div>

      {/* Floating Element 4 - Icon Circle */}
      <motion.div 
        animate={{ 
          x: mousePosition.x * 2.5, 
          y: mousePosition.y * 1.5,
          rotate: 360
        }}
        transition={{ type: "spring", stiffness: 80, damping: 30, rotate: { duration: 20, repeat: Infinity, ease: "linear" } }}
        className="absolute bottom-[20%] right-[25%] z-0 w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center border-dashed"
      >
        <Star className="w-6 h-6 text-primary opacity-50" />
      </motion.div>

      {/* Tiny decorative circles */}
      <motion.div 
        animate={{ x: mousePosition.x * -3, y: mousePosition.y * -3 }}
        className="absolute top-[15%] right-[40%] w-3 h-3 rounded-full bg-primary/40"
      />
      <motion.div 
        animate={{ x: mousePosition.x * 3, y: mousePosition.y * 3 }}
        className="absolute bottom-[15%] left-[45%] w-4 h-4 rounded-full bg-purple-500/30"
      />
      
      {/* Background Subtle Title */}
      <div className="absolute inset-x-0 bottom-12 text-center pointer-events-none">
        <h2 className="text-xl font-bold text-muted-foreground/30 tracking-widest uppercase">
          Your pass to the next experience
        </h2>
      </div>
    </div>
  );
}
