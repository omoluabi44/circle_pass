from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StubView, OrganizerProfileViewSet, CustomUserViewSet, EventViewSet, EventCategoryViewSet, OrganizerVerificationView, google_auth, WaitlistEntryCreateView, PublicOrganizerProfileView
from .views_checkout import CheckoutView
from .views_payment import PaystackWebhookView, PaymentVerifyView
from .views_wallet import OrganizerWalletView, WalletTransactionListView
from .views_payout import (
    OrganizerPayoutListCreateView, OrganizerPayoutDetailView,
    AdminPayoutListView, AdminPayoutApproveView, AdminPayoutRejectView,
    PaystackBankListView, PaystackResolveAccountView,
)
from .views_find_ticket import FindTicketView
from .views_dashboard import OrganizerDashboardView
from .views_contacts import OrganizerContactsView, OrganizerFollowersView
from .views_analytics import OrganizerAnalyticsView
from .views_inbox import OrganizerInboxView
from .views_engagement import (
    SaveEventToggleView, SavedEventListView,
    FollowOrganizerToggleView, FollowedOrganizerListView,
)
from .views_attendee import AttendeeProfileView, AttendeeDashboardView

from .views_discount import EventDiscountListCreateView, EventDiscountDetailView, EventDiscountValidateView
from .views_announcement import EventAnnouncementListCreateView
from .views_newsletter import NewsletterSubscribeView
from .views_upload import PresignedUrlView

from .views_admin import (
    AdminOverviewView, AdminUserViewSet, AdminOrganizerVerificationViewSet,
    AdminEventViewSet, AdminPayoutViewSet
)

auth_router = DefaultRouter()
auth_router.register(r'users', CustomUserViewSet, basename='users')

admin_router = DefaultRouter()
admin_router.register(r'users', AdminUserViewSet, basename='admin-users')
admin_router.register(r'organizer-verifications', AdminOrganizerVerificationViewSet, basename='admin-verifications')
admin_router.register(r'events', AdminEventViewSet, basename='admin-events')
admin_router.register(r'payouts', AdminPayoutViewSet, basename='admin-payouts')

from .views_ticket import TicketViewSet, PublicTicketView
from .views_checkin import CheckInScanView, CheckInManualSearchView, CheckInStatsView

router = DefaultRouter()
router.register(r'organizer/profile', OrganizerProfileViewSet, basename='organizer-profile')
router.register(r'events', EventViewSet, basename='events')
router.register(r'categories', EventCategoryViewSet, basename='categories')
router.register(r'tickets', TicketViewSet, basename='tickets')

urlpatterns = [
    path('', include(router.urls)),

    
    # Custom User ViewSet overrides standard djoser /users/
    path('auth/', include(auth_router.urls)),
    
    # Auth (Djoser + SimpleJWT + Social Auth)
    path('auth/', include('djoser.urls')),
    path('auth/', include('djoser.urls.jwt')),
    path('auth/social/', include('social_django.urls', namespace='social')),
    path('auth/google/', google_auth, name='google_auth'),
    
    # Waitlist
    path('events/<int:event_id>/waitlist/', WaitlistEntryCreateView.as_view(), name='event_waitlist'),

    # Orders / Checkout
    path('orders/checkout/', CheckoutView.as_view(), name='orders_checkout'),
    
    # Payments
    path('payments/paystack/webhook/', PaystackWebhookView.as_view(), name='payments_webhook'),
    path('payments/verify/', PaymentVerifyView.as_view(), name='payments_verify'),
    
    # Check-in
    path('check-in/scan/', CheckInScanView.as_view(), name='checkin_scan'),
    path('check-in/search/', CheckInManualSearchView.as_view(), name='checkin_search'),
    path('check-in/stats/', CheckInStatsView.as_view(), name='checkin_stats'),
    
    # Organizer: Wallet & Payouts
    path('organizer/wallet/', OrganizerWalletView.as_view(), name='organizer_wallet'),
    path('organizer/wallet/transactions/', WalletTransactionListView.as_view(), name='wallet_transactions'),
    
    path('organizer/banks/', PaystackBankListView.as_view(), name='organizer_banks'),
    path('organizer/resolve_account/', PaystackResolveAccountView.as_view(), name='resolve_account'),
    
    path('organizer/payouts/', OrganizerPayoutListCreateView.as_view(), name='organizer_payouts'),
    path('organizer/payouts/<int:pk>/', OrganizerPayoutDetailView.as_view(), name='organizer_payout_detail'),
    
    # Organizer: Dashboard Overview
    path('organizer/dashboard/', OrganizerDashboardView.as_view(), name='organizer_dashboard'),
    path('organizer/contacts/', OrganizerContactsView.as_view(), name='organizer_contacts'),
    path('organizer/followers/', OrganizerFollowersView.as_view(), name='organizer_followers'),
    path('organizer/analytics/', OrganizerAnalyticsView.as_view(), name='organizer_analytics'),
    path('organizer/inbox/', OrganizerInboxView.as_view(), name='organizer_inbox'),
    
    # Organizer: Verification
    path('organizer/verification/', OrganizerVerificationView.as_view(), name='organizer_verification'),
    path('organizers/<int:pk>/', PublicOrganizerProfileView.as_view(), name='public_organizer'),
    
    # Discounts & Announcements
    path('events/<int:event_id>/discounts/', EventDiscountListCreateView.as_view(), name='event_discounts'),
    path('events/<int:event_id>/discounts/validate/', EventDiscountValidateView.as_view(), name='event_discount_validate'),
    path('events/<int:event_id>/discounts/<int:discount_id>/', EventDiscountDetailView.as_view(), name='event_discount_detail'),
    path('events/<int:event_id>/announcements/', EventAnnouncementListCreateView.as_view(), name='event_announcements'),
    
    # Newsletter
    path('newsletter/subscribe/', NewsletterSubscribeView.as_view(), name='newsletter_subscribe'),
    
    # File Upload (Presigned URL)
    path('upload/presigned-url/', PresignedUrlView.as_view(), name='presigned_url'),
    
    # Find Ticket (public)
    path('tickets/public/<str:qr_token>/', PublicTicketView.as_view(), name='public_ticket'),
    path('tickets/', TicketViewSet.as_view({'get': 'list'}), name='tickets'),
    
    # Attendee: Profile
    path('attendee/profile/', AttendeeProfileView.as_view(), name='attendee_profile'),
    path('attendee/dashboard/', AttendeeDashboardView.as_view(), name='attendee_dashboard'),

    # Engagement: Save & Follow
    path('events/<int:pk>/save/', SaveEventToggleView.as_view(), name='save_event'),
    path('saved-events/', SavedEventListView.as_view(), name='saved_events'),
    path('organizers/<int:pk>/follow/', FollowOrganizerToggleView.as_view(), name='follow_organizer'),
    path('followed-organizers/', FollowedOrganizerListView.as_view(), name='followed_organizers'),
    
    # Admin Views
    path('admin/overview/', AdminOverviewView.as_view(), name='admin_overview'),
    path('admin/', include(admin_router.urls)),
    
    # Admin: Payouts (Old specific views, kept for compatibility if needed, though viewset has them too)
    path('admin/payouts_list/', AdminPayoutListView.as_view(), name='admin_payouts_list'),
    path('admin/payouts/<int:pk>/approve_old/', AdminPayoutApproveView.as_view(), name='admin_payout_approve_old'),
    path('admin/payouts/<int:pk>/reject_old/', AdminPayoutRejectView.as_view(), name='admin_payout_reject_old'),
    
    # Content/Blog (stubs)
    path('blog/', StubView.as_view(), name='blog_list'),
    path('content/social/', StubView.as_view(), name='content_social'),
]
