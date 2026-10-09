import { Hero } from "@/components/sections/Hero";
import { DiscoverEvents } from "@/components/sections/DiscoverEvents";
import { TrendingEvents } from "@/components/sections/TrendingEvents";
import { DiscoverySection } from "@/components/sections/DiscoverySection";
import { PlanningVotingSplit } from "@/components/sections/PlanningVotingSplit";
import { SimpleWay } from "@/components/sections/SimpleWay";
import { EventMedia } from "@/components/sections/EventMedia";
import { LiveVotingNominations } from "@/components/sections/LiveVotingNominations";
import { Features } from "@/components/sections/Features";
import { Pricing } from "@/components/sections/Pricing";
import { FAQ } from "@/components/sections/FAQ";

export default function Home() {
  return (
    <>
      <Hero />
      <DiscoverEvents />
      <TrendingEvents />
      <DiscoverySection limit={4} />
      <PlanningVotingSplit />
      <SimpleWay />
      <EventMedia />
      <LiveVotingNominations />
      <Features />
      <Pricing />
      <FAQ />
    </>
  );
}
