from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from django.utils.crypto import get_random_string
from django.core.mail import send_mail
from django.conf import settings

from core.models import Event, TeamMember, OrganizerProfile
from .permissions import IsOrganizerOrTeamMember
from django.db.models import Q

def check_event_admin_access(event, user):
    if user.is_staff or getattr(user, 'role', '') == 'ADMIN':
        return True
    if event.organizer.user == user:
        return True
    return TeamMember.objects.filter(user=user, status='ACTIVE', role='ORGANIZER_ADMIN').filter(Q(event=event) | Q(event__isnull=True)).exists()

class TeamMemberManagementView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizerOrTeamMember]

    def get(self, request, event_id):
        event = get_object_or_404(Event, id=event_id)
        if not check_event_admin_access(event, request.user):
            return Response({'detail': 'No Event matches the given query.'}, status=status.HTTP_404_NOT_FOUND)
        members = TeamMember.objects.filter(organizer=event.organizer)
        
        data = []
        for member in members:
            # Calculate scan count for this member for this event (or all events depending on need, let's do this event)
            # Actually, total scans by this user across the organizer's events is useful.
            scan_count = 0
            if member.user:
                from core.models import CheckIn
                scan_count = CheckIn.objects.filter(scanned_by=member.user, ticket__order__event=event).count()

            data.append({
                "id": member.id,
                "email": member.email,
                "role": member.role,
                "status": member.status,
                "scope": "All Events" if not member.event else f"Event: {member.event.title}",
                "user_id": member.user.id if member.user else None,
                "created_at": member.created_at,
                "scan_count": scan_count
            })
        return Response(data)

    def post(self, request, event_id):
        event = get_object_or_404(Event, id=event_id)
        if not check_event_admin_access(event, request.user):
            return Response({'detail': 'No Event matches the given query.'}, status=status.HTTP_404_NOT_FOUND)
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
        
        # HTML Template for the email
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 40px 0; margin: 0;">
                <div style="max-w-md: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center;">
                    <h2 style="color: #111827; font-size: 24px; margin-bottom: 8px;">You've been invited!</h2>
                    <p style="color: #4b5563; font-size: 16px; margin-bottom: 32px;">
                        You have been invited to join the <strong>{event.organizer.name}</strong> team on CirclePass as a <strong>{role.replace('_', ' ').title()}</strong>.
                    </p>
                    <a href="{invite_link}" style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; padding: 14px 28px; border-radius: 8px; margin-bottom: 32px;">
                        Accept Invitation
                    </a>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin-bottom: 24px;" />
                    <p style="color: #9ca3af; font-size: 14px;">
                        If the button doesn't work, copy and paste this link into your browser:<br/>
                        <a href="{invite_link}" style="color: #6366f1;">{invite_link}</a>
                    </p>
                </div>
            </body>
        </html>
        """

        try:
            send_mail(
                subject=f"Invitation to join {event.organizer.name}'s Team on CirclePass",
                message=f"You have been invited to join as {role}. Click here to accept: {invite_link}",
                from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@circlepass.com',
                recipient_list=[email],
                html_message=html_content,
                fail_silently=True,
            )
        except Exception as e:
            # Log error but don't fail the request if email backend isn't set up locally
            print(f"Error sending email: {e}")

        return Response({"detail": "Invitation sent successfully."}, status=status.HTTP_201_CREATED)

class TeamMemberDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizerOrTeamMember]

    def get(self, request, event_id, pk):
        event = get_object_or_404(Event, id=event_id)
        if not check_event_admin_access(event, request.user):
            return Response({'detail': 'No Event matches the given query.'}, status=status.HTTP_404_NOT_FOUND)
        member = get_object_or_404(TeamMember, pk=pk, organizer=event.organizer)
        
        if not member.user:
            return Response({"recent_scans": [], "total_scans": 0})
            
        from core.models import CheckIn
        # Get scans by this member for this event
        scans = CheckIn.objects.filter(
            scanned_by=member.user, 
            ticket__order__event=event
        ).select_related('ticket__ticket_type').order_by('-scanned_at')
        
        total_scans = scans.count()
        recent_scans = scans[:50] # return up to 50
        
        data = [{
            "id": c.id,
            "attendee_name": c.ticket.attendee_name,
            "ticket_type": c.ticket.ticket_type.name,
            "status": c.status,
            "scanned_at": c.scanned_at
        } for c in recent_scans]
        
        return Response({
            "member_email": member.email,
            "total_scans": total_scans,
            "recent_scans": data
        })

    def delete(self, request, event_id, pk):
        event = get_object_or_404(Event, id=event_id)
        if not check_event_admin_access(event, request.user):
            return Response({'detail': 'No Event matches the given query.'}, status=status.HTTP_404_NOT_FOUND)
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

        return Response({
            "detail": "Invitation accepted successfully.", 
            "organizer": member.organizer.name,
            "event_id": member.event_id
        })
