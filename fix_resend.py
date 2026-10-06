with open('backend/api/views.py', 'r', encoding='utf-8') as f:
    text = f.read()

target = """    @action(["post"], detail=False)
    def resend_activation(self, request, *args, **kwargs):
        response = super().resend_activation(request, *args, **kwargs)
        if response.status_code == 204:
            email = request.data.get("email")
            user = User.objects.get(email=email)
            self._generate_code(user)
            return Response({"message": "Activation resent"}, status=status.HTTP_200_OK)
        return response"""

replacement = """    @action(["post"], detail=False)
    def resend_activation(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.get_user(is_active=False)

        from djoser.conf import settings as djoser_settings
        from djoser.compat import get_user_email

        if not djoser_settings.SEND_ACTIVATION_EMAIL:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        if user:
            self._generate_code(user)
            context = {"user": user}
            to = [get_user_email(user)]
            djoser_settings.EMAIL.activation(self.request, context).send(to)

        return Response({"message": "Activation resent"}, status=status.HTTP_200_OK)"""

text = text.replace(target, replacement)

with open('backend/api/views.py', 'w', encoding='utf-8') as f:
    f.write(text)
