import subprocess

ssh_cmd = [
    "ssh",
    "-i", "terraform/coursepass-new.pem",
    "-o", "StrictHostKeyChecking=no",
    "ubuntu@34.206.78.67",
    "cd ~/circlepass && sudo docker-compose exec -T backend python manage.py shell -c \"from core.models import User; u = User.objects.get(email='olaawalewilliams@gmail.com'); u.role='ADMIN'; u.is_staff=True; u.is_superuser=True; u.save(); print('SUCCESS')\""
]

subprocess.run(ssh_cmd)
