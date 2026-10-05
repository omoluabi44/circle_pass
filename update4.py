import re
with open("src/app/organizer/events/create/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Remove personalized DP
dp_search = r'(<div className="flex flex-col gap-2">\s*<label className="flex items-center gap-2 cursor-pointer w-fit">\s*<input type="checkbox" className="w-5 h-5 text-primary rounded"\s*checked=\{formData\.personalized_dp_enabled\}.*?</span>\s*</label>\s*<p className="text-sm text-muted-foreground">Allow attendees to generate a custom display picture.*?</p>\s*</div>)'
content = re.sub(dp_search, "", content, flags=re.DOTALL)

# Add onsite notification
onsite_search = r'(checked=\{formData\.has_onsite_services\} onChange=\{e => setFormData\(\{\.\.\.formData, has_onsite_services: e\.target\.checked\}\)\})'
onsite_replace = r'checked={formData.has_onsite_services} onChange={e => { setFormData({...formData, has_onsite_services: e.target.checked}); if (e.target.checked) { toast.success("Admin has been notified for onsite services request.", { icon: "??" }); } }}'
content = re.sub(onsite_search, onsite_replace, content)

with open("src/app/organizer/events/create/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
