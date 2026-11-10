"""
Organizer Wallet API views.
Endpoints for wallet balance summary and transaction history.
"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.permissions import IsOrganizerOrAdmin
from core.models import OrganizerWallet, WalletTransaction
from core.utils.transfers import (
    resolve_account_number,
    is_bank_name_valid_for_organizer,
    get_organizer_bank_name_mismatch_error,
    get_organizer_name_for_display,
)


class OrganizerWalletView(APIView):
    """
    GET /api/organizer/wallet/
    Returns the authenticated organizer's wallet summary.
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizerOrAdmin]

    def get(self, request):
        try:
            from core.models import OrganizerProfile, OrganizerWallet
            profile = OrganizerProfile.objects.get(user=request.user)
            wallet, _ = OrganizerWallet.objects.get_or_create(organizer=profile)
            
            if not wallet:
                raise Exception("No wallet")
        except Exception:
            return Response(
                {'detail': 'Wallet not found. Please complete your organizer profile.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        from api.serializers import OrganizerWalletSerializer
        serializer = OrganizerWalletSerializer(wallet)
        return Response(serializer.data)

    def patch(self, request):
        try:
            from core.models import OrganizerProfile, OrganizerWallet
            profile = OrganizerProfile.objects.get(user=request.user)
            wallet, _ = OrganizerWallet.objects.get_or_create(organizer=profile)
        except Exception:
            return Response({'detail': 'Wallet not found.'}, status=status.HTTP_404_NOT_FOUND)

        bank_code = (request.data.get('bank_code') or '').strip()
        account_number = (request.data.get('account_number') or '').strip()
        bank_name = (request.data.get('bank_name') or '').strip()
        submitted_account_name = (request.data.get('account_name') or '').strip()

        if any(k in request.data for k in ('bank_code', 'account_number', 'bank_name', 'account_name')):
            if not bank_code or not account_number:
                return Response(
                    {'detail': 'bank_code and account_number are required.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                resolved = resolve_account_number(bank_code, account_number)
                account_name = resolved.get('account_name', '') or submitted_account_name
            except Exception as e:
                return Response(
                    {'detail': f'Account verification failed: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not is_bank_name_valid_for_organizer(profile, account_name):
                display_name = get_organizer_name_for_display(profile)
                err_msg = get_organizer_bank_name_mismatch_error(display_name, account_name)
                return Response(
                    {
                        'detail': err_msg,
                        'error': err_msg,
                        'account_name': account_name,
                        'organizer_name': display_name,
                        'name_mismatch': True,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            wallet.bank_code = bank_code
            wallet.bank_name = bank_name
            wallet.account_number = account_number
            wallet.account_name = account_name
            wallet.save(update_fields=['bank_code', 'bank_name', 'account_number', 'account_name', 'updated_at'])

        from api.serializers import OrganizerWalletSerializer
        serializer = OrganizerWalletSerializer(wallet)
        return Response(serializer.data)


class WalletTransactionListView(generics.ListAPIView):
    """
    GET /api/organizer/wallet/transactions/
    Returns paginated wallet transaction ledger for the authenticated organizer.
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizerOrAdmin]

    def get_serializer_class(self):
        from api.serializers import WalletTransactionSerializer
        return WalletTransactionSerializer

    def get_queryset(self):
        return WalletTransaction.objects.filter(
            wallet__organizer__user=self.request.user
        ).order_by('-created_at')
