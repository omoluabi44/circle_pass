from djoser import email
from django.conf import settings

class CustomActivationEmail(email.ActivationEmail):
    template_name = 'email/custom_activation.html'

    def get_context_data(self):
        # ActivationEmail provides context: user, uid, token, url
        context = super().get_context_data()
        # Append ?next=/dashboard/tickets to the activation URL
        context['url'] = context['url'] + '?next=/dashboard/tickets'
        return context
