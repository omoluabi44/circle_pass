from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta

from api.permissions import IsOrganizer
from core.models import Event, Order, Ticket

class OrganizerAnalyticsView(APIView):
    """
    GET /api/organizer/analytics/
    Returns analytics metrics, 7-day revenue trend, and top events.
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizer]

    def get(self, request):
        user = request.user
        events = Event.objects.filter(organizer__user=user)

        # Base tickets and orders
        completed_orders = Order.objects.filter(event__in=events, status='COMPLETED')
        tickets = Ticket.objects.filter(order__in=completed_orders)

        # 1. Total Ticket Volume
        total_tickets = tickets.count()

        # 2. Total Revenue (in kobo)
        revenue_aggr = completed_orders.aggregate(total=Sum('total_amount'))
        total_revenue = revenue_aggr['total'] or 0

        # 3. Avg Check-in Rate
        checkins = tickets.filter(status='USED').count()
        checkin_rate = round((checkins / total_tickets) * 100) if total_tickets > 0 else 0

        # 4. Total Attendees (approximate by tickets or distinct guest_email/attendee)
        # We'll just use total_tickets for simplicity, or distinct emails on tickets
        total_attendees = tickets.values('attendee_email').distinct().count()

        # 5. Revenue Trends (Last 7 Days)
        today = timezone.now().date()
        seven_days_ago = today - timedelta(days=6)
        
        # Aggregate revenue by day
        daily_revenue = completed_orders.filter(
            created_at__date__gte=seven_days_ago
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            daily_total=Sum('total_amount')
        ).order_by('date')

        # Build map of date -> revenue
        revenue_map = {item['date']: item['daily_total'] for item in daily_revenue}
        
        trend_data = []
        for i in range(7):
            d = seven_days_ago + timedelta(days=i)
            rev_kobo = revenue_map.get(d, 0)
            trend_data.append({
                "day": d.strftime("%a"), # Mon, Tue, etc
                "revenue": rev_kobo
            })

        # 6. Top Performing Events (Top 3 by ticket sales)
        top_events_qs = events.annotate(
            sales=Count('orders__tickets', filter=Q(orders__status='COMPLETED'))
        ).order_by('-sales')[:3]

        top_events = [
            {"name": e.title, "sales": e.sales} for e in top_events_qs if e.sales > 0
        ]

        return Response({
            "metrics": {
                "total_tickets": total_tickets,
                "total_revenue": total_revenue,
                "checkin_rate": checkin_rate,
                "total_attendees": total_attendees,
            },
            "trends": trend_data,
            "top_events": top_events
        })
