import re
with open("src/app/organizer/events/create/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

settings_match = re.search(r'(        \{\/\* Event Settings & Features \*\/\}[\s\S]*?)(        \{\/\* Ticket Types \*\/\}[\s\S]*?)(\n      <\/div>\n\n      <div className="mt-8 flex justify-end gap-4">)', content)

if settings_match:
    settings_block = settings_match.group(1)
    tickets_block = settings_match.group(2)
    end_block = settings_match.group(3)
    
    new_content = content[:settings_match.start()] + tickets_block + settings_block + end_block + content[settings_match.end():]
    
    with open("src/app/organizer/events/create/page.tsx", "w", encoding="utf-8") as f:
        f.write(new_content)
