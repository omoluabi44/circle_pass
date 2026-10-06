with open(r'src/lib/api/wallet.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
old = """    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Payout request failed');
    }"""
new = """    if (!res.ok) {
      const err = await res.json();
      if (err.detail) throw new Error(err.detail);
      const firstError = Object.values(err)[0];
      if (Array.isArray(firstError)) throw new Error(firstError[0]);
      throw new Error(typeof firstError === 'string' ? firstError : 'Payout request failed');
    }"""

text = text.replace(old, new)
with open(r'src/lib/api/wallet.ts', 'w', encoding='utf-8') as f:
    f.write(text)
print("done")
