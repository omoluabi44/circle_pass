with open(r'src/components/layout/Footer.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_statement = "import { FooterNewsletter } from '@/components/layout/FooterNewsletter';\n"

if 'FooterNewsletter' not in text:
    text = text.replace("import { Music2 } from 'lucide-react';", "import { Music2 } from 'lucide-react';\n" + import_statement)

old_grid = '<div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-5 gap-8">'
new_grid = '<div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6">'

old_col1 = '<div className="col-span-2 space-y-4">'
new_col1 = '<div className="lg:col-span-3 space-y-4 pr-0 lg:pr-4">'

old_col2 = '<div className="md:col-span-3 grid grid-cols-3 gap-2 sm:gap-4 md:gap-8 mt-6 md:mt-0">'
new_col2 = '''<div className="lg:col-span-3 mt-6 lg:mt-0">
            <FooterNewsletter />
          </div>
          
          <div className="lg:col-span-6 grid grid-cols-3 gap-2 sm:gap-4 md:gap-8 mt-6 lg:mt-0">'''

text = text.replace(old_grid, new_grid)
text = text.replace(old_col1, new_col1)
text = text.replace(old_col2, new_col2)

with open(r'src/components/layout/Footer.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
