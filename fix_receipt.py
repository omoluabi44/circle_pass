with open('backend/templates/email/order_receipt.html', 'r', encoding='utf-8') as f:
    text = f.read()

target = """    <h3 style="color: #1a1a1a; font-size: 18px; margin-top: 32px;">Your QR Code</h3>
    <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6;">
      Your ticket QR code will be activated <strong>3 hours before the exact start time of the event</strong>.
    </p>
    <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6;">
      Once your QR code is activated, it will be sent directly to this email address. Please check your inbox when it is within 3 hours of the event time to access your active QR code.
    </p>"""

replacement = """    <h3 style="color: #1a1a1a; font-size: 18px; margin-top: 32px;">Your QR Code</h3>
    <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6;">
      Your ticket QR code is now <strong>active and ready to use</strong>.
    </p>
    <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6;">
      You can view and present your digital ticket QR code at the event entrance by clicking the link below.
    </p>"""

text = text.replace(target, replacement)

with open('backend/templates/email/order_receipt.html', 'w', encoding='utf-8') as f:
    f.write(text)
