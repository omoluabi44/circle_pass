with open(r'src/components/layout/FooterNewsletter.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_form = """      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email" 
              className="w-full bg-background/50 border border-border/80 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              required
              disabled={status === "loading"}
            />
          </div>
          <button 
            type="submit" 
            disabled={status === "loading"}
            className="w-full bg-primary text-primary-foreground font-bold rounded-lg px-3 py-2.5 text-sm hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
          >
            {status === "loading" ? "Subscribing..." : "Subscribe"}
          </button>
          {status === "error" && (
            <p className="text-destructive text-xs mt-1">{message}</p>
          )}
        </form>"""

new_form = """      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2 w-full">
          <div className="relative flex-1 min-w-0">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email" 
              className="w-full bg-background/50 border border-border/80 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              required
              disabled={status === "loading"}
            />
          </div>
          <button 
            type="submit" 
            disabled={status === "loading"}
            className="whitespace-nowrap shrink-0 bg-primary text-primary-foreground font-bold rounded-lg px-4 py-2.5 text-sm hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
          >
            {status === "loading" ? "Wait..." : "Subscribe"}
          </button>
        </form>
      )}
      {status === "error" && (
        <p className="text-destructive text-xs mt-1">{message}</p>
      )}"""

text = text.replace(old_form, new_form)

with open(r'src/components/layout/FooterNewsletter.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
