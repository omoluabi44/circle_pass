with open(r'src/app/events/[slug]/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
text = re.sub(r'(<Music2.*?/> TikTok\s*</a>)', r'\1\n                          <div className="h-px bg-border my-1" />\n                          <button \n                            onClick={downloadQRCode}\n                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary text-sm font-medium transition-colors text-primary"\n                          >\n                            <QrCode className="w-4 h-4" /> Download QR Code\n                          </button>', text)

with open(r'src/app/events/[slug]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced successfully")
