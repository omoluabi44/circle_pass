import os
import django
from django.db import transaction

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'circlepass_backend.settings')
django.setup()

from core.models import Event, TicketType

with transaction.atomic():
    ev = Event.objects.filter(slug="the-water-wars-2").first()
    if not ev:
        print("Event 'the-water-wars-2' not found!")
    else:
        print(f"Updating Event: '{ev.title}' (ID: {ev.id})")
        
        # Set capacity
        ev.capacity = 1250
        ev.save(update_fields=['capacity'])
        
        # Remove old placeholder ticket types
        old_count = ev.ticket_types.count()
        ev.ticket_types.all().delete()
        print(f"Removed {old_count} old ticket types.")
        
        # 1. FIRST WAVE (₦5,000)
        tt1 = TicketType.objects.create(
            event=ev,
            name="FIRST WAVE",
            description="EVENT ACCESS",
            tier="EARLY_BIRD",
            price=500000, # 5,000 NGN in kobo
            quantity=500,
            quantity_sold=0,
            sort_order=1
        )
        
        # 2. SECOND WAVE (₦7,000)
        tt2 = TicketType.objects.create(
            event=ev,
            name="SECOND WAVE",
            description="EVENT ACCESS",
            tier="REGULAR",
            price=700000, # 7,000 NGN in kobo
            quantity=500,
            quantity_sold=0,
            sort_order=2
        )
        
        # 3. SQUAD OF 4 (₦16,000)
        tt3 = TicketType.objects.create(
            event=ev,
            name="SQUAD OF 4",
            description="ADMITS 4",
            tier="VIP",
            price=1600000, # 16,000 NGN in kobo
            quantity=100,
            quantity_sold=0,
            sort_order=3
        )
        
        # 4. SQUAD OF 4 (₦24,000)
        tt4 = TicketType.objects.create(
            event=ev,
            name="SQUAD OF 4",
            description="ADMITS 4",
            tier="VIP",
            price=2400000, # 24,000 NGN in kobo
            quantity=100,
            quantity_sold=0,
            sort_order=4
        )
        
        # 5. COMAND SQUAD (₦150,000)
        tt5 = TicketType.objects.create(
            event=ev,
            name="COMAND SQUAD",
            description="ADMITS 3 WITH A SPEND CREDIT OF 100,000 AND 3 STAGE ACCESS",
            tier="VVIP",
            price=15000000, # 150,000 NGN in kobo
            quantity=50,
            quantity_sold=0,
            sort_order=5
        )
        
        print("\nSuccessfully created 5 new ticket types for 'The water wars 2':")
        for t in ev.ticket_types.all().order_by('sort_order', 'price'):
            print(f"  - {t.name} (NGN {t.price/100:,.2f}) | Description: '{t.description}' | Tier: {t.tier} | Qty: {t.quantity}")
