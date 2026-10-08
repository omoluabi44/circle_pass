with open(r'src/app/events/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_header = """      <div 
        className="text-background pt-32 pb-36 px-4 relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: 'url("/hero_event_pass.jpg")' }}
      >"""

new_header = """      <div className="text-background pt-32 pb-36 px-4 relative overflow-hidden">
        <video
          src="/video1.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        />"""

text = text.replace(old_header, new_header)

with open(r'src/app/events/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
