with open('backend/core/utils/notifications.py', 'r', encoding='utf-8') as f:
    text = f.read()

target = """Your ticket QR code will be activated 3 hours before the exact start time of the event.
You can also access your ticket anytime by clicking the link below:"""

replacement = """You can view and download your digital ticket QR code anytime by clicking the link below:"""

text = text.replace(target, replacement)

with open('backend/core/utils/notifications.py', 'w', encoding='utf-8') as f:
    f.write(text)
