from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from django.utils.crypto import get_random_string
from django.core.mail import send_mail
from django.conf import settings

from core.models import Event, TeamMember, OrganizerProfile
from .permissions import IsOrganizer

class TeamMemberManagementView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizer]

    def get(self, request, event_id):
        event = get_object_or_404(Event, id=event_id, organizer__user=request.user)
        members = TeamMember.objects.filter(organizer=event.organizer)
        
        data = []
        for member in members:
            data.append({
                "id": member.id,
                "email": member.email,
                "role": member.role,
                "status": member.status,
                "scope": "All Events" if not member.event else f"Event: {member.event.title}",
                "user_id": member.user.id if member.user else None,
                "created_at": member.created_at
            })
        return Response(data)

    def post(self, request, event_id):
        event = get_object_or_404(Event, id=event_id, organizer__user=request.user)
        email = request.data.get('email')
        role = request.data.get('role', 'SCANNER_STAFF')
        scope = request.data.get('scope', 'event') # 'event' or 'all'

        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Generate a unique invite token
        token = get_random_string(64)
        
        target_event = event if scope == 'event' else None

        # Create the team member record
        member, created = TeamMember.objects.get_or_create(
            organizer=event.organizer,
            email=email,
            event=target_event,
            defaults={
                'role': role,
                'token': token,
                'status': 'PENDING'
            }
        )

        if not created:
            # Update token and role if already exists but pending
            member.token = token
            member.role = role
            member.status = 'PENDING'
            member.save()

        # Send invite email
        # Use a fallback URL if settings.FRONTEND_URL isn't defined
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        invite_link = f"{frontend_url}/invite?token={token}"
        try:
            send_mail(
                subject=f"Invitation to join {event.organizer.name}'s Team on CirclePass",
                message=f"You have been invited to join as {role}. Click here to accept: {invite_link}",
                from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@circlepass.com',
                recipient_list=[email],
                fail_silently=True,
            )
        except Exception as e:
            # Log error but don't fail the request if email backend isn't set up locally
            print(f"Error sending email: {e}")

        return Response({"detail": "Invitation sent successfully."}, status=status.HTTP_201_CREATED)

class TeamMemberDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizer]

    def delete(self, request, event_id, pk):
        event = get_object_or_404(Event, id=event_id, organizer__user=request.user)
        member = get_object_or_404(TeamMember, pk=pk, organizer=event.organizer)
        member.delete()
        return Response({"detail": "Team member removed."}, status=status.HTTP_204_NO_CONTENT)

class AcceptTeamInviteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({"detail": "Token is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        member = get_object_or_404(TeamMember, token=token)
        
        if member.status == 'ACTIVE':
            return Response({"detail": "This invitation has already been accepted."}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure the logged in user matches the invited email
        if request.user.email != member.email:
            return Response({"detail": f"Please log in with the email {member.email} to accept this invite."}, status=status.HTTP_400_BAD_REQUEST)

        member.user = request.user
        member.status = 'ACTIVE'
        member.token = '' # Clear the token
        member.save()

        return Response({"detail": "Invitation accepted successfully.", "organizer": member.organizer.name})
