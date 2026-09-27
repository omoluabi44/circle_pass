"use client";

import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, Ticket, DollarSign } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getEventAnalytics } from '@/lib/api/events';
import { toast } from 'react-hot-toast';

export default function AnalyticsPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session, status } = useSession();
  
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      if (status === "loading") return;
      const token = (session as any)?.accessToken;
      if (!token || !id || id === "undefined") return;
      try {
        const data = await getEventAnalytics(token, id);
        setAnalytics(data);
      } catch (err: any) {
        toast.error("Failed to fetch analytics");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [id, session, status]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center text-muted-foreground">
        Loading analytics...
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-8 flex justify-center text-muted-foreground">
        No analytics data available.
      </div>
    );
  }

  // Format currency
  const formatCurrency = (kobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(kobo / 100);
  };

  const checkInPercentage = analytics.tickets_sold > 0 
    ? Math.round((analytics.check_ins / analytics.tickets_sold) * 100) 
    : 0;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">Event Analytics</h1>
      
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { title: 'Total Revenue', value: formatCurrency(analytics.total_revenue), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { title: 'Tickets Sold', value: analytics.tickets_sold.toString(), icon: Ticket, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { title: 'Page Views', value: analytics.page_views.toString(), icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { title: 'Checked In', value: analytics.check_ins.toString(), icon: Users, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} mr-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Tier Breakdown */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-6">Ticket Sales Breakdown</h3>
          <div className="space-y-4">
            {analytics.ticket_tiers.map((tier: any) => {
              const percentage = tier.quantity > 0 ? (tier.sold / tier.quantity) * 100 : 0;
              let barColor = 'bg-primary';
              if (tier.tier === 'FREE') barColor = 'bg-success';
              else if (tier.tier === 'VIP') barColor = 'bg-purple-500';

              return (
                <div key={tier.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground font-medium">{tier.name}</span>
                    <span className="text-muted-foreground">{tier.sold} / {tier.quantity} sold</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2.5">
                    <div className={`${barColor} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
            
            {analytics.ticket_tiers.length === 0 && (
              <div className="text-sm text-muted-foreground">No ticket tiers created yet.</div>
            )}
          </div>
        </div>

        {/* Check-in Progress */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-6">Check-in Status</h3>
          <div className="flex items-center justify-center py-6">
            <div className="relative w-48 h-48 rounded-full border-[16px] border-secondary flex items-center justify-center">
              <div 
                className="absolute inset-0 rounded-full border-[16px] border-primary border-t-transparent border-l-transparent transform rotate-45"
                style={{ clipPath: `polygon(50% 50%, -50% -50%, ${checkInPercentage > 50 ? '150% -50%' : '-50% -50%'}, ${checkInPercentage > 50 ? '150% 150%' : ''})` }} // Simplified representation
              ></div>
              <div className="text-center z-10 bg-card rounded-full p-6 shadow-sm">
                <span className="block text-3xl font-bold text-foreground">{checkInPercentage}%</span>
                <span className="block text-xs text-muted-foreground mt-1">{analytics.check_ins} of {analytics.tickets_sold}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
