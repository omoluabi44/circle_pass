import re
with open(r'backend/api/serializers.py', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'min_value=100_000, help_text=.Amount in kobo. Minimum .1,000..', "min_value=10_000, help_text='Amount in kobo. Minimum 100.'", text)

with open(r'backend/api/serializers.py', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced successfully")
