"""Read-only audit of organizer wallets.

Balances on the dashboard must be backed by two things and nothing else:

* completed orders (what CirclePass actually collected), credited using the
  same rule ``core.utils.fulfillment.fulfill_order`` uses, and
* payouts that really left the platform, minus the ones already paid out.

Anything else — a restored balance, a wallet that was credited the gross
amount instead of the 95% net, money parked on the wrong organizer — shows up
here as a difference between ``true available`` and what the dashboard shows.

Run it before and after recording historical payouts:

    python manage.py wallet_audit
"""
from django.core.management.base import BaseCommand
from django.db.models import Sum

from core.models import Order, OrganizerProfile, OrganizerWallet, Payout


def credit_for(order):
    """Organizer credit for one completed order, per fulfillment.py.

    Buyer paid the 5% fee  -> organizer keeps the full ticket price.
    Organizer absorbed it  -> organizer keeps 95% of what was collected.
    """
    gross = max(0, (order.subtotal or 0) - (order.discount_amount or 0))
    if gross <= 0:
        return 0
    if (order.fee_amount or 0) > 0:
        return gross
    return gross - int(gross * 0.05)


class Command(BaseCommand):
    help = 'Compare stored wallet balances with completed orders and recorded payouts.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--organizer', default='',
            help='Only audit one organizer (email, company name or wallet id).',
        )

    def handle(self, *args, **options):
        wallets = OrganizerWallet.objects.select_related('organizer__user').order_by('id')
        if options['organizer']:
            from django.db.models import Q

            needle = options['organizer'].strip()
            query = (
                Q(organizer__user__email__iexact=needle)
                | Q(organizer__company_name__icontains=needle)
                | Q(organizer__user__username__iexact=needle)
            )
            if needle.isdigit():
                query |= Q(id=int(needle)) | Q(organizer_id=int(needle))
            wallets = wallets.filter(query)

        header = (
            f"{'org':>4} {'wallet':>6} {'company':26} {'true earned':>14} "
            f"{'available':>14} {'recorded paid':>14} {'true available':>15} {'delta':>13}"
        )
        self.stdout.write(header)
        self.stdout.write('-' * len(header))

        totals = {'earned': 0, 'available': 0, 'paid': 0, 'true': 0}
        for wallet in wallets:
            organizer = wallet.organizer
            earned = 0
            for order in (
                Order.objects
                .filter(event__organizer=organizer, status='COMPLETED')
                .exclude(total_amount__lte=0)
                .only('subtotal', 'discount_amount', 'fee_amount', 'total_amount')
            ):
                earned += credit_for(order)

            recorded_paid = Payout.objects.filter(
                wallet=wallet, status__in=('SUCCESSFUL', 'COMPLETED'),
            ).aggregate(s=Sum('amount'))['s'] or 0

            available = wallet.available_balance or 0
            true_available = max(0, earned - recorded_paid)
            delta = available - true_available

            note = ''
            if delta > 0:
                note = '  <== OVERSTATED (withdrawable excess)'
            elif delta < 0:
                note = '  <== understated'

            self.stdout.write(
                f"{organizer.id:>4} {wallet.id:>6} {(organizer.company_name or '')[:26]:26} "
                f"{earned / 100:>14,.2f} {available / 100:>14,.2f} "
                f"{recorded_paid / 100:>14,.2f} {true_available / 100:>15,.2f} "
                f"{delta / 100:>13,.2f}{note}"
            )
            totals['earned'] += earned
            totals['available'] += available
            totals['paid'] += recorded_paid
            totals['true'] += true_available

            if earned == 0 and available == 0 and recorded_paid == 0:
                continue

        self.stdout.write('-' * len(header))
        self.stdout.write(
            f"TOTAL true earned: {totals['earned'] / 100:,.2f}   "
            f"shown available: {totals['available'] / 100:,.2f}   "
            f"recorded payouts: {totals['paid'] / 100:,.2f}   "
            f"true available: {totals['true'] / 100:,.2f}"
        )
        difference = totals['available'] - totals['true']
        if difference > 0:
            self.stdout.write(self.style.WARNING(
                f'Dashboards show {difference / 100:,.2f} more than the orders and payouts support.'
            ))
        elif difference < 0:
            self.stdout.write(self.style.WARNING(
                f'Dashboards show {abs(difference) / 100:,.2f} less than organizers are owed.'
            ))
        else:
            self.stdout.write(self.style.SUCCESS('Balances reconcile with orders and payouts.'))
