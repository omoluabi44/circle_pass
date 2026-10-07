with open(r'src/app/about/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
text = re.sub(
    r'<section className="max-w-4xl mx-auto px-4 py-24 text-center space-y-8">', 
    r'<section className="w-full bg-cover bg-center bg-no-repeat relative py-24 px-4" style={{ backgroundImage: "url(\'/your_next_experience_section_in_about_us.PNG\')" }}>\n        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">', 
    text
)
# Close the new div
text = text.replace('        </section>\n      </main>', '        </div>\n        </section>\n      </main>')

with open(r'src/app/about/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
