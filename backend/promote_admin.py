import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'circlepass_backend.settings')
django.setup()

from core.models import User

# Show current roles
for u in User.objects.all():
    print(f"  User #{u.id} | {u.email} | role={u.role}")

# Promote both accounts to ADMIN
updated = User.objects.filter(email__startswith='emmanuelogunleye').update(role='ADMIN')
print(f"\nPromoted {updated} users to ADMIN")

for u in User.objects.all():
    print(f"  User #{u.id} | {u.email} | role={u.role}")
