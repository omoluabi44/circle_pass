with open('src/app/events/[slug]/checkout/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('Event Sold Out</h3>', '{isPast ? "Event Ended" : "Event Sold Out"}</h3>')
text = text.replace('Tickets are currently sold out. Join the waitlist to be notified if spots open up.', '{isPast ? "This event has ended. Join the waitlist to be notified if it re-opens." : "Tickets are currently sold out. Join the waitlist to be notified if spots open up."}')

with open('src/app/events/[slug]/checkout/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
