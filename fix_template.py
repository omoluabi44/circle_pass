with open('backend/templates/email/custom_activation.html', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
'''Please click the secure link below to verify your email and sign in to view your digital ticket:
{{ protocol }}://{{ domain }}/{{ url|safe }}''',
'''Please use the following 4-digit code to verify your email and sign in:
{{ code }}'''
)

text = text.replace(
'''Your ticket has been booked successfully. Click the button below to instantly verify your email and view your digital ticket.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="{{ protocol }}://{{ domain }}/{{ url|safe }}"
         style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
        View My Ticket
      </a>
    </div>''',
'''Your ticket has been booked successfully. Use the 4-digit verification code below to verify your email and view your digital ticket.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <div style="display: inline-block; background: #f3f4f6; color: #6366f1; padding: 16px 40px; border-radius: 12px; font-size: 32px; font-weight: 700; letter-spacing: 8px; border: 2px dashed #6366f1;">
        {{ code }}
      </div>
    </div>'''
)

with open('backend/templates/email/custom_activation.html', 'w', encoding='utf-8') as f:
    f.write(text)
