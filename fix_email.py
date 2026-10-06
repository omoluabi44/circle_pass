with open('backend/api/views.py', 'r', encoding='utf-8') as f:
    text = f.read()

target = """    def perform_create(self, serializer, *args, **kwargs):
        user = serializer.save(*args, **kwargs)
        self._generate_code(user)
        # Now send the signal which triggers the email
        from djoser import signals
        signals.user_registered.send(
            sender=self.__class__, user=user, request=self.request
        )"""

replacement = """    def perform_create(self, serializer, *args, **kwargs):
        user = serializer.save(*args, **kwargs)
        self._generate_code(user)
        
        from djoser import signals
        from djoser.compat import get_user_email
        from djoser.conf import settings as djoser_settings
        
        signals.user_registered.send(
            sender=self.__class__, user=user, request=self.request
        )

        context = {"user": user}
        to = [get_user_email(user)]
        if djoser_settings.SEND_ACTIVATION_EMAIL:
            djoser_settings.EMAIL.activation(self.request, context).send(to)
        elif djoser_settings.SEND_CONFIRMATION_EMAIL:
            djoser_settings.EMAIL.confirmation(self.request, context).send(to)"""

text = text.replace(target, replacement)

with open('backend/api/views.py', 'w', encoding='utf-8') as f:
    f.write(text)
