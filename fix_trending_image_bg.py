with open(r'src/components/sections/TrendingEvents.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_block = '''              {/* Image Area */}
              <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden">
                <img 
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-contain"
                />'''

new_block = '''              {/* Image Area */}
              <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden">
                {/* Blurred Background */}
                <div 
                  className="absolute inset-0 bg-cover bg-center blur-2xl scale-125 opacity-80"
                  style={{ backgroundImage: `url(${event.image})` }}
                />
                <div className="absolute inset-0 bg-black/10 z-[1]" />
                {/* Main Image */}
                <img 
                  src={event.image}
                  alt={event.title}
                  className="relative w-full h-full object-contain z-10"
                />'''

if old_block in text:
    text = text.replace(old_block, new_block)
    print("Replaced!")
else:
    print("Not found")

with open(r'src/components/sections/TrendingEvents.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
