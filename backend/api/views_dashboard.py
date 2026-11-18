from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Sum, Count, Q
from core.models import Event, Order, Ticket, OrganizerWallet, Referral


def _referral_summary(events, limit=5):
    """Referral performance for the dashboard.

    Every saved code is listed, even before it has a sale, so an organizer who
    just created codes does not see an empty panel. Completed orders are then
    attached; codes found only on orders (deleted or typed manually) are still
    counted so no sale disappears from the totals.
    """
    rows = []
    seen = set()

    for referral in Referral.objects.filter(event__in=events).select_related('event'):
        orders = referral.sales_queryset()
        totals = orders.aggregate(
            tickets=Sum('items__quantity'),
            revenue=Sum('total_amount'),
        )
        seen.add((referral.event_id, referral.code.upper()))
        rows.append({
            'referral_code': referral.code,
            'referral_name': referral.name,
            'event_id': referral.event_id,
            'event_title': referral.event.title,
            'is_active': referral.is_active,
            'sales': orders.count(),
            'tickets': int(totals['tickets'] or 0),
            'revenue': int(totals['revenue'] or 0),
        })

    extra_codes = (
        Order.objects.filter(event__in=events, status='COMPLETED')
        .exclude(referral_code='')
        .values('event_id', 'event__title', 'referral_code')
        .annotate(
            sales=Count('id', distinct=True),
            tickets=Sum('items__quantity'),
            revenue=Sum('total_amount'),
        )
    )
    for row in extra_codes:
        key = (row['event_id'], (row['referral_code'] or '').upper())
        if key in seen:
            continue
        seen.add(key)
        rows.append({
            'referral_code': row['referral_code'],
            'referral_name': '',
            'event_id': row['event_id'],
            'event_title': row['event__title'],
            'is_active': False,
            'sales': row['sales'],
            'tickets': int(row['tickets'] or 0),
            'revenue': int(row['revenue'] or 0),
        })

    # Codes with sales first, then the newest idle codes.
    rows.sort(key=lambda r: (-r['sales'], -r['tickets'], r['referral_code']))
    return rows[:limit]


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
            # Revenue (Organizer Net Revenue: subtotal - discount_amount, excluding CirclePass fee)
            revenue_aggr = Order.objects.filter(event=event, status='COMPLETED').aggregate(
                subtotal_sum=Sum('subtotal'),
                discount_sum=Sum('discount_amount')
            )
            subtotal = revenue_aggr['subtotal_sum'] or 0
            discount = revenue_aggr['discount_sum'] or 0
            if getattr(event, 'absorb_fees', False):
                # When organizer absorbs the fee, CirclePass takes 5%
                revenue = int((subtotal - discount) * 0.95)
            else:
                # When buyer pays fee, organizer gets full subtotal - discount
                revenue = subtotal - discount
            
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
        # Start from the codes the organizer created, so a new code shows up
        # immediately (at zero) instead of the dashboard looking empty until
        # the first sale lands. Completed orders are then attached to it.
        referrals = _referral_summary(events=events)

        return Response({
            "available_balance": available_balance,
            "tickets_sold": tickets_sold,
            "checkin_rate": checkin_rate,
            "active_events": active_events_data,
            "followers_count": followers_count,
            "referrals": referrals
        })
