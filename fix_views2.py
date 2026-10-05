with open('backend/api/views.py', 'r', encoding='utf-8') as f:
    text = f.read()

view_code = '''
class VerifyCodeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        code = request.data.get('code')
        
        if not email or not code:
            return Response({"detail": "Email and code are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
            
        if user.is_active:
            return Response({"detail": "User is already active."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            verification = user.verification_code
        except EmailVerificationCode.DoesNotExist:
            return Response({"detail": "No verification code found."}, status=status.HTTP_400_BAD_REQUEST)
            
        if verification.is_expired():
            return Response({"detail": "Code has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)
            
        if verification.code != code:
            return Response({"detail": "Invalid code."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Success
        user.is_active = True
        user.save(update_fields=['is_active'])
        verification.delete()
        
        # Generate JWT tokens
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        
        return Response({
            "detail": "Email verified successfully.",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "username": user.username
            }
        }, status=status.HTTP_200_OK)
'''

text += "\n" + view_code

with open('backend/api/views.py', 'w', encoding='utf-8') as f:
    f.write(text)
