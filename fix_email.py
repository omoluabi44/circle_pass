with open('backend/api/email.py', 'r', encoding='utf-8') as f:
    text = f.read()

replacement = '''class CustomActivationEmail(email.ActivationEmail):
    template_name = 'email/custom_activation.html'

    def get_context_data(self):
        context = super().get_context_data()
        context['url'] = context['url'] + '?next=/dashboard/tickets'
        # Pass the verification code to the template
        user = context.get('user')
        if user and hasattr(user, 'verification_code'):
            context['code'] = user.verification_code.code
        else:
            context['code'] = '0000'
        return context'''

text = text.replace('''class CustomActivationEmail(email.ActivationEmail):
    template_name = 'email/custom_activation.html'

    def get_context_data(self):
        # ActivationEmail provides context: user, uid, token, url
        context = super().get_context_data()
        # Append ?next=/dashboard/tickets to the activation URL
        context['url'] = context['url'] + '?next=/dashboard/tickets'
        return context''', replacement)

with open('backend/api/email.py', 'w', encoding='utf-8') as f:
    f.write(text)
