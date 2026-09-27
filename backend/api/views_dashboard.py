from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Sum, Count, Q
from core.models import Event, Order, Ticket, OrganizerWallet

class OrganizerDashboardView(APIView):
    """
    GET /api/organizer/dashboard/
    Returns summary statistics and a list of recent events.
    Accessible by ORGANIZER and ADMIN roles.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        # Only organizers and admins can access this view
        if user.role not in ('ORGANIZER', 'ADMIN'):
            return Response({"detail": "You do not have permission to access this page."}, status=403)

        # 1. Available Balance
        try:
            wallet = OrganizerWallet.objects.get(organizer__user=user)
            available_balance = wallet.available_balance
        except OrganizerWallet.DoesNotExist:
            available_balance = 0

        # Base queryset for this user's events (works for both ORGANIZER and ADMIN roles)
        events = Event.objects.filter(organizer__user=user)
        
        # 2. Tickets Sold (30d) - for simplicity right now, we do all time tickets sold for this organizer's events
        tickets_sold = Ticket.objects.filter(
            order__event__in=events,
            order__status='COMPLETED'
        ).count()

        # 3. Avg Check-in Rate
        total_checkins = Ticket.objects.filter(
            order__event__in=events,
            order__status='COMPLETED',
            status='USED'
        ).count()
        
        checkin_rate = 0
        if tickets_sold > 0:
            checkin_rate = round((total_checkins / tickets_sold) * 100)

        # 4. Active Events list (fetch recent or active ones)
        # We annotate sales and revenue
        active_events_data = []
        for event in events.order_by('-id')[:5]:
            # Sales
            event_tickets = Ticket.objects.filter(order__event=event, order__status='COMPLETED').count()
            # Revenue (Sum of order totals for this event)
            revenue_aggr = Order.objects.filter(event=event, status='COMPLETED').aggregate(total=Sum('total_amount'))
            revenue = revenue_aggr['total'] or 0
            
            capacity = event.capacity or 0
            
            active_events_data.append({
                "id": event.id,
                "title": event.title,
                "status": event.status,
                "tickets_sold": event_tickets,
                "capacity": capacity,
                "revenue": revenue,
            })

        # 5. Total Followers
        followers_count = 0
        if user.role == 'ORGANIZER':
            from core.models import FollowedOrganizer
            followers_count = FollowedOrganizer.objects.filter(organizer__user=user).count()
            
        # 6. Referrals summary
        referrals_qs = Order.objects.filter(
            event__in=events, 
            status='COMPLETED'
        ).exclude(referral_code='').values('referral_code').annotate(
            sales=Count('id'),
            revenue=Sum('total_amount')
        ).order_by('-sales')[:5]
        referrals = list(referrals_qs)

        return Response({
            "available_balance": available_balance,
            "tickets_sold": tickets_sold,
            "checkin_rate": checkin_rate,
            "active_events": active_events_data,
            "followers_count": followers_count,
            "referrals": referrals
        })
