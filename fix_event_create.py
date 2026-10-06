with open('src/app/organizer/events/create/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Extract formData declaration
start_idx = text.find("  const [formData, setFormData] = useState({")
end_idx = text.find("  });", start_idx) + 5

form_data_code = text[start_idx:end_idx]

# Remove it from the original position
text = text[:start_idx] + text[end_idx:]

# Insert it right after the other useState hooks at the top
insert_idx = text.find("  const [showSuggestions, setShowSuggestions] = useState(false);\n") + len("  const [showSuggestions, setShowSuggestions] = useState(false);\n")

text = text[:insert_idx] + form_data_code + "\n" + text[insert_idx:]

with open('src/app/organizer/events/create/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
