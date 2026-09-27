"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface OrganizerProfile {
  id?: number;
  company_name: string;
  website?: string;
  bio?: string;
  logo?: string;
}

export function ProfileForm() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<OrganizerProfile>({ company_name: "", website: "", bio: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      if (!session?.accessToken) return;
      
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organizer/profile/`, {
          headers: {
            "Authorization": `Bearer ${session.accessToken}`
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setProfile(data[0]); // GET /organizer/profile/ returns a list
          }
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const url = profile.id 
        ? `${process.env.NEXT_PUBLIC_API_URL}/organizer/profile/${profile.id}/`
        : `${process.env.NEXT_PUBLIC_API_URL}/organizer/profile/`;
      
      const method = profile.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.accessToken}`
        },
        body: JSON.stringify(profile),
      });

      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setMessage("Profile saved successfully!");
      } else {
        setMessage("Failed to save profile.");
      }
    } catch (err) {
      setMessage("An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading profile...</div>;
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {message && (
        <div className={`p-3 rounded text-sm ${message.includes("success") ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
          {message}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-muted-foreground">Company Name</label>
        <input 
          type="text" 
          value={profile.company_name}
          onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2" 
          placeholder="e.g. Acme Events" 
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground">Website</label>
        <input 
          type="url" 
          value={profile.website || ""}
          onChange={(e) => setProfile({ ...profile, website: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2" 
          placeholder="https://acme-events.com" 
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground">Bio / Description</label>
        <textarea 
          value={profile.bio || ""}
          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2" 
          rows={4}
          placeholder="Tell attendees about your organization..." 
        />
      </div>

      <button 
        type="submit" 
        disabled={saving}
        className="bg-primary text-primary-foreground px-4 py-2 rounded font-medium disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
