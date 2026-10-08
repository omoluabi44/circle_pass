import re

with open("src/components/events/EventForm.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add eventStatus to state
if 'const [eventStatus, setEventStatus] = useState("DRAFT");' not in content:
    content = content.replace(
        '  const [formData, setFormData] = useState({',
        '  const [eventStatus, setEventStatus] = useState("DRAFT");\n  const [formData, setFormData] = useState({'
    )
    content = content.replace(
        '        location_name: initialData.location_name || "",\n      }));',
        '        location_name: initialData.location_name || "",\n      }));\n      setEventStatus(initialData.status || "DRAFT");'
    )

old_submit = """      if (submitAfterSave) {
        await submitEvent(session.accessToken as string, targetId);
        toast.success(eventId ? "Event updated and published!" : "Event created and published successfully!");
      } else {
        toast.success(eventId ? "Event updated successfully!" : "Event saved as draft successfully!");
      }"""

new_submit = """      if (submitAfterSave && eventStatus !== 'PUBLISHED' && eventStatus !== 'UNDER_REVIEW') {
        await submitEvent(session.accessToken as string, targetId);
        toast.success(eventId ? "Event updated and published!" : "Event created and published successfully!");
      } else {
        toast.success(eventId ? "Event updated successfully!" : "Event saved as draft successfully!");
      }"""

content = content.replace(old_submit, new_submit)

old_buttons = """<div className="mt-8 flex justify-end gap-4">
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
      </div>"""

new_buttons = """<div className="mt-8 flex justify-end gap-4">
        {eventStatus !== 'PUBLISHED' && eventStatus !== 'UNDER_REVIEW' && (
          <button 
            onClick={() => handleSave(false)} 
            disabled={loading}
            className="px-6 py-3 border border-border text-muted-foreground font-medium rounded-lg hover:bg-secondary transition flex items-center gap-2"
          >
            <Save className="w-5 h-5" /> Save as Draft
          </button>
        )}
        <button 
          onClick={() => handleSave(true)} 
          disabled={loading}
          className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition flex items-center gap-2 shadow-sm"
        >
          {eventStatus === 'PUBLISHED' || eventStatus === 'UNDER_REVIEW' ? (
            <><Save className="w-5 h-5" /> {loading ? "Processing..." : "Save Changes"}</>
          ) : (
            <><Send className="w-5 h-5" /> {loading ? "Processing..." : "Save & Publish"}</>
          )}
        </button>
      </div>"""

content = content.replace(old_buttons, new_buttons)

with open("src/components/events/EventForm.tsx", "w", encoding="utf-8") as f:
    f.write(content)
