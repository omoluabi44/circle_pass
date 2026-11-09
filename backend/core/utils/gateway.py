"""Payment gateway selection and a gateway-agnostic verification helper."""
from core.utils import nomba, paystack


def get_active_gateway():
    """Return the gateway root admins selected for new paid checkouts."""
    from core.models import PlatformSetting

    return PlatformSetting.get_solo().payment_gateway


def verify_payment(payment):
    """Verify a ``Payment`` with whichever gateway processed it.

    Normalised return:
    ``{'status', 'success', 'failed', 'channel', 'data', 'raw'}``.
    Unknown/lookup failures stay non-final so callers never mark a payment
    failed on a transient provider error.
    """
    if payment.provider == 'NOMBA':
        result = nomba.verify_transaction(payment.reference)
        status = result['status']
        return {
            'status': status,
            'success': status == 'SUCCESS',
            'failed': status == 'FAILED',
            'channel': result.get('channel', ''),
            'data': result.get('data'),
            'raw': result.get('raw'),
        }

    verification = paystack.verify_transaction(payment.reference)
    data = verification.get('data') or {}
    status = (data.get('status') or '').lower()
    return {
        'status': status,
        'success': status == 'success',
        'failed': status in ('failed', 'abandoned', 'reversed'),
        'channel': data.get('channel', ''),
        'data': data,
        'raw': verification,
    }
