"use client";

import { Building2, ShieldCheck, CreditCard, Lock, Save, Loader2, Bell } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { API_URL } from "@/lib/api/config";
import { uploadToS3 } from "@/utils/s3Upload";
import { toast } from "react-hot-toast";

function BusinessDetailsForm() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_email: '',
    bio: '',
    website: '',
    instagram_handle: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = (session as any)?.accessToken;
        if (!token) return;

        const res = await fetch(`${API_URL}/organizer/profile/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const profile = data[0];
            setProfileId(profile.id);
            setFormData({
              company_name: profile.company_name || '',
              contact_email: profile.contact_email || '',
              bio: profile.bio || '',
              website: profile.website || '',
              instagram_handle: profile.instagram_handle || '',
            });
            if (profile.logo) {
              setLogoPreview(profile.logo.startsWith('/') ? `${API_URL.replace('/api', '')}${profile.logo}` : profile.logo);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      } finally {
        setLoading(false);
      }
    };

    if (session) fetchProfile();
  }, [session]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) return;

    setSaving(true);
    try {
      const token = (session as any)?.accessToken;
      const data = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        data.append(key, val);
      });
      if (logoFile) {
        const logoUrl = await uploadToS3(logoFile, 'organizer_logos', token);
        data.append('logo', logoUrl);
      }

      const res = await fetch(`${API_URL}/organizer/profile/${profileId}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: data
      });

      if (!res.ok) {
        let errData;
        try { errData = await res.json(); } catch(e) {}
        throw new Error(errData?.error || errData?.detail || errData?.message || "Failed to update profile");
      }
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <form className="space-y-6 max-w-2xl" onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold text-foreground border-b border-border pb-4">Business Details</h2>

      <div className="flex items-center gap-6">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20 shrink-0 overflow-hidden relative">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <Building2 className="w-10 h-10 text-primary" />
          )}
        </div>
        <div>
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleLogoChange} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-secondary text-foreground rounded-lg font-bold hover:bg-secondary/80 transition-colors text-sm">
            {logoPreview ? 'Change Logo' : 'Upload Logo'}
          </button>
          <p className="text-xs text-muted-foreground mt-2">Recommended: 400x400px. Max 2MB.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">Organization Name</label>
          <input type="text" required value={formData.company_name} onChange={e => setFormData({ ...formData, company_name: e.target.value })} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">Contact Email</label>
          <input type="email" value={formData.contact_email} onChange={e => setFormData({ ...formData, contact_email: e.target.value })} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-foreground">Bio / Description</label>
        <textarea rows={4} value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors"></textarea>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">Website (Optional)</label>
          <input type="url" placeholder="https://" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">Instagram Handle (Optional)</label>
          <input type="text" placeholder="@" value={formData.instagram_handle} onChange={e => setFormData({ ...formData, instagram_handle: e.target.value })} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors" />
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-70">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

import { getVerificationStatus, submitVerification } from "@/lib/api/verification";

function VerificationTab() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Unverified");

  const [cacFile, setCacFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = (session as any)?.accessToken;
        if (!token) return;

        const data = await getVerificationStatus(token);
        setStatus(data.status);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (session) fetchStatus();
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cacFile || !idFile) {
      toast.error("Please upload both documents.");
      return;
    }

    setSubmitting(true);
    try {
      const token = (session as any)?.accessToken;
      const formData = new FormData();
      formData.append("cac_document", cacFile);
      formData.append("id_document", idFile);

      const data = await submitVerification(token, formData);
      setStatus(data.status);
      toast.success("Verification documents submitted successfully.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit verification.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold text-foreground border-b border-border pb-4">Identity Verification</h2>

      {status === "Verified" && (
        <div className="bg-success/10 border border-success/30 rounded-xl p-6 flex items-start gap-4">
          <div className="w-10 h-10 bg-success/20 text-success rounded-full flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-success mb-1">Account Verified</h3>
            <p className="text-sm text-success/80">Your identity and business details have been verified. You can now host paid events and receive payouts.</p>
          </div>
        </div>
      )}

      {(status === "Verification Submitted" || status === "Under Review") && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-6 flex items-start gap-4">
          <div className="w-10 h-10 bg-primary/20 text-primary rounded-full flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-primary mb-1">Verification Pending Review</h3>
            <p className="text-sm text-primary/80">Your compliance documents have been submitted and are currently being reviewed by our team. This usually takes 1-2 business days.</p>
          </div>
        </div>
      )}

      {(status === "Unverified" || status === "Rejected") && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {status === "Rejected" && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-4">
              <h3 className="font-bold text-destructive text-sm mb-1">Verification Rejected</h3>
              <p className="text-sm text-destructive/80">Your previous verification request was rejected. Please ensure your documents are clear and valid, and submit again.</p>
            </div>
          )}

          <div className="bg-background border border-border rounded-xl p-6 space-y-4">
            <div>
              <label className="text-sm font-bold text-foreground block mb-2">CAC Document</label>
              <p className="text-xs text-muted-foreground mb-2">Upload your Certificate of Incorporation or Business Registration (PDF or Image).</p>
              <input
                type="file"
                accept=".pdf,image/*"
                required
                onChange={e => setCacFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-secondary file:text-foreground hover:file:bg-secondary/80"
              />
            </div>

            <div className="pt-4 border-t border-border">
              <label className="text-sm font-bold text-foreground block mb-2">Government ID (Director)</label>
              <p className="text-xs text-muted-foreground mb-2">Upload a valid passport, driver's license, or national ID of the primary director.</p>
              <input
                type="file"
                accept=".pdf,image/*"
                required
                onChange={e => setIdFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-secondary file:text-foreground hover:file:bg-secondary/80"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-70"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Submitting...' : 'Submit for Verification'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function PayoutSettingsTab() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    bank_name: '',
    account_number: '',
    account_name: ''
  });

  const [banks, setBanks] = useState<any[]>([]);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");

  useEffect(() => {
    const fetchWalletAndBanks = async () => {
      try {
        const token = (session as any)?.accessToken;
        if (!token) return;

        const [walletRes, banksRes] = await Promise.all([
          fetch(`${API_URL}/organizer/wallet/`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_URL}/organizer/banks/`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (walletRes.ok) {
          const data = await walletRes.json();
          setFormData({
            bank_name: data.bank_code || '',
            account_number: data.account_number || '',
            account_name: data.account_name || ''
          });
        }
        
        if (banksRes.ok) {
          const banksData = await banksRes.json();
          setBanks(banksData.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (session) fetchWalletAndBanks();
  }, [session]);

  const resolveAccount = async (bankCode: string, accNum: string) => {
    if (!bankCode || accNum.length !== 10) {
      setFormData(prev => ({ ...prev, account_name: "" }));
      return;
    }
    
    setResolving(true);
    setResolveError("");
    setFormData(prev => ({ ...prev, account_name: "" }));
    
    try {
      const token = (session as any)?.accessToken;
      const res = await fetch(`${API_URL}/organizer/resolve_account/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bank_code: bankCode, account_number: accNum })
      });
      
      const data = await res.json();
      if (res.ok && data.status) {
        setFormData(prev => ({ ...prev, account_name: data.data.account_name }));
      } else {
        setResolveError(data.message || data.error || "Could not resolve account");
      }
    } catch (err) {
      setResolveError("Network error while resolving account");
    } finally {
      setResolving(false);
    }
  };

  const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setFormData(prev => ({ ...prev, bank_name: code }));
    resolveAccount(code, formData.account_number);
  };

  const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = e.target.value;
    setFormData(prev => ({ ...prev, account_number: num }));
    if (num.length === 10) {
      resolveAccount(formData.bank_name, num);
    } else {
      setFormData(prev => ({ ...prev, account_name: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.account_name) {
      toast.error("Please ensure your account name is resolved.");
      return;
    }
    setSaving(true);
    try {
      const token = (session as any)?.accessToken;
      const selectedBank = banks.find(b => b.code === formData.bank_name);
      
      const res = await fetch(`${API_URL}/organizer/wallet/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bank_code: formData.bank_name,
          bank_name: selectedBank ? selectedBank.name : '',
          account_number: formData.account_number,
          account_name: formData.account_name
        })
      });

      if (!res.ok) {
        let errData;
        try { errData = await res.json(); } catch(e) {}
        throw new Error(errData?.error || errData?.detail || errData?.message || "Failed to save bank details");
      }
      toast.success("Bank details updated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <form className="space-y-6 max-w-2xl" onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold text-foreground border-b border-border pb-4">Payout Settings</h2>

      <div className="bg-secondary p-6 rounded-xl space-y-4">
        <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">Bank Account Details</h3>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Bank Name</label>
            <select
              required
              value={formData.bank_name}
              onChange={handleBankChange}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors"
            >
              <option value="">Select a Bank</option>
              {banks.map(bank => (
                <option key={bank.code} value={bank.code}>{bank.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Account Number</label>
            <input
              type="text"
              required
              maxLength={10}
              placeholder="0123456789"
              value={formData.account_number}
              onChange={handleAccountChange}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors"
            />
            {resolveError && <p className="text-destructive text-sm mt-1">{resolveError}</p>}
          </div>

          <div className="space-y-2 relative">
            <label className="text-sm font-bold text-foreground">Account Name</label>
            <div className="relative">
              <input
                type="text"
                required
                readOnly
                placeholder="Account Name will appear here"
                value={formData.account_name}
                className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 focus:outline-none text-muted-foreground transition-colors"
              />
              {resolving && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-70">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Details'}
          </button>
        </div>
      </div>


    </form>
  );
}

export default function AccountSettingsPage() {
  const [activeTab, setActiveTab] = useState("business");

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your organization profile, verification, and payout details.</p>
      </header>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-border pb-2 scrollbar-hide">
        {[
          { id: "business", label: "Business Details", icon: Building2 },
          { id: "verification", label: "Verification", icon: ShieldCheck },
          { id: "payout", label: "Payout Settings", icon: CreditCard },
          { id: "notifications", label: "Notifications", icon: Bell },
          { id: "security", label: "Security", icon: Lock },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
        {activeTab === "business" && <BusinessDetailsForm />}

        {activeTab === "verification" && <VerificationTab />}

        {activeTab === "payout" && <PayoutSettingsTab />}

        {activeTab === "notifications" && (
          <form className="space-y-6 max-w-2xl">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-4">Notification Preferences</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
                <div>
                  <h3 className="font-bold text-foreground">Sales Notifications</h3>
                  <p className="text-sm text-muted-foreground">Receive an email every time a ticket is sold.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
                <div>
                  <h3 className="font-bold text-foreground">Daily Summary</h3>
                  <p className="text-sm text-muted-foreground">Receive a daily digest of all sales and check-ins.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button type="button" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors">
                <Save className="w-4 h-4" /> Save Preferences
              </button>
            </div>
          </form>
        )}

        {activeTab === "security" && (
          <form className="space-y-6 max-w-2xl">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-4">Security Settings</h2>

            <div className="space-y-4">
              <h3 className="font-bold text-foreground">Change Password</h3>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Current Password</label>
                <input type="password" placeholder="••••••••" className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">New Password</label>
                  <input type="password" placeholder="••••••••" className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Confirm New Password</label>
                  <input type="password" placeholder="••••••••" className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors" />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-start">
              <button type="button" className="px-6 py-3 bg-secondary text-foreground rounded-xl font-bold hover:bg-secondary/80 transition-colors">
                Update Password
              </button>
            </div>

            <div className="border-t border-border mt-8 pt-8 space-y-4">
              <h3 className="font-bold text-destructive">Danger Zone</h3>
              <p className="text-sm text-muted-foreground">Once you delete your account, there is no going back. Please be certain.</p>
              <button type="button" className="px-6 py-3 border border-destructive text-destructive rounded-xl font-bold hover:bg-destructive/10 transition-colors">
                Delete Account
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
