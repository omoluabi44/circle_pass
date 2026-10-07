with open(r'src/app/pricing/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
text = re.sub(
    r'<section className="pt-24 pb-16 px-4 max-w-7xl mx-auto text-center">', 
    r'<section className="pt-24 pb-16 px-4 w-full bg-cover bg-center bg-no-repeat relative" style={{ backgroundImage: "url(\'/paid_event_pricing_page.PNG\')" }}><div className="max-w-7xl mx-auto text-center relative z-10">', 
    text
)
# Close the newly added div wrapper at the end of the section
text = text.replace('          </div>\n        </section>', '          </div>\n        </div>\n        </section>')

with open(r'src/app/pricing/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
