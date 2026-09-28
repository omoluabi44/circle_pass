import Link from 'next/link';
import { Calendar, BarChart2, ArrowRight } from 'lucide-react';

export function PlanningVotingSplit() {
  return (
    <section className="bg-primary py-20 px-4">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">

          {/* Left Side: Planning */}
          <div className="bg-white p-8 md:p-12 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-3xl font-bold mb-4 text-balance">Planning your first event?</h3>
            <p className="text-gray-600 mb-8 text-lg text-balance">
              CirclePass makes it simple to create, sell tickets & manage your events seamlessly.
            </p>
            <Link href="/create" className="inline-flex items-center gap-2  justify-center px-6 py-3 border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary hover:text-white transition-all">
              Create an event  <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Right Side: Voting */}
          <div className="bg-secondary p-8 md:p-12 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
              <BarChart2 className="w-7 h-7" />
            </div>
            <h3 className="text-3xl font-bold mb-4 text-balance">Give your Audience a Voice</h3>
            <p className="text-gray-600 mb-8 text-lg text-balance">
              Create polls & awards, invite your audience to vote & see results in real time.
            </p>
            <Link href="#voting" className="inline-flex items-center gap-2 justify-center px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all">
              Explore E-voting <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
