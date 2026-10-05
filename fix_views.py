with open('backend/api/views.py', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''class CustomUserViewSet(UserViewSet):
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201:
            user = User.objects.get(id=response.data['id'])
            uid = utils.encode_uid(user.pk)
            token = default_token_generator.make_token(user)
            activation_url = f"https://thecirclepass.com/verify-email/{uid}/{token}"
            response.data['activation_url'] = activation_url
        return response

    from rest_framework.decorators import action
    @action(["post"], detail=False)
    def resend_activation(self, request, *args, **kwargs):
        response = super().resend_activation(request, *args, **kwargs)
        if response.status_code == 204:
            email = request.data.get("email")
            user = User.objects.get(email=email)
            uid = utils.encode_uid(user.pk)
            token = default_token_generator.make_token(user)
            activation_url = f"https://thecirclepass.com/verify-email/{uid}/{token}"
            return Response({"message": "Activation resent", "activation_url": activation_url}, status=status.HTTP_200_OK)
        return response'''

replacement = '''from rest_framework.decorators import action
import random
from core.models import EmailVerificationCode

class CustomUserViewSet(UserViewSet):
    def _generate_code(self, user):
        code = str(random.randint(1000, 9999))
        EmailVerificationCode.objects.update_or_create(
            user=user,
            defaults={'code': code}
        )
        return code

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201:
            user = User.objects.get(id=response.data['id'])
            self._generate_code(user)
        return response

    @action(["post"], detail=False)
    def resend_activation(self, request, *args, **kwargs):
        response = super().resend_activation(request, *args, **kwargs)
        if response.status_code == 204:
            email = request.data.get("email")
            user = User.objects.get(email=email)
            self._generate_code(user)
            return Response({"message": "Activation resent"}, status=status.HTTP_200_OK)
        return response'''

text = text.replace(target, replacement)
with open('backend/api/views.py', 'w', encoding='utf-8') as f:
    f.write(text)
