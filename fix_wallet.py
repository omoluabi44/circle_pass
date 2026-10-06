with open(r'backend/api/views_wallet.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re

target1 = """            if getattr(request.user, 'role', '') == 'ADMIN':
                wallet = OrganizerWallet.objects.first()
            else:
                profile = OrganizerProfile.objects.get(user=request.user)
                wallet, _ = OrganizerWallet.objects.get_or_create(organizer=profile)"""

replacement1 = """            profile = OrganizerProfile.objects.get(user=request.user)
            wallet, _ = OrganizerWallet.objects.get_or_create(organizer=profile)"""

if target1 in text:
    text = text.replace(target1, replacement1)
    
target2 = """        if getattr(self.request.user, 'role', '') == 'ADMIN':
            wallet = OrganizerWallet.objects.first()
            if not wallet:
                return WalletTransaction.objects.none()
            return WalletTransaction.objects.filter(wallet=wallet).order_by('-created_at')"""

replacement2 = ""

if target2 in text:
    text = text.replace(target2, replacement2)

with open(r'backend/api/views_wallet.py', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced successfully")
