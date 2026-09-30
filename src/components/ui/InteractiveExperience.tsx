"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  MapPin,
  Heart,
  Music,
  Users,
  Bell,
  Ticket,
} from "lucide-react";
import Image from "next/image";

/* ─────────────────────── Event data ─────────────────────── */
const events = [
  {
    title: "Lagos Music Festival 2026",
    date: "24 Oct, 2026",
    venue: "Eko Convention Center",
    going: "+2.4K going",
    image: "/image-folders/music/IMG_0784.jpg",
    avatars: 4,
  },
  {
    title: "Back In the 90s",
    date: "12 Nov, 2026",
    venue: "Central Park",
    going: "+850 going",
    image: "/image-folders/festival/IMG_0772.jpg",
    avatars: 3,
  },
  {
    title: "The Creators Hub",
    date: "5 Dec, 2026",
    venue: "Landmark Centre",
    going: "+1.1K going",
    image: "/image-folders/nightlife/IMG_0775.jpg",
    avatars: 3,
  },
];

/* ─────────── Tiny avatar cluster (fake colour circles) ─────────── */
function AvatarCluster({ count }: { count: number }) {
  const colors = ["#a78bfa", "#f472b6", "#fb923c", "#34d399", "#60a5fa"];
  return (
    <div className="flex -space-x-1.5">
      {colors.slice(0, count).map((c, i) => (
        <div
          key={i}
          className="w-5 h-5 rounded-full border-[1.5px] border-[#1e1b4b]"
          style={{ backgroundColor: c, zIndex: count - i }}
        />
      ))}
    </div>
  );
}

/* ─────────── Event Card ─────────── */
function EventCard({
  event,
  mouseX,
  mouseY,
  parallaxFactor,
  style,
  className,
  size = "large",
}: {
  event: (typeof events)[number];
  mouseX: number;
  mouseY: number;
  parallaxFactor: number;
  style?: React.CSSProperties;
  className?: string;
  size?: "large" | "small";
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [localMouse, setLocalMouse] = useState({ x: 0, y: 0 });

  const handleCardMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      setLocalMouse({ x, y });
    },
    []
  );

  const isLarge = size === "large";
  const cardW = isLarge ? "w-[260px]" : "w-[220px]";
  const imgH = isLarge ? "h-[130px]" : "h-[100px]";

  return (
    <motion.div
      ref={cardRef}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setLocalMouse({ x: 0, y: 0 });
      }}
      onMouseMove={handleCardMouseMove}
      animate={{
        x: mouseX * parallaxFactor,
        y: mouseY * parallaxFactor,
        rotateX: hover ? -localMouse.y * 8 : 0,
        rotateY: hover ? localMouse.x * 8 : 0,
        scale: hover ? 1.05 : 1,
      }}
      transition={{
        type: "spring",
        stiffness: 120,
        damping: 18,
        scale: { duration: 0.25 },
      }}
      className={`absolute ${cardW} rounded-2xl overflow-hidden cursor-default select-none ${className}`}
      style={{
        perspective: 800,
        transformStyle: "preserve-3d",
        ...style,
      }}
    >
      {/* Glassmorphism card body */}
      <div
        className="relative rounded-2xl overflow-hidden border border-white/10"
        style={{
          background:
            "linear-gradient(135deg, rgba(30, 27, 75, 0.85) 0%, rgba(49, 46, 129, 0.6) 100%)",
          backdropFilter: "blur(20px)",
          boxShadow: hover
            ? "0 25px 60px rgba(99, 102, 241, 0.3), 0 0 0 1px rgba(99, 102, 241, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)"
            : "0 15px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.06)",
          transition: "box-shadow 0.3s ease",
        }}
      >
        {/* Event Image */}
        <div className={`relative ${imgH} w-full overflow-hidden`}>
          <Image
            src={event.image}
            alt={event.title}
            fill
            className="object-cover"
            sizes="260px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e1b4b]/80 via-transparent to-transparent" />

          {/* Heart icon */}
          <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center border border-white/10">
            <Heart className="w-3.5 h-3.5 text-white" fill="none" />
          </div>

          {/* Event title overlay */}
          <div className="absolute bottom-2.5 left-3 right-3">
            <h4 className="text-white font-bold text-sm leading-tight drop-shadow-lg">
              {event.title}
            </h4>
          </div>
        </div>

        {/* Event details */}
        <div className="p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-purple-200/80">
            <Calendar className="w-3 h-3 text-purple-300/60" />
            {event.date}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-purple-200/80">
            <MapPin className="w-3 h-3 text-purple-300/60" />
            {event.venue}
          </div>
          <div className="flex items-center justify-between pt-1">
            <AvatarCluster count={event.avatars} />
            <span className="text-[10px] text-purple-300/70 font-medium">
              {event.going}
            </span>
          </div>
        </div>

        {/* Hover reveal — extra info */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{
            opacity: hover ? 1 : 0,
            height: hover ? "auto" : 0,
          }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div className="px-3 pb-3 pt-0 border-t border-white/5">
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-purple-300/60 uppercase tracking-wider font-semibold">
                Get your pass
              </span>
              <div className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/20">
                <span className="text-[10px] text-purple-300 font-semibold">
                  Available
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─────────── VIP Pass / Ticket element ─────────── */
function VIPPass({
  mouseX,
  mouseY,
}: {
  mouseX: number;
  mouseY: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [localMouse, setLocalMouse] = useState({ x: 0, y: 0 });

  const handleCardMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      setLocalMouse({ x, y });
    },
    []
  );

  return (
    <motion.div
      ref={cardRef}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setLocalMouse({ x: 0, y: 0 });
      }}
      onMouseMove={handleCardMouseMove}
      animate={{
        x: mouseX * 2,
        y: mouseY * -1,
        rotateX: hover ? -localMouse.y * 10 : 0,
        rotateY: hover ? localMouse.x * 10 : mouseY * -0.3 + 8,
        rotateZ: hover ? 0 : -5,
        scale: hover ? 1.08 : 1,
      }}
      transition={{
        type: "spring",
        stiffness: 120,
        damping: 16,
        scale: { duration: 0.25 },
      }}
      className="absolute top-[16%] right-[12%] z-10 w-[175px] cursor-default select-none"
      style={{ perspective: 600, transformStyle: "preserve-3d" }}
    >
      <div
        className="rounded-xl overflow-hidden border border-white/15"
        style={{
          background:
            "linear-gradient(145deg, rgba(99, 102, 241, 0.6) 0%, rgba(79, 70, 229, 0.45) 40%, rgba(129, 140, 248, 0.35) 100%)",
          backdropFilter: "blur(24px)",
          boxShadow: hover
            ? "0 20px 50px rgba(99, 102, 241, 0.35), 0 0 30px rgba(99, 102, 241, 0.15), inset 0 1px 0 rgba(255,255,255,0.15)"
            : "0 12px 35px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
          transition: "box-shadow 0.3s ease",
        }}
      >
        <div className="p-4 space-y-2">
          {/* Header row */}
          <div className="flex items-start justify-between">
            <Ticket className="w-4 h-4 text-white/70" />
            <span className="text-[10px] text-white/60 font-bold uppercase tracking-[0.15em]">
              VIP PASS
            </span>
          </div>

          {/* Dashed separator */}
          <div className="border-t border-dashed border-white/20 my-1.5" />

          {/* Details */}
          <div className="space-y-1">
            <p className="text-[11px] text-white/50 font-medium">Admit One</p>
            <p className="text-base font-mono font-bold text-white tracking-wide">
              #CP-84920
            </p>
          </div>

          {/* Mini barcode illusion */}
          <div className="flex items-end gap-[2px] pt-1 opacity-40">
            {[3, 5, 2, 6, 3, 4, 7, 2, 5, 3, 6, 4, 2, 5, 3, 7, 4, 2, 5, 3].map(
              (h, i) => (
                <div
                  key={i}
                  className="w-[2px] bg-white rounded-full"
                  style={{ height: `${h}px` }}
                />
              )
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────── Floating icon circle ─────────── */
function FloatingIcon({
  icon: Icon,
  mouseX,
  mouseY,
  parallaxFactor,
  className,
  bgColor,
  iconColor,
  size = "w-10 h-10",
  iconSize = "w-4 h-4",
}: {
  icon: React.ElementType;
  mouseX: number;
  mouseY: number;
  parallaxFactor: number;
  className?: string;
  bgColor: string;
  iconColor: string;
  size?: string;
  iconSize?: string;
}) {
  return (
    <motion.div
      animate={{
        x: mouseX * parallaxFactor,
        y: mouseY * parallaxFactor,
      }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className={`absolute z-10 ${size} rounded-full flex items-center justify-center ${className}`}
      style={{
        background: bgColor,
        boxShadow: `0 8px 24px rgba(0,0,0,0.3)`,
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <Icon className={`${iconSize} ${iconColor}`} />
    </motion.div>
  );
}

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */
export function InteractiveExperience() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
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

  const mx = mousePosition.x;
  const my = mousePosition.y;

  return (
    <div
      ref={containerRef}
      className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse 80% 80% at 50% 45%, #1e1b4b 0%, #0f0a2e 50%, #080520 100%)",
      }}
    >
      {/* ───── Background ambient glow layers ───── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 35% 40%, rgba(99, 102, 241, 0.12) 0%, transparent 50%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 65% 55%, rgba(139, 92, 246, 0.08) 0%, transparent 45%)",
        }}
      />
      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ───── Top header bar ───── */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="CirclePass"
            width={28}
            height={28}
            className="object-contain"
          />
          <span className="text-white font-fredoka text-lg font-semibold tracking-tight">
            CirclePass
          </span>
        </div>
        <p className="text-purple-300/50 text-xs font-medium tracking-wide">
          Your pass to the next experience.
        </p>
      </div>

      {/* ───── Central CirclePass logo ───── */}
      <motion.div
        animate={{
          x: mx * 0.4,
          y: my * 0.4,
        }}
        transition={{ type: "spring", stiffness: 140, damping: 16 }}
        className="relative z-20"
      >
        {/* Outer glow ring */}
        <div
          className="w-[160px] h-[160px] rounded-full flex items-center justify-center"
          style={{
            background:
              "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
          }}
        >
          {/* Main logo circle */}
          <div
            className="w-[120px] h-[120px] rounded-full flex items-center justify-center relative"
            style={{
              background:
                "linear-gradient(145deg, rgba(99, 102, 241, 0.25) 0%, rgba(30, 27, 75, 0.8) 100%)",
              border: "2.5px solid rgba(129, 140, 248, 0.4)",
              boxShadow:
                "0 0 60px rgba(99, 102, 241, 0.25), 0 0 120px rgba(99, 102, 241, 0.1), inset 0 0 30px rgba(99, 102, 241, 0.15), 0 20px 40px rgba(0,0,0,0.4)",
            }}
          >
            {/* Inner ring */}
            <div
              className="w-[96px] h-[96px] rounded-full flex items-center justify-center"
              style={{
                border: "1.5px solid rgba(129, 140, 248, 0.2)",
              }}
            >
              {/* The logo with animated neon glow */}
              <motion.div
                animate={{
                  filter: [
                    "drop-shadow(0 0 15px rgba(167,139,250,0.6)) drop-shadow(0 0 30px rgba(99,102,241,0.4))",
                    "drop-shadow(0 0 30px rgba(167,139,250,0.9)) drop-shadow(0 0 60px rgba(99,102,241,0.7))",
                    "drop-shadow(0 0 15px rgba(167,139,250,0.6)) drop-shadow(0 0 30px rgba(99,102,241,0.4))",
                  ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Image
                  src="/logo.png"
                  alt="CirclePass Icon"
                  width={64}
                  height={64}
                  className="object-contain relative z-10"
                />
              </motion.div>
            </div>
            {/* Orbiting dot */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-0"
            >
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, #818cf8 0%, #6366f1 100%)",
                  boxShadow: "0 0 10px rgba(99, 102, 241, 0.6)",
                }}
              />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* ───── Event Card: Lagos Music Festival (top-left, large) ───── */}
      <EventCard
        event={events[0]}
        mouseX={mx}
        mouseY={my}
        parallaxFactor={-1.8}
        size="large"
        className="top-[12%] left-[3%] z-10"
        style={{ rotate: "-3deg" }}
      />

      {/* ───── Event Card: Back In the 90s (bottom-left, small) ───── */}
      <EventCard
        event={events[1]}
        mouseX={mx}
        mouseY={my}
        parallaxFactor={-1.2}
        size="small"
        className="bottom-[22%] left-[5%] z-10"
        style={{ rotate: "2deg" }}
      />

      {/* ───── Event Card: The Creators Hub (bottom-right, small) ───── */}
      <EventCard
        event={events[2]}
        mouseX={mx}
        mouseY={my}
        parallaxFactor={1.5}
        size="small"
        className="bottom-[18%] right-[8%] z-10"
        style={{ rotate: "-2deg" }}
      />

      {/* ───── VIP Pass ticket (top-right) ───── */}
      <VIPPass mouseX={mx} mouseY={my} />

      {/* ───── Floating icon: Music note (top-center-left) ───── */}
      <FloatingIcon
        icon={Music}
        mouseX={mx}
        mouseY={my}
        parallaxFactor={-2.5}
        className="top-[14%] left-[42%]"
        bgColor="rgba(99, 102, 241, 0.6)"
        iconColor="text-white"
        size="w-9 h-9"
        iconSize="w-4 h-4"
      />

      {/* ───── Floating icon: Group/Users (center-left) ───── */}
      <FloatingIcon
        icon={Users}
        mouseX={mx}
        mouseY={my}
        parallaxFactor={1.8}
        className="top-[55%] left-[32%]"
        bgColor="rgba(99, 102, 241, 0.5)"
        iconColor="text-white"
        size="w-8 h-8"
        iconSize="w-3.5 h-3.5"
      />

      {/* ───── Floating icon: Bell/Notification (center-right) ───── */}
      <FloatingIcon
        icon={Bell}
        mouseX={mx}
        mouseY={my}
        parallaxFactor={-1.5}
        className="top-[46%] right-[18%]"
        bgColor="rgba(249, 115, 22, 0.7)"
        iconColor="text-white"
        size="w-8 h-8"
        iconSize="w-3.5 h-3.5"
      />

      {/* ───── Heart icon (top of Lagos card) ───── */}
      <FloatingIcon
        icon={Heart}
        mouseX={mx}
        mouseY={my}
        parallaxFactor={-2.2}
        className="top-[11%] left-[22%]"
        bgColor="transparent"
        iconColor="text-purple-300/60"
        size="w-5 h-5"
        iconSize="w-4 h-4"
      />

      {/* ───── Heart icon (top-right of Creators Hub card) ───── */}
      <FloatingIcon
        icon={Heart}
        mouseX={mx}
        mouseY={my}
        parallaxFactor={2}
        className="bottom-[42%] right-[9%]"
        bgColor="transparent"
        iconColor="text-purple-300/50"
        size="w-5 h-5"
        iconSize="w-4 h-4"
      />

      {/* ───── Decorative small circles ───── */}
      <motion.div
        animate={{ x: mx * -3, y: my * -3 }}
        transition={{ type: "spring", stiffness: 80, damping: 25 }}
        className="absolute top-[22%] right-[38%] w-2 h-2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(129, 140, 248, 0.6), rgba(129, 140, 248, 0.1))",
        }}
      />
      <motion.div
        animate={{ x: mx * 2.5, y: my * 2.5 }}
        transition={{ type: "spring", stiffness: 70, damping: 30 }}
        className="absolute bottom-[35%] left-[48%] w-1.5 h-1.5 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(167, 139, 250, 0.5), rgba(167, 139, 250, 0.1))",
        }}
      />
      <motion.div
        animate={{ x: mx * -2, y: my * 2 }}
        transition={{ type: "spring", stiffness: 90, damping: 20 }}
        className="absolute top-[60%] left-[15%] w-1.5 h-1.5 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(99, 102, 241, 0.5), transparent)",
        }}
      />
      <motion.div
        animate={{ x: mx * 3, y: my * -2 }}
        transition={{ type: "spring", stiffness: 60, damping: 25 }}
        className="absolute top-[30%] right-[10%] w-2 h-2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(129, 140, 248, 0.4), transparent)",
        }}
      />

      {/* ───── Subtle connecting line arcs (decorative) ───── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.08)" />
            <stop offset="50%" stopColor="rgba(99, 102, 241, 0.15)" />
            <stop offset="100%" stopColor="rgba(99, 102, 241, 0.05)" />
          </linearGradient>
        </defs>
        {/* Arc from logo toward top-left card */}
        <ellipse
          cx="40%"
          cy="42%"
          rx="22%"
          ry="28%"
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="1"
          strokeDasharray="4 6"
          opacity="0.3"
        />
      </svg>

      {/* ───── Bottom tagline ───── */}
      <div className="absolute bottom-16 left-8 right-8 z-20 pointer-events-none">
        <h2 className="text-[28px] font-bold leading-tight text-white/90">
          Discover events.
        </h2>
        <h2 className="text-[28px] font-bold leading-tight text-white/90">
          Get your pass.
        </h2>
        <h2 className="text-[28px] font-bold leading-tight text-purple-400">
          Enter the Circle.
        </h2>
        <p className="mt-3 text-sm text-purple-300/50 font-medium">
          Music, food, culture, tech and more. All in one place.
        </p>
      </div>

    </div>
  );
}
