from djoser import email
from django.conf import settings

class CustomActivationEmail(email.ActivationEmail):
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
        return context
