"""Record a payout that was already sent to an organizer outside CirclePass.

Payouts made by hand (bank app, Nomba dashboard, old Paystack dashboard) never
touched the ledger, so the wallet still showed the money as available and the
organizer could have requested it a second time. This command writes that
payment into the same tables a normal withdrawal uses, so the dashboard,
payout history and ledger all agree:

* creates a Payout row (provider MANUAL, status SUCCESSFUL),
* deducts the amount from ``available_balance``,
* adds it to ``total_payouts``,
* writes a PAYOUT entry to the wallet ledger.

The reference is derived from the payout itself (``MANUAL-<date>-<org>-<amount>``),
so running the same file twice is safe — an already-recorded payout is skipped.

Dry run first, always:

    python manage.py record_manual_payouts --file payouts.csv --dry-run
    python manage.py record_manual_payouts --file payouts.csv

CSV: one row per payment, header optional.

    organizer,amount,date,note
    goathq0@gmail.com,50000,2026-11-05,GTB transfer - Goat HQ
    NESA\\ Lagos,150000,2026-11-08,Nomba transfer - ECONNEXT

``organizer`` may be an email, a company name (partial match allowed when
unique) or a wallet id. ``amount`` is in Naira and may contain commas.
"""
import csv
from datetime import datetime

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone

from core.models import OrganizerWallet, Payout, WalletTransaction

MANUAL_PROVIDER = 'MANUAL'
DESCRIPTION_PREFIX = 'Manual payout recorded during reconciliation'


def parse_amount(value):
    """Naira (with or without commas/₦) to integer kobo."""
    cleaned = str(value).strip().replace(',', '').replace('₦', '').replace('NGN', '').strip()
    if not cleaned:
        raise ValueError('missing amount')
    kobo = int(round(float(cleaned) * 100))
    if kobo <= 0:
        raise ValueError('amount must be greater than zero')
    return kobo


def parse_date(value):
    text = str(value or '').strip()
    if not text:
        return timezone.now()
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%Y-%m-%d %H:%M', '%d/%m/%Y %H:%M'):
        try:
            parsed = datetime.strptime(text, fmt)
        except ValueError:
            continue
        return timezone.make_aware(parsed) if timezone.is_naive(parsed) else parsed
    raise ValueError(f'could not read date "{value}" (use YYYY-MM-DD)')


class Command(BaseCommand):
    help = 'Record payouts already sent to organizers outside CirclePass.'

    def add_arguments(self, parser):
        parser.add_argument('--file', help='CSV of payouts: organizer,amount,date,note')
        parser.add_argument('--organizer', help='Single payout: organizer email/name/wallet id')
        parser.add_argument('--amount', help='Single payout: amount in Naira')
        parser.add_argument('--date', help='Single payout: date (YYYY-MM-DD), defaults to now')
        parser.add_argument('--note', default='', help='Single payout: bank/channel note')
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Show what would be recorded without writing anything.',
        )

    # ── input ────────────────────────────────────────────────────────────────
    def _rows(self, options):
        if options['file']:
            try:
                handle = open(options['file'], newline='', encoding='utf-8-sig')
            except OSError as exc:
                raise CommandError(f'Could not open {options["file"]}: {exc}')
            with handle:
                reader = csv.reader(handle)
                rows = []
                for index, raw in enumerate(reader):
                    if not raw or not any(cell.strip() for cell in raw):
                        continue
                    first = raw[0].strip().lower()
                    if index == 0 and first in ('organizer', 'email', 'organiser'):
                        continue  # header
                    padded = (raw + [''] * 4)[:4]
                    rows.append({
                        'organizer': padded[0].strip(),
                        'amount': padded[1].strip(),
                        'date': padded[2].strip(),
                        'note': padded[3].strip(),
                    })
            return rows

        if options['organizer'] and options['amount']:
            return [{
                'organizer': options['organizer'].strip(),
                'amount': options['amount'].strip(),
                'date': (options['date'] or '').strip(),
                'note': (options['note'] or '').strip(),
            }]

        raise CommandError('Provide --file, or both --organizer and --amount.')

    def _find_wallet(self, needle):
        query = (
            Q(organizer__user__email__iexact=needle)
            | Q(organizer__company_name__iexact=needle)
            | Q(organizer__company_name__icontains=needle)
            | Q(organizer__user__username__iexact=needle)
        )
        if needle.isdigit():
            query |= Q(id=int(needle)) | Q(organizer_id=int(needle))

        matches = list(
            OrganizerWallet.objects.select_related('organizer__user').filter(query).distinct()
        )
        if not matches:
            raise CommandError(f'No wallet matched "{needle}".')
        if len(matches) > 1:
            options = ', '.join(
                f'{w.id} ({w.organizer.company_name} / {w.organizer.user.email})'
                for w in matches
            )
            raise CommandError(
                f'"{needle}" matched more than one wallet: {options}. '
                'Use the wallet id.'
            )
        return matches[0]

    # ── main ─────────────────────────────────────────────────────────────────
    def handle(self, *args, **options):
        rows = self._rows(options)
        dry_run = options['dry_run']

        planned = []
        for row in rows:
            try:
                amount = parse_amount(row['amount'])
                when = parse_date(row['date'])
            except ValueError as exc:
                raise CommandError(
                    f'{row["organizer"] or "row"}: {exc} (amount "{row["amount"]}", '
                    f'date "{row["date"]}")'
                )

            wallet = self._find_wallet(row['organizer'])
            reference = f'MANUAL-{when.strftime("%Y%m%d")}-{wallet.organizer_id}-{amount}'
            note = row['note'] or f'Paid to {wallet.organizer.company_name} outside CirclePass'
            planned.append({
                'wallet': wallet,
                'amount': amount,
                'when': when,
                'note': note,
                'reference': reference,
            })

        self.stdout.write('')
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN — nothing is written.'))
        self.stdout.write(
            f"{'wallet':>6} {'company':28} {'amount':>14} {'available now':>15} "
            f"{'after':>14} {'date':>12} {'state':>10}"
        )

        written = skipped = 0
        for item in planned:
            wallet = item['wallet']
            amount = item['amount']
            exists = Payout.objects.filter(reference=item['reference']).exists()
            available = wallet.available_balance or 0
            after = available - amount

            state = 'record' if not exists else 'already'
            if dry_run:
                state = 'would add' if not exists else 'already'
            if after < 0 and not exists:
                state = 'OVERDRAW'

            self.stdout.write(
                f"{wallet.id:>6} {(wallet.organizer.company_name or '')[:28]:28} "
                f"{amount / 100:>14,.2f} {available / 100:>15,.2f} "
                f"{max(0, after) / 100:>14,.2f} "
                f"{item['when'].strftime('%Y-%m-%d'):>12} {state:>10}"
            )

            if dry_run or exists:
                skipped += 1 if exists else 0
                continue

            with transaction.atomic():
                locked = OrganizerWallet.objects.select_for_update().get(pk=wallet.pk)
                payout = Payout.objects.create(
                    wallet=locked,
                    amount=amount,
                    payout_charge=0,
                    amount_received=amount,
                    status='SUCCESSFUL',
                    provider=MANUAL_PROVIDER,
                    reference=item['reference'],
                    bank_name='Recorded manually',
                    account_number='',
                    account_name=locked.organizer.company_name,
                    bank_code='',
                    processed_at=item['when'],
                )
                Payout.objects.filter(pk=payout.pk).update(requested_at=item['when'])

                OrganizerWallet.objects.filter(pk=locked.pk).update(
                    available_balance=F('available_balance') - amount,
                    total_payouts=F('total_payouts') + amount,
                )
                locked.refresh_from_db()

                WalletTransaction.objects.create(
                    wallet=locked,
                    type='PAYOUT',
                    amount=amount,
                    balance_after=locked.available_balance,
                    reference=item['reference'],
                    description=(
                        f'{DESCRIPTION_PREFIX} — {item["note"]}. '
                        f'Recorded on {timezone.now().strftime("%Y-%m-%d %H:%M")}.'
                    ),
                    related_payout=payout,
                )
            written += 1

        self.stdout.write('')
        if dry_run:
            self.stdout.write(self.style.WARNING(
                f'Dry run complete — {len(planned)} row(s) checked, nothing written.'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'Recorded {written} payout(s); {skipped} already recorded.'
            ))
            self.stdout.write('Run `python manage.py wallet_audit` to confirm the balances.')
