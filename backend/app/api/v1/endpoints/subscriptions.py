"""DRF endpoints for subscriptions."""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from app.api.v1.permissions import IsCustomer, IsStaff, IsStaffOrCustomer
from app.models import Subscription, User
from app.serializers import SubscriptionSerializer


class SubscriptionListView(APIView):
    """GET /api/v1/subscriptions/ — List subscriptions with role-based filtering."""

    permission_classes = [IsStaffOrCustomer]

    def get(self, request):
        user = request.user
        if user.role == User.Role.CUSTOMER:
            subscriptions = Subscription.objects.filter(customer__user=user)
        else:
            subscriptions = Subscription.objects.all()

        subscriptions = subscriptions.select_related(
            "customer", "plan", "product", "staff"
        ).order_by("-created_at")
        return Response(
            SubscriptionSerializer(subscriptions, many=True).data,
            status=status.HTTP_200_OK,
        )


class SubscriptionDetailView(APIView):
    """GET /api/v1/subscriptions/<id>/ — Get a single subscription."""

    permission_classes = [IsStaffOrCustomer]

    def get(self, request, subscription_id):
        try:
            if request.user.role == User.Role.CUSTOMER:
                subscription = Subscription.objects.get(
                    id=subscription_id, customer__user=request.user
                )
            else:
                subscription = Subscription.objects.get(id=subscription_id)
        except Subscription.DoesNotExist:
            return Response(
                {"error": "Subscription not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(SubscriptionSerializer(subscription).data, status=status.HTTP_200_OK)


class SubscriptionStatusView(APIView):
    """POST /api/v1/subscriptions/<id>/status/ — Staff changes subscription status."""

    permission_classes = [IsStaff]

    def post(self, request, subscription_id):
        try:
            subscription = Subscription.objects.get(id=subscription_id)
        except Subscription.DoesNotExist:
            return Response(
                {"error": "Subscription not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_status = request.data.get("status")
        valid_statuses = [
            Subscription.Status.ACTIVE,
            Subscription.Status.PAUSED,
            Subscription.Status.CANCELLED,
            Subscription.Status.CLOSED,
        ]
        if new_status not in valid_statuses:
            return Response(
                {"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subscription.status = new_status
        subscription.save()
        return Response(
            SubscriptionSerializer(subscription).data,
            status=status.HTTP_200_OK,
        )


