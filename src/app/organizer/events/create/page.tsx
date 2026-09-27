"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { createEvent, submitEvent, getCategories } from "@/lib/api/events";
import { Save, Send, AlertCircle, Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { uploadToS3 } from "@/utils/s3Upload";

export default function CreateEventPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    async function fetchCats() {
      try {
        const data = await getCategories();
        const cats = Array.isArray(data) ? data : (data.results || []);
        setCategories(cats);
        if (cats.length > 0) {
          setFormData(prev => ({ ...prev, category: cats[0].id || cats[0].name }));
        }
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    }
    fetchCats();
  }, []);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    event_type: "PHYSICAL",
    is_online: false,
    venue: "",
    country: "",
    state: "",
    city: "",
    start_time: "",
    end_time: "",
    capacity: 0,
    absorb_fees: false,
    cover_image: null as File | null,
    organizer_contact: "",
    emergency_contact: "",
    age_restriction: "",
    dress_code: "",
    lineup: "",
    personalized_dp_enabled: false,
    has_onsite_services: false,
  });

  const [ticketTypes, setTicketTypes] = useState([
    { name: "General Admission", price: 0, quantity: 100, tier: "FREE", description: "" }
  ]);

  const handleTicketChange = (index: number, field: string, value: string | number) => {
    const updated = [...ticketTypes];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'tier' && value === 'FREE') {
      updated[index].price = 0;
    }
    setTicketTypes(updated);
  };

  const addTicketType = () => {
    setTicketTypes([...ticketTypes, { name: "", price: 0, quantity: 0, tier: "FREE", description: "" }]);
  };

  const removeTicketType = (index: number) => {
    setTicketTypes(ticketTypes.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, cover_image: e.target.files[0] });
    }
  };

  const validateForm = () => {
    if (!formData.title || !formData.start_time || !formData.end_time) {
      toast.error("Please fill out all required fields (Title, Start Time, End Time).");
      return false;
    }
    const totalTickets = ticketTypes.reduce((acc, curr) => acc + Number(curr.quantity), 0);
    if (totalTickets > formData.capacity) {
      toast.error(`Total tickets (${totalTickets}) cannot exceed event capacity (${formData.capacity}).`);
      return false;
    }
    
    // Ticket validation
    for (const ticket of ticketTypes) {
      if (!ticket.name.trim()) {
        toast.error("All ticket types must have a name.");
        return false;
      }
      if (ticket.quantity <= 0) {
        toast.error("All ticket types must have a quantity greater than 0.");
        return false;
      }
      if (ticket.tier !== 'FREE' && ticket.price <= 0) {
        toast.error(`Ticket '${ticket.name}' must have a price greater than ₦0.`);
        return false;
      }
    }
    
    return true;
  };

  const handleSave = async (submitAfterSave: boolean) => {
    if (!validateForm()) return;
    if (!session?.accessToken) {
      toast.error("Not authenticated.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const ticketsWithKobo = ticketTypes.map(t => ({
        ...t,
        price: t.price * 100
      }));
      
      const payload = new FormData();
      payload.append('title', formData.title);
      payload.append('description', formData.description);
      payload.append('category', formData.category);
      payload.append('event_type', formData.event_type);
      payload.append('is_online', String(formData.event_type === 'ONLINE'));
      payload.append('venue', formData.venue);
      payload.append('country', formData.country);
      payload.append('state', formData.state);
      payload.append('city', formData.city);
      if (formData.start_time) payload.append('start_time', formData.start_time);
      if (formData.end_time) payload.append('end_time', formData.end_time);
      payload.append('capacity', String(formData.capacity));
      payload.append('absorb_fees', String(formData.absorb_fees));
      
      payload.append('organizer_contact', formData.organizer_contact);
      payload.append('emergency_contact', formData.emergency_contact);
      payload.append('age_restriction', formData.age_restriction);
      payload.append('dress_code', formData.dress_code);
      payload.append('lineup', formData.lineup);
      payload.append('personalized_dp_enabled', String(formData.personalized_dp_enabled));
      payload.append('has_onsite_services', String(formData.has_onsite_services));
      
      if (formData.cover_image) {
        const coverImageUrl = await uploadToS3(formData.cover_image as File, 'event_covers', session.accessToken as string);
        payload.append('cover_image', coverImageUrl);
      }
      
      payload.append('ticket_types', JSON.stringify(ticketsWithKobo));

      const event = await createEvent(session.accessToken as string, payload);
      
      if (submitAfterSave) {
        await submitEvent(session.accessToken as string, event.id);
        toast.success("Event created and submitted for review!");
      } else {
        toast.success("Event saved as draft successfully!");
      }

      router.push("/organizer/events");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col min-h-screen">
      <Link href="/organizer/events" className="text-muted-foreground hover:text-muted-foreground flex items-center gap-2 mb-6 w-fit font-medium transition">
        <ArrowLeft className="w-4 h-4" />
        Back to Events
      </Link>
      
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Create Event</h1>
        <p className="text-muted-foreground mt-2">Fill in the details below to draft or publish your new event.</p>
      </header>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-8 flex items-center gap-3 border border-destructive/30">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-8 bg-background p-8 rounded-xl shadow-sm border border-border">
        
        {/* Basic Info */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">Basic Info</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Event Title *</label>
              <input type="text" className="w-full border border-border rounded-lg p-2.5 focus:ring-2 focus:ring-primary outline-none" 
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
              <textarea rows={4} className="w-full border border-border rounded-lg p-2.5 focus:ring-2 focus:ring-primary outline-none"
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
                <select className="w-full border border-border rounded-lg p-2.5 outline-none bg-background text-foreground"
                  value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option value="" disabled>Select a category</option>
                  {categories.map((cat: any) => (
                    <option key={cat.id} value={cat.id || cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Event Type</label>
                <select className="w-full border border-border rounded-lg p-2.5 outline-none bg-background text-foreground"
                  value={formData.event_type} onChange={e => setFormData({...formData, event_type: e.target.value})}>
                  <option value="PHYSICAL">Physical</option>
                  <option value="ONLINE">Online</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Event Cover Image (Banner)</label>
              <input type="file" accept="image/*" className="w-full border border-border rounded-lg p-2.5 outline-none"
                onChange={handleFileChange} />
              <p className="text-xs text-muted-foreground mt-1">Recommended size: 1920x1080 (16:9 ratio).</p>
            </div>
            
            {formData.event_type !== 'ONLINE' && (
              <div className="space-y-4 border border-border rounded-lg p-4 bg-secondary/20">
                <h3 className="font-medium text-sm text-foreground">Location Details</h3>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Venue & Google Maps Location *</label>
                  <input type="text" placeholder="e.g. Landmark Centre, Lagos" className="w-full border border-border rounded-lg p-2.5 outline-none"
                    value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Country</label>
                    <input type="text" className="w-full border border-border rounded-lg p-2.5 outline-none"
                      value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">State</label>
                    <input type="text" className="w-full border border-border rounded-lg p-2.5 outline-none"
                      value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">City</label>
                    <input type="text" className="w-full border border-border rounded-lg p-2.5 outline-none"
                      value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Date & Capacity */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">Timing & Capacity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Start Time *</label>
              <input type="datetime-local" className="w-full border border-border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary"
                value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">End Time *</label>
              <input type="datetime-local" className="w-full border border-border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary"
                value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">Maximum Capacity</label>
              <input type="number" className="w-full border border-border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary"
                value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value) || 0})} />
              <p className="text-sm text-muted-foreground mt-1">The maximum number of people that can attend across all ticket types.</p>
            </div>
          </div>
        </section>

        {/* Additional Details */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">Additional Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Organizer Contact Info</label>
              <input type="text" placeholder="Email or Phone number" className="w-full border border-border rounded-lg p-2.5 outline-none"
                value={formData.organizer_contact} onChange={e => setFormData({...formData, organizer_contact: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Emergency Contact</label>
              <input type="text" placeholder="Where needed" className="w-full border border-border rounded-lg p-2.5 outline-none"
                value={formData.emergency_contact} onChange={e => setFormData({...formData, emergency_contact: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Age Restriction</label>
              <input type="text" placeholder="e.g. 18+, 21 and over, None" className="w-full border border-border rounded-lg p-2.5 outline-none"
                value={formData.age_restriction} onChange={e => setFormData({...formData, age_restriction: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Dress Code</label>
              <input type="text" placeholder="e.g. Casual, Black Tie" className="w-full border border-border rounded-lg p-2.5 outline-none"
                value={formData.dress_code} onChange={e => setFormData({...formData, dress_code: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">Lineup / Artists</label>
              <textarea rows={2} placeholder="List performers or guests if applicable" className="w-full border border-border rounded-lg p-2.5 outline-none"
                value={formData.lineup} onChange={e => setFormData({...formData, lineup: e.target.value})} />
            </div>
          </div>
        </section>

        {/* Event Settings & Features */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">Event Settings & Features</h2>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <input type="checkbox" className="w-5 h-5 text-primary rounded" 
                  checked={formData.absorb_fees} onChange={e => setFormData({...formData, absorb_fees: e.target.checked})} />
                <span className="text-sm font-medium text-foreground">Absorb Service Fee</span>
              </label>
              <p className="text-sm text-muted-foreground">If checked, the 5% service fee will be deducted from your payout rather than added to the ticket price.</p>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <input type="checkbox" className="w-5 h-5 text-primary rounded" 
                  checked={formData.personalized_dp_enabled} onChange={e => setFormData({...formData, personalized_dp_enabled: e.target.checked})} />
                <span className="text-sm font-medium text-foreground">Enable Personalized DP</span>
              </label>
              <p className="text-sm text-muted-foreground">Allow attendees to generate a custom display picture (DP) with their name and your event banner.</p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <input type="checkbox" className="w-5 h-5 text-primary rounded" 
                  checked={formData.has_onsite_services} onChange={e => setFormData({...formData, has_onsite_services: e.target.checked})} />
                <span className="text-sm font-medium text-foreground">Enable On-site Services</span>
              </label>
              <p className="text-sm text-muted-foreground">This feature provides dedicated on-site staff for check-in and event management. It charges an additional 13% of the ticket price.</p>
            </div>
          </div>
        </section>

        {/* Ticket Types */}
        <section>
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="text-xl font-semibold text-foreground">Ticket Types</h2>
            <button type="button" onClick={addTicketType} className="text-sm text-primary font-medium flex items-center gap-1 hover:text-primary/80 transition-colors">
              <Plus className="w-4 h-4" /> Add Ticket Type
            </button>
          </div>
          
          <div className="space-y-4">
            {ticketTypes.map((ticket, index) => (
              <div key={index} className="flex flex-col gap-4 p-4 border border-border rounded-lg bg-secondary/50">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="w-32">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Tier</label>
                    <select 
                      className="w-full border border-border rounded-lg p-2 text-sm outline-none bg-background focus:ring-2 focus:ring-primary"
                      value={ticket.tier} 
                      onChange={e => handleTicketChange(index, 'tier', e.target.value)}
                    >
                      <option value="FREE">Free</option>
                      <option value="EARLY_BIRD">Early Bird</option>
                      <option value="REGULAR">Regular</option>
                      <option value="VIP">VIP</option>
                      <option value="VVIP">VVIP</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Ticket Name</label>
                    <input type="text" placeholder="e.g. Early Bird Pass" className="w-full border border-border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      value={ticket.name} onChange={e => handleTicketChange(index, 'name', e.target.value)} />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Price (₦)</label>
                    <input type="number" className="w-full border border-border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:bg-muted"
                      value={ticket.price} onChange={e => handleTicketChange(index, 'price', parseInt(e.target.value) || 0)} disabled={ticket.tier === 'FREE'} />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Quantity</label>
                    <input type="number" className="w-full border border-border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      value={ticket.quantity} onChange={e => handleTicketChange(index, 'quantity', parseInt(e.target.value) || 0)} />
                  </div>
                  {ticketTypes.length > 1 && (
                    <button type="button" onClick={() => removeTicketType(index)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition mb-0.5">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="w-full">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Description (Optional)</label>
                  <input type="text" placeholder="Briefly describe what this ticket includes" className="w-full border border-border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    value={ticket.description} onChange={e => handleTicketChange(index, 'description', e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      <div className="mt-8 flex justify-end gap-4">
        <button 
          onClick={() => handleSave(false)} 
          disabled={loading}
          className="px-6 py-3 border border-border text-muted-foreground font-medium rounded-lg hover:bg-secondary transition flex items-center gap-2"
        >
          <Save className="w-5 h-5" /> Save as Draft
        </button>
        <button 
          onClick={() => handleSave(true)} 
          disabled={loading}
          className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition flex items-center gap-2 shadow-sm"
        >
          <Send className="w-5 h-5" /> {loading ? "Processing..." : "Save & Publish"}
        </button>
      </div>

    </div>
  );
}
