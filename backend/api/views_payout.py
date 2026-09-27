"""
Organizer Payout API views + Admin payout management.
Handles payout requests, history, admin approval/rejection.
"""
import uuid

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.permissions import IsOrganizerOrAdmin, IsAdmin
from core.models import OrganizerWallet, Payout, WalletTransaction
from django.conf import settings
import requests

class PaystackBankListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            res = requests.get('https://api.paystack.co/bank', headers={
                'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}'
            })
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
                headers={'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}'}
            )
            return Response(res.json())
        except Exception as e:
            return Response({'error': str(e)}, status=400)


# ==========================================
# ORGANIZER ENDPOINTS
# ==========================================

class OrganizerPayoutListCreateView(APIView):
    """
    GET  /api/organizer/payouts/  — List organizer's payout history.
    POST /api/organizer/payouts/  — Request a new payout withdrawal.
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizerOrAdmin]

    def get(self, request):
        from api.serializers import PayoutSerializer
        if getattr(request.user, 'role', '') == 'ADMIN':
            payouts = Payout.objects.all().order_by('-requested_at')
        else:
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

        with transaction.atomic():
            try:
                if getattr(request.user, 'role', '') == 'ADMIN':
                    wallet = OrganizerWallet.objects.select_for_update().first()
                    if not wallet:
                        raise OrganizerWallet.DoesNotExist
                else:
                    wallet = OrganizerWallet.objects.select_for_update().get(
                        organizer__user=request.user
                    )
            except OrganizerWallet.DoesNotExist:
                return Response(
                    {'detail': 'Wallet not found.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            amount = data['amount']
            withdrawal_fee = 10000 # ₦100 withdrawal fee (in kobo)
            total_deduction = amount + withdrawal_fee

            if total_deduction > wallet.available_balance:
                return Response(
                    {'detail': f'Insufficient balance for payout and ₦100 fee. Available: ₦{wallet.available_balance / 100:,.2f}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Generate unique payout reference
            reference = f'PO-{uuid.uuid4().hex[:8].upper()}'

            # Deduct from available balance
            wallet.available_balance = F('available_balance') - total_deduction
            wallet.save(update_fields=['available_balance', 'updated_at'])
            wallet.refresh_from_db()

            # Create the payout record
            payout = Payout.objects.create(
                wallet=wallet,
                amount=amount,
                reference=reference,
                bank_name=data['bank_name'],
                account_number=data['account_number'],
                account_name=data['account_name'],
                bank_code=data['bank_code'],
                status='PENDING',
            )

            # Create wallet transaction entry for payout
            WalletTransaction.objects.create(
                wallet=wallet,
                type='PAYOUT',
                amount=amount,
                balance_after=wallet.available_balance + withdrawal_fee,
                reference=reference,
                description=f'Payout request to {data["bank_name"]} - {data["account_number"]}',
            )
            
            # Create wallet transaction entry for fee
            WalletTransaction.objects.create(
                wallet=wallet,
                type='PAYOUT',
                amount=withdrawal_fee,
                balance_after=wallet.available_balance,
                reference=f'{reference}-FEE',
                description=f'Withdrawal fee for {reference}',
            )

            # If auto-upon-request is enabled, we could trigger Paystack Transfers API here
            # For now, it stays PENDING for manual processing or async processing.

        result = PayoutSerializer(payout)
        return Response(result.data, status=status.HTTP_201_CREATED)


class OrganizerPayoutDetailView(APIView):
    """
    GET /api/organizer/payouts/<id>/  — Single payout detail.
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizerOrAdmin]

    def get(self, request, pk):
        from api.serializers import PayoutSerializer
        try:
            if getattr(request.user, 'role', '') == 'ADMIN':
                payout = Payout.objects.get(pk=pk)
            else:
                payout = Payout.objects.get(
                    pk=pk,
                    wallet__organizer__user=request.user,
                )
        except Payout.DoesNotExist:
            return Response(
                {'detail': 'Payout not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(PayoutSerializer(payout).data)


# ==========================================
# ADMIN ENDPOINTS
# ==========================================

class AdminPayoutListView(generics.ListAPIView):
    """
    GET /api/admin/payouts/  — All payouts for admin review.
    Supports ?status=PENDING query param filter.
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


class AdminPayoutApproveView(APIView):
    """
    POST /api/admin/payouts/<id>/approve/
    Transitions payout from PENDING → PROCESSING.
    In production, this would also initiate a Paystack Transfer.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        from api.serializers import AdminPayoutSerializer

        with transaction.atomic():
            try:
                payout = Payout.objects.select_for_update().get(pk=pk)
            except Payout.DoesNotExist:
                return Response(
                    {'detail': 'Payout not found.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if payout.status != 'PENDING':
                return Response(
                    {'detail': f'Cannot approve a payout with status: {payout.status}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            payout.status = 'PROCESSING'
            payout.save(update_fields=['status', 'updated_at'])

            # TODO: Initiate Paystack Transfer here in production
            # from core.utils.transfers import create_transfer_recipient, initiate_transfer
            # recipient_code = create_transfer_recipient(payout.bank_code, payout.account_number, payout.account_name)
            # transfer_code = initiate_transfer(recipient_code, payout.amount, payout.reference)
            # payout.paystack_recipient_code = recipient_code
            # payout.paystack_transfer_code = transfer_code
            # payout.save(update_fields=['paystack_recipient_code', 'paystack_transfer_code', 'updated_at'])

        return Response(AdminPayoutSerializer(payout).data)


class AdminPayoutRejectView(APIView):
    """
    POST /api/admin/payouts/<id>/reject/
    Rejects a PENDING payout and refunds the amount back to available_balance.
    Body: { "reason": "..." }
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        from api.serializers import AdminPayoutSerializer

        reason = request.data.get('reason', '')
        if not reason:
            return Response(
                {'detail': 'Rejection reason is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            try:
                payout = Payout.objects.select_for_update().get(pk=pk)
            except Payout.DoesNotExist:
                return Response(
                    {'detail': 'Payout not found.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if payout.status != 'PENDING':
                return Response(
                    {'detail': f'Cannot reject a payout with status: {payout.status}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Refund the amount back to available balance
            wallet = OrganizerWallet.objects.select_for_update().get(pk=payout.wallet_id)
            wallet.available_balance = F('available_balance') + payout.amount
            wallet.save(update_fields=['available_balance', 'updated_at'])
            wallet.refresh_from_db()

            # Create reversal transaction
            WalletTransaction.objects.create(
                wallet=wallet,
                type='REVERSAL',
                amount=payout.amount,
                balance_after=wallet.available_balance,
                reference=payout.reference,
                description=f'Payout rejected: {reason}',
            )

            # Update payout status
            payout.status = 'REJECTED'
            payout.rejection_reason = reason
            payout.processed_at = timezone.now()
            payout.save(update_fields=['status', 'rejection_reason', 'processed_at', 'updated_at'])

        return Response(AdminPayoutSerializer(payout).data)
