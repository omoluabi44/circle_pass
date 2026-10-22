from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum, Count, Q
from core.models import User, OrganizerProfile, Event, Payout, Order, OrganizerVerification, Ticket
from .permissions import IsAdmin
from core.utils.notifications import send_event_status_update, send_organizer_verification_update
from rest_framework import serializers

# Simple serializers for Admin
class AdminUserSerializer(serializers.ModelSerializer):
    organizer_id = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'date_joined', 'organizer_id', 'company_name')

    def get_organizer_id(self, obj):
        try:
            return obj.organizerprofile.id
        except Exception:
            return None

    def get_company_name(self, obj):
        try:
            return obj.organizerprofile.company_name
        except Exception:
            return None

class AdminOrganizerVerificationSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='organizer.company_name', read_only=True)
    user_email = serializers.CharField(source='organizer.user.email', read_only=True)
    bio = serializers.CharField(source='organizer.bio', read_only=True)
    website = serializers.CharField(source='organizer.website', read_only=True)
    instagram_handle = serializers.CharField(source='organizer.instagram_handle', read_only=True)
    
    class Meta:
        model = OrganizerVerification
        fields = ('id', 'organizer', 'company_name', 'user_email', 'bio', 'website', 'instagram_handle', 'status', 'cac_document', 'id_document')

class AdminEventSerializer(serializers.ModelSerializer):
    organizer_name = serializers.CharField(source='organizer.company_name', read_only=True)
    venue_name = serializers.CharField(source='venue.name', read_only=True)
    
    class Meta:
        model = Event
        fields = ('id', 'title', 'slug', 'description', 'cover_image', 'capacity', 'event_type', 'is_online', 'venue_name', 'country', 'state', 'city', 'status', 'organizer_name', 'start_time', 'end_time', 'organizer_contact', 'emergency_contact', 'age_restriction', 'dress_code')

class AdminPayoutSerializer(serializers.ModelSerializer):
    organizer_name = serializers.CharField(source='wallet.organizer.company_name', read_only=True)
    
    class Meta:
        model = Payout
        fields = ('id', 'wallet', 'organizer_name', 'amount', 'status')

# Views
class AdminOverviewView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, *args, **kwargs):
        total_users = User.objects.count()
        active_events = Event.objects.filter(status__in=['PUBLISHED', 'LIVE']).count()
        events_awaiting_review = Event.objects.filter(status='UNDER_REVIEW').count()
        
        pending_payouts_count = Payout.objects.filter(status='Pending').count()
        failed_payouts_count = Payout.objects.filter(status='Failed').count()
        
        total_tickets_sold = Ticket.objects.filter(status__in=['ISSUED', 'ACTIVE', 'USED']).count()
        total_ticket_scans = Ticket.objects.filter(status='USED').count()
        
        platform_revenue = Order.objects.filter(status='COMPLETED').aggregate(total=Sum('fee_amount'))['total'] or 0
        
        return Response({
            'total_users': total_users,
            'active_events': active_events,
            'events_awaiting_review': events_awaiting_review,
            'pending_payouts_count': pending_payouts_count,
            'failed_payouts_count': failed_payouts_count,
            'total_tickets_sold': total_tickets_sold,
            'total_ticket_scans': total_ticket_scans,
            'platform_revenue': platform_revenue,
        })

class AdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = AdminUserSerializer

class AdminOrganizerVerificationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = OrganizerVerification.objects.all()
    serializer_class = AdminOrganizerVerificationSerializer

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        verif = self.get_object()
        verif.status = 'Verified'
        verif.save()
        
        # Mark profile as verified
        verif.organizer.is_verified = True
        verif.organizer.save()
        
        send_organizer_verification_update(verif)
        return Response({"status": "Verified"})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        verif = self.get_object()
        verif.status = 'Rejected'
        verif.save()
        
        verif.organizer.is_verified = False
        verif.organizer.save()
        
        send_organizer_verification_update(verif)
        return Response({"status": "Rejected"})

class AdminEventViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = Event.objects.all().order_by('-id')
    serializer_class = AdminEventSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        event = self.get_object()
        event.status = 'PUBLISHED'
        event.save()
        send_event_status_update(event)
        return Response({"status": "PUBLISHED"})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        event = self.get_object()
        event.status = 'REJECTED'
        event.save()
        send_event_status_update(event)
        return Response({"status": "REJECTED"})

class AdminPayoutViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = Payout.objects.all().order_by('-id')
    serializer_class = AdminPayoutSerializer

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        payout = self.get_object()
        if payout.status == 'Pending':
            payout.status = 'Completed'
            payout.save()
            
            # Deduct from wallet's pending balance
            wallet = payout.wallet
            wallet.pending_balance -= payout.amount
            if wallet.pending_balance < 0:
                wallet.pending_balance = 0
            wallet.save()
            
            return Response({"status": "Completed"})
        return Response({"detail": "Payout is not pending"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        payout = self.get_object()
        if payout.status == 'Pending':
            payout.status = 'Rejected'
            payout.save()
            
            # Refund to available balance? Depending on exact logic. Let's just update status for now.
            return Response({"status": "Rejected"})
        return Response({"detail": "Payout is not pending"}, status=status.HTTP_400_BAD_REQUEST)


class AdminReconcilePaymentsView(APIView):
    """
    POST /api/admin/reconcile-payments/

    Admin-only endpoint. Scans ALL PENDING and CANCELLED orders that have a
    Paystack payment reference, verifies each one against Paystack, and
    auto-fulfills any confirmed payments that never got tickets issued.

    Optional body param:
      { "hours": 72 }   (default: 72 hours look-back window)

    Returns a detailed list of every recovered order + attendee info.
    """
    permission_classes = [IsAdmin]

    def post(self, request):
        from core.models import Payment
        from core.utils.paystack import verify_transaction
        from core.utils.fulfillment import fulfill_order
        from django.utils import timezone
        from datetime import timedelta
        import logging

        logger = logging.getLogger(__name__)

        hours = int(request.data.get('hours', 72))
        cutoff = timezone.now() - timedelta(hours=hours)

        pending_payments = Payment.objects.filter(
            created_at__gte=cutoff,
            status__in=['PENDING', 'FAILED'],
            order__status__in=['PENDING', 'CANCELLED'],
        ).select_related('order', 'order__event', 'order__attendee__user').exclude(provider='FREE')

        total_checked = pending_payments.count()
        recovered = []
        already_paid = []
        failed_check = []

        for payment in pending_payments:
            if not payment.reference:
                continue
            try:
                res = verify_transaction(payment.reference)
                v_status = res.get('data', {}).get('status')

                if v_status == 'success':
                    # Already fulfilled check (idempotent)
                    if payment.order.status == 'COMPLETED':
                        already_paid.append(payment.reference)
                        continue

                    payment.status = 'SUCCESS'
                    payment.paid_at = timezone.now()
                    payment.channel = res['data'].get('channel', '')
                    payment.provider_data = res['data']
                    payment.save(update_fields=['status', 'paid_at', 'channel', 'provider_data', 'updated_at'])

                    tickets = fulfill_order(payment.order, payment=payment)
                    payment.order.refresh_from_db()

                    attendee_email = payment.order.guest_email or (
                        payment.order.attendee.user.email if payment.order.attendee else 'N/A'
                    )
                    attendee_name = payment.order.guest_name or (
                        payment.order.attendee.user.get_full_name() if payment.order.attendee else 'N/A'
                    )

                    recovered.append({
                        'order_id': payment.order_id,
                        'reference': payment.reference,
                        'attendee_name': attendee_name,
                        'attendee_email': attendee_email,
                        'event': payment.order.event.title if payment.order.event else 'N/A',
                        'amount_naira': payment.amount / 100,
                        'tickets_issued': len(tickets),
                        'ticket_qr_tokens': [t.qr_token for t in tickets],
                    })
                    logger.info(f"[Reconcile] Recovered order #{payment.order_id} ({attendee_email})")

            except Exception as e:
                failed_check.append({'reference': payment.reference, 'error': str(e)})
                logger.warning(f"[Reconcile] Error checking {payment.reference}: {e}")

        return Response({
            'look_back_hours': hours,
            'total_payments_checked': total_checked,
            'recovered_count': len(recovered),
            'recovered_orders': recovered,
            'already_paid_count': len(already_paid),
            'failed_checks': failed_check,
        })


class AdminOrganizerDetailView(APIView):
    """
    GET /api/admin/organizers/<pk>/
    Returns full dashboard view for a specific organizer:
    wallet balance, all events with tickets sold, capacity, revenue, ticket tiers, and recent orders.
    Accessible only by ADMIN.
    """
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        organizer = OrganizerProfile.objects.filter(Q(id=pk) | Q(user_id=pk)).first()
        if not organizer:
            return Response({"detail": "Organizer not found."}, status=status.HTTP_404_NOT_FOUND)

        # 1. Wallet & Bank Info
        try:
            from core.models import OrganizerWallet
            wallet = OrganizerWallet.objects.get(organizer=organizer)
            wallet_data = {
                "available_balance": wallet.available_balance,
                "total_earnings": wallet.total_earnings,
                "pending_balance": wallet.pending_balance,
                "total_payouts": wallet.total_payouts,
                "bank_name": wallet.bank_name,
                "account_number": wallet.account_number,
                "account_name": wallet.account_name,
            }
        except Exception:
            wallet_data = {
                "available_balance": 0,
                "total_earnings": 0,
                "pending_balance": 0,
                "total_payouts": 0,
                "bank_name": "",
                "account_number": "",
                "account_name": "",
            }

        # 2. Events & Metrics
        events_qs = Event.objects.filter(organizer=organizer).order_by('-id')
        total_tickets_sold = 0
        total_used_tickets = 0
        total_organizer_revenue = 0
        events_data = []

        for ev in events_qs:
            ev_tickets_sold = Ticket.objects.filter(order__event=ev, order__status='COMPLETED').count()
            ev_tickets_used = Ticket.objects.filter(order__event=ev, order__status='COMPLETED', status='USED').count()
            total_tickets_sold += ev_tickets_sold
            total_used_tickets += ev_tickets_used

            rev_aggr = Order.objects.filter(event=ev, status='COMPLETED').aggregate(
                subtotal_sum=Sum('subtotal'),
                discount_sum=Sum('discount_amount')
            )
            subtotal = rev_aggr['subtotal_sum'] or 0
            discount = rev_aggr['discount_sum'] or 0
            if getattr(ev, 'absorb_fees', False):
                ev_revenue = int((subtotal - discount) * 0.95)
            else:
                ev_revenue = subtotal - discount

            total_organizer_revenue += ev_revenue

            ticket_types_data = []
            for tt in ev.ticket_types.all():
                ticket_types_data.append({
                    "id": tt.id,
                    "name": tt.name,
                    "tier": tt.tier,
                    "price": tt.price,
                    "quantity": tt.quantity,
                    "quantity_sold": tt.quantity_sold,
                    "quantity_remaining": tt.quantity_remaining,
                    "is_sold_out": tt.is_sold_out,
                })

            events_data.append({
                "id": ev.id,
                "title": ev.title,
                "slug": ev.slug,
                "status": ev.status,
                "event_type": ev.event_type,
                "start_time": ev.start_time,
                "end_time": ev.end_time,
                "city": ev.city,
                "country": ev.country,
                "location_name": ev.location_name,
                "venue_name": ev.venue.name if ev.venue else (ev.location_name or "TBA"),
                "cover_image": ev.cover_image,
                "capacity": ev.capacity,
                "tickets_sold": ev_tickets_sold,
                "tickets_used": ev_tickets_used,
                "revenue": ev_revenue,
                "net_revenue": ev_revenue,
                "ticket_types": ticket_types_data,
                "ticket_tiers": ticket_types_data,
            })

        # 3. Recent Orders
        recent_orders_qs = Order.objects.filter(event__organizer=organizer, status='COMPLETED').order_by('-id')[:30]
        recent_orders_data = []
        for o in recent_orders_qs:
            ref = ""
            channel = "paystack"
            if hasattr(o, 'payment'):
                ref = o.payment.reference
                channel = o.payment.channel or "paystack"
            else:
                ref = f"ORD-{o.id}"

            customer_name = o.guest_name or (o.attendee.user.get_full_name() if o.attendee else "Customer")
            customer_email = o.guest_email or (o.attendee.user.email if o.attendee else "")

            recent_orders_data.append({
                "id": o.id,
                "order_number": f"ORD-{o.id}",
                "event_id": o.event_id,
                "event_title": o.event.title if o.event else "N/A",
                "customer_name": customer_name,
                "attendee_name": customer_name,
                "customer_email": customer_email,
                "attendee_email": customer_email,
                "amount": o.total_amount,
                "total_amount": o.total_amount,
                "tickets_count": o.tickets.count(),
                "ticket_count": o.tickets.count(),
                "created_at": o.created_at,
                "reference": ref,
                "paystack_reference": ref,
                "channel": channel,
                "status": o.status,
            })

        checkin_rate = round((total_used_tickets / total_tickets_sold * 100)) if total_tickets_sold > 0 else 0

        # Verification info
        try:
            verif = OrganizerVerification.objects.filter(organizer=organizer).first()
            verif_status = verif.status if verif else ("Verified" if organizer.is_verified else "Unverified")
            cac_doc = verif.cac_document.url if (verif and verif.cac_document) else None
            id_doc = verif.id_document.url if (verif and verif.id_document) else None
        except Exception:
            verif_status = "Verified" if organizer.is_verified else "Unverified"
            cac_doc = None
            id_doc = None

        summary_data = {
            "total_events": events_qs.count(),
            "total_tickets_sold": total_tickets_sold,
            "total_tickets_used": total_used_tickets,
            "total_revenue": total_organizer_revenue,
            "checkin_rate": checkin_rate,
            "active_events": sum(1 for e in events_data if e["status"] in ["PUBLISHED", "LIVE"]),
            "available_balance": wallet_data["available_balance"],
        }

        return Response({
            "organizer": {
                "id": organizer.id,
                "company_name": organizer.company_name,
                "contact_email": organizer.contact_email or organizer.user.email,
                "email": organizer.user.email,
                "username": organizer.user.username,
                "first_name": organizer.user.first_name,
                "last_name": organizer.user.last_name,
                "phone": getattr(organizer.user, "phone", None),
                "bio": organizer.bio,
                "website": organizer.website,
                "instagram_handle": organizer.instagram_handle,
                "logo": organizer.logo,
                "is_verified": organizer.is_verified,
                "verification_status": verif_status,
                "cac_document": cac_doc,
                "id_document": id_doc,
                "created_at": organizer.user.date_joined,
                "user": {
                    "id": organizer.user.id,
                    "username": organizer.user.username,
                    "email": organizer.user.email,
                    "date_joined": organizer.user.date_joined,
                }
            },
            "wallet": wallet_data,
            "summary": summary_data,
            "metrics": summary_data,
            "events": events_data,
            "recent_orders": recent_orders_data,
        })



# ─────────────────────────────────────────────────────────────────────────────
# ADMIN EDIT VIEWS
# ─────────────────────────────────────────────────────────────────────────────

from core.models import TicketType


class AdminOrganizerEditView(APIView):
    """PATCH /admin/organizers/<pk>/edit/ — update User + OrganizerProfile fields."""
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            organizer = OrganizerProfile.objects.select_related('user').get(pk=pk)
        except OrganizerProfile.DoesNotExist:
            return Response({'error': 'Organizer not found'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        user = organizer.user

        # ── User fields ───────────────────────────────────────────────────────
        user_changed = False
        for field in ('first_name', 'last_name', 'email', 'phone'):
            if field in data:
                setattr(user, field, data[field])
                user_changed = True
        if 'role' in data and data['role'] in ('ATTENDEE', 'ORGANIZER', 'ADMIN'):
            user.role = data['role']
            user_changed = True
        if user_changed:
            user.save()

        # ── OrganizerProfile fields ───────────────────────────────────────────
        org_changed = False
        for field in ('company_name', 'contact_email', 'bio', 'website', 'instagram_handle'):
            if field in data:
                setattr(organizer, field, data[field])
                org_changed = True
        if 'is_verified' in data:
            organizer.is_verified = bool(data['is_verified'])
            org_changed = True
        if org_changed:
            organizer.save()

        return Response({'success': True, 'message': 'Organizer updated successfully'})


class AdminEventDetailView2(APIView):
    """GET /admin/events/<pk>/detail/ — full event data for the edit form."""
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        try:
            event = Event.objects.select_related('organizer', 'organizer__user', 'category', 'venue').get(pk=pk)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found'}, status=status.HTTP_404_NOT_FOUND)

        ticket_types = TicketType.objects.filter(event=event).order_by('sort_order', 'price')
        tts = []
        for tt in ticket_types:
            tts.append({
                'id': tt.id,
                'name': tt.name,
                'tier': tt.tier,
                'description': tt.description,
                'price': tt.price,           # kobo
                'price_naira': tt.price / 100,
                'quantity': tt.quantity,
                'quantity_sold': tt.quantity_sold,
                'sale_start': tt.sale_start,
                'sale_end': tt.sale_end,
                'is_active': tt.is_active,
                'sort_order': tt.sort_order,
            })

        # All organizers for reassign dropdown
        all_organizers = OrganizerProfile.objects.select_related('user').order_by('company_name')
        organizers_list = [
            {'id': o.id, 'company_name': o.company_name, 'email': o.user.email}
            for o in all_organizers
        ]

        return Response({
            'event': {
                'id': event.id,
                'title': event.title,
                'slug': event.slug,
                'description': event.description,
                'cover_image': event.cover_image,
                'event_type': event.event_type,
                'status': event.status,
                'country': event.country,
                'state': event.state,
                'city': event.city,
                'location_name': event.location_name,
                'start_time': event.start_time,
                'end_time': event.end_time,
                'capacity': event.capacity,
                'organizer_contact': event.organizer_contact,
                'instagram_handle': event.instagram_handle,
                'tiktok_handle': event.tiktok_handle,
                'emergency_contact': event.emergency_contact,
                'age_restriction': event.age_restriction,
                'dress_code': event.dress_code,
                'lineup': event.lineup,
                'absorb_fees': event.absorb_fees,
                'sales_paused': event.sales_paused,
                'waitlist_enabled': event.waitlist_enabled,
                'organizer_id': event.organizer.id,
                'organizer_name': event.organizer.company_name,
                'category_id': event.category_id,
            },
            'ticket_types': tts,
            'all_organizers': organizers_list,
        })


class AdminEventEditView(APIView):
    """PATCH /admin/events/<pk>/edit/ — update event fields + reassign organizer."""
    permission_classes = [IsAdmin]

    EDITABLE_FIELDS = [
        'title', 'description', 'cover_image', 'event_type', 'status',
        'country', 'state', 'city', 'location_name',
        'start_time', 'end_time', 'capacity',
        'organizer_contact', 'instagram_handle', 'tiktok_handle',
        'emergency_contact', 'age_restriction', 'dress_code', 'lineup',
        'absorb_fees', 'sales_paused', 'waitlist_enabled',
    ]

    def patch(self, request, pk):
        try:
            event = Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data

        for field in self.EDITABLE_FIELDS:
            if field in data:
                val = data[field]
                if field in ('start_time', 'end_time'):
                    val = val if val else None
                elif field == 'capacity':
                    try:
                        val = int(val) if val is not None and val != '' else 0
                    except (ValueError, TypeError):
                        val = 0
                elif field in ('absorb_fees', 'sales_paused', 'waitlist_enabled'):
                    val = bool(val)
                setattr(event, field, val)

        if 'organizer_id' in data and data['organizer_id']:
            try:
                org = OrganizerProfile.objects.get(pk=data['organizer_id'])
                event.organizer = org
            except OrganizerProfile.DoesNotExist:
                return Response({'error': 'Organizer not found'}, status=status.HTTP_400_BAD_REQUEST)

        event.save()
        return Response({'success': True, 'message': 'Event updated successfully'})


class AdminTicketTypeListCreateView(APIView):
    """
    GET  /admin/events/<event_pk>/ticket-types/  — list ticket types
    POST /admin/events/<event_pk>/ticket-types/  — create new ticket type
    """
    permission_classes = [IsAdmin]

    def get(self, request, event_pk):
        try:
            event = Event.objects.get(pk=event_pk)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found'}, status=404)
        tts = TicketType.objects.filter(event=event).order_by('sort_order', 'price')
        data = [{
            'id': tt.id,
            'name': tt.name,
            'tier': tt.tier,
            'description': tt.description,
            'price': tt.price,
            'price_naira': tt.price / 100,
            'quantity': tt.quantity,
            'quantity_sold': tt.quantity_sold,
            'sale_start': tt.sale_start,
            'sale_end': tt.sale_end,
            'is_active': tt.is_active,
            'sort_order': tt.sort_order,
        } for tt in tts]
        return Response(data)

    def post(self, request, event_pk):
        try:
            event = Event.objects.get(pk=event_pk)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found'}, status=404)

        d = request.data
        try:
            price_naira = float(d.get('price_naira', 0)) if d.get('price_naira') not in (None, '') else 0
        except (ValueError, TypeError):
            price_naira = 0
        price_kobo = int(round(price_naira * 100))

        try:
            qty = int(d.get('quantity', 0)) if d.get('quantity') not in (None, '') else 0
        except (ValueError, TypeError):
            qty = 0

        try:
            s_order = int(d.get('sort_order', 0)) if d.get('sort_order') not in (None, '') else 0
        except (ValueError, TypeError):
            s_order = 0

        tt = TicketType.objects.create(
            event=event,
            name=d.get('name', 'New Ticket'),
            tier=d.get('tier', 'REGULAR'),
            description=d.get('description', ''),
            price=price_kobo,
            quantity=qty,
            sale_start=d.get('sale_start') or None,
            sale_end=d.get('sale_end') or None,
            is_active=bool(d.get('is_active', True)),
            sort_order=s_order,
        )
        return Response({
            'id': tt.id,
            'name': tt.name,
            'tier': tt.tier,
            'description': tt.description,
            'price': tt.price,
            'price_naira': tt.price / 100,
            'quantity': tt.quantity,
            'quantity_sold': tt.quantity_sold,
            'is_active': tt.is_active,
            'sort_order': tt.sort_order,
        }, status=201)


class AdminTicketTypeDetailView(APIView):
    """
    PATCH  /admin/ticket-types/<pk>/  — update ticket type
    DELETE /admin/ticket-types/<pk>/  — delete (only if no sales)
    """
    permission_classes = [IsAdmin]

    def _get_tt(self, pk):
        try:
            return TicketType.objects.get(pk=pk)
        except TicketType.DoesNotExist:
            return None

    def patch(self, request, pk):
        tt = self._get_tt(pk)
        if not tt:
            return Response({'error': 'Ticket type not found'}, status=404)

        d = request.data
        if 'name' in d:
            tt.name = d['name']
        if 'tier' in d:
            tt.tier = d['tier']
        if 'description' in d:
            tt.description = d['description']
        if 'price_naira' in d:
            try:
                tt.price = int(round(float(d['price_naira']) * 100))
            except (ValueError, TypeError):
                pass
        if 'price' in d:   # allow raw kobo too
            try:
                tt.price = int(d['price'])
            except (ValueError, TypeError):
                pass
        if 'quantity' in d:
            try:
                new_qty = int(d['quantity'])
                if new_qty < tt.quantity_sold:
                    return Response(
                        {'error': f'Cannot set quantity below tickets already sold ({tt.quantity_sold})'},
                        status=400
                    )
                tt.quantity = new_qty
            except (ValueError, TypeError):
                pass
        if 'sale_start' in d:
            tt.sale_start = d['sale_start'] or None
        if 'sale_end' in d:
            tt.sale_end = d['sale_end'] or None
        if 'is_active' in d:
            tt.is_active = bool(d['is_active'])
        if 'sort_order' in d:
            try:
                tt.sort_order = int(d['sort_order'])
            except (ValueError, TypeError):
                pass

        tt.save()
        return Response({
            'id': tt.id,
            'name': tt.name,
            'tier': tt.tier,
            'price': tt.price,
            'price_naira': tt.price / 100,
            'quantity': tt.quantity,
            'quantity_sold': tt.quantity_sold,
            'is_active': tt.is_active,
        })

    def delete(self, request, pk):
        tt = self._get_tt(pk)
        if not tt:
            return Response({'error': 'Ticket type not found'}, status=404)
        if tt.quantity_sold > 0:
            return Response(
                {'error': f'Cannot delete: {tt.quantity_sold} ticket(s) already sold. Deactivate instead.'},
                status=400
            )
        tt.delete()
        return Response({'success': True, 'message': 'Ticket type deleted'})



class AdminTicketListView(APIView):
    """GET /admin/tickets/ — list and search all attendee tickets across all events."""
    permission_classes = [IsAdmin]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        status_filter = request.query_params.get('status', '').strip()
        event_filter = request.query_params.get('event_id', '').strip()

        qs = Ticket.objects.select_related('order', 'order__event', 'ticket_type').order_by('-created_at')

        if q:
            qs = qs.filter(
                Q(attendee_name__icontains=q) |
                Q(attendee_email__icontains=q) |
                Q(qr_token__icontains=q) |
                Q(order__order_number__icontains=q) |
                Q(order__event__title__icontains=q)
            )

        if status_filter and status_filter != 'ALL':
            qs = qs.filter(status=status_filter)

        if event_filter:
            try:
                qs = qs.filter(order__event_id=int(event_filter))
            except (ValueError, TypeError):
                pass

        tickets_data = []
        for t in qs[:200]:
            tickets_data.append({
                'id': t.id,
                'qr_token': t.qr_token,
                'status': t.status,
                'attendee_name': t.attendee_name or (t.order.guest_name if t.order else ''),
                'attendee_email': t.attendee_email or (t.order.guest_email if t.order else ''),
                'ticket_type_id': t.ticket_type_id,
                'ticket_type_name': t.ticket_type.name if t.ticket_type else 'Unknown',
                'ticket_tier': t.ticket_type.tier if t.ticket_type else '',
                'price': t.ticket_type.price if t.ticket_type else 0,
                'price_naira': (t.ticket_type.price / 100) if t.ticket_type else 0,
                'order_id': t.order_id,
                'order_number': t.order.order_number if (t.order and hasattr(t.order, 'order_number')) else f"ORD-{t.order_id}",
                'event_id': t.order.event_id if t.order else None,
                'event_title': t.order.event.title if (t.order and t.order.event) else 'Unknown',
                'created_at': t.created_at,
            })

        events = Event.objects.order_by('-id').values('id', 'title')[:100]

        return Response({
            'tickets': tickets_data,
            'total': qs.count(),
            'events': list(events),
        })


class AdminTicketDetailView(APIView):
    """GET / PATCH / DELETE /api/admin/tickets/<pk>/"""
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        try:
            t = Ticket.objects.select_related('order', 'order__event', 'ticket_type').get(pk=pk)
        except Ticket.DoesNotExist:
            return Response({'error': 'Ticket not found'}, status=404)

        available_types = []
        if t.order and t.order.event:
            available_types = list(TicketType.objects.filter(event=t.order.event).values('id', 'name', 'tier', 'price'))

        return Response({
            'ticket': {
                'id': t.id,
                'qr_token': t.qr_token,
                'status': t.status,
                'attendee_name': t.attendee_name or (t.order.guest_name if t.order else ''),
                'attendee_email': t.attendee_email or (t.order.guest_email if t.order else ''),
                'ticket_type_id': t.ticket_type_id,
                'ticket_type_name': t.ticket_type.name if t.ticket_type else '',
                'price': t.ticket_type.price if t.ticket_type else 0,
                'price_naira': (t.ticket_type.price / 100) if t.ticket_type else 0,
                'order_id': t.order_id,
                'order_number': t.order.order_number if (t.order and hasattr(t.order, 'order_number')) else f"ORD-{t.order_id}",
                'event_id': t.order.event_id if t.order else None,
                'event_title': t.order.event.title if (t.order and t.order.event) else '',
                'created_at': t.created_at,
            },
            'available_types': available_types,
        })

    def patch(self, request, pk):
        try:
            t = Ticket.objects.get(pk=pk)
        except Ticket.DoesNotExist:
            return Response({'error': 'Ticket not found'}, status=404)

        d = request.data
        if 'attendee_name' in d:
            t.attendee_name = d['attendee_name']
        if 'attendee_email' in d:
            t.attendee_email = d['attendee_email']
        if 'status' in d and d['status'] in ('PENDING', 'ISSUED', 'ACTIVE', 'USED', 'EXPIRED', 'INVALIDATED'):
            t.status = d['status']
        if 'ticket_type_id' in d and d['ticket_type_id']:
            try:
                tt = TicketType.objects.get(pk=d['ticket_type_id'])
                t.ticket_type = tt
            except TicketType.DoesNotExist:
                return Response({'error': 'Invalid ticket type'}, status=400)

        t.save()
        return Response({'success': True, 'message': 'Ticket updated successfully'})

    def delete(self, request, pk):
        try:
            t = Ticket.objects.get(pk=pk)
        except Ticket.DoesNotExist:
            return Response({'error': 'Ticket not found'}, status=404)

        t.delete()
        return Response({'success': True, 'message': 'Ticket deleted'})
