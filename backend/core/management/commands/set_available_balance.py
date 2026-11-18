"""Set an organizer's available balance to an exact figure.

Used when money was sent to an organizer outside CirclePass and the dashboard
must stop showing it as withdrawable. Only ``available_balance`` is touched:
total earnings, payout history and the ledger are left exactly as they are.

    python manage.py set_available_balance --organizer goathq0@gmail.com --amount 143000 --dry-run
    python manage.py set_available_balance --organizer goathq0@gmail.com --amount 143000

Batch (CSV, header optional: organizer,available):

    python manage.py set_available_balance --file balances.csv --dry-run
    python manage.py set_available_balance --file balances.csv

``amount`` is what the balance should become, in Naira (commas allowed).
``organizer`` may be an email, a company name, or a wallet id.
"""
import csv

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q

from core.models import OrganizerWallet


def parse_amount(value):
    cleaned = str(value).strip().replace(',', '').replace('₦', '').replace('NGN', '').strip()
    if not cleaned:
        raise ValueError('missing amount')
    kobo = int(round(float(cleaned) * 100))
    if kobo < 0:
        raise ValueError('amount cannot be negative')
    return kobo


class Command(BaseCommand):
    help = "Set an organizer's available balance to an exact figure (available_balance only)."

    def add_arguments(self, parser):
        parser.add_argument('--file', help='CSV: organizer,available')
        parser.add_argument('--organizer', help='Email, company name or wallet id')
        parser.add_argument('--amount', help='The balance it should become, in Naira')
        parser.add_argument('--note', default='', help='Why (kept in the command output only)')
        parser.add_argument('--dry-run', action='store_true', help='Show changes without writing')

    def _rows(self, options):
        if options['file']:
            try:
                handle = open(options['file'], newline='', encoding='utf-8-sig')
            except OSError as exc:
                raise CommandError(f'Could not open {options["file"]}: {exc}')
            with handle:
                rows = []
                for index, raw in enumerate(csv.reader(handle)):
                    if not raw or not any(cell.strip() for cell in raw):
                        continue
                    if index == 0 and raw[0].strip().lower() in ('organizer', 'email', 'organiser'):
                        continue
                    padded = (raw + [''] * 2)[:2]
                    rows.append({
                        'organizer': padded[0].strip(),
                        'amount': padded[1].strip(),
                    })
            return rows

        if options['organizer'] and options['amount']:
            return [{
                'organizer': options['organizer'].strip(),
                'amount': options['amount'].strip(),
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
            listed = ', '.join(
                f'{w.id} ({w.organizer.company_name} / {w.organizer.user.email})'
                for w in matches
            )
            raise CommandError(f'"{needle}" matched more than one wallet: {listed}. Use the id.')
        return matches[0]

    def handle(self, *args, **options):
        rows = self._rows(options)
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN — nothing is written.'))
        if options['note']:
            self.stdout.write(f"Reason: {options['note']}")
        self.stdout.write(
            f"{'wallet':>6} {'company':28} {'before':>14} {'after':>14} {'change':>13}"
        )

        changed = 0
        for row in rows:
            try:
                target = parse_amount(row['amount'])
            except ValueError as exc:
                raise CommandError(f'{row["organizer"] or "row"}: {exc}')

            wallet = self._find_wallet(row['organizer'])
            before = wallet.available_balance or 0
            self.stdout.write(
                f"{wallet.id:>6} {(wallet.organizer.company_name or '')[:28]:28} "
                f"{before / 100:>14,.2f} {target / 100:>14,.2f} "
                f"{(target - before) / 100:>+13,.2f}"
            )

            if dry_run or target == before:
                continue

            wallet.available_balance = target
            wallet.save(update_fields=['available_balance', 'updated_at'])
            changed += 1

        self.stdout.write('')
        if dry_run:
            self.stdout.write(self.style.WARNING(
                f'Dry run complete — {len(rows)} row(s) checked, nothing written.'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(f'Updated {changed} wallet(s).'))
