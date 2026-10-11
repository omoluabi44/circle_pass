"use client";

import { useState, useEffect } from "react";
import { User, Mail, Phone, Bell, Settings, LogOut, ChevronRight, Loader2, X, Lock, AlertTriangle, Check, Shield } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { API_URL } from "@/lib/api/config";
import toast from "react-hot-toast";

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

  // Modal and Settings states
  const [activeModal, setActiveModal] = useState<'account' | 'notifications' | 'delete' | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [notifSettings, setNotifSettings] = useState({
    ticketReceipts: true,
    reminders: true,
    announcements: true,
    following: true,
    recommendations: false,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("circlepass_attendee_notifs");
      if (saved) {
        setNotifSettings(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  const saveNotifSettings = (newSettings: typeof notifSettings) => {
    setNotifSettings(newSettings);
    try {
      localStorage.setItem("circlepass_attendee_notifs", JSON.stringify(newSettings));
    } catch (e) {}
    toast.success("Notification preferences updated!");
    setActiveModal(null);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }

    setUpdatingPassword(true);
    try {
      const token = (session as any)?.accessToken;
      const res = await fetch(`${API_URL}/users/set_password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          re_new_password: confirmPassword,
        }),
      });

      if (res.ok) {
        toast.success("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setActiveModal(null);
      } else {
        const data = await res.json().catch(() => ({}));
        const errorMsg = data.current_password?.[0] || data.new_password?.[0] || data.detail || "Failed to update password.";
        toast.error(errorMsg);
      }
    } catch (err) {
      toast.error("Network error while updating password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const confirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const token = (session as any)?.accessToken;
      const res = await fetch(`${API_URL}/users/delete_account/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        toast.success("Your account has been deleted.");
        setActiveModal(null);
        signOut({ callbackUrl: "/" });
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.detail || data.message || "Failed to delete account. Please try again.");
      }
    } catch (err) {
      toast.error("Network error while deleting account.");
    } finally {
      setIsDeleting(false);
    }
  };

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
          <button 
            type="button"
            onClick={() => setActiveModal('account')}
            className="flex items-center justify-between p-6 hover:bg-secondary transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <Settings className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <div>
                <p className="font-bold text-foreground">Account Preferences</p>
                <p className="text-xs text-muted-foreground mt-0.5">Password security & account deletion</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
          <div className="w-full h-px bg-border/50" />
          
          <button 
            type="button"
            onClick={() => setActiveModal('notifications')}
            className="flex items-center justify-between p-6 hover:bg-secondary transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <Bell className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <div>
                <p className="font-bold text-foreground">Notification Preferences</p>
                <p className="text-xs text-muted-foreground mt-0.5">Event reminders & organizer updates</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
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

      {/* Account Preferences Modal */}
      {activeModal === 'account' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Account Preferences</h3>
                  <p className="text-xs text-muted-foreground">Manage your password and security</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <h4 className="font-bold text-sm text-foreground">Change Password</h4>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary text-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">New Password</label>
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary text-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary text-foreground"
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {updatingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                  {updatingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>

            {/* Danger Zone */}
            <div className="border-t border-border pt-6 space-y-3">
              <h4 className="font-bold text-sm text-destructive">Danger Zone</h4>
              <p className="text-xs text-muted-foreground">
                Once you delete your account, there is no going back. All tickets, orders, and saved events will be permanently removed.
              </p>
              <button
                type="button"
                onClick={() => setActiveModal('delete')}
                className="px-5 py-2.5 border border-destructive text-destructive text-sm rounded-xl font-bold hover:bg-destructive/10 transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Preferences Modal */}
      {activeModal === 'notifications' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Notification Preferences</h3>
                  <p className="text-xs text-muted-foreground">Control what emails and notifications you receive</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Ticket Receipts */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/40 border border-border/50">
                <div className="pr-4">
                  <p className="font-bold text-sm text-foreground">Ticket & Order Receipts</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Instant booking confirmations and digital passes</p>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 bg-primary/10 text-primary rounded-full shrink-0">
                  Required
                </span>
              </div>

              {/* Event Reminders */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/40 border border-border/50">
                <div className="pr-4">
                  <p className="font-bold text-sm text-foreground">Event Reminders</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Reminders 24 hours & 2 hours before events start</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifSettings(prev => ({ ...prev, reminders: !prev.reminders }))}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${notifSettings.reminders ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${notifSettings.reminders ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Organizer Announcements */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/40 border border-border/50">
                <div className="pr-4">
                  <p className="font-bold text-sm text-foreground">Organizer Announcements</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Venue updates, schedule changes & emergency info</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifSettings(prev => ({ ...prev, announcements: !prev.announcements }))}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${notifSettings.announcements ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${notifSettings.announcements ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Followed Organizers */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/40 border border-border/50">
                <div className="pr-4">
                  <p className="font-bold text-sm text-foreground">Followed Organizers</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Alerts when organizers you follow launch new events</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifSettings(prev => ({ ...prev, following: !prev.following }))}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${notifSettings.following ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${notifSettings.following ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Recommendations */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/40 border border-border/50">
                <div className="pr-4">
                  <p className="font-bold text-sm text-foreground">Trending & Recommendations</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Weekly curated top events based on your city</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifSettings(prev => ({ ...prev, recommendations: !prev.recommendations }))}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${notifSettings.recommendations ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${notifSettings.recommendations ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveNotifSettings(notifSettings)}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-sm"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {activeModal === 'delete' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto sm:mx-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Delete Account?</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Are you sure you want to delete your account? This action is <strong className="text-foreground font-semibold">permanent</strong> and cannot be undone. All your booked tickets, order history, and saved events will be permanently erased.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setActiveModal('account')}
                className="flex-1 px-5 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-secondary transition-colors order-2 sm:order-1"
              >
                No, Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteAccount}
                className="flex-1 px-5 py-3 rounded-xl bg-destructive text-destructive-foreground font-semibold hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2 order-1 sm:order-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  "Yes, Delete Account"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
