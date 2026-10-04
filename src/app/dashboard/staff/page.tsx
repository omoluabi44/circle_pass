'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { API_URL } from '@/lib/api/config';
import { Shield, QrCode, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function StaffAccessPage() {
  const { data: session } = useSession();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const token = (session as any)?.accessToken;
        const res = await fetch(`${API_URL}/user/team-roles/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setRoles(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (session) fetchRoles();
  }, [session]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#6366f1]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-heading text-gray-900 tracking-tight">Staff Access</h1>
        <p className="text-gray-500 mt-2 text-lg">Manage your PassControl scanning assignments.</p>
      </div>

      {roles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Assignments Yet</h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            You haven't been invited to scan for any events. When an organizer invites you to their team, you'll see your assignments here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((role) => (
            <div key={role.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#6366f1]"></div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{role.event_title}</h3>
                  <p className="text-sm text-gray-500">{role.organizer_name}</p>
                </div>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold whitespace-nowrap">
                  {role.role === 'ORGANIZER_ADMIN' ? 'Organizer / Admin' : 'Scanner / Staff'}
                </span>
              </div>
              
              <div className="pt-4 mt-2 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500 gap-2">
                  <Shield size={16} />
                  <span>PassControl Access</span>
                </div>
                
                {role.event_id ? (
                  <Link 
                    href={`/staff/scan/${role.event_id}`}
                    className="flex items-center gap-1.5 text-sm font-bold text-white bg-[#6366f1] hover:bg-[#5046e5] px-4 py-2 rounded-xl transition-colors"
                  >
                    <QrCode size={16} />
                    Open Scanner
                  </Link>
                ) : (
                  <span className="text-xs text-gray-400 italic">Global Access</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
