with open(r'src/components/events/EventForm.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add Draft Loading logic inside the initialData useEffect
old_useeffect = """  useEffect(() => {
    if (initialData) {"""

new_useeffect = """  useEffect(() => {
    if (!eventId && !initialData) {
      const saved = localStorage.getItem("circlepass_draft_event");
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          if (draft.formData) setFormData(prev => ({ ...prev, ...draft.formData, cover_image: null }));
          if (draft.ticketTypes) setTicketTypes(draft.ticketTypes);
          if (draft.isTBA !== undefined) setIsTBA(draft.isTBA);
          if (draft.locationQuery !== undefined) setLocationQuery(draft.locationQuery);
        } catch (e) {
          console.error("Failed to parse draft", e);
        }
      }
    }

    if (initialData) {"""
text = text.replace(old_useeffect, new_useeffect)

# Add Autosave logic after ticketTypes
old_ticket = """  const [ticketTypes, setTicketTypes] = useState<any[]>([
    { name: "General Admission", price: 0, quantity: 100, tier: "FREE", description: "" }
  ]);"""

new_ticket = """  const [ticketTypes, setTicketTypes] = useState<any[]>([
    { name: "General Admission", price: 0, quantity: 100, tier: "FREE", description: "" }
  ]);

  // Auto-save draft on change (only for new events)
  useEffect(() => {
    if (!eventId) {
      const draft = {
        formData: { ...formData, cover_image: null },
        ticketTypes,
        isTBA,
        locationQuery
      };
      localStorage.setItem("circlepass_draft_event", JSON.stringify(draft));
    }
  }, [formData, ticketTypes, isTBA, locationQuery, eventId]);"""
text = text.replace(old_ticket, new_ticket)

# Clear draft on successful submit
old_submit = """        toast.success(eventId ? "Event updated successfully!" : "Event created successfully!");
        router.push("/organizer/events");"""

new_submit = """        toast.success(eventId ? "Event updated successfully!" : "Event created successfully!");
        if (!eventId) {
          localStorage.removeItem("circlepass_draft_event");
        }
        router.push("/organizer/events");"""
text = text.replace(old_submit, new_submit)

with open(r'src/components/events/EventForm.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
