import re
from datetime import timedelta
from django.utils import timezone
from core.models import Event, EventScreening

def screen_event(event_id):
    """
    Rule-based event screening (v1).
    Returns the new status of the event.
    """
    try:
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        return None

    now = timezone.now()
    score = 100
    flags = []

    # 1. Date Sanity
    if event.start_time <= now:
        flags.append("Start time must be in the future.")
        score -= 50
    if event.end_time <= event.start_time:
        flags.append("End time must be after start time.")
        score -= 50
    if event.end_time - event.start_time > timedelta(days=30):
        flags.append("Event duration exceeds 30 days.")
        score -= 20

    # 2. Venue/Location Sanity
    if not event.is_online and not event.venue:
        flags.append("Physical event must have a venue.")
        score -= 40

    # 3. Content Check (simple blocklist)
    banned_words = ['spam', 'scam', 'fake', 'testevent123']
    title_lower = event.title.lower()
    desc_lower = event.description.lower()
    
    for word in banned_words:
        if re.search(r'\b' + re.escape(word) + r'\b', title_lower) or \
           re.search(r'\b' + re.escape(word) + r'\b', desc_lower):
            flags.append(f"Prohibited word detected: {word}")
            score -= 60

    # 4. Duplicate Detection (same organizer, exact title, overlapping start time)
    # Just check if same organizer has another event with exact same title.
    duplicates = Event.objects.filter(
        organizer=event.organizer,
        title=event.title
    ).exclude(id=event.id)
    
    if duplicates.exists():
        flags.append("Possible duplicate event detected.")
        score -= 30

    # Determine outcome (always make admin verification automatic for good events)
    if score >= 80 and not flags:
        ai_status = 'AUTO_APPROVED'
        new_event_status = 'PUBLISHED'
    elif any(f in flags for f in [
        "Start time must be in the future.",
        "End time must be after start time.",
        "Physical event must have a venue."
    ]):
        ai_status = 'CHANGES_REQUIRED'
        new_event_status = 'CHANGES_REQUIRED'
    else:
        ai_status = 'HUMAN_ADMIN_REVIEW'
        new_event_status = 'UNDER_REVIEW'

    # Save Screening record
    screening, created = EventScreening.objects.update_or_create(
        event=event,
        defaults={
            'ai_status': ai_status,
            'confidence_score': max(0, score)
        }
    )

    # Update event status
    event.status = new_event_status
    event.save(update_fields=['status'])

    return new_event_status
