with open('src/app/(auth)/verify-email/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
text = re.sub(r'fetch\([^\/]*\/auth\/verify-code\/,[^\)]*\)', r'fetch(\\/auth/verify-code/\, {', text)
text = re.sub(r'fetch\([^\/]*\/auth\/users\/resend_activation\/,[^\)]*\)', r'fetch(\\/auth/users/resend_activation/\, {', text)

with open('src/app/(auth)/verify-email/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
