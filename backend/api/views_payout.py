"""
Organizer Payout API views + Admin payout management.
Handles payout requests with auto-initiated Paystack transfers,
dynamic fee calculation, and fee-preview endpoint.
"""
import uuid

from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.permissions import IsOrganizerOrAdmin, IsAdmin
from core.models import OrganizerWallet, OrganizerBankAccount, Payout, WalletTransaction
from django.conf import settings
import requests


# ==========================================
# FEE UTILITIES
# ==========================================

def calculate_paystack_transfer_fee(amount_kobo: int) -> int:
    """
    Dynamic Paystack NGN transfer fee in kobo.
    ≤ ₦5,000  → ₦10  (1,000 kobo)
    ≤ ₦50,000 → ₦25  (2,500 kobo)
    > ₦50,000 → ₦50  (5,000 kobo)
    """
    naira = amount_kobo / 100
    if naira <= 5_000:
        return 1_000   # ₦10
    elif naira <= 50_000:
        return 2_500   # ₦25
    else:
        return 5_000   # ₦50


# ==========================================
# PAYSTACK HELPERS (kept for backward compat)
# ==========================================

class PaystackBankListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            res = requests.get('https://api.paystack.co/bank', headers={
                'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}'
            }, timeout=15)
            return Response(res.json())
        except Exception as e:
            return Response({'error': str(e)}, status=400)


class PaystackResolveAccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        account_number = request.data.get('account_number')
        bank_code = request.data.get('bank_code')
        if not account_number or not bank_code:
            return Response({'error': 'account_number and bank_code are required'}, status=400)

        try:
            res = requests.get(
                f'https://api.paystack.co/bank/resolve?account_number={account_number}&bank_code={bank_code}',
                headers={'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}'},
                timeout=15,
            )
            res_data = res.json()
            if not res_data.get('status'):
                return Response({'error': res_data.get('message', 'Failed to resolve account')}, status=400)
            return Response(res_data)
        except Exception as e:
            return Response({'error': str(e)}, status=400)


# ==========================================
# FEE PREVIEW ENDPOINT
# ==========================================

class PayoutFeePreviewView(APIView):
    """
    GET /api/organizer/payouts/fee-preview/?amount=<kobo>
    Returns dynamic payout charge and what the organizer will receive.
    All values in kobo.
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizerOrAdmin]

    def get(self, request):
        try:
            amount_kobo = int(request.query_params.get('amount', 0))
        except (ValueError, TypeError):
            return Response({'detail': 'amount must be a valid integer (kobo).'}, status=400)

        if amount_kobo < 10_000:  # Minimum ₦1,000
            return Response({'detail': 'Minimum withdrawal amount is ₦1,000.'}, status=400)

        payout_charge = calculate_paystack_transfer_fee(amount_kobo)
        amount_received = amount_kobo - payout_charge

        return Response({
            'amount_requested': amount_kobo,
            'payout_charge': payout_charge,
            'amount_received': amount_received,
        })


# ==========================================
# ORGANIZER ENDPOINTS
# ==========================================

class OrganizerPayoutListCreateView(APIView):
    """
    GET  /api/organizer/payouts/  — List organizer's payout history.
    POST /api/organizer/payouts/  — Request a new payout withdrawal (auto-initiates Paystack transfer).
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizerOrAdmin]

    def get(self, request):
        from api.serializers import PayoutSerializer
        payouts = Payout.objects.filter(
            wallet__organizer__user=request.user
        ).order_by('-requested_at')
        serializer = PayoutSerializer(payouts, many=True)
        return Response(serializer.data)

    def post(self, request):
        from api.serializers import PayoutRequestSerializer, PayoutSerializer

        serializer = PayoutRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        amount = data['amount']  # kobo — this is the TOTAL deducted from balance
        bank_account_id = data['bank_account_id']

        # Calculate fees dynamically — always server-side
        payout_charge = calculate_paystack_transfer_fee(amount)
        amount_received = amount - payout_charge  # organizer receives this

        with transaction.atomic():
            try:
                wallet = OrganizerWallet.objects.select_for_update().get(
                    organizer__user=request.user
                )
            except OrganizerWallet.DoesNotExist:
                return Response({'detail': 'Wallet not found.'}, status=status.HTTP_404_NOT_FOUND)

            try:
                bank_account = OrganizerBankAccount.objects.get(
                    pk=bank_account_id, organizer__user=request.user
                )
            except OrganizerBankAccount.DoesNotExist:
                return Response({'detail': 'Bank account not found.'}, status=status.HTTP_404_NOT_FOUND)

            if amount > wallet.available_balance:
                return Response(
                    {'detail': f'Insufficient balance. Available: ₦{wallet.available_balance / 100:,.2f}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Generate unique reference
            reference = f'PO-{uuid.uuid4().hex[:10].upper()}'

            # Reserve the full amount immediately (deduct from available_balance)
            OrganizerWallet.objects.filter(pk=wallet.pk).update(
                available_balance=F('available_balance') - amount
            )
            wallet.refresh_from_db()

            # Create payout record in PROCESSING state
            payout = Payout.objects.create(
                wallet=wallet,
                bank_account=bank_account,
                amount=amount,
                payout_charge=payout_charge,
                amount_received=amount_received,
                status='PROCESSING',
                reference=reference,
                bank_name=bank_account.bank_name,
                account_number=bank_account.account_number,
                account_name=bank_account.account_name,
                bank_code=bank_account.bank_code,
                paystack_recipient_code=bank_account.paystack_recipient_code,
            )

            # Create ledger entry for the withdrawal reservation
            WalletTransaction.objects.create(
                wallet=wallet,
                type='PAYOUT',
                amount=amount,
                balance_after=wallet.available_balance,
                reference=reference,
                description=(
                    f'Payout to {bank_account.bank_name} ••••{bank_account.account_number[-4:]}. '
                    f'Requested: ₦{amount / 100:,.0f}, '
                    f'Charge: ₦{payout_charge / 100:,.0f}, '
                    f'Organizer receives: ₦{amount_received / 100:,.0f}'
                ),
                related_payout=payout,
            )

            # Auto-initiate Paystack transfer
            try:
                from core.utils.transfers import initiate_transfer, create_transfer_recipient

                # Ensure recipient code exists (may have been created when bank account was saved)
                recipient_code = bank_account.paystack_recipient_code
                if not recipient_code:
                    recipient_code = create_transfer_recipient(
                        bank_account.bank_code,
                        bank_account.account_number,
                        bank_account.account_name,
                    )
                    bank_account.paystack_recipient_code = recipient_code
                    bank_account.save(update_fields=['paystack_recipient_code'])
                    payout.paystack_recipient_code = recipient_code
                    payout.save(update_fields=['paystack_recipient_code'])

                # Initiate the transfer with amount_received (what organizer gets after charge)
                transfer_code = initiate_transfer(recipient_code, amount_received, reference)
                payout.paystack_transfer_code = transfer_code
                payout.save(update_fields=['paystack_transfer_code', 'updated_at'])

            except Exception as transfer_error:
                # Transfer initiation failed — mark as failed and refund
                OrganizerWallet.objects.filter(pk=wallet.pk).update(
                    available_balance=F('available_balance') + amount
                )
                wallet.refresh_from_db()
                WalletTransaction.objects.create(
                    wallet=wallet,
                    type='REVERSAL',
                    amount=amount,
                    balance_after=wallet.available_balance,
                    reference=reference,
                    description=f'Payout initiation failed: {str(transfer_error)}',
                    related_payout=payout,
                )
                payout.status = 'FAILED'
                payout.failure_reason = f'Transfer initiation failed: {str(transfer_error)}'
                payout.processed_at = timezone.now()
                payout.save(update_fields=['status', 'failure_reason', 'processed_at', 'updated_at'])

                return Response(
                    {'detail': f'Payout could not be initiated: {str(transfer_error)}'},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        return Response(PayoutSerializer(payout).data, status=status.HTTP_201_CREATED)


class OrganizerPayoutDetailView(APIView):
    """
    GET /api/organizer/payouts/<id>/  — Single payout detail.
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizerOrAdmin]

    def get(self, request, pk):
        from api.serializers import PayoutSerializer
        try:
            payout = Payout.objects.get(pk=pk, wallet__organizer__user=request.user)
        except Payout.DoesNotExist:
            return Response({'detail': 'Payout not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(PayoutSerializer(payout).data)


# ==========================================
# ADMIN ENDPOINTS
# ==========================================

class AdminPayoutListView(generics.ListAPIView):
    """
    GET /api/admin/payouts/  — All payouts for admin review.
    Supports ?status= query param filter.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        from api.serializers import AdminPayoutSerializer
        return AdminPayoutSerializer

    def get_queryset(self):
        qs = Payout.objects.select_related(
            'wallet__organizer__user'
        ).order_by('-requested_at')

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        return qs
