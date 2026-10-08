with open(r'backend/api/views_contacts.py', 'r', encoding='utf-8') as f:
    text = f.read()

old_contacts = '''    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', '') == 'ADMIN':
            qs = Ticket.objects.filter(order__status='COMPLETED')
        else:
            qs = Ticket.objects.filter(
                order__event__organizer__user=user,
                order__status='COMPLETED'
            )'''

new_contacts = '''    def get_queryset(self):
        user = self.request.user
        qs = Ticket.objects.filter(
            order__event__organizer__user=user,
            order__status='COMPLETED'
        )'''

old_followers = '''    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', '') == 'ADMIN':
            qs = FollowedOrganizer.objects.all()
        else:
            qs = FollowedOrganizer.objects.filter(organizer__user=user)'''

new_followers = '''    def get_queryset(self):
        user = self.request.user
        qs = FollowedOrganizer.objects.filter(organizer__user=user)'''

text = text.replace(old_contacts, new_contacts)
text = text.replace(old_followers, new_followers)

with open(r'backend/api/views_contacts.py', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
