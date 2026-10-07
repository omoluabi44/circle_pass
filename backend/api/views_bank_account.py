"""
Organizer Bank Account management.
Supports multiple saved bank accounts per organizer with Paystack recipient code storage.
"""
import requests

from django.db import transaction
from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import permissions

from api.permissions import IsOrganizerOrAdmin
from core.models import OrganizerBankAccount, OrganizerProfile
from core.utils.transfers import resolve_account_number, create_transfer_recipient


class OrganizerBankAccountListCreateView(APIView):
    """
    GET  /api/organizer/bank-accounts/  — List organizer's saved bank accounts.
    POST /api/organizer/bank-accounts/  — Add a new bank account (resolves & creates Paystack recipient).
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizerOrAdmin]

    def _get_organizer(self, request):
        return OrganizerProfile.objects.get(user=request.user)

    def get(self, request):
        from api.serializers import OrganizerBankAccountSerializer
        organizer = self._get_organizer(request)
        accounts = OrganizerBankAccount.objects.filter(organizer=organizer)
        return Response(OrganizerBankAccountSerializer(accounts, many=True).data)

    def post(self, request):
        from api.serializers import OrganizerBankAccountSerializer

        bank_code = request.data.get('bank_code', '').strip()
        account_number = request.data.get('account_number', '').strip()
        bank_name = request.data.get('bank_name', '').strip()

        if not bank_code or not account_number or not bank_name:
            return Response(
                {'detail': 'bank_code, account_number, and bank_name are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        organizer = self._get_organizer(request)

        # Check duplicate
        if OrganizerBankAccount.objects.filter(
            organizer=organizer, bank_code=bank_code, account_number=account_number
        ).exists():
            return Response(
                {'detail': 'This bank account is already saved.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Step 1: Verify account number via Paystack
        try:
            resolved = resolve_account_number(bank_code, account_number)
            account_name = resolved.get('account_name', '')
        except Exception as e:
            return Response(
                {'detail': f'Account verification failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Step 2: Create Paystack Transfer Recipient
        try:
            recipient_code = create_transfer_recipient(bank_code, account_number, account_name)
        except Exception as e:
            return Response(
                {'detail': f'Failed to create transfer recipient: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Step 3: Save to DB
        with transaction.atomic():
            is_first = not OrganizerBankAccount.objects.filter(organizer=organizer).exists()
            account = OrganizerBankAccount.objects.create(
                organizer=organizer,
                bank_name=bank_name,
                bank_code=bank_code,
                account_number=account_number,
                account_name=account_name,
                paystack_recipient_code=recipient_code,
                is_default=is_first,  # First account becomes default automatically
            )

        # Step 4: Send Notification Email
        try:
            from core.utils.notifications import send_bank_account_added_email
            send_bank_account_added_email(account)
        except Exception as e:
            # We don't want email failure to break the API response
            pass

        return Response(
            OrganizerBankAccountSerializer(account).data,
            status=status.HTTP_201_CREATED,
        )


class OrganizerBankAccountDetailView(APIView):
    """
    DELETE /api/organizer/bank-accounts/<id>/    — Remove a saved account.
    PATCH  /api/organizer/bank-accounts/<id>/    — Set as default.
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizerOrAdmin]

    def _get_account(self, request, pk):
        organizer = OrganizerProfile.objects.get(user=request.user)
        return OrganizerBankAccount.objects.get(pk=pk, organizer=organizer)

    def patch(self, request, pk):
        """Set this account as the default."""
        from api.serializers import OrganizerBankAccountSerializer
        try:
            account = self._get_account(request, pk)
        except OrganizerBankAccount.DoesNotExist:
            return Response({'detail': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            OrganizerBankAccount.objects.filter(organizer=account.organizer).update(is_default=False)
            account.is_default = True
            account.save(update_fields=['is_default'])

        return Response(OrganizerBankAccountSerializer(account).data)

    def delete(self, request, pk):
        try:
            account = self._get_account(request, pk)
        except OrganizerBankAccount.DoesNotExist:
            return Response({'detail': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)

        account.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
