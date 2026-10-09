import re

with open("backend/core/migrations/0030_fix_emoji_encoding.py", "r", encoding="utf-8") as f:
    content = f.read()

# Remove the block for core_socialpost
block_to_remove = """        migrations.RunSQL(
            sql="ALTER TABLE core_socialpost CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            reverse_sql=migrations.RunSQL.noop
        ),
"""

if block_to_remove in content:
    content = content.replace(block_to_remove, "")
else:
    print("Block not found exactly as string. Will use regex.")
    content = re.sub(
        r'        migrations\.RunSQL\(\s*sql="ALTER TABLE core_socialpost CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",\s*reverse_sql=migrations\.RunSQL\.noop\s*\),\s*',
        '',
        content
    )

with open("backend/core/migrations/0030_fix_emoji_encoding.py", "w", encoding="utf-8") as f:
    f.write(content)
