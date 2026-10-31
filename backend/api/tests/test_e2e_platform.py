import json
from unittest.mock import patch
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
import hmac
import hashlib
from django.conf import settings

from core.models import (
    User, OrganizerProfile, OrganizerWallet, Event, TicketType, AttendeeProfile,
    Order, Payment, OrganizerBankAccount, Payout, WalletTransaction, EventCategory, Venue, Ticket
)

class PlatformE2ETests(APITestCase):
    def setUp(self):
        # Admin User
        self.admin_user = User.objects.create_superuser(
            username="admin", email="admin@test.com", password="password"
        )

        # Organizer
        self.organizer_user = User.objects.create_user(
            username="org_test", email="org@test.com", password="password", role="ORGANIZER"
        )
        self.profile = OrganizerProfile.objects.get(user=self.organizer_user)
        self.wallet = OrganizerWallet.objects.get(organizer=self.profile)

        # Attendee
        self.buyer_user = User.objects.create_user(
            username="buyer", email="buyer@test.com", password="password", role="ATTENDEE"
        )
        self.buyer_profile = AttendeeProfile.objects.get(user=self.buyer_user)

        self.category = EventCategory.objects.create(name="Test Cat", slug="test-cat")
        self.venue = Venue.objects.create(name="Test Venue", address="123 Test St")

    def test_end_to_end_platform_flow(self):
        # 1. Organizer Registration & Verification
        self.client.force_authenticate(user=self.organizer_user)
        verify_data = {
            "company_name": "Org Company",
            "address": "123 Business St"
        }
        # In a real scenario we upload files, here we simulate verification
        self.profile.is_verified = True
        self.profile.save()

        # 2. Create Event
        event_data = {
            "title": "E2E Test Event",
            "slug": "e2e-test-event",
            "event_type": "PHYSICAL",
            "category_id": self.category.id,
            "venue_name": "Test Venue",
            "venue_address": "123 Test St",
            "start_time": (timezone.now() + timezone.timedelta(days=1)).isoformat(),
            "end_time": (timezone.now() + timezone.timedelta(days=1, hours=2)).isoformat(),
            "description": "A great event",
            "ticket_types": [
                {
                    "name": "Free Pass",
                    "tier": "FREE",
                    "price": 0,
                    "quantity": 50
                },
                {
                    "name": "VIP Pass",
                    "tier": "VIP",
                    "price": 1000000, # 10,000 NGN
                    "quantity": 100
                }
            ],
            "absorb_fees": False
        }
        res = self.client.post("/api/events/", event_data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        event_id = res.data["id"]
        event = Event.objects.get(id=event_id)

        # Submit event
        res = self.client.post(f"/api/events/{event_id}/submit/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Admin screens/approves event
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.post(f"/api/admin/events/{event_id}/approve/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        event.refresh_from_db()
        self.assertEqual(event.status, "PUBLISHED")

        # 3. Attendee Free Checkout
        self.client.force_authenticate(user=self.buyer_user)
        free_tier = event.ticket_types.get(tier="FREE")
        free_order_data = {
            "event_id": event_id,
            "items": [{"ticket_type_id": free_tier.id, "quantity": 2}]
        }
        res = self.client.post("/api/orders/", free_order_data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["total_amount"], 0)
        self.assertEqual(res.data["status"], "COMPLETED") # Free orders complete instantly
        
        order_id = res.data["id"]
        order = Order.objects.get(id=order_id)
        
        # Verify tickets are issued
        tickets = Ticket.objects.filter(order=order)
        self.assertEqual(tickets.count(), 2)
        self.assertEqual(tickets.first().status, "ISSUED")

        # 4. Attendee Paid Checkout
        vip_tier = event.ticket_types.get(tier="VIP")
        paid_order_data = {
            "event_id": event_id,
            "items": [{"ticket_type_id": vip_tier.id, "quantity": 1}]
        }
        res = self.client.post("/api/orders/", paid_order_data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["total_amount"], 1050000) # 10k + 5% fee
        self.assertEqual(res.data["status"], "PENDING")
        paid_order_id = res.data["id"]

        # Simulate Paystack Webhook for paid order
        payment = Payment.objects.create(
            order_id=paid_order_id,
            reference="PAY_TEST_123",
            amount=1050000,
            status="PENDING"
        )
        
        payload = {
            "event": "charge.success",
            "data": {
                "reference": "PAY_TEST_123",
                "status": "success",
                "amount": 1050000,
            }
        }
        body = json.dumps(payload)
        sig = hmac.new(
            settings.PAYSTACK_SECRET_KEY.encode('utf-8'),
            body.encode('utf-8'),
            hashlib.sha512
        ).hexdigest()
        
        # We need to test the webhook endpoint, but first we should logout or just use client
        self.client.logout()
        res = self.client.post(
            "/api/payments/paystack/webhook/", 
            data=body, 
            content_type="application/json",
            HTTP_X_PAYSTACK_SIGNATURE=sig
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        paid_order = Order.objects.get(id=paid_order_id)
        self.assertEqual(paid_order.status, "COMPLETED")
        paid_tickets = Ticket.objects.filter(order=paid_order)
        self.assertEqual(paid_tickets.count(), 1)
        self.assertEqual(paid_tickets.first().status, "ISSUED")

        # Verify Organizer Wallet Credit
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_balance, 997500) # 95% of 1050000
        
        # 5. PassControl Check-In
        self.client.force_authenticate(user=self.organizer_user)
        qr_token = paid_tickets.first().qr_token
        res = self.client.post("/api/check-in/scan/", {"qr_token": qr_token})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "Valid")
        
        # Duplicate Scan
        res = self.client.post("/api/check-in/scan/", {"qr_token": qr_token})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "Already Used")

        # 6. Payout Request
        bank_account = OrganizerBankAccount.objects.create(
            organizer=self.profile,
            bank_name="Test Bank",
            bank_code="044",
            account_number="1234567890",
            account_name="Test Org",
            paystack_recipient_code="RCP_123",
            is_default=True
        )

        with patch("api.views_payout.initiate_transfer", return_value="TRF_E2E_123"):
            res = self.client.post("/api/organizer/payouts/", {
                "amount": 500000, # 5k NGN
                "bank_account_id": bank_account.id
            }, format="json")
            self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_balance, 497500) # 997500 - 500000

        # Simulate Transfer Success Webhook
        transfer_payload = {
            "event": "transfer.success",
            "data": {
                "transfer_code": "TRF_E2E_123",
                "status": "success",
                "amount": 499000 # 500000 - 1000 fee
            }
        }
        t_body = json.dumps(transfer_payload)
        t_sig = hmac.new(
            settings.PAYSTACK_SECRET_KEY.encode('utf-8'),
            t_body.encode('utf-8'),
            hashlib.sha512
        ).hexdigest()
        
        self.client.logout()
        res = self.client.post(
            "/api/payments/paystack/webhook/", 
            data=t_body, 
            content_type="application/json",
            HTTP_X_PAYSTACK_SIGNATURE=t_sig
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        payout = Payout.objects.get(paystack_transfer_code="TRF_E2E_123")
        self.assertEqual(payout.status, "SUCCESSFUL")
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.total_payouts, 500000)
