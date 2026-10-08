import re

with open("src/components/events/EventForm.tsx", "r", encoding="utf-8") as f:
    content = f.read()

new_block = """      let event;
      if (eventId) {
        event = await updateEvent(session.accessToken as string, eventId, payload);
      } else {
        event = await createEvent(session.accessToken as string, payload);
      }
      
      const targetId = eventId || event.id;
      
      if (submitAfterSave) {
        await submitEvent(session.accessToken as string, targetId);
        toast.success(eventId ? "Event updated and published!" : "Event created and published successfully!");
      } else {
        toast.success(eventId ? "Event updated successfully!" : "Event saved as draft successfully!");
      }
      
      router.push(`/organizer/events/${targetId}/overview`);
      router.refresh();"""

content = re.sub(r'const event = await createEvent\(.*router\.refresh\(\);', new_block, content, flags=re.DOTALL)

with open("src/components/events/EventForm.tsx", "w", encoding="utf-8") as f:
    f.write(content)
