from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'ADMIN'

class IsOrganizer(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['ORGANIZER', 'ADMIN']

class IsAttendee(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'ATTENDEE'

class IsOrganizerOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['ORGANIZER', 'ADMIN']

class IsOrganizerOrTeamMember(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role in ['ORGANIZER', 'ADMIN']:
            return True
        # Check if the user is a team member for any organizer
        from core.models import TeamMember
        return TeamMember.objects.filter(user=request.user, status='ACTIVE').exists()

