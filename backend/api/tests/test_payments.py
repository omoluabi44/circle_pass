from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from core.models import User, AttendeeProfile, OrganizerProfile, Event, EventCategory, TicketType, Order, Payment, Ticket
from unittest.mock import patch

class CheckoutPaymentTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testorg', email='org@example.com', password='password')
        self.organizer = OrganizerProfile.objects.create(user=self.user, company_name='Test Org')
        self.event = Event.objects.create(
            organizer=self.organizer,
            title='Test Event',
            capacity=100,
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(days=1),
            status='PUBLISHED'
        )
        self.free_ticket = TicketType.objects.create(
            event=self.event,
            tier='FREE',
            name='Free Tier',
            price=0,
            quantity=50
        )
        self.paid_ticket = TicketType.objects.create(
            event=self.event,
            tier='REGULAR',
            name='Paid Tier',
            price=5000,
            quantity=50
        )

    def test_free_checkout_path(self):
        url = reverse('orders_checkout')
        data = {
            "event_id": self.event.id,
            "guest_email": "guest@example.com",
            "guest_name": "Guest User",
            "items": [{"ticket_type_id": self.free_ticket.id, "quantity": 2}]
        }
        
        response = self.client.post(url, data, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.data['payment_required'])
        
        # Verify db objects
        order = Order.objects.first()
        self.assertEqual(order.status, 'COMPLETED')
        self.assertEqual(order.total_amount, 0)
        
        payment = Payment.objects.first()
        self.assertEqual(payment.provider, 'FREE')
        self.assertEqual(payment.status, 'SUCCESS')
        
        self.assertEqual(Ticket.objects.count(), 2)
        
        # Inventory updated
        self.free_ticket.refresh_from_db()
        self.assertEqual(self.free_ticket.quantity_sold, 2)

    @patch('core.utils.paystack.requests.post')
    def test_paid_checkout_path(self, mock_post):
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            "status": True,
            "data": {
                "authorization_url": "https://checkout.paystack.com/xxx",
                "access_code": "xxx",
                "reference": "test-ref"
            }
        }
        
        url = reverse('orders_checkout')
        data = {
            "event_id": self.event.id,
            "guest_email": "guest@example.com",
            "guest_name": "Guest User",
            "items": [{"ticket_type_id": self.paid_ticket.id, "quantity": 1}]
        }
        
        response = self.client.post(url, data, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data['payment_required'])
        
        order = Order.objects.first()
        self.assertEqual(order.status, 'PENDING')
        
        payment = Payment.objects.first()
        self.assertEqual(payment.provider, 'PAYSTACK')
        self.assertEqual(payment.status, 'PENDING')
        
        self.assertEqual(Ticket.objects.count(), 0)
        
        self.paid_ticket.refresh_from_db()
        self.assertEqual(self.paid_ticket.quantity_sold, 1)
