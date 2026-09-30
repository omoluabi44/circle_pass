"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { UploadCloud, Loader2, X } from "lucide-react";
import { uploadToS3 } from "@/utils/s3Upload";
import { toast } from "react-hot-toast";

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
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    try {
      setUploadingImage(true);
      const imageUrl = await uploadToS3(file, 'organizer_logos', session?.accessToken);
      setProfile((prev) => ({ ...prev, logo: imageUrl }));
      toast.success("Image uploaded successfully!");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

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
        toast.success("Profile saved successfully!");
      } else {
        let errData;
        try { errData = await res.json(); } catch(e) {}
        console.error("Save profile error:", errData);
        toast.error(errData?.error || errData?.detail || errData?.message || "Failed to save profile.");
      }
    } catch (err: any) {
      console.error("Profile update error:", err);
      toast.error(err.message || "An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading profile...</div>;
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Organizer Logo</label>
        <div className="flex items-center gap-6">
          <div className="relative h-24 w-24 rounded-full overflow-hidden border bg-muted flex items-center justify-center shrink-0">
            {profile.logo ? (
              <Image 
                src={profile.logo} 
                alt="Organizer Logo" 
                fill 
                className="object-cover"
                unoptimized
              />
            ) : (
              <UploadCloud className="h-8 w-8 text-muted-foreground/50" />
            )}
            
            {uploadingImage && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
              disabled={uploadingImage}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2 rounded text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {uploadingImage ? "Uploading..." : "Change Logo"}
              </button>
              
              {profile.logo && (
                <button
                  type="button"
                  onClick={() => setProfile({ ...profile, logo: "" })}
                  className="text-destructive text-sm font-medium hover:underline flex items-center gap-1"
                >
                  <X className="h-4 w-4" /> Remove
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Recommended: 500x500px or larger. Maximum size: 5MB.
            </p>
          </div>
        </div>
      </div>

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
