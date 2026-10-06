text = """{% load i18n %}

{% block subject %}
Verify your CirclePass Account
{% endblock subject %}

{% block text_body %}
Hi {{ user.username }},

Welcome to CirclePass! 

Please use the following 4-digit code to verify your email and sign in to your dashboard:
{{ code }}

If you did not request this, you can safely ignore this email.

Best regards,
The {{ site_name }} Team
{% endblock text_body %}

{% block html_body %}
<div style="font-family: 'Roboto', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
  <div style="background: #6366f1; padding: 32px; text-align: center;">
    <h1 style="color: #ffffff; font-family: 'Fredoka', sans-serif; font-size: 28px; margin: 0;">CirclePass</h1>
  </div>

  <div style="padding: 32px;">
    <h2 style="color: #1a1a1a; font-size: 24px; margin-top: 0;">Verify Your Email</h2>

    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
      Hi <strong>{{ user.username }}</strong>,
    </p>

    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
      Welcome to CirclePass! Use the 4-digit verification code below to verify your email address and access your dashboard.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <div style="display: inline-block; background: #f3f4f6; color: #6366f1; padding: 16px 40px; border-radius: 12px; font-size: 32px; font-weight: 700; letter-spacing: 8px; border: 2px dashed #6366f1;">
        {{ code }}
      </div>
    </div>

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px; line-height: 1.5;">
      If you did not register for an account, please ignore this email.
    </p>
  </div>

  <div style="background: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="color: #9ca3af; font-size: 13px; margin: 0;">
      Warm regards, - The {{ site_name }} Team
    </p>
  </div>
</div>
{% endblock html_body %}
"""

with open('backend/templates/email/custom_activation.html', 'w', encoding='utf-8') as f:
    f.write(text)
