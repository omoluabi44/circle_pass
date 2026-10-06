with open(r'src/app/organizer/events/[id]/tickets/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("Number(ticket.price).toLocaleString()", "(Number(ticket.price) / 100).toLocaleString()")

with open(r'src/app/organizer/events/[id]/tickets/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
