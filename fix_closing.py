import re

with open("src/components/sections/DiscoverySection.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the closing </div> of the maps with </HorizontalCarousel>
# Note: we replaced the opening <div className="flex overflow-x-auto ..."> with <HorizontalCarousel>
# So we just need to replace the next </div> after the map finishes.

# Actually, the map block is like this:
#                     ))}
#                   </div>

content = content.replace(
    '                    </Link>\n                  ))}\n                </div>',
    '                    </Link>\n                  ))}\n                </HorizontalCarousel>'
)

with open("src/components/sections/DiscoverySection.tsx", "w", encoding="utf-8") as f:
    f.write(content)
