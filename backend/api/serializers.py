from rest_framework import serializers
from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer, UserSerializer as BaseUserSerializer
from core.models import (
    User, OrganizerProfile, Event, TicketType, Order, OrderItem, Ticket, EventCategory, Venue,
    OrganizerWallet, WalletTransaction, Payout, SavedEvent, FollowedOrganizer
)


# ==========================================
# AUTH SERIALIZERS
# ==========================================
class UserCreateSerializer(BaseUserCreateSerializer):
    phone_number = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta(BaseUserCreateSerializer.Meta):
        model = User
        fields = ('id', 'username', 'email', 'password', 'role', 'phone_number')

    def validate(self, attrs):
        phone_number = attrs.pop('phone_number', None)
        attrs = super().validate(attrs)
        if phone_number is not None:
            attrs['phone_number'] = phone_number
        return attrs

    def create(self, validated_data):
        phone_number = validated_data.pop('phone_number', '')
        user = super().create(validated_data)
        
        if user.role == 'ATTENDEE':
            from core.models import AttendeeProfile
            profile, _ = AttendeeProfile.objects.get_or_create(user=user)
            if phone_number:
                profile.phone_number = phone_number
                profile.save()
        elif user.role == 'ORGANIZER':
            if phone_number:
                profile, _ = OrganizerProfile.objects.get_or_create(user=user)
                # Organizer profile doesn't have phone_number field explicitly, maybe save in contact_email or just ignore
                pass
                
        return user

class UserSerializer(BaseUserSerializer):
    class Meta(BaseUserSerializer.Meta):
        model = User
        fields = ('id', 'username', 'email', 'role')

class OrganizerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizerProfile
        fields = ('id', 'company_name', 'is_verified', 'contact_email', 'bio', 'website', 'instagram_handle', 'logo')

from core.models import OrganizerVerification

class OrganizerVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizerVerification
        fields = ('id', 'status', 'cac_document', 'id_document', 'updated_at')
        read_only_fields = ('id', 'status', 'updated_at')


# ==========================================
# TICKET TYPE SERIALIZERS
# ==========================================
class TicketTypeSerializer(serializers.ModelSerializer):
    quantity_remaining = serializers.IntegerField(read_only=True)
    is_sold_out = serializers.BooleanField(read_only=True)

    class Meta:
        model = TicketType
        fields = (
            'id', 'tier', 'name', 'description', 'price',
            'quantity', 'quantity_sold', 'quantity_remaining', 'is_sold_out',
            'sale_start', 'sale_end', 'is_active', 'sort_order',
        )
        read_only_fields = ('quantity_sold',)


class TicketTypeCreateSerializer(serializers.ModelSerializer):
    """Used when creating/updating ticket types within an event."""
    id = serializers.IntegerField(required=False)

    class Meta:
        model = TicketType
        fields = (
            'id', 'tier', 'name', 'description', 'price',
            'quantity', 'sale_start', 'sale_end', 'is_active', 'sort_order',
        )

    def validate(self, data):
        tier = data.get('tier', 'REGULAR')
        price = data.get('price', 0)
        if tier == 'FREE' and price != 0:
            raise serializers.ValidationError({'price': 'Free-tier tickets must have a price of ₦0.'})
        if tier != 'FREE' and price <= 0:
            raise serializers.ValidationError({'price': 'Paid ticket tiers must have a price greater than ₦0.'})
        return data


class EventCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EventCategory
        fields = ('id', 'name', 'slug', 'icon_name', 'image_url')

class VenueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venue
        fields = ('id', 'name', 'location', 'latitude', 'longitude')

# ==========================================
# EVENT SERIALIZERS
# ==========================================
class EventSerializer(serializers.ModelSerializer):
    organizer_name = serializers.CharField(source='organizer.company_name', read_only=True)
    organizer_instagram = serializers.CharField(source='organizer.instagram_handle', read_only=True)
    organizer_website = serializers.CharField(source='organizer.website', read_only=True)
    organizer_logo = serializers.URLField(source='organizer.logo', read_only=True)
    ticket_types = TicketTypeSerializer(many=True, read_only=True)
    category = EventCategorySerializer(read_only=True)
    venue = VenueSerializer(read_only=True)

    is_followed = serializers.SerializerMethodField()
    follower_count = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = (
            'id', 'organizer', 'organizer_name', 'organizer_logo', 'organizer_instagram', 'organizer_website', 'category', 'venue',
            'title', 'slug', 'description', 'cover_image', 'capacity', 'event_type',
            'country', 'state', 'city', 'organizer_contact', 'emergency_contact', 
            'age_restriction', 'dress_code', 'lineup', 'personalized_dp_enabled',
            'is_online', 'status', 'absorb_fees', 'start_time', 'end_time', 'ticket_types',
            'sales_paused', 'waitlist_enabled', 'is_followed', 'follower_count'
        )

    cover_image = serializers.SerializerMethodField()

    def get_cover_image(self, obj):
        cover = obj.cover_image
        if not cover:
            return None
        if cover.startswith(('http://', 'https://')):
            return cover
            
        # Ensure it has the /media/ prefix if it's a relative path
        if not cover.startswith('/'):
            if not cover.startswith('media/'):
                cover = f'/media/{cover}'
            else:
                cover = f'/{cover}'
                
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(cover)
        
        # Fallback if no request context
        from django.conf import settings
        return f"http://127.0.0.1:8000{cover}"

    def get_is_followed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from core.models import FollowedOrganizer
            return FollowedOrganizer.objects.filter(organizer=obj.organizer, user=request.user).exists()
        return False

    def get_follower_count(self, obj):
        from core.models import FollowedOrganizer
        return FollowedOrganizer.objects.filter(organizer=obj.organizer).count()


class EventCreateUpdateSerializer(serializers.ModelSerializer):
    ticket_types = TicketTypeCreateSerializer(many=True, required=False)
    venue_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    category_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    category = serializers.PrimaryKeyRelatedField(
        queryset=EventCategory.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Event
        fields = (
            'id', 'category', 'category_name', 'venue', 'venue_name', 'title', 'description', 'cover_image', 'capacity',
            'event_type', 'country', 'state', 'city', 'organizer_contact', 'emergency_contact', 
            'age_restriction', 'dress_code', 'lineup', 'personalized_dp_enabled', 'sales_paused', 'waitlist_enabled',
            'is_online', 'status', 'absorb_fees', 'start_time', 'end_time', 'ticket_types',
        )

    def to_internal_value(self, data):
        # In multipart/form-data requests, data is often a QueryDict
        if hasattr(data, 'dict'):
            clean_data = data.dict()
        elif hasattr(data, 'copy'):
            clean_data = dict(data.copy())
        else:
            clean_data = dict(data)

        # Handle venue string (if not a foreign key integer)
        venue_val = clean_data.pop('venue', None)
        if venue_val:
            if isinstance(venue_val, list):
                venue_val = venue_val[0] if venue_val else ''
            if isinstance(venue_val, str) and not venue_val.isdigit():
                clean_data['venue_name'] = venue_val.strip()
            elif isinstance(venue_val, (int, str)) and str(venue_val).isdigit():
                clean_data['venue'] = int(venue_val)
                
        # Handle category string
        category_val = clean_data.pop('category', None)
        if category_val:
            if isinstance(category_val, list):
                category_val = category_val[0] if category_val else ''
            if isinstance(category_val, str) and not category_val.isdigit():
                clean_data['category_name'] = category_val.strip()
            elif isinstance(category_val, (int, str)) and str(category_val).isdigit():
                clean_data['category'] = int(category_val)

        # Handle multipart/form-data where ticket_types is sent as a JSON string
        ticket_types_val = clean_data.get('ticket_types')
        if ticket_types_val and isinstance(ticket_types_val, str):
            import json
            try:
                clean_data['ticket_types'] = json.loads(ticket_types_val)
            except json.JSONDecodeError:
                pass

        return super().to_internal_value(clean_data)

    def create(self, validated_data):
        ticket_types_data = validated_data.pop('ticket_types', [])
        venue_name = validated_data.pop('venue_name', None)
        category_name = validated_data.pop('category_name', None)
        
        if venue_name:
            venue, _ = Venue.objects.get_or_create(
                name=venue_name, 
                defaults={'location': venue_name}
            )
            validated_data['venue'] = venue
            
        if category_name:
            from django.utils.text import slugify
            cat, _ = EventCategory.objects.get_or_create(slug=slugify(category_name), defaults={'name': category_name.title()})
            validated_data['category'] = cat
            
        # Generate slug
        title = validated_data.get('title', '')
        from django.utils.text import slugify
        base_slug = slugify(title) or 'event'
        slug = base_slug
        import uuid
        slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"
        validated_data['slug'] = slug
            
        event = Event.objects.create(**validated_data)
        for idx, ticket_data in enumerate(ticket_types_data):
            ticket_data.setdefault('sort_order', idx)
            TicketType.objects.create(event=event, **ticket_data)
        return event

    def update(self, instance, validated_data):
        ticket_types_data = validated_data.pop('ticket_types', None)
        venue_name = validated_data.pop('venue_name', None)
        category_name = validated_data.pop('category_name', None)
        
        if venue_name:
            venue, _ = Venue.objects.get_or_create(
                name=venue_name, 
                defaults={'location': venue_name}
            )
            validated_data['venue'] = venue
            
        if category_name:
            from django.utils.text import slugify
            cat, _ = EventCategory.objects.get_or_create(slug=slugify(category_name), defaults={'name': category_name.title()})
            validated_data['category'] = cat

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if ticket_types_data is not None:
            # Only delete ticket types that have zero sales.
            # Ticket types with sales are preserved to protect existing orders.
            existing_ids = set(instance.ticket_types.values_list('id', flat=True))
            incoming_ids = {t.get('id') for t in ticket_types_data if t.get('id')}

            # IDs to delete: exist in DB but not in incoming data AND have 0 sales
            ids_to_remove = existing_ids - incoming_ids
            removable = instance.ticket_types.filter(id__in=ids_to_remove, quantity_sold=0)
            protected_count = instance.ticket_types.filter(id__in=ids_to_remove).exclude(quantity_sold=0).count()
            removable.delete()

            if protected_count > 0:
                # We don't fail the entire update; we just skip deleting sold ticket types.
                pass

            # Upsert remaining ticket types
            for idx, ticket_data in enumerate(ticket_types_data):
                ticket_id = ticket_data.pop('id', None)
                ticket_data.setdefault('sort_order', idx)
                if ticket_id and ticket_id in existing_ids:
                    instance.ticket_types.filter(id=ticket_id).update(**ticket_data)
                else:
                    TicketType.objects.create(event=instance, **ticket_data)

        return instance


# ==========================================
# CHECKOUT SERIALIZERS
# ==========================================
class CheckoutItemSerializer(serializers.Serializer):
    """A single line item in the checkout request."""
    ticket_type_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=10)


class CheckoutRequestSerializer(serializers.Serializer):
    """Payload for the checkout endpoint."""
    event_id = serializers.IntegerField()
    items = CheckoutItemSerializer(many=True, min_length=1)
    # Optional guest checkout fields
    guest_name = serializers.CharField(required=False, allow_blank=True, default='')
    guest_email = serializers.EmailField(required=False, allow_blank=True, default='')
    guest_phone = serializers.CharField(required=False, allow_blank=True, default='')
    
    # Discounts & Referrals
    discount_code = serializers.CharField(required=False, allow_blank=True, default='')


class OrderItemSerializer(serializers.ModelSerializer):
    ticket_type_name = serializers.CharField(source='ticket_type.name', read_only=True)
    ticket_type_tier = serializers.CharField(source='ticket_type.tier', read_only=True)

    class Meta:
        model = OrderItem
        fields = ('id', 'ticket_type', 'ticket_type_name', 'ticket_type_tier',
                  'quantity', 'unit_price', 'line_total')


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'event', 'subtotal', 'discount_amount', 'fee_amount',
            'total_amount', 'status', 'items', 'created_at',
        )


class TicketSerializer(serializers.ModelSerializer):
    ticket_type_name = serializers.CharField(source='ticket_type.name', read_only=True)
    ticket_type_tier = serializers.CharField(source='ticket_type.tier', read_only=True)
    event_title = serializers.CharField(source='order.event.title', read_only=True)
    event_start_time = serializers.DateTimeField(source='order.event.start_time', read_only=True)
    event_end_time = serializers.DateTimeField(source='order.event.end_time', read_only=True)
    event_image = serializers.SerializerMethodField()
    event_venue = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            'id', 'ticket_type_name', 'ticket_type_tier', 'event_title',
            'event_start_time', 'event_end_time', 'event_image', 'event_venue',
            'attendee_name', 'attendee_email', 'status', 'qr_token',
            'issued_at', 'created_at',
        )

    def get_event_venue(self, obj):
        venue = obj.order.event.venue
        return venue.name if venue else None
        
    def get_event_image(self, obj):
        cover = obj.order.event.cover_image
        if not cover:
            return None
        # cover_image is a URLField (plain string), not a FileField
        # If it's already an absolute URL, return it directly
        if cover.startswith(('http://', 'https://')):
            return cover
            
        # Ensure it has the /media/ prefix if it's a relative path
        if not cover.startswith('/'):
            if not cover.startswith('media/'):
                cover = f'/media/{cover}'
            else:
                cover = f'/{cover}'
                
        # Build an absolute URI from the request
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(cover)
        return cover


# ==========================================
# WALLET & PAYOUT SERIALIZERS
# ==========================================
class OrganizerWalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizerWallet
        fields = ('pending_balance', 'available_balance', 'total_earnings', 'total_payouts', 'updated_at', 'bank_name', 'bank_code', 'account_number', 'account_name')
        read_only_fields = ('pending_balance', 'available_balance', 'total_earnings', 'total_payouts', 'updated_at')


class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = ('id', 'type', 'amount', 'balance_after', 'reference', 'description', 'created_at')
        read_only_fields = fields


class PayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payout
        fields = (
            'id', 'amount', 'status', 'reference', 'bank_name',
            'account_number', 'account_name', 'rejection_reason',
            'requested_at', 'processed_at',
        )
        read_only_fields = fields


class PayoutRequestSerializer(serializers.Serializer):
    """Validates an organizer's payout withdrawal request."""
    amount = serializers.IntegerField(min_value=100000, help_text='Amount in kobo. Minimum ₦1,000.')
    bank_code = serializers.CharField(max_length=10)
    account_number = serializers.CharField(max_length=20)
    account_name = serializers.CharField(max_length=255)
    bank_name = serializers.CharField(max_length=100)


class AdminPayoutSerializer(serializers.ModelSerializer):
    organizer_name = serializers.CharField(source='wallet.organizer.company_name', read_only=True)
    organizer_email = serializers.EmailField(source='wallet.organizer.user.email', read_only=True)

    class Meta:
        model = Payout
        fields = (
            'id', 'amount', 'status', 'reference', 'bank_name',
            'account_number', 'account_name', 'bank_code',
            'organizer_name', 'organizer_email', 'rejection_reason',
            'requested_at', 'processed_at',
        )
        read_only_fields = fields


# ==========================================
# FIND TICKET SERIALIZERS
# ==========================================
class FindTicketRequestSerializer(serializers.Serializer):
    """At least one lookup field is required."""
    reference = serializers.CharField(required=False, allow_blank=True, default='')
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    phone = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        if not any([data.get('reference'), data.get('email'), data.get('phone')]):
            raise serializers.ValidationError('At least one of reference, email, or phone is required.')
        return data


class FindTicketResultSerializer(serializers.Serializer):
    event_title = serializers.CharField()
    ticket_type_name = serializers.CharField()
    attendee_name_masked = serializers.CharField()
    attendee_email_masked = serializers.CharField()
    status = serializers.CharField()
    order_reference = serializers.CharField()
    ticket_count = serializers.IntegerField()


# ==========================================
# ENGAGEMENT SERIALIZERS (Save / Follow)
# ==========================================
class SavedEventSerializer(serializers.ModelSerializer):
    event = EventSerializer(read_only=True)
    saved_at = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = SavedEvent
        fields = ('id', 'event', 'saved_at')
        read_only_fields = fields


class FollowedOrganizerSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='organizer.company_name', read_only=True)
    is_verified = serializers.BooleanField(source='organizer.is_verified', read_only=True)
    organizer_id = serializers.IntegerField(source='organizer.id', read_only=True)
    follower_count = serializers.SerializerMethodField()
    upcoming_event_count = serializers.SerializerMethodField()
    followed_at = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = FollowedOrganizer
        fields = ('id', 'organizer_id', 'company_name', 'is_verified', 'follower_count', 'upcoming_event_count', 'followed_at')
        read_only_fields = fields

    def get_follower_count(self, obj):
        return obj.organizer.followers.count()

    def get_upcoming_event_count(self, obj):
        from django.utils import timezone
        return Event.objects.filter(
            organizer=obj.organizer,
            status__in=['PUBLISHED', 'LIVE'],
            start_time__gte=timezone.now()
        ).count()

from core.models import SupportTicket

class SupportTicketSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = SupportTicket
        fields = '__all__'
        read_only_fields = ('user', 'status', 'created_at', 'updated_at')
