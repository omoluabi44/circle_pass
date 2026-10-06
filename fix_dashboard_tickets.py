with open('src/app/dashboard/tickets/[id]/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("""            {isIssued ? (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-4 text-center z-10">
                <Lock className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="font-semibold text-foreground text-sm">QR Code Locked</p>
                <p className="text-xs text-muted-foreground mt-1">Unlocks exactly 3 hours before the event starts.</p>
              </div>
            ) : isUsed ? (""", """            {isUsed ? (""")

text = text.replace("""              {isIssued && " Your code will automatically unlock 3 hours prior to the event."}""", "")

text = text.replace("""              className={isIssued || isUsed ? "opacity-30 filter blur-sm" : ""}""", """              className={isUsed ? "opacity-30 filter blur-sm" : ""}""")

with open('src/app/dashboard/tickets/[id]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
