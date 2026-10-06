with open('backend/api/views_checkin.py', 'r', encoding='utf-8') as f:
    text = f.read()

target = """            # 3. Apply lazy activation just in case it wasn't triggered yet
            if ticket.status == 'ISSUED':
                activation_threshold = ticket.order.event.start_time - timedelta(hours=3)
                if timezone.now() >= activation_threshold:
                    ticket.status = 'ACTIVE'
                    ticket.save(update_fields=['status'])"""

text = text.replace(target, '')

target2 = """            elif ticket.status == 'ISSUED':
                scan_status = 'Invalid'
                response_detail = "This ticket is not yet active (activates 3 hours before event).\""""

text = text.replace(target2, '')

with open('backend/api/views_checkin.py', 'w', encoding='utf-8') as f:
    f.write(text)
