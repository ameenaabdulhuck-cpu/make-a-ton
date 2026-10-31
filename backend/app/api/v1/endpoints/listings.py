"""Read-only list endpoints for customers, plans, products, taxes and quotations."""

from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from app.models import CustomerProfile, Discount, SubscriptionPlan


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = [
            "id",
            "user",
            "company_name",
            "address",
            "tax_id",
            "created_at",
            "updated_at",
        ]


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = [
            "id",
            "plan_name",
            "billing_frequency",
            "base_price",
            "auto_renew",
            "can_pause",
            "can_close_early",
            "created_at",
            "updated_at",
        ]


class CustomerListView(APIView):
    """GET /api/v1/customers/"""

    def get(self, request):
        customers = CustomerProfile.objects.all()
        serializer = CustomerSerializer(customers, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PlanListView(APIView):
    """GET /api/v1/plans/"""

    def get(self, request):
        plans = SubscriptionPlan.objects.all()
        serializer = PlanSerializer(plans, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class QuotationListView(APIView):
    """GET /api/v1/quotations/"""

    def get(self, request):
        from app.models import Quotation

        quotations = Quotation.objects.all().select_related("customer", "plan", "staff")
        from app.serializers import QuotationSerializer

        serializer = QuotationSerializer(quotations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
