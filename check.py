with open("src/components/events/EventForm.tsx", "r", encoding="utf-8") as f:
    content = f.read()

idx = content.rfind("  return (")
print(content[idx:idx+800])
