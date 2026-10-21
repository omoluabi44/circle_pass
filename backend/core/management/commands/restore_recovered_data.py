"""
CirclePass Management Command: restore_recovered_data

Imports all recovered orders, payments, tickets, organizer profiles, and events
into the RDS MySQL database after disaster recovery.
"""
import os
import json
from datetime import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from core.models import (
    User, OrganizerProfile, OrganizerVerification, OrganizerWallet,
    EventCategory, Event, TicketType, Order, OrderItem, Ticket, Payment
)
from core.utils.qr import generate_secure_qr_token


class Command(BaseCommand):
    help = "Restore all recovered tickets, orders, organizer wallet, and event data into RDS MySQL"

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default='recovered_payload.json',
            help='Path to recovered JSON payload'
        )

    def handle(self, *args, **options):
        payload_file = options['file']
        if not os.path.exists(payload_file):
            self.stderr.write(self.style.ERROR(f"Payload file not found: {payload_file}"))
            return

        with open(payload_file, 'r', encoding='utf-8') as f:
            orders_data = json.load(f)

        self.stdout.write(self.style.SUCCESS(f"Loaded {len(orders_data)} orders from {payload_file}."))

        with transaction.atomic():
            # 1. Ensure Admin User
            admin_user, _ = User.objects.get_or_create(
                email="officialcirclepass@thecirclepass.com",
                defaults={
                    "username": "circlepass_admin",
                    "role": "ADMIN",
                    "is_staff": True,
                    "is_superuser": True,
                }
            )
            if not admin_user.has_usable_password():
                admin_user.set_password("CirclePass2026!Admin")
                admin_user.save()

            # 2. Ensure Goat HQ Organizer User & Profile
            org_user, _ = User.objects.get_or_create(
                email="goathq0@gmail.com",
                defaults={
                    "username": "goathq",
                    "role": "ORGANIZER",
                    "first_name": "Goat",
                    "last_name": "HQ",
                }
            )
            if not org_user.has_usable_password():
                org_user.set_password("GoatHQ2026!Secure")
                org_user.save()

            org_profile, _ = OrganizerProfile.objects.get_or_create(
                user=org_user,
                defaults={
                    "company_name": "Goat HQ",
                    "slug": "goathq",
                    "contact_email": "goathq0@gmail.com",
                    "is_verified": True,
                }
            )

            # Ensure Verification
            OrganizerVerification.objects.get_or_create(
                organizer=org_profile,
                defaults={
                    "status": "VERIFIED",
                    "reviewer": admin_user,
                    "reviewed_at": timezone.now(),
                }
            )

            # Ensure Organizer Wallet with recovered ₦94,500.00
            wallet, _ = OrganizerWallet.objects.get_or_create(
                organizer=org_profile,
                defaults={
                    "available_balance": 9450000, # 94,500 NGN in kobo
                    "total_earnings": 9450000,
                    "account_name": "Goat HQ",
                }
            )
            # Make sure balances reflect true earnings
            wallet.available_balance = 9450000
            wallet.total_earnings = 9450000
            wallet.save(update_fields=['available_balance', 'total_earnings'])

            # 3. Ensure Category
            category = EventCategory.objects.filter(slug='festivals').first()
            if not category:
                category = EventCategory.objects.filter(name__icontains='Festival').first()
            if not category:
                category = EventCategory.objects.first()

            # 4. Ensure Event: WATER WARS (ID 35)
            event, created = Event.objects.get_or_create(
                id=35,
                defaults={
                    "organizer": org_profile,
                    "category": category,
                    "title": "WATER WARS",
                    "slug": "water-wars",
                    "description": "Experience the ultimate water festival experience in Lagos! Water Wars is back with music, games, and unmatched energy.",
                    "event_type": "PHYSICAL",
                    "city": "Lagos",
                    "country": "Nigeria",
                    "location_name": "Lagos",
                    "capacity": 500,
                    "status": "PUBLISHED",
                    "absorb_fees": False,
                }
            )
            if not created and event.status != 'PUBLISHED':
                event.status = 'PUBLISHED'
                event.save(update_fields=['status'])

            # 5. Ensure Ticket Type: WAR PASS
            ticket_type, _ = TicketType.objects.get_or_create(
                event=event,
                name="WAR PASS",
                defaults={
                    "tier": "REGULAR",
                    "price": 350000, # ₦3,500.00 in kobo
                    "quantity": 500,
                    "quantity_sold": 0,
                    "is_active": True,
                }
            )

            total_orders_restored = 0
            total_tickets_restored = 0

            # 6. Restore Orders and Tickets
            for order_key, data in orders_data.items():
                oid = data['order_id']
                email = data['email']
                name = data['name']
                ref = data['reference']
                amount_kobo = data['amount_kobo']
                qty = data['qty']
                channel = data['channel']
                paid_at_str = data['paid_at']

                paid_at = None
                if paid_at_str:
                    try:
                        paid_at = datetime.fromisoformat(paid_at_str.replace('Z', '+00:00'))
                    except Exception:
                        paid_at = timezone.now()
                else:
                    paid_at = timezone.now()

                # Order
                order, _ = Order.objects.get_or_create(
                    id=oid,
                    defaults={
                        "event": event,
                        "guest_email": email,
                        "guest_name": name or (email.split('@')[0] if email else 'Attendee'),
                        "subtotal": qty * ticket_type.price,
                        "fee_amount": int(qty * ticket_type.price * 0.05),
                        "total_amount": amount_kobo,
                        "status": "COMPLETED",
                    }
                )

                # OrderItem
                OrderItem.objects.get_or_create(
                    order=order,
                    ticket_type=ticket_type,
                    defaults={
                        "quantity": qty,
                        "unit_price": ticket_type.price,
                        "line_total": qty * ticket_type.price,
                    }
                )

                # Payment
                Payment.objects.get_or_create(
                    order=order,
                    defaults={
                        "reference": ref,
                        "amount": amount_kobo,
                        "status": "SUCCESS",
                        "provider": "PAYSTACK",
                        "channel": channel,
                        "paid_at": paid_at,
                    }
                )

                # Tickets
                known_tickets = data.get('known_tickets', [])
                for i in range(qty):
                    if i < len(known_tickets):
                        kt = known_tickets[i]
                        t_id = kt.get('ticket_id')
                        t_name = kt.get('attendee_name') or name or (email.split('@')[0] if email else 'Attendee')
                        t_email = kt.get('attendee_email') or email
                        t_token = kt.get('qr_token') or generate_secure_qr_token()

                        Ticket.objects.get_or_create(
                            id=t_id,
                            defaults={
                                "order": order,
                                "ticket_type": ticket_type,
                                "attendee_name": t_name,
                                "attendee_email": t_email,
                                "status": "ACTIVE",
                                "qr_token": t_token,
                                "issued_at": paid_at,
                            }
                        )
                    else:
                        t_name = name or (email.split('@')[0] if email else 'Attendee')
                        t_email = email
                        t_token = generate_secure_qr_token()

                        # Check if a ticket for this order already exists
                        if not Ticket.objects.filter(order=order, attendee_email=t_email).exists():
                            Ticket.objects.create(
                                order=order,
                                ticket_type=ticket_type,
                                attendee_name=t_name,
                                attendee_email=t_email,
                                status="ACTIVE",
                                qr_token=t_token,
                                issued_at=paid_at,
                            )

                    total_tickets_restored += 1
                total_orders_restored += 1

            # Update ticket type sold count
            actual_sold = Ticket.objects.filter(ticket_type=ticket_type).count()
            ticket_type.quantity_sold = actual_sold
            ticket_type.save(update_fields=['quantity_sold'])

        self.stdout.write(self.style.SUCCESS(
            f"RESTORATION COMPLETE:\n"
            f"- Event #35 'WATER WARS' created & published.\n"
            f"- Organizer 'Goat HQ' wallet updated to ₦94,500.00.\n"
            f"- {total_orders_restored} Orders restored.\n"
            f"- {actual_sold} Tickets restored with valid signed PassControl QR tokens."
        ))
