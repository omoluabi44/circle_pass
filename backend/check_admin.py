import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'circlepass_backend.settings')
django.setup()

from core.models import User

admins = User.objects.filter(role='ADMIN')
print(f"Admin users: {admins.count()}")
for u in admins:
    print(f"  - {u.email} | role={u.role} | active={u.is_active}")

# Also check what the role field looks like on all users
all_users = User.objects.all()
print(f"\nAll users:")
for u in all_users:
    print(f"  - {u.email} | role='{u.role}'")
