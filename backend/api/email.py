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
            
        context['frontend_url'] = getattr(settings, 'FRONTEND_URL', 'https://thecirclepass.com')
        return context


class CustomPasswordResetEmail(email.PasswordResetEmail):
    template_name = 'email/password_reset.html'

    def get_context_data(self):
        context = super().get_context_data()
        user = context.get('user')
        domain = getattr(settings, 'DOMAIN', 'thecirclepass.com')
        uid = context.get('uid')
        token = context.get('token')
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://thecirclepass.com')

        context['first_name'] = user.first_name or user.username or 'There'
        context['reset_url'] = f"{frontend_url}/reset-password/{uid}/{token}"
        context['frontend_url'] = frontend_url
        return context


class CustomConfirmationEmail(email.ConfirmationEmail):
    template_name = 'email/account_created.html'

    def get_context_data(self):
        context = super().get_context_data()
        user = context.get('user')
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://thecirclepass.com')
        context['first_name'] = user.first_name or user.username or 'There'
        context['frontend_url'] = frontend_url
        return context
