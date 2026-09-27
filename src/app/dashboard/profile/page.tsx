"use client";

import { useState, useEffect } from "react";
import { User, Mail, Phone, Bell, Settings, LogOut, ChevronRight, Loader2 } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { API_URL } from "@/lib/api/config";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const token = (session as any)?.accessToken;
      if (!token) return;

      try {
        const res = await fetch(`${API_URL}/attendee/profile/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setFormData({
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            phone_number: data.phone_number || "",
          });
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      } finally {
        setLoading(false);
      }
    };
    if (session) fetchProfile();
  }, [session]);

  const handleSave = async (field: string) => {
    const token = (session as any)?.accessToken;
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/attendee/profile/`, {
        method: "PATCH",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setEditingField(null);
        // Refresh session if name changed
        if (field === 'name') update();
      }
    } catch (err) {
      console.error("Failed to update profile", err);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-10">
      <header className="mb-4 pt-4 md:pt-0">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-2 font-medium">Manage your personal information and preferences.</p>
      </header>

      {/* Personal Information */}
      <section>
        <h2 className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-4">Personal Information</h2>
        <div className="bg-background border border-border rounded-3xl p-6 shadow-sm space-y-6">
          {/* Name */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground mb-0.5">Full Name</p>
              {editingField === 'name' ? (
                <div className="flex gap-2 mt-2">
                  <input type="text" placeholder="First Name" className="border rounded p-1.5 text-sm w-full" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                  <input type="text" placeholder="Last Name" className="border rounded p-1.5 text-sm w-full" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                </div>
              ) : (
                <p className="text-muted-foreground font-medium">{profile?.first_name} {profile?.last_name}</p>
              )}
            </div>
            {editingField === 'name' ? (
              <button onClick={() => handleSave('name')} className="text-sm font-bold text-success hover:text-success/80">Save</button>
            ) : (
              <button onClick={() => setEditingField('name')} className="text-sm font-bold text-primary hover:text-primary/80">Edit</button>
            )}
          </div>
          <div className="w-full h-px bg-border/50" />
          
          {/* Email */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground mb-0.5">Email Address</p>
              <p className="text-muted-foreground font-medium">{profile?.email}</p>
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Uneditable</span>
          </div>
          <div className="w-full h-px bg-border/50" />
          
          {/* Phone Number */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground mb-0.5">Phone Number</p>
              {editingField === 'phone' ? (
                <div className="mt-2">
                  <input type="text" placeholder="Phone Number" className="border rounded p-1.5 text-sm w-full max-w-[200px]" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
                </div>
              ) : (
                <p className="text-muted-foreground font-medium">{profile?.phone_number || "Not set"}</p>
              )}
            </div>
            {editingField === 'phone' ? (
              <button onClick={() => handleSave('phone')} className="text-sm font-bold text-success hover:text-success/80">Save</button>
            ) : (
              <button onClick={() => setEditingField('phone')} className="text-sm font-bold text-primary hover:text-primary/80">Edit</button>
            )}
          </div>
        </div>
      </section>

      {/* Account Settings */}
      <section>
        <h2 className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-4">Account Settings</h2>
        <div className="bg-background border border-border rounded-3xl overflow-hidden shadow-sm flex flex-col">
          <button className="flex items-center justify-between p-6 hover:bg-secondary transition-colors group">
            <div className="flex items-center gap-4">
              <Settings className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <p className="font-bold text-foreground">Account Preferences</p>
            </div>
            <ChevronRight className="w-5 h-5 text-border group-hover:text-primary transition-colors" />
          </button>
          <div className="w-full h-px bg-border/50" />
          
          <button className="flex items-center justify-between p-6 hover:bg-secondary transition-colors group">
            <div className="flex items-center gap-4">
              <Bell className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <p className="font-bold text-foreground">Notification Preferences</p>
            </div>
            <ChevronRight className="w-5 h-5 text-border group-hover:text-primary transition-colors" />
          </button>
        </div>
      </section>

      {/* Sign Out */}
      <section className="pt-4">
        <button onClick={() => signOut()} className="w-full flex items-center justify-center gap-2 bg-destructive/10 text-destructive hover:bg-destructive/20 px-4 py-4 rounded-2xl font-bold transition-colors">
          <LogOut className="w-5 h-5" />
          Sign Out of CirclePass
        </button>
      </section>
    </div>
  );
}
