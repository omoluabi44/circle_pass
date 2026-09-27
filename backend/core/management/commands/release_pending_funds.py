"""
Management command: release_pending_funds

Moves funds from pending_balance → available_balance for wallets
whose events have ended more than 24 hours ago.

Designed to run as a cron job:
    python manage.py release_pending_funds
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone

from core.models import Event, Order, OrganizerWallet, WalletTransaction


class Command(BaseCommand):
    help = 'Release pending wallet funds for events that ended 24+ hours ago.'

    def handle(self, *args, **options):
        cutoff = timezone.now() - timezone.timedelta(hours=24)

        # Find organizer wallets with pending_balance > 0
        wallets = OrganizerWallet.objects.filter(
            pending_balance__gt=0
        ).select_related('organizer')

        released_count = 0
        total_released = 0

        for wallet in wallets:
            # Check if the organizer has any completed events that ended 24+ hours ago
            # with orders that could contribute to pending balance
            completed_events = Event.objects.filter(
                organizer=wallet.organizer,
                status__in=['COMPLETED', 'LIVE', 'PUBLISHED'],
                end_time__lte=cutoff,
            )

            if not completed_events.exists():
                continue

            with transaction.atomic():
                # Lock the wallet
                locked_wallet = OrganizerWallet.objects.select_for_update().get(pk=wallet.pk)

                if locked_wallet.pending_balance <= 0:
                    continue

                release_amount = locked_wallet.pending_balance

                # Move funds
                locked_wallet.available_balance = F('available_balance') + release_amount
                locked_wallet.pending_balance = 0
                locked_wallet.save(update_fields=['available_balance', 'pending_balance', 'updated_at'])
                locked_wallet.refresh_from_db()

                # Create ledger entry
                WalletTransaction.objects.create(
                    wallet=locked_wallet,
                    type='RELEASE',
                    amount=release_amount,
                    balance_after=locked_wallet.available_balance,
                    reference=f'AUTO-RELEASE-{timezone.now().strftime("%Y%m%d%H%M")}',
                    description=f'Auto-release of ₦{release_amount / 100:,.2f} from pending balance.',
                )

                released_count += 1
                total_released += release_amount

        self.stdout.write(
            self.style.SUCCESS(
                f'Released funds for {released_count} wallet(s). '
                f'Total: ₦{total_released / 100:,.2f}'
            )
        )
