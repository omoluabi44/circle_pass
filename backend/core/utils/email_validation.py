"""Catch ".con" style email typos before a ticket goes nowhere.

A buyer who typed ``papkastella565@gmail.con`` paid, the ticket was issued, and
the mail bounced because that domain does not exist. ``.con`` is not a real
TLD, so the correction is unambiguous. Real top-level domains are never
touched — ``.co``, ``.cm``, ``.com.ng`` and friends are legitimate, and
"fixing" them would break working addresses.

Two kinds of typo are corrected:

* a non-existent TLD that is one edit away from ``com`` (``.con``, ``.cim``,
  ``.comm`` …), and
* a known provider domain misspelt (``gmial.com``, ``gmail.co`` …).

Use :func:`normalise_email` to clean an address before saving it, and
:func:`email_suggestion` when you only want to warn the user.
"""
import re

# TLDs that do not exist and are clearly a mistyped .com. Anything real
# (co, cm, com.ng, net, org, io …) is deliberately absent.
TLD_TYPOS = {
    'con': 'com',
    'cim': 'com',
    'cpm': 'com',
    'clm': 'com',
    'comn': 'com',
    'coom': 'com',
    'comm': 'com',
    'conm': 'com',
    'ocm': 'com',
    'vom': 'com',
    'xom': 'com',
    'coml': 'com',
}

# Whole domains that belong to a big provider but are misspelt. Matched
# exactly, so a real domain such as yahoo.co.uk is never rewritten.
PROVIDER_DOMAIN_TYPOS = {
    'gmial.com': 'gmail.com',
    'gmal.com': 'gmail.com',
    'gnail.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'gmaill.com': 'gmail.com',
    'gemail.com': 'gmail.com',
    'gmail.co': 'gmail.com',
    'gmail.cim': 'gmail.com',
    'yaho.com': 'yahoo.com',
    'yahooo.com': 'yahoo.com',
    'yahoo.co': 'yahoo.com',
    'hotmial.com': 'hotmail.com',
    'hotmal.com': 'hotmail.com',
    'hotmai.com': 'hotmail.com',
    'hotmail.co': 'hotmail.com',
    'outlok.com': 'outlook.com',
    'outllook.com': 'outlook.com',
    'outlook.co': 'outlook.com',
    'iclod.com': 'icloud.com',
    'icloud.co': 'icloud.com',
}

_EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def split_email(email):
    """Return ``(local, domain)`` lower-cased, or ``(email, '')`` when malformed."""
    value = (email or '').strip()
    if '@' not in value:
        return value.lower(), ''
    local, _, domain = value.rpartition('@')
    return local.lower(), domain.lower()


def email_suggestion(email):
    """Return the corrected address, or ``None`` when nothing needs fixing.

    Only the domain is ever changed; the local part is left exactly as typed.
    """
    local, domain = split_email(email)
    if not local or not domain:
        return None
    if not _EMAIL_RE.match(f'{local}@{domain}'):
        return None

    if domain in PROVIDER_DOMAIN_TYPOS:
        fixed_domain = PROVIDER_DOMAIN_TYPOS[domain]
    else:
        _, _, last_label = domain.rpartition('.')
        fixed_last = TLD_TYPOS.get(last_label)
        if not fixed_last:
            return None
        fixed_domain = f'{domain[:len(domain) - len(last_label)]}{fixed_last}'

    candidate = f'{local}@{fixed_domain}'
    original = (email or '').strip().lower()
    return candidate if candidate != original else None


def normalise_email(email):
    """Return the address with an obvious domain typo corrected."""
    return email_suggestion(email) or (email or '').strip()


def looks_like_email(email):
    return bool(_EMAIL_RE.match((email or '').strip()))
