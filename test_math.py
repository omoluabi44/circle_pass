amount_paid_naira = 500
amount_paid_kobo = amount_paid_naira * 100

print("OLD LOGIC:")
organizer_credit = int(amount_paid_kobo * 0.95)
cp_fee = amount_paid_kobo - organizer_credit
print(f"Amount Paid: {amount_paid_kobo}")
print(f"Organizer Credit: {organizer_credit}")
print(f"CP Fee: {cp_fee}")
print(f"Deduction %: {cp_fee / amount_paid_kobo * 100}%")
