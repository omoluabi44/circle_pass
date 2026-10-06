with open(r'src/app/organizer/events/[id]/tickets/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("setPrice(ticket.price.toString());", "setPrice((ticket.price / 100).toString());")
text = text.replace("price: Number(price) || 0,", "price: (Number(price) || 0) * 100,")
text = text.replace("?{Number(ticket.price).toLocaleString()}", "?{(Number(ticket.price) / 100).toLocaleString()}")

with open(r'src/app/organizer/events/[id]/tickets/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
