import Link from 'next/link';
import { Calendar, BarChart2, ArrowRight } from 'lucide-react';
import { getSession } from '@/lib/auth';

export async function PlanningVotingSplit() {
  const session = await getSession();
  
  let createEventHref = "/register";
  if (session?.user) {
    if (session.user.role === 'ORGANIZER' || session.user.role === 'ADMIN') {
      createEventHref = "/organizer/events/create";
    } else {
      createEventHref = "/dashboard";
    }
  }

  return (
    <section className=" py-20 px-4 bg-cover bg-center bg-no-repeat relative" style={{ backgroundImage: "url(\'/planning_your_first_events_section.PNG\')" }}>
      <div className="container mx-auto">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">

          {/* Left Side: Planning */}
          <div className="bg-card text-card-foreground p-8 md:p-12 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-3xl font-bold mb-4 text-balance">Planning your first event?</h3>
            <p className="text-muted-foreground mb-8 text-lg text-balance">
              CirclePass makes it simple to create, sell tickets & manage your events seamlessly.
            </p>
            <Link href={createEventHref} className="inline-flex items-center gap-2  justify-center px-6 py-3 border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary hover:text-white transition-all">
              Create an event  <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Right Side: Voting */}
          <div className="bg-secondary text-secondary-foreground p-8 md:p-12 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
              <BarChart2 className="w-7 h-7" />
            </div>
            <h3 className="text-3xl font-bold mb-4 text-balance">Give your Audience a Voice</h3>
            <p className="text-muted-foreground mb-8 text-lg text-balance">
              Create polls & awards, invite your audience to vote & see results in real time.
            </p>
            <Link href="/coming-soon" className="inline-flex items-center gap-2 justify-center px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all">
              Explore Voting <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
