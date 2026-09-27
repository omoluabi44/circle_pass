from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from core.models import NewsletterSubscriber


class NewsletterSubscribeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email or '@' not in email:
            return Response({'error': 'Valid email is required'}, status=400)
        subscriber, created = NewsletterSubscriber.objects.get_or_create(email=email)
        if created:
            return Response({'message': 'Successfully subscribed!'}, status=201)
        return Response({'message': 'You are already subscribed.'}, status=200)
