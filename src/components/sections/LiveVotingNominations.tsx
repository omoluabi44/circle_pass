"use client";

import { useState } from 'react';
import Link from 'next/link';
import { CheckSquare } from 'lucide-react';

export function LiveVotingNominations() {
  const [activeTab, setActiveTab] = useState<'voting' | 'nomination'>('voting');

  return (
    <section className="py-24 px-4 bg-background" id="voting">
      <div className="container mx-auto">
        {/* Toggle Button */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-secondary rounded-full p-1.5 border border-border">
            <button
              onClick={() => setActiveTab('voting')}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                activeTab === 'voting'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Voting
            </button>
            <button
              onClick={() => setActiveTab('nomination')}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                activeTab === 'nomination'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Nomination
            </button>
          </div>
        </div>

        {activeTab === 'voting' ? (
          /* ── VOTING VIEW ── */
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 max-w-7xl mx-auto">
            {/* Left: Live Voting */}
            <div className="flex-1 space-y-6">
              <div className="inline-flex gap-2 px-3 py-1 bg-primary/10 text-primary items-center justify-center font-bold tracking-wide rounded-full text-sm mb-2 uppercase">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Live voting
              </div>
              <h2 className="text-4xl font-bold text-balance text-foreground">Let Your Audience have a say.</h2>
              <p className="text-muted-foreground text-lg text-balance">
                Run secure, real time voting for awards, competitions, stellar, POOL and audience choices all in one place.
              </p>
              <ul className="space-y-4 pt-4">
                <li className="flex items-center gap-3">
                  <CheckSquare className="text-primary w-6 h-6 shrink-0" />
                  <span className="font-medium text-muted-foreground text-lg">Create your vote</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckSquare className="text-primary w-6 h-6 shrink-0" />
                  <span className="font-medium text-muted-foreground text-lg">Share with your Audience</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckSquare className="text-primary w-6 h-6 shrink-0" />
                  <span className="font-medium text-muted-foreground text-lg">Watch the result come in</span>
                </li>
              </ul>
              <div className="pt-6">
                <Link href="#" className="inline-block px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-colors shadow-md">
                  Create a vote
                </Link>
              </div>
            </div>

            {/* Center: Mockup */}
            <div className="flex-1 w-full max-w-md mx-auto mt-8 lg:mt-0">
              <div className="bg-secondary rounded-3xl border border-border p-8 shadow-xl relative aspect-[4/5] flex flex-col justify-center">
                <div className="w-full bg-card rounded-2xl border border-border shadow-sm p-6 space-y-6">
                  <div className="w-1/2 h-5 bg-muted rounded-full"></div>
                  <div className="space-y-5">
                    <div className="flex items-center gap-4"><div className="w-5 h-5 rounded-full border-4 border-primary flex items-center justify-center p-1"><div className="w-full h-full bg-primary rounded-full"></div></div><div className="w-3/4 h-4 bg-muted rounded-full"></div></div>
                    <div className="flex items-center gap-4"><div className="w-5 h-5 rounded-full border-2 border-border"></div><div className="w-2/3 h-4 bg-muted rounded-full"></div></div>
                    <div className="flex items-center gap-4"><div className="w-5 h-5 rounded-full border-2 border-border"></div><div className="w-1/2 h-4 bg-muted rounded-full"></div></div>
                  </div>
                  <div className="w-full h-12 bg-primary/20 rounded-xl mt-4"></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── NOMINATION VIEW ── */
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 max-w-7xl mx-auto">
            {/* Left: Nominations */}
            <div className="flex-1 space-y-6">
              <div className="inline-block px-3 py-1 bg-muted text-muted-foreground font-bold tracking-wide rounded-full text-sm mb-2 uppercase">
                Nominations
              </div>
              <h2 className="text-4xl font-bold text-balance text-foreground">Put Yourself in the Running.</h2>
              <p className="text-muted-foreground text-lg text-balance">
                Choose your category, submit your nominations and get instant access to nominee&apos;s space.
              </p>
              <ul className="space-y-4 pt-4">
                <li className="flex items-center gap-3">
                  <CheckSquare className="text-primary w-6 h-6 shrink-0" />
                  <span className="font-medium text-muted-foreground text-lg">Choose a category</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckSquare className="text-primary w-6 h-6 shrink-0" />
                  <span className="font-medium text-muted-foreground text-lg">Submit your nomination</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckSquare className="text-primary w-6 h-6 shrink-0" />
                  <span className="font-medium text-muted-foreground text-lg">Track your nominee status</span>
                </li>
              </ul>
              <div className="pt-6">
                <Link href="#" className="inline-block px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-colors shadow-md">
                  Explore nominations
                </Link>
              </div>
            </div>

            {/* Right: Nomination Mockup */}
            <div className="flex-1 w-full max-w-md mx-auto mt-8 lg:mt-0">
              <div className="bg-secondary rounded-3xl border border-border p-8 shadow-xl relative aspect-[4/5] flex flex-col justify-center">
                <div className="w-full bg-card rounded-2xl border border-border shadow-sm p-6 space-y-5">
                  <div className="w-2/3 h-5 bg-muted rounded-full"></div>
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                      <div className="w-1/2 h-3 bg-muted rounded-full mb-3"></div>
                      <div className="w-full h-10 bg-muted rounded-lg"></div>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                      <div className="w-1/3 h-3 bg-muted rounded-full mb-3"></div>
                      <div className="w-full h-10 bg-muted rounded-lg"></div>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                      <div className="w-2/5 h-3 bg-muted rounded-full mb-3"></div>
                      <div className="w-full h-20 bg-muted rounded-lg"></div>
                    </div>
                  </div>
                  <div className="w-full h-12 bg-primary/20 rounded-xl"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
