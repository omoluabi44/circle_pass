from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role == 'ADMIN' or request.user.is_staff or request.user.is_superuser

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


def is_admin_user(user):
    """True for super admins (role ADMIN or Django staff/superuser)."""
    return bool(
        user
        and user.is_authenticated
        and (
            getattr(user, 'role', '') == 'ADMIN'
            or user.is_staff
            or user.is_superuser
        )
    )


def user_can_view_ticket(user, ticket):
    """
    A digital pass may be read by:
      - an admin (any ticket)
      - the organizer who owns the event
      - the buyer: the account behind the order's attendee, or the account
        whose email matches the guest email the order was placed with

    Everyone else, including anyone who merely has the shareable link, is
    denied.
    """
    if not user or not user.is_authenticated:
        return False

    if is_admin_user(user):
        return True

    order = getattr(ticket, 'order', None)
    if order is None:
        return False

    # Organizer of the event this ticket belongs to.
    organizer = getattr(getattr(order, 'event', None), 'organizer', None)
    if organizer is not None and organizer.user_id == user.id:
        return True

    # Buyer with an account.
    attendee = getattr(order, 'attendee', None)
    if attendee is not None and attendee.user_id and attendee.user_id == user.id:
        return True

    # Guest checkout: the buyer is identified by the email on the order.
    user_email = (getattr(user, 'email', '') or '').strip().lower()
    if user_email:
        guest_email = (getattr(order, 'guest_email', '') or '').strip().lower()
        if guest_email and guest_email == user_email:
            return True
        attendee_user = getattr(attendee, 'user', None) if attendee is not None else None
        attendee_email = (getattr(attendee_user, 'email', '') or '').strip().lower()
        if attendee_email and attendee_email == user_email:
            return True

    return False


