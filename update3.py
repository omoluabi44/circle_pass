import re
with open("src/app/organizer/events/create/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix capacity input value={formData.capacity || ""}
content = content.replace('value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value) || 0})}', 'value={formData.capacity || ""} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value) || 0})}')

# Validate dates
val_search = r'(if \(!formData\.title \|\| !formData\.start_time \|\| !formData\.end_time\) \{)'
val_replace = r'''    if (formData.start_time && formData.end_time) {
      if (new Date(formData.end_time) <= new Date(formData.start_time)) {
        toast.error("End time must be after the start time.");
        return false;
      }
      if (new Date(formData.start_time) < new Date()) {
        toast.error("Start time cannot be in the past.");
        return false;
      }
    }
\1'''
content = re.sub(val_search, val_replace, content)

# Modify the Additional Details Section
additional_details_search = r'(<h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">Additional Details</h2>\s*<div className="grid grid-cols-1 md:grid-cols-2 gap-6">[\s\S]*?</section>)'
additional_details_replace = r'''<h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">Additional Details <span className="text-sm font-normal text-muted-foreground ml-2">(Optional)</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Organizer Contact Info <span className="text-primary">*</span></label>
              <input type="text" placeholder="Email or Phone number" className="w-full border border-border rounded-lg p-2.5 outline-none"
                value={formData.organizer_contact} onChange={e => setFormData({...formData, organizer_contact: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Emergency Contact</label>
              <input type="text" placeholder="Where needed" className="w-full border border-border rounded-lg p-2.5 outline-none"
                value={formData.emergency_contact} onChange={e => setFormData({...formData, emergency_contact: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Instagram Handle</label>
              <input type="text" placeholder="e.g. @circlepass" className="w-full border border-border rounded-lg p-2.5 outline-none"
                value={formData.instagram_handle} onChange={e => setFormData({...formData, instagram_handle: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">TikTok Handle</label>
              <input type="text" placeholder="e.g. @circlepass" className="w-full border border-border rounded-lg p-2.5 outline-none"
                value={formData.tiktok_handle} onChange={e => setFormData({...formData, tiktok_handle: e.target.value})} />
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
        </section>'''
content = re.sub(additional_details_search, additional_details_replace, content)

# Check Organizer Contact in validateForm
org_search = r'(if \(!formData\.title \|\| !formData\.start_time \|\| !formData\.end_time\))'
org_replace = r'if (!formData.title || !formData.start_time || !formData.end_time || !formData.organizer_contact)'
content = re.sub(org_search, org_replace, content)
content = content.replace('toast.error("Please fill out all required fields (Title, Start Time, End Time).");', 'toast.error("Please fill out all required fields (Title, Start Time, End Time, Organizer Contact).");')

with open("src/app/organizer/events/create/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
