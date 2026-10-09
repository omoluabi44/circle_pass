with open(r'src/components/sections/FAQ.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Force light mode text and backgrounds because the background image is permanently light
text = text.replace('text-foreground', 'text-slate-900')
text = text.replace('text-muted-foreground', 'text-slate-600')
text = text.replace('bg-card', 'bg-white')
text = text.replace('bg-secondary', 'bg-slate-100')
text = text.replace('border-border/60', 'border-slate-300')
text = text.replace('border-primary/20', 'border-primary/40')

with open(r'src/components/sections/FAQ.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Forced FAQ to use light mode text classes")
