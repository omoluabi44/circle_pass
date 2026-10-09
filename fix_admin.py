import re

with open("src/app/admin/layout.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Desktop Admin Logo
old_desktop = """        <div className="p-5 border-b border-border/50 shrink-0">
          <div className="text-2xl font-bold text-logo mb-4 px-2 font-logo flex items-center">
            CirclePass <span className="text-sm font-normal text-muted-foreground ml-2 px-2 py-0.5 bg-secondary rounded-full border border-border">Admin</span>
          </div>"""

new_desktop = """        <div className="p-5 border-b border-border/50 shrink-0">
          <Link href="/" className="text-2xl font-bold text-logo mb-4 px-2 font-logo flex items-center hover:opacity-80 transition-opacity">
            CirclePass <span className="text-sm font-normal text-muted-foreground ml-2 px-2 py-0.5 bg-secondary rounded-full border border-border">Admin</span>
          </Link>"""

content = content.replace(old_desktop, new_desktop)

# Mobile Top Nav
old_mobile = """      {/* Mobile Top Nav */}
      <div className="lg:hidden bg-background border-b border-border p-4 flex justify-between items-center fixed top-0 w-full z-40">
        <div className="text-xl font-bold text-logo font-logo flex items-center">
          CirclePass
        </div>"""

new_mobile = """      {/* Mobile Top Nav */}
      <div className="lg:hidden bg-background border-b border-border p-4 flex justify-between items-center fixed top-0 w-full z-40">
        <Link href="/" className="text-xl font-bold text-logo font-logo flex items-center hover:opacity-80 transition-opacity">
          CirclePass
        </Link>"""

content = content.replace(old_mobile, new_mobile)

# Mobile Drawer
old_drawer = """              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-logo font-logo flex items-center">
                  CirclePass
                </div>"""

new_drawer = """              <div className="flex items-center justify-between">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-bold text-logo font-logo flex items-center hover:opacity-80 transition-opacity">
                  CirclePass
                </Link>"""

content = content.replace(old_drawer, new_drawer)

with open("src/app/admin/layout.tsx", "w", encoding="utf-8") as f:
    f.write(content)
