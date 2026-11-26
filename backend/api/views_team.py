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
        email = str(request.data.get('email') or '').strip().lower()
        role = request.data.get('role', 'SCANNER_STAFF')
        scope = request.data.get('scope', 'event') # 'event' or 'all'

        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        target_event = event if scope == 'event' else None

        # Reuse the existing row when this address was invited before. Emails are
        # matched case-insensitively ("Ada@X.com" == "ada@x.com") because sign-in
        # normalises them to lower case and the invitee must be able to accept
        # with the account they actually log in with.
        member = TeamMember.objects.filter(
            organizer=event.organizer,
            event=target_event,
            email__iexact=email,
        ).first()

        if member is None:
            member = TeamMember(
                organizer=event.organizer,
                event=target_event,
                email=email,
                token=get_random_string(64),
                role=role,
                status='PENDING',
            )
        else:
            # Keep the existing token so links already sitting in the invitee's
            # inbox keep working. Only backfill one for legacy rows without it.
            if not member.token:
                member.token = get_random_string(64)
            member.email = email
            member.role = role
            # Re-inviting must not lock an already-active scanner out.
            if member.status != 'ACTIVE':
                member.status = 'PENDING'

        member.save()
        token = member.token

        # Send invite email
        # Use a fallback URL if settings.FRONTEND_URL isn't defined
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://thecirclepass.com')
        invite_link = f"{frontend_url}/invite?token={token}"
        
        display_name = email.split('@')[0]
        event_name = event.title if event else "All Events"
        role_name = "Staff Scanner" if role == "SCANNER_STAFF" else "Organizer/Admin"
        
        # HTML Template for the email
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 40px 0; margin: 0;">
                <div style="max-w-md: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <p style="color: #111827; font-size: 16px; margin-bottom: 20px;">Hello {display_name},</p>
                    
                    <p style="color: #4b5563; font-size: 16px; margin-bottom: 20px; line-height: 1.5;">
                        You have been invited by <strong>{event.organizer.company_name}</strong> to join <strong>{event_name}</strong> as a {role_name} on PassControl.
                    </p>
                    
                    <p style="color: #4b5563; font-size: 16px; margin-bottom: 30px; line-height: 1.5;">
                        As a {role_name}, you will be able to access the PassControl scanning system and assist with verifying and checking in attendees.
                    </p>
                    
                    <p style="color: #4b5563; font-size: 16px; margin-bottom: 20px;">To get started, click the button below:</p>
                    
                    <div style="text-align: center; margin-bottom: 30px;">
                        <a href="{invite_link}" style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; padding: 14px 28px; border-radius: 8px;">
                            Accept Invitation & Access PassControl
                        </a>
                    </div>
                    
                    <p style="color: #4b5563; font-size: 15px; margin-bottom: 15px; line-height: 1.5;">
                        If you already have a PassControl account, simply log in after clicking the link.
                    </p>
                    
                    <p style="color: #4b5563; font-size: 15px; margin-bottom: 20px; line-height: 1.5;">
                        If you do not have an account, you will be able to create an account using this email address and then access PassControl.
                    </p>
                    
                    <p style="color: #6b7280; font-size: 14px; margin-bottom: 30px; font-style: italic; line-height: 1.5; padding-left: 15px; border-left: 4px solid #e5e7eb;">
                        Please note that your access is limited to the PassControl scanning function for this event. You will not have access to the Organizer's other dashboard features or settings.
                    </p>
                    
                    <p style="color: #111827; font-size: 16px; margin-bottom: 5px;">Thank you,</p>
                    <p style="color: #111827; font-size: 16px; font-weight: bold; margin-top: 0;">PassControl Team</p>
                </div>
            </body>
        </html>
        """

        try:
            send_mail(
                subject=f"Invitation to join {event.organizer.company_name}'s Team on PassControl",
                message=f"You have been invited to join PassControl. Click here: {invite_link}",
                from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@thecirclepass.com',
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
        token = str(request.data.get('token') or '').strip()
        if not token:
            return Response({"detail": "Token is required."}, status=status.HTTP_400_BAD_REQUEST)

        member = TeamMember.objects.filter(token=token).first()
        if member is None:
            return Response(
                {"detail": "This invitation link is no longer valid. Ask the organizer to send a fresh invitation."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user_email = (request.user.email or '').strip().lower()
        invited_email = (member.email or '').strip().lower()

        # Already accepted by this same account — a repeat click (including the
        # second shot React StrictMode fires in development) is a success, not
        # an error.
        if member.status == 'ACTIVE' and member.user_id == request.user.id:
            return Response({
                "detail": "You already have access to this team.",
                "organizer": member.organizer.company_name,
                "event_id": member.event_id,
                "already_accepted": True,
            })

        if member.status == 'ACTIVE' and member.user_id:
            return Response(
                {"detail": "This invitation has already been accepted by another account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Ensure the logged in user matches the invited email. Compare
        # case-insensitively/trimmed because auth lower-cases emails.
        if user_email != invited_email:
            return Response(
                {"detail": (
                    f"This invitation was sent to {member.email}, but you are signed in as "
                    f"{request.user.email}. Sign out and sign in with {member.email} to accept it."
                )},
                status=status.HTTP_400_BAD_REQUEST,
            )

        member.user = request.user
        member.status = 'ACTIVE'
        member.email = invited_email
        # Token is retained for idempotency to prevent React Strict Mode 404s
        member.save(update_fields=['user', 'status', 'email'])

        return Response({
            "detail": "Invitation accepted successfully.", 
            "organizer": member.organizer.company_name,
            "event_id": member.event_id
        })

class UserTeamRolesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        roles = TeamMember.objects.filter(user=request.user, status='ACTIVE')
        data = []
        for role in roles:
            data.append({
                'id': role.id,
                'organizer_name': role.organizer.company_name,
                'event_id': role.event.id if role.event else None,
                'event_title': role.event.title if role.event else 'All Events',
                'role': role.role,
                'scope': 'event' if role.event else 'all'
            })
        return Response(data, status=status.HTTP_200_OK)
