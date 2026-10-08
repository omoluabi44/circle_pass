import re

with open("src/components/sections/DiscoverySection.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add imports
content = content.replace(
    'import { useState, useEffect } from "react";',
    'import { useState, useEffect, useRef, useCallback } from "react";'
)

content = content.replace(
    'import { MapPin, Calendar, ChevronDown } from "lucide-react";',
    'import { MapPin, Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";'
)

# Inject HorizontalCarousel component
carousel_code = """
function HorizontalCarousel({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div className="relative group/carousel">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 shadow-lg backdrop-blur-sm transition-all opacity-0 group-hover/carousel:opacity-100 -translate-x-1/2 md:translate-x-0"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-6 custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0"
      >
        {children}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 shadow-lg backdrop-blur-sm transition-all opacity-0 group-hover/carousel:opacity-100 translate-x-1/2 md:translate-x-0"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

"""

content = content.replace(
    'export function DiscoverySection',
    carousel_code + 'export function DiscoverySection'
)

# Now wrap the mapped lists
old_list = """                  {/* Horizontally scrollable container */}
                  <div className="flex overflow-x-auto gap-4 pb-6 snap-x snap-mandatory custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                    {categoryEvents.map(event => ("""

new_list = """                  {/* Horizontally scrollable container with arrows */}
                  <HorizontalCarousel>
                    {categoryEvents.map(event => ("""

content = content.replace(old_list, new_list)

old_list_other = """                  <div className="flex overflow-x-auto gap-4 pb-6 snap-x snap-mandatory custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                    {uncategorizedEvents.map(event => ("""

new_list_other = """                  <HorizontalCarousel>
                    {uncategorizedEvents.map(event => ("""

content = content.replace(old_list_other, new_list_other)

# Replace the closing tags of the list wrappers
# For categoryEvents:
content = content.replace(
    '                        </div>\n                      </Link>\n                    ))}\n                  </div>\n                </div>',
    '                        </div>\n                      </Link>\n                    ))}\n                  </HorizontalCarousel>\n                </div>'
)

with open("src/components/sections/DiscoverySection.tsx", "w", encoding="utf-8") as f:
    f.write(content)
