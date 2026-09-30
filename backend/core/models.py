from django.db import models
from django.contrib.auth.models import AbstractUser

# ==========================================
# AUTHENTICATION & PROFILES
# ==========================================
class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('ORGANIZER', 'Organizer'),
        ('ATTENDEE', 'Attendee'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='ATTENDEE')
    email = models.EmailField(unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']


class AttendeeProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone_number = models.CharField(max_length=20, blank=True)
    # Additional fields can go here

class OrganizerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    company_name = models.CharField(max_length=255)
    is_verified = models.BooleanField(default=False)
    contact_email = models.EmailField(blank=True)
    bio = models.TextField(blank=True)
    website = models.URLField(blank=True)
    instagram_handle = models.CharField(max_length=100, blank=True)
    logo = models.URLField(max_length=500, null=True, blank=True)

class OrganizerVerification(models.Model):
    organizer = models.OneToOneField(OrganizerProfile, on_delete=models.CASCADE)
    status = models.CharField(max_length=50, default='Unverified') # Unverified, Verification Submitted, Under Review, Verified, Rejected
    cac_document = models.FileField(upload_to='verifications/cac/', null=True, blank=True)
    id_document = models.FileField(upload_to='verifications/id/', null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

# ==========================================
# EVENTS & VENUES
# ==========================================
class EventCategory(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, blank=True, max_length=100)
    icon_name = models.CharField(max_length=50, blank=True, help_text="Lucide icon name, e.g., 'Music'")
    image_url = models.URLField(blank=True, help_text="URL to background cover image")

class Venue(models.Model):
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

class Event(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('UNDER_REVIEW', 'Under Review'),
        ('APPROVED', 'Approved'),
        ('CHANGES_REQUIRED', 'Changes Required'),
        ('REJECTED', 'Rejected'),
        ('PUBLISHED', 'Published'),
        ('LIVE', 'Live'),
        ('COMPLETED', 'Completed'),
        ('ARCHIVED', 'Archived'),
    )

    EVENT_TYPE_CHOICES = (
        ('PHYSICAL', 'Physical'),
        ('ONLINE', 'Online'),
        ('HYBRID', 'Hybrid'),
    )

    organizer = models.ForeignKey(OrganizerProfile, on_delete=models.CASCADE)
    category = models.ForeignKey(EventCategory, on_delete=models.SET_NULL, null=True)
    venue = models.ForeignKey(Venue, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Basic Info
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, blank=True, max_length=255)
    description = models.TextField(blank=True)
    cover_image = models.URLField(max_length=500, null=True, blank=True)
    event_type = models.CharField(max_length=50, choices=EVENT_TYPE_CHOICES, default='PHYSICAL')
    
    # Location details (if physical/hybrid)
    country = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    
    # Timing & Capacity
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    capacity = models.IntegerField(default=0)
    
    # Additional Details
    organizer_contact = models.CharField(max_length=255, blank=True, help_text="Email or phone for attendee inquiries.")
    emergency_contact = models.CharField(max_length=255, blank=True, help_text="Emergency contact info.")
    age_restriction = models.CharField(max_length=50, blank=True, help_text="e.g., '18+', 'None', '21 and over'")
    dress_code = models.CharField(max_length=100, blank=True, help_text="e.g., 'Casual', 'Black Tie', 'No specific dress code'")
    lineup = models.TextField(blank=True, help_text="Lineup or artists where applicable")
    
    # Settings & Status
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='DRAFT')
    is_online = models.BooleanField(default=False) # Keep for backward compatibility or replace logic with event_type
    absorb_fees = models.BooleanField(
        default=False,
        help_text='If True, organizer absorbs the 5% CirclePass fee. If False, buyer pays it.',
    )
    personalized_dp_enabled = models.BooleanField(
        default=False, 
        help_text="Organizer can enable/disable Personalized DP for the event"
    )
    sales_paused = models.BooleanField(default=False, help_text="If True, ticket sales are paused.")
    waitlist_enabled = models.BooleanField(default=False, help_text="If True, waitlist is enabled for sold out tickets.")
    has_onsite_services = models.BooleanField(default=False, help_text="Charges 13% of ticket price if enabled.")

class EventScreening(models.Model):
    event = models.OneToOneField(Event, on_delete=models.CASCADE)
    ai_status = models.CharField(max_length=50) # Auto-Approve, Changes Required, Human Admin Review
    confidence_score = models.IntegerField(default=0)

# ==========================================
# TICKETS & ORDERS
# ==========================================
class TicketType(models.Model):
    TIER_CHOICES = (
        ('FREE', 'Free'),
        ('EARLY_BIRD', 'Early Bird'),
        ('REGULAR', 'Regular'),
        ('VIP', 'VIP'),
        ('VVIP', 'VVIP'),
        ('CUSTOM', 'Custom'),
    )

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='ticket_types')
    tier = models.CharField(max_length=20, choices=TIER_CHOICES, default='REGULAR')
    name = models.CharField(max_length=100, help_text='Display name, e.g. "Super Early Bird", "Gold Table"')
    description = models.TextField(blank=True)
    price = models.IntegerField(default=0, help_text='Price in kobo. Must be 0 for FREE tier.')
    quantity = models.IntegerField(default=0, help_text='Total inventory for this ticket type.')
    quantity_sold = models.IntegerField(default=0, help_text='Number of tickets sold. Updated atomically.')
    sale_start = models.DateTimeField(null=True, blank=True, help_text='When this ticket goes on sale.')
    sale_end = models.DateTimeField(null=True, blank=True, help_text='When this ticket stops selling.')
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0, help_text='Display ordering within the event.')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'price']

    def __str__(self):
        return f'{self.name} — {self.event.title}'

    @property
    def quantity_remaining(self):
        return max(self.quantity - self.quantity_sold, 0)

    @property
    def is_sold_out(self):
        return self.quantity_remaining <= 0

    def clean(self):
        from django.core.exceptions import ValidationError
        from django.db.models import Sum

        # Enforce FREE tier must have price = 0
        if self.tier == 'FREE' and self.price != 0:
            raise ValidationError({'price': 'Free-tier tickets must have a price of ₦0 (0 kobo).'})

        # Enforce non-FREE tier must have price > 0
        if self.tier != 'FREE' and self.price <= 0:
            raise ValidationError({'price': 'Paid ticket tiers must have a price greater than ₦0.'})

        # Ensure total ticket quantity across all types does not exceed event capacity
        other_tickets = TicketType.objects.filter(event=self.event)
        if self.pk:
            other_tickets = other_tickets.exclude(pk=self.pk)

        current_total = other_tickets.aggregate(total=Sum('quantity'))['total'] or 0
        if current_total + self.quantity > self.event.capacity:
            raise ValidationError({
                'quantity': f'Total ticket quantity ({current_total + self.quantity}) '
                            f'cannot exceed event capacity ({self.event.capacity}).'
            })

class Order(models.Model):
    ORDER_STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    )

    attendee = models.ForeignKey(AttendeeProfile, on_delete=models.CASCADE, null=True, blank=True)
    guest_email = models.EmailField(blank=True, help_text='For guest checkout when attendee is null.')
    guest_name = models.CharField(max_length=255, blank=True)
    guest_phone = models.CharField(max_length=20, blank=True, help_text='For guest checkout phone number.')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='orders')
    subtotal = models.IntegerField(default=0, help_text='Sum of ticket prices in kobo, before fees/discounts.')
    discount_amount = models.IntegerField(default=0, help_text='Discount amount in kobo.')
    fee_amount = models.IntegerField(default=0, help_text='CirclePass 5% service fee in kobo. 0 if free or absorbed.')
    total_amount = models.IntegerField(default=0, help_text='Final amount charged in kobo: subtotal - discount + fee.')
    status = models.CharField(max_length=50, choices=ORDER_STATUS_CHOICES, default='PENDING')
    referral_code = models.CharField(max_length=100, blank=True, help_text='Code of the promoter or affiliate')
    expires_at = models.DateTimeField(null=True, blank=True, help_text='For PENDING paid orders. Null for free orders.')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Order #{self.pk} — {self.event.title}'

class OrderItem(models.Model):
    """Individual line item within an order, linking to a specific ticket type."""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    ticket_type = models.ForeignKey(TicketType, on_delete=models.PROTECT)
    quantity = models.IntegerField(default=1)
    unit_price = models.IntegerField(help_text='Price per ticket in kobo at time of purchase.')
    line_total = models.IntegerField(help_text='unit_price * quantity in kobo.')

    def __str__(self):
        return f'{self.quantity}x {self.ticket_type.name}'

class Ticket(models.Model):
    TICKET_STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('ISSUED', 'Issued'),
        ('ACTIVE', 'Active'),
        ('USED', 'Used'),
        ('EXPIRED', 'Expired'),
        ('INVALIDATED', 'Invalidated'),
    )

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='tickets')
    ticket_type = models.ForeignKey(TicketType, on_delete=models.PROTECT)
    attendee_name = models.CharField(max_length=255, blank=True, help_text='Name on ticket (supports buying for others).')
    attendee_email = models.EmailField(blank=True)
    status = models.CharField(max_length=50, choices=TICKET_STATUS_CHOICES, default='PENDING')
    qr_token = models.CharField(max_length=255, unique=True)
    issued_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Ticket {self.qr_token[:8]}... — {self.ticket_type.name}'

# ==========================================
# CHECK-INS & OPERATIONS
# ==========================================
class CheckIn(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='checkins')
    scanned_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50) # Valid, Already Used, Invalid

# ==========================================
# PAYMENTS & FINANCE
# ==========================================
class Payment(models.Model):
    PAYMENT_STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    )
    PROVIDER_CHOICES = (
        ('PAYSTACK', 'Paystack'),
        ('FREE', 'Free'),
    )

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='payment')
    reference = models.CharField(max_length=255, unique=True, db_index=True)
    amount = models.IntegerField(help_text='Amount in kobo.')
    status = models.CharField(max_length=50, choices=PAYMENT_STATUS_CHOICES, default='PENDING')
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default='PAYSTACK')
    channel = models.CharField(max_length=50, blank=True, help_text='e.g. card, bank, ussd')
    paid_at = models.DateTimeField(null=True, blank=True)
    provider_data = models.JSONField(default=dict, blank=True, help_text='Raw Paystack response.')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class PaymentEvent(models.Model):
    """Append-only log of Paystack webhook deliveries. Ensures idempotent processing."""
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='events')
    event_id = models.CharField(max_length=255, unique=True, help_text='Paystack event ID for idempotency.')
    event_type = models.CharField(max_length=100, help_text='e.g. charge.success')
    raw_body = models.JSONField(help_text='Full webhook payload.')
    processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class OrganizerWallet(models.Model):
    organizer = models.OneToOneField(OrganizerProfile, on_delete=models.CASCADE, related_name='wallet')
    pending_balance = models.IntegerField(default=0, help_text='Funds clearing (kobo). Released 24h after event ends.')
    available_balance = models.IntegerField(default=0, help_text='Funds ready for withdrawal (kobo).')
    total_earnings = models.IntegerField(default=0, help_text='Lifetime credited revenue (kobo).')
    total_payouts = models.IntegerField(default=0, help_text='Lifetime withdrawn amount (kobo).')
    
    # Banking Details
    bank_name = models.CharField(max_length=100, blank=True)
    bank_code = models.CharField(max_length=20, blank=True)
    account_number = models.CharField(max_length=20, blank=True)
    account_name = models.CharField(max_length=255, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Wallet — {self.organizer.company_name}'

class Payout(models.Model):
    PAYOUT_STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('REJECTED', 'Rejected'),
    )
    wallet = models.ForeignKey(OrganizerWallet, on_delete=models.CASCADE, related_name='payouts')
    amount = models.IntegerField(help_text='Amount in kobo.')
    status = models.CharField(max_length=50, choices=PAYOUT_STATUS_CHOICES, default='PENDING')
    reference = models.CharField(max_length=100, unique=True, db_index=True, help_text='CirclePass payout reference.')
    bank_name = models.CharField(max_length=100)
    account_number = models.CharField(max_length=20)
    account_name = models.CharField(max_length=255)
    bank_code = models.CharField(max_length=10)
    paystack_recipient_code = models.CharField(max_length=100, blank=True)
    paystack_transfer_code = models.CharField(max_length=100, blank=True)
    rejection_reason = models.TextField(blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Payout {self.reference} — ₦{self.amount / 100:,.2f} ({self.status})'


class WalletTransaction(models.Model):
    """Append-only ledger of all wallet balance changes for audit trail."""
    TYPE_CHOICES = (
        ('CREDIT', 'Credit'),       # Revenue from completed order
        ('RELEASE', 'Release'),     # pending_balance → available_balance
        ('PAYOUT', 'Payout'),       # Withdrawal to bank
        ('REVERSAL', 'Reversal'),   # Correction / refund
    )
    wallet = models.ForeignKey(OrganizerWallet, on_delete=models.CASCADE, related_name='transactions')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    amount = models.IntegerField(help_text='Positive kobo value.')
    balance_after = models.IntegerField(help_text='Available balance after this transaction.')
    reference = models.CharField(max_length=255, help_text='Order ID, payout ref, etc.')
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.type} ₦{self.amount / 100:,.2f} — {self.reference}'

# ==========================================
# PROMOTERS
# ==========================================
class Promoter(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)

class PromoterCampaign(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    promoter = models.ForeignKey(Promoter, on_delete=models.CASCADE)
    commission_rate = models.IntegerField(default=0) # Percentage

# ==========================================
# CONTENT & CMS
# ==========================================
class BlogPost(models.Model):
    title = models.CharField(max_length=255)
    content = models.TextField()

class FeaturedEvent(models.Model):
    event = models.OneToOneField(Event, on_delete=models.CASCADE)
    order = models.IntegerField(default=0)

# ==========================================
# ENGAGEMENT (Save / Follow)
# ==========================================
class SavedEvent(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_events')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='saves')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'event')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.email} saved {self.event.title}'


class FollowedOrganizer(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followed_organizers')
    organizer = models.ForeignKey(OrganizerProfile, on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'organizer')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.email} follows {self.organizer.company_name}'


# ==========================================
# DISCOUNTS
# ==========================================
class Discount(models.Model):
    DISCOUNT_TYPE_CHOICES = (
        ('PERCENTAGE', 'Percentage'),
        ('FIXED', 'Fixed Amount'),
    )
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='discounts')
    code = models.CharField(max_length=50, help_text='Discount code (e.g. EARLY20).')
    type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES, default='PERCENTAGE')
    value = models.IntegerField(help_text='Percentage (0-100) or fixed amount in kobo.')
    usage_limit = models.IntegerField(default=0, help_text='0 = unlimited.')
    usage_count = models.IntegerField(default=0)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('event', 'code')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.code} — {self.event.title}'


class DiscountRedemption(models.Model):
    discount = models.ForeignKey(Discount, on_delete=models.CASCADE, related_name='redemptions')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='discount_redemptions')
    created_at = models.DateTimeField(auto_now_add=True)


class EventAnnouncement(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='announcements')
    title = models.CharField(max_length=255)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} for {self.event.title}'

class WaitlistEntry(models.Model):
    """Captures emails for sold-out events (Waitlist) or pre-sale (Notify Me)."""
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='waitlist_entries')
    name = models.CharField(max_length=255, blank=True)
    email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)
    notified = models.BooleanField(default=False)

    class Meta:
        unique_together = ('event', 'email')
        ordering = ['created_at']

    def __str__(self):
        return f'{self.email} waiting for {self.event.title}'

class NewsletterSubscriber(models.Model):
    email = models.EmailField(unique=True)
    subscribed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.email


class Notification(models.Model):
    TYPE_CHOICES = (
        ('ORDER', 'Order'),
        ('EVENT', 'Event'),
        ('SYSTEM', 'System'),
        ('CHECKIN', 'Check-in'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='SYSTEM')
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} — {self.user.email}'

from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created and getattr(instance, 'role', None) == 'ORGANIZER':
        OrganizerProfile.objects.get_or_create(
            user=instance, 
            defaults={'company_name': f'{instance.username} Events'}
        )

@receiver(post_save, sender=OrganizerProfile)
def create_organizer_dependencies(sender, instance, created, **kwargs):
    if created:
        from core.models import OrganizerWallet, OrganizerVerification
        OrganizerWallet.objects.get_or_create(organizer=instance)
        OrganizerVerification.objects.get_or_create(organizer=instance)

class EmailLog(models.Model):
    recipient = models.EmailField()
    subject = models.CharField(max_length=255)
    status = models.CharField(max_length=50) # Sent, Failed
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.subject} -> {self.recipient} ({self.status})'
