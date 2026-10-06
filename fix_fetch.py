with open('src/app/(auth)/verify-email/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target1 = """      const res = await fetch(`${API_URL}/auth/verify-code/`, {
      });"""

replacement1 = """      const res = await fetch(`${API_URL}/auth/verify-code/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode })
      });"""

target2 = """      const res = await fetch(`${API_URL}/auth/users/resend_activation/`, {
      });"""

replacement2 = """      const res = await fetch(`${API_URL}/auth/users/resend_activation/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });"""

text = text.replace(target1, replacement1)
text = text.replace(target2, replacement2)

with open('src/app/(auth)/verify-email/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
