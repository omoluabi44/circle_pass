from django.conf import settings
print("EMAIL_BACKEND:", settings.EMAIL_BACKEND)
print("EMAIL_HOST:", settings.EMAIL_HOST)
print("EMAIL_PORT:", settings.EMAIL_PORT)
print("EMAIL_USE_TLS:", settings.EMAIL_USE_TLS)
print("EMAIL_HOST_USER:", settings.EMAIL_HOST_USER)
print("EMAIL_HOST_PASSWORD:", settings.EMAIL_HOST_PASSWORD[:15] + "..." if settings.EMAIL_HOST_PASSWORD else "None")
print("DEFAULT_FROM_EMAIL:", settings.DEFAULT_FROM_EMAIL)
