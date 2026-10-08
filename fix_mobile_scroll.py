with open(r'src/app/layout.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('<body className="flex flex-col min-h-screen">', '<body className="flex flex-col min-h-screen overflow-x-hidden relative">')
text = text.replace('className={`${roboto.variable} ${fredoka.variable} font-sans text-foreground bg-background flex flex-col min-h-screen`}', 'className={`${roboto.variable} ${fredoka.variable} font-sans text-foreground bg-background flex flex-col min-h-screen overflow-x-hidden relative`}')

with open(r'src/app/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
