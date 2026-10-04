from core.models import User
for u in User.objects.all():
    print(f'{u.id} - {u.email} - {u.username}')
