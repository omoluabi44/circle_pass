with open(r'backend/core/utils/fulfillment.py', 'r', encoding='utf-8') as f:
    text = f.read()

target = """        if payment and payment.amount > 0:
            organizer_credit = int(payment.amount * 0.95)
            cp_fee = payment.amount - organizer_credit  # 5% retained by CirclePass"""

replacement = """        if payment and payment.amount > 0:
            if order_fresh.fee_amount > 0:
                # Buyer paid the fee. CirclePass takes exactly what was charged as the fee.
                cp_fee = order_fresh.fee_amount
                organizer_credit = payment.amount - cp_fee
            else:
                # Organizer absorbed the fee. CirclePass takes 5% of the final payment.
                cp_fee = int(payment.amount * 0.05)
                organizer_credit = payment.amount - cp_fee"""

if target in text:
    text = text.replace(target, replacement)
    with open(r'backend/core/utils/fulfillment.py', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced successfully")
else:
    print("Target not found")
