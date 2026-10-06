with open(r'src/app/events/[slug]/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = """                          <a 
                            href={`https://www.tiktok.com/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary text-sm font-medium transition-colors"
                          >
                            <Music2 className="w-4 h-4 text-foreground" /> TikTok
                          </a>
                        </div>"""

replacement = """                          <a 
                            href={`https://www.tiktok.com/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary text-sm font-medium transition-colors"
                          >
                            <Music2 className="w-4 h-4 text-foreground" /> TikTok
                          </a>
                          <div className="h-px bg-border my-1" />
                          <button 
                            onClick={downloadQRCode}
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary text-sm font-medium transition-colors text-primary"
                          >
                            <QrCode className="w-4 h-4" /> Download QR Code
                          </button>
                        </div>"""

if target in text:
    text = text.replace(target, replacement)
    with open(r'src/app/events/[slug]/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced successfully")
else:
    print("Target not found")
