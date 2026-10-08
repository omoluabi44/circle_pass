import re

with open("src/middleware.ts", "r", encoding="utf-8") as f:
    content = f.read()

old_check = """  // 1. Direct cookie check (Bulletproof fallback for Edge runtime bugs)
  const hasSessionCookie = 
    req.cookies.has("next-auth.session-token") || 
    req.cookies.has("__Secure-next-auth.session-token");"""

new_check = """  // 1. Direct cookie check (Bulletproof fallback for Edge runtime bugs & chunked cookies)
  const hasSessionCookie = req.cookies.getAll().some(c => 
    c.name.startsWith("next-auth.session-token") || 
    c.name.startsWith("__Secure-next-auth.session-token")
  );"""

content = content.replace(old_check, new_check)

with open("src/middleware.ts", "w", encoding="utf-8") as f:
    f.write(content)
