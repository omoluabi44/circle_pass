#!/bin/bash
# Phase 2 watcher: CirclePass sends through Amazon SES. Until thecirclepass.com
# is verified in SES, the sender is the CirclePass-branded coursepass.app address
# (circlepass@coursepass.app). This watcher swaps in the real domain sender the
# moment SES verifies officialcirclepass@thecirclepass.com (or the whole domain),
# sends a test email, then removes itself from cron.
set -u

cd /home/ubuntu/circlepass || exit 1
LOG=/home/ubuntu/ses_switch.log
exec >>"$LOG" 2>&1
echo "=== $(date -u) tick ==="

stop_cron() {
  crontab -l 2>/dev/null | grep -v 'switch_ses_email.sh' | crontab - || true
}

if grep -q '^DEFAULT_FROM_EMAIL=.*@thecirclepass.com' backend/.env; then
  echo "already using thecirclepass.com sender - disabling watcher"
  stop_cron
  exit 0
fi

STATUS=$(sudo docker-compose exec -T backend python manage.py shell <<'PY'
import boto3
from django.conf import settings
ses = boto3.client('sesv2', region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1'))
ok = False
for identity in ('officialcirclepass@thecirclepass.com', 'thecirclepass.com'):
    try:
        if ses.get_email_identity(EmailIdentity=identity).get('VerifiedForSendingStatus'):
            ok = True
            print('VERIFIED', identity)
    except Exception as exc:
        print('ERR', identity, exc)
print('RESULT', 'YES' if ok else 'NO')
PY
)

echo "$STATUS" | tail -3

if ! echo "$STATUS" | grep -q 'RESULT YES'; then
  echo "thecirclepass.com not verified yet - staying on coursepass.app sender"
  exit 0
fi

echo "thecirclepass.com verified - switching sender"
if grep -q '^DEFAULT_FROM_EMAIL=' backend/.env; then
  sed -i 's|^DEFAULT_FROM_EMAIL=.*|DEFAULT_FROM_EMAIL=CirclePass <officialcirclepass@thecirclepass.com>|' backend/.env
else
  printf '\nDEFAULT_FROM_EMAIL=CirclePass <officialcirclepass@thecirclepass.com>\n' >>backend/.env
fi
grep -n '^DEFAULT_FROM_EMAIL=' backend/.env

sudo docker-compose up -d --force-recreate backend celery_worker
sleep 25

sudo docker-compose exec -T backend python manage.py email_health --send-to emmanuelogunleye441999@gmail.com
echo "=== sender switch complete $(date -u) ==="
stop_cron
