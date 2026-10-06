with open('src/app/(auth)/verify-email/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
text = re.sub(r'fetch\(\$\{API_URL\}([^,]+),', r'fetch(${API_URL}\1,', text)

with open('src/app/(auth)/verify-email/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
