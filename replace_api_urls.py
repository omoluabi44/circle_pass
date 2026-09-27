import re
import sys

files = [
    r'c:\Users\adeta\OneDrive\Desktop\circlepass\src\components\checkin\QRScanner.tsx',
    r'c:\Users\adeta\OneDrive\Desktop\circlepass\src\components\checkin\ManualSearch.tsx',
    r'c:\Users\adeta\OneDrive\Desktop\circlepass\src\components\checkin\LiveFeed.tsx',
    r'c:\Users\adeta\OneDrive\Desktop\circlepass\src\components\sections\Newsletter.tsx',
    r'c:\Users\adeta\OneDrive\Desktop\circlepass\src\app\organizer\passcontrol\page.tsx',
    r'c:\Users\adeta\OneDrive\Desktop\circlepass\src\app\organizer\page.tsx',
    r'c:\Users\adeta\OneDrive\Desktop\circlepass\src\app\organizer\inbox\page.tsx',
    r'c:\Users\adeta\OneDrive\Desktop\circlepass\src\app\(auth)\register\page.tsx',
    r'c:\Users\adeta\OneDrive\Desktop\circlepass\src\app\organizer\contacts\page.tsx',
    r'c:\Users\adeta\OneDrive\Desktop\circlepass\src\app\organizer\analytics\page.tsx',
    r'c:\Users\adeta\OneDrive\Desktop\circlepass\src\app\dashboard\following\page.tsx',
    r'c:\Users\adeta\OneDrive\Desktop\circlepass\src\app\organizer\account\page.tsx',
    r'c:\Users\adeta\OneDrive\Desktop\circlepass\src\app\dashboard\saved\page.tsx',
    r'c:\Users\adeta\OneDrive\Desktop\circlepass\src\app\events\[slug]\page.tsx',
    r'c:\Users\adeta\OneDrive\Desktop\circlepass\src\app\dashboard\profile\page.tsx',
    r'c:\Users\adeta\OneDrive\Desktop\circlepass\src\app\dashboard\page.tsx'
]

import_statement = 'import { API_URL } from "@/lib/api/config";'

for fpath in files:
    try:
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f'Error reading {fpath}: {e}')
        continue
        
    original = content
    # Replace URL pattern
    content = re.sub(r'\$\{process\.env\.NEXT_PUBLIC_API_URL[^}]*\}', '${API_URL}', content)
    
    # If changed, ensure import exists
    if content != original and import_statement not in content:
        lines = content.split('\n')
        # Find the last import
        last_import_idx = -1
        for i, line in enumerate(lines):
            if line.startswith('import '):
                last_import_idx = i
        
        if last_import_idx != -1:
            lines.insert(last_import_idx + 1, import_statement)
        else:
            lines.insert(0, import_statement)
            
        content = '\n'.join(lines)
        
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f'Processed {fpath}')
