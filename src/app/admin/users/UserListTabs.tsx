"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import { deleteAdminUser } from "@/lib/api/admin";


interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  date_joined: string;
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
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No users found in this category.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-secondary transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{u.username}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
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
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => handleDelete(u.id)}
                      disabled={isDeleting === u.id}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
