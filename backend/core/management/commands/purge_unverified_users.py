"""Delete bot/junk accounts."""
from django.core.management.base import BaseCommand
from django.utils import timezone

from api.spam_guard import registration_problem


class Command(BaseCommand):
    help = (
        'Remove bot/junk signups. By default deletes accounts that never '
        'completed email verification; --suspicious also removes accounts '
        'whose email/username matches the bot patterns (even if verified). '
        'Unverified accounts are also cleaned automatically on every signup.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours', type=int, default=48,
            help='Only delete unverified accounts older than this many hours (default: 48).',
        )
        parser.add_argument(
            '--suspicious', action='store_true',
            help='Also delete accounts with machine-generated emails/usernames.',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Report how many accounts would be removed without deleting.',
        )

    def handle(self, *args, **options):
        ids = self._targets(options['hours'])
        if options['suspicious']:
            ids |= self._suspicious_ids()

        if options['dry_run']:
            self.stdout.write(f'{len(ids)} account(s) would be deleted.')
            return

        from core.models import User
        queryset = User.objects.filter(id__in=ids)
        count = queryset.count()
        queryset.delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {count} account(s).'))

    def _targets(self, hours):
        from core.models import User

        cutoff = timezone.now() - timezone.timedelta(hours=hours)
        return set(User.objects.filter(
            is_active=False, is_staff=False, is_superuser=False,
            date_joined__lt=cutoff,
        ).values_list('id', flat=True))

    def _suspicious_ids(self):
        from core.models import User

        ids = set()
        candidates = User.objects.filter(
            is_staff=False, is_superuser=False, role='ATTENDEE',
        ).only('id', 'email', 'username')
        for user in candidates.iterator():
            if registration_problem(user.email, user.username):
                ids.add(user.id)
        return ids
