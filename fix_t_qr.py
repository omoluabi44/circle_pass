with open('src/app/t/[qr_token]/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("  const isPending = ticket.status === 'ISSUED'; // ISSUED means it hasn't been activated yet (3 hours before)", "")

target = """                {isPending ? (
                  <div className="w-40 h-40 bg-secondary flex flex-col items-center justify-center rounded-xl text-center p-4 border-2 border-dashed border-border">
                    <Clock className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">QR Available 3hrs before event</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white p-3 rounded-xl shadow-sm mb-4">
                      <QRCodeSVG value={ticket.qr_token} size={160} />
                    </div>
                    <span className="px-4 py-1.5 bg-green-100 text-green-700 font-bold rounded-full text-sm">
                      ACTIVE
                    </span>
                  </>
                )}"""

replacement = """                  <>
                    <div className="bg-white p-3 rounded-xl shadow-sm mb-4">
                      <QRCodeSVG value={ticket.qr_token} size={160} />
                    </div>
                    <span className="px-4 py-1.5 bg-green-100 text-green-700 font-bold rounded-full text-sm">
                      ACTIVE
                    </span>
                  </>"""

text = text.replace(target, replacement)

with open('src/app/t/[qr_token]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
