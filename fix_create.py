with open('backend/api/views.py', 'r', encoding='utf-8') as f:
    text = f.read()

target = """    def perform_create(self, serializer, *args, **kwargs):"""

replacement = """    def create(self, request, *args, **kwargs):
        email = request.data.get('email')
        if email:
            try:
                # If the user exists but hasn't verified their email yet,
                # delete the stale account so they can cleanly re-register
                # with fresh details (like fixing a typo'd password).
                user = User.objects.get(email=email)
                if not user.is_active:
                    user.delete()
            except User.DoesNotExist:
                pass
                
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer, *args, **kwargs):"""

text = text.replace(target, replacement)

with open('backend/api/views.py', 'w', encoding='utf-8') as f:
    f.write(text)
