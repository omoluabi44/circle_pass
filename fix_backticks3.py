import re
with open('src/app/(auth)/verify-email/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'fetch\([^\/]*\/auth\/verify-code\/,[^\)]*\)', 'fetch(`${API_URL}/auth/verify-code/`, {', text)
text = re.sub(r'fetch\([^\/]*\/auth\/users\/resend_activation\/,[^\)]*\)', 'fetch(`${API_URL}/auth/users/resend_activation/`, {', text)

with open('src/app/(auth)/verify-email/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
