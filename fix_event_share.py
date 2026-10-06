with open(r'src/app/events/[slug]/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add QrCode import
target_lucide = 'from "lucide-react";'
replacement_lucide = ', QrCode } from "lucide-react";'
if target_lucide in text:
    text = text.replace(target_lucide, replacement_lucide, 1)
    # Remove QrCode if it was accidentally duplicated
    text = text.replace(", QrCode, QrCode }", ", QrCode }")

# Add qrcode.react import
if 'import { QRCodeCanvas }' not in text:
    text = text.replace('import { InstagramIcon }', 'import { QRCodeCanvas } from "qrcode.react";\nimport { InstagramIcon }')

# Add download function
target_func = 'const [isSendingMessage, setIsSendingMessage] = useState(false);'
replacement_func = '''const [isSendingMessage, setIsSendingMessage] = useState(false);

  const downloadQRCode = () => {
    const canvas = document.getElementById("event-qr-code") as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `event-${event?.slug || "share"}-qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      setIsShareOpen(false);
      toast.success("QR Code downloaded!");
    }
  };'''
if target_func in text:
    text = text.replace(target_func, replacement_func)

# Add hidden QR Code Canvas
target_canvas = '<div className="min-h-screen bg-background">'
replacement_canvas = '''<div className="min-h-screen bg-background">
      <div style={{ display: 'none' }}>
        <QRCodeCanvas 
          id="event-qr-code" 
          value={typeof window !== 'undefined' ? window.location.href : `https://thecirclepass.com/events/${event.slug}`} 
          size={512} 
          level={"H"}
          includeMargin={true}
        />
      </div>'''
if target_canvas in text:
    text = text.replace(target_canvas, replacement_canvas)

# Add Download QR Code button
target_btn = '''<a 
                            href={`https://www.tiktok.com/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary text-sm font-medium transition-colors"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 15.66a6.34 6.34 0 0 0 10.86 4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.52Z"/>
                            </svg>
                            TikTok
                          </a>
                        </div>'''
replacement_btn = '''<a 
                            href={`https://www.tiktok.com/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary text-sm font-medium transition-colors"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 15.66a6.34 6.34 0 0 0 10.86 4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.52Z"/>
                            </svg>
                            TikTok
                          </a>
                          <div className="h-px bg-border my-1" />
                          <button 
                            onClick={downloadQRCode}
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary text-sm font-medium transition-colors text-primary"
                          >
                            <QrCode className="w-4 h-4" /> Download QR Code
                          </button>
                        </div>'''
if target_btn in text:
    text = text.replace(target_btn, replacement_btn)
else:
    print("WARNING: TikTok button not found")

with open(r'src/app/events/[slug]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Script finished")
