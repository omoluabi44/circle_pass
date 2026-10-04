'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { API_URL } from "@/lib/api/config";
import { Users, UserPlus, Trash2, Shield, User, Mail } from 'lucide-react';

export function TeamManagement({ eventId }: { eventId: string }) {
  const { data: session } = useSession();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'SCANNER_STAFF', scope: 'event' });
  const [inviteStatus, setInviteStatus] = useState({ loading: false, error: '', success: '' });

  // History modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any>(null);

  const fetchMembers = async () => {
    if (!eventId) return;
    try {
      const token = (session as any)?.accessToken;
      const res = await fetch(`${API_URL}/events/${eventId}/team/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMembers(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [eventId]);

  const handleViewHistory = async (memberId: number) => {
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistoryData(null);
    try {
      const token = (session as any)?.accessToken;
      const res = await fetch(`${API_URL}/events/${eventId}/team/${memberId}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setHistoryData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteStatus({ loading: true, error: '', success: '' });
    try {
      const token = (session as any)?.accessToken;
      const res = await fetch(`${API_URL}/events/${eventId}/team/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(inviteForm)
      });
      
      if (res.ok) {
        setInviteStatus({ loading: false, error: '', success: 'Invitation sent successfully!' });
        setInviteForm({ email: '', role: 'SCANNER_STAFF', scope: 'event' });
        fetchMembers();
        setTimeout(() => setShowInviteModal(false), 2000);
      } else {
        const err = await res.json();
        setInviteStatus({ loading: false, error: err.detail || 'Failed to send invite.', success: '' });
      }
    } catch (e) {
      setInviteStatus({ loading: false, error: 'Network error.', success: '' });
    }
  };

  const handleRevoke = async (memberId: number) => {
    if (!confirm("Are you sure you want to revoke access for this member?")) return;
    try {
      const token = (session as any)?.accessToken;
      const res = await fetch(`${API_URL}/events/${eventId}/team/${memberId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchMembers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-gray-200 rounded w-3/4"></div></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Event Team</h3>
          <p className="text-sm text-gray-500">Manage who has access to scan tickets and manage this event.</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#6366f1] text-white rounded-lg text-sm font-medium hover:bg-[#5046e5] transition-colors shadow-sm"
        >
          <UserPlus size={16} />
          Add Team Member
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-medium">Member</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium">Access Scope</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Scans</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <Users className="w-8 h-8 text-gray-300 mb-2" />
                    <p>No team members added yet.</p>
                  </div>
                </td>
              </tr>
            ) : (
              members.map((member: any) => (
                <tr key={member.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                        <User size={14} />
                      </div>
                      <div className="font-medium text-gray-900">{member.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <Shield size={14} className={member.role === 'ORGANIZER_ADMIN' ? 'text-purple-500' : 'text-blue-500'} />
                      <span className="font-medium text-gray-700">
                        {member.role === 'ORGANIZER_ADMIN' ? 'Organizer / Admin' : 'Scanner / Staff'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{member.scope}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                      member.status === 'ACTIVE' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {member.status === 'ACTIVE' ? 'Active' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-semibold">
                    {member.scan_count || 0}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleViewHistory(member.id)}
                      className="text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors mr-2 text-sm font-medium"
                      title="View Scan History"
                    >
                      History
                    </button>
                    <button
                      onClick={() => handleRevoke(member.id)}
                      className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Revoke Access"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900 font-heading">Invite Team Member</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={e => setInviteForm({...inviteForm, email: e.target.value})}
                    className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#6366f1] focus:border-[#6366f1] sm:text-sm"
                    placeholder="colleague@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={e => setInviteForm({...inviteForm, role: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#6366f1] focus:border-[#6366f1] sm:text-sm"
                >
                  <option value="SCANNER_STAFF">Scanner / Staff (Scan tickets only)</option>
                  <option value="ORGANIZER_ADMIN">Organizer / Admin (Full access)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Access Scope</label>
                <select
                  value={inviteForm.scope}
                  onChange={e => setInviteForm({...inviteForm, scope: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#6366f1] focus:border-[#6366f1] sm:text-sm"
                >
                  <option value="event">This Event Only</option>
                  <option value="all">All My Events</option>
                </select>
                <p className="text-xs text-gray-500 mt-1.5">
                  Choose if they should only access this specific event, or every event you organize.
                </p>
              </div>

              {inviteStatus.error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{inviteStatus.error}</div>}
              {inviteStatus.success && <div className="text-green-600 text-sm bg-green-50 p-2 rounded">{inviteStatus.success}</div>}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteStatus.loading}
                  className="flex-1 px-4 py-2.5 bg-[#6366f1] text-white rounded-xl text-sm font-medium hover:bg-[#5046e5] disabled:opacity-50"
                >
                  {inviteStatus.loading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900 font-heading">Scan History</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {historyLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-10 bg-gray-100 rounded"></div>
                  <div className="h-10 bg-gray-100 rounded"></div>
                </div>
              ) : historyData ? (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <p className="text-sm text-gray-500">Team Member</p>
                      <p className="font-medium text-gray-900">{historyData.member_email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total Scans</p>
                      <p className="font-bold text-[#6366f1] text-xl">{historyData.total_scans}</p>
                    </div>
                  </div>
                  
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 border-b pb-2">Recent Scans (Max 50)</h4>
                  
                  {historyData.recent_scans.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4 bg-gray-50 rounded-lg">No scans performed by this member.</p>
                  ) : (
                    <div className="space-y-3">
                      {historyData.recent_scans.map((scan: any) => (
                        <div key={scan.id} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{scan.attendee_name || 'Guest'}</p>
                            <p className="text-xs text-gray-500">{scan.ticket_type} • {new Date(scan.scanned_at).toLocaleTimeString()}</p>
                          </div>
                          <span className={`text-[11px] font-medium px-2 py-1 rounded-md ${
                            scan.status === 'Valid' ? 'bg-green-50 text-green-700' :
                            scan.status === 'Already Used' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {scan.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-red-500">Failed to load history.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
