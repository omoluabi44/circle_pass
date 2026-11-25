"use client";

import { useState } from "react";
import { Trash2, BarChart3, Phone, MessageCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSession } from "@/context/AuthContext";
import { deleteAdminUser } from "@/lib/api/admin";
import Link from "next/link";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  date_joined: string;
  organizer_id?: number | null;
  company_name?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
}

/** Turn a local Nigerian number into a wa.me link (234… instead of 0…). */
function whatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const international = digits.startsWith("0")
    ? `234${digits.slice(1)}`
    : digits.startsWith("234")
      ? digits
      : `234${digits}`;
  return `https://wa.me/${international}`;
}

export default function UserListTabs({ users: initialUsers }: { users: User[] }) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [localUsers, setLocalUsers] = useState<User[]>(initialUsers);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const filteredUsers = activeTab === "ALL" 
    ? localUsers 
    : localUsers.filter(u => u.role === activeTab);

  const handleDelete = async (userId: number) => {
    if (!confirm("Are you sure you want to completely delete this user? This cannot be undone.")) return;
    if (!session?.accessToken) return;
    
    setIsDeleting(userId);
    try {
      await deleteAdminUser(session.accessToken, userId);
      setLocalUsers(prev => prev.filter(u => u.id !== userId));
      toast.success("User deleted successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user.");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 border-b border-border pb-2 overflow-x-auto">
        {["ALL", "ADMIN", "ORGANIZER", "ATTENDEE"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            }`}
          >
            {tab === "ALL" ? "All Users" : `${tab.charAt(0) + tab.slice(1).toLowerCase()}s`}
          </button>
        ))}
      </div>

      <div className="bg-background border border-border rounded-xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground font-bold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No users found in this category.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-secondary transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">
                    <div>{u.username}</div>
                    {u.full_name && (
                      <div className="text-xs text-muted-foreground">{u.full_name}</div>
                    )}
                    {u.company_name && (
                      <div className="text-xs text-muted-foreground">{u.company_name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {u.phone_number ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${u.phone_number}`}
                          className="text-foreground font-medium hover:text-primary transition-colors"
                          title="Call"
                        >
                          {u.phone_number}
                        </a>
                        <a
                          href={whatsappHref(u.phone_number)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-[#25D366] hover:bg-success/10 rounded-md transition-colors"
                          title="Message on WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> Not provided
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                      u.role === 'ADMIN' ? 'bg-destructive/10 text-destructive' :
                      u.role === 'ORGANIZER' ? 'bg-primary/10 text-primary' :
                      'bg-success/10 text-success'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(u.date_joined).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      {u.organizer_id && (
                        <Link
                          href={`/admin/organizers/${u.organizer_id}`}
                          className="px-2.5 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
                          title="View Organizer Dashboard"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>View Dashboard</span>
                        </Link>
                      )}
                      <button 
                        onClick={() => handleDelete(u.id)}
                        disabled={isDeleting === u.id}
                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
