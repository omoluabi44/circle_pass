import re

with open("src/components/events/EventForm.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add getLocalDatetimeString helper function outside the component
helper = """
function getLocalDatetimeString(dateString: string | null | undefined) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

"""

if 'function getLocalDatetimeString' not in content:
    content = content.replace('export default function EventForm', helper + 'export default function EventForm')

# Fix the useEffect
old_effect = """        start_time: initialData.start_time ? new Date(initialData.start_time).toISOString().slice(0, 16) : "",
        end_time: initialData.end_time ? new Date(initialData.end_time).toISOString().slice(0, 16) : "","""
new_effect = """        start_time: getLocalDatetimeString(initialData.start_time),
        end_time: getLocalDatetimeString(initialData.end_time),"""

content = content.replace(old_effect, new_effect)

# Fix the handleSave append
old_append = """      if (formData.start_time) payload.append('start_time', formData.start_time);
      if (formData.end_time) payload.append('end_time', formData.end_time);"""

new_append = """      if (formData.start_time) payload.append('start_time', new Date(formData.start_time).toISOString());
      if (formData.end_time) payload.append('end_time', new Date(formData.end_time).toISOString());"""

content = content.replace(old_append, new_append)

with open("src/components/events/EventForm.tsx", "w", encoding="utf-8") as f:
    f.write(content)
