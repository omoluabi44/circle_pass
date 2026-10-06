"""
Organizer Wallet API views.
Endpoints for wallet balance summary and transaction history.
"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.permissions import IsOrganizerOrAdmin
from core.models import OrganizerWallet, WalletTransaction

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
        
        from api.serializers import OrganizerWalletSerializer
        serializer = OrganizerWalletSerializer(wallet, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
