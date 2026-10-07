"use client";

import { useState } from 'react';
import Link from 'next/link';
import { CheckSquare } from 'lucide-react';

export function LiveVotingNominations() {
  const [activeTab, setActiveTab] = useState<'voting' | 'nomination'>('voting');

  return (
    <section className="py-24 px-4 bg-cover bg-center bg-no-repeat relative" id="voting" style={{ backgroundImage: "url('/voting_section.PNG')" }}>
      <div className="container mx-auto relative z-10">
        {/* Toggle Button */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-white/10 backdrop-blur-sm rounded-full p-1.5 border border-white/20">
            <button
              onClick={() => setActiveTab('voting')}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                activeTab === 'voting'
                  ? 'bg-white text-primary shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Voting
            </button>
            <button
              onClick={() => setActiveTab('nomination')}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                activeTab === 'nomination'
                  ? 'bg-white text-primary shadow-md'
                  : 'text-white/70 hover:text-white'
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
              <div className="inline-flex gap-2 px-3 py-1 bg-white/10 text-white items-center justify-center font-bold tracking-wide rounded-full text-sm mb-2 uppercase">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                Live voting
              </div>
              <h2 className="text-4xl font-bold text-balance text-white">Let Your Audience have a say.</h2>
              <p className="text-white/80 text-lg text-balance">
                Run secure, real time voting for awards, competitions, stellar, POOL and audience choices all in one place.
              </p>
              <ul className="space-y-4 pt-4">
                <li className="flex items-center gap-3">
                  <CheckSquare className="text-white w-6 h-6 shrink-0" />
                  <span className="font-medium text-white text-lg">Create your vote</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckSquare className="text-white w-6 h-6 shrink-0" />
                  <span className="font-medium text-white text-lg">Share with your Audience</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckSquare className="text-white w-6 h-6 shrink-0" />
                  <span className="font-medium text-white text-lg">Watch the result come in</span>
                </li>
              </ul>
              <div className="pt-6">
                <Link href="#" className="inline-block px-8 py-4 bg-white text-primary rounded-xl font-bold text-lg hover:bg-white/90 transition-colors shadow-md">
                  Create a vote
                </Link>
              </div>
            </div>

          </div>
        ) : (
          /* ── NOMINATION VIEW ── */
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 max-w-7xl mx-auto">
            {/* Left: Nominations */}
            <div className="flex-1 space-y-6">
              <div className="inline-block px-3 py-1 bg-white/10 text-white font-bold tracking-wide rounded-full text-sm mb-2 uppercase">
                Nominations
              </div>
              <h2 className="text-4xl font-bold text-balance text-white">Put Yourself in the Running.</h2>
              <p className="text-white/80 text-lg text-balance">
                Choose your category, submit your nominations and get instant access to nominee&apos;s space.
              </p>
              <ul className="space-y-4 pt-4">
                <li className="flex items-center gap-3">
                  <CheckSquare className="text-white w-6 h-6 shrink-0" />
                  <span className="font-medium text-white text-lg">Choose a category</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckSquare className="text-white w-6 h-6 shrink-0" />
                  <span className="font-medium text-white text-lg">Submit your nomination</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckSquare className="text-white w-6 h-6 shrink-0" />
                  <span className="font-medium text-white text-lg">Track your nominee status</span>
                </li>
              </ul>
              <div className="pt-6">
                <Link href="#" className="inline-block px-8 py-4 bg-white text-primary rounded-xl font-bold text-lg hover:bg-white/90 transition-colors shadow-md">
                  Explore nominations
                </Link>
              </div>
            </div>

          </div>
        )}
      </div>
    </section>
  );
}
