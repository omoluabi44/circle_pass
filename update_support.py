import re

with open('backend/api/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_code = """    def perform_update(self, serializer):
        old_status = self.get_object().status
        instance = serializer.save()
        
        if old_status != instance.status:
            from core.models import Notification
            status_display = dict(instance.STATUS_CHOICES).get(instance.status, instance.status)
            Notification.objects.create(
                user=instance.user,
                type='SYSTEM',
                title=f"Support Ticket Update: {status_display}",
                message=f"Your support ticket regarding '{instance.issue_type}' is now marked as {status_display}."
            )"""

new_code = """    def update(self, request, *args, **kwargs):
        # We override update to manually handle 'status' because it's read_only in the serializer
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        old_status = instance.status
        new_status = request.data.get('status')
        
        # Only Admins can change status (or you could allow anyone)
        if new_status and (request.user.is_staff or request.user.role == 'ADMIN'):
            instance.status = new_status
            
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        
        if old_status != instance.status:
            from core.models import Notification
            status_display = dict(instance.STATUS_CHOICES).get(instance.status, instance.status)
            Notification.objects.create(
                user=instance.user,
                type='SYSTEM',
                title=f"Support Ticket Update: {status_display}",
                message=f"Your support ticket regarding '{instance.issue_type}' is now marked as {status_display}."
            )
            
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('backend/api/views.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated views.py successfully")
else:
    print("Could not find old code in views.py")
