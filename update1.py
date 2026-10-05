import re

with open("src/app/organizer/events/create/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# I will define this script to make precise replacements in the file instead of rewriting the whole 450 lines to avoid messing up other logic.

# 1. Update basic info heading
content = content.replace(">Basic Info</h2>", ">Basic Information</h2>")

# 2. Add social handles and location name to state
state_search = r'(has_onsite_services:\s*false,\s*)(\})'
state_replace = r'\1instagram_handle: "",\n    tiktok_handle: "",\n    location_name: "",\n  }'
content = re.sub(state_search, state_replace, content)

# 3. Add to payload
payload_search = r"(payload\.append\('has_onsite_services', String\(formData\.has_onsite_services\)\);)"
payload_replace = r"\1\n      payload.append('instagram_handle', formData.instagram_handle);\n      payload.append('tiktok_handle', formData.tiktok_handle);\n      payload.append('location_name', formData.location_name);"
content = re.sub(payload_search, payload_replace, content)

# 4. Description textarea rows
content = content.replace("textarea rows={4}", "textarea rows={6}")

with open("src/app/organizer/events/create/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
