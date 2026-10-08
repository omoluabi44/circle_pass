import re

with open("src/components/sections/DiscoverySection.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(
    r'<div className="flex overflow-x-auto gap-4 pb-6 snap-x snap-mandatory custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">\s*\{categoryEvents\.map',
    '<HorizontalCarousel>\n                  {categoryEvents.map',
    content
)

content = re.sub(
    r'<div className="flex overflow-x-auto gap-4 pb-6 snap-x snap-mandatory custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">\s*\{uncategorizedEvents\.map',
    '<HorizontalCarousel>\n                  {uncategorizedEvents.map',
    content
)

with open("src/components/sections/DiscoverySection.tsx", "w", encoding="utf-8") as f:
    f.write(content)
