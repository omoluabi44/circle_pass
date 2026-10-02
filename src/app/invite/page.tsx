'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { API_URL } from "@/lib/api/config";
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

function InviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [state, setState] = useState<'loading' | 'success' | 'error' | 'auth_required'>('loading');
  const [message, setMessage] = useState('');
  const [organizerName, setOrganizerName] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('Invalid or missing invitation token.');
      return;
    }

    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      setState('auth_required');
      return;
    }

    // Authenticated, accept invite
    const acceptInvite = async () => {
      try {
        const res = await fetch(`${API_URL}/team/accept/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(session as any)?.accessToken}`
          },
          body: JSON.stringify({ token })
        });
        const data = await res.json();
        
        if (res.ok) {
          setState('success');
          setMessage(data.detail);
          setOrganizerName(data.organizer);
        } else {
          setState('error');
          setMessage(data.detail || 'Failed to accept invitation.');
        }
      } catch (err) {
        setState('error');
        setMessage('Network error occurred.');
      }
    };

    acceptInvite();
  }, [token, status, session]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center border border-gray-100">
        <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <img src="/logo.png" alt="CirclePass" className="w-8 h-8 object-contain" />
        </div>
        
        {state === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-[#6366f1] animate-spin mb-4" />
            <h2 className="text-xl font-bold font-heading text-gray-900">Verifying Invitation...</h2>
          </div>
        )}

        {state === 'auth_required' && (
          <div>
            <h2 className="text-2xl font-bold font-heading text-gray-900 mb-2">You've been invited!</h2>
            <p className="text-gray-500 mb-8">
              Please log in or register with your email to accept this invitation and join the event team.
            </p>
            <div className="flex flex-col gap-3">
              <Link 
                href={`/login?callbackUrl=/invite?token=${token}`}
                className="w-full bg-[#6366f1] text-white rounded-xl py-3.5 font-semibold hover:bg-[#5046e5] transition-colors"
              >
                Log In
              </Link>
              <Link 
                href={`/register?callbackUrl=/invite?token=${token}`}
                className="w-full bg-white border-2 border-gray-200 text-gray-700 rounded-xl py-3.5 font-semibold hover:bg-gray-50 transition-colors"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}

        {state === 'success' && (
          <div>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold font-heading text-gray-900 mb-2">Invitation Accepted</h2>
            <p className="text-gray-600 mb-8">
              You have successfully joined the team for <strong>{organizerName}</strong>. 
            </p>
            <Link 
              href="/dashboard"
              className="block w-full bg-[#6366f1] text-white rounded-xl py-3.5 font-semibold hover:bg-[#5046e5] transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        )}

        {state === 'error' && (
          <div>
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold font-heading text-gray-900 mb-2">Invalid Invitation</h2>
            <p className="text-gray-600 mb-8">{message}</p>
            <Link 
              href="/"
              className="block w-full bg-gray-100 text-gray-700 rounded-xl py-3.5 font-semibold hover:bg-gray-200 transition-colors"
            >
              Return Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-[#6366f1] animate-spin" />
      </div>
    }>
      <InviteContent />
    </Suspense>
  );
}
