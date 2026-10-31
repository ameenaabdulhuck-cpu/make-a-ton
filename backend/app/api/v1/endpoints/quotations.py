"""DRF endpoints for quotations."""

from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from app.services.quotation_service import QuotationService
from app.serializers import QuotationSerializer


class QuotationCreateInputSerializer(serializers.Serializer):
    """Input validation for POST /api/quotations/."""

    customer_id = serializers.CharField(required=True)
    plan_id = serializers.CharField(required=True)
    discount_code = serializers.CharField(required=False, allow_blank=True)
    validity_days = serializers.IntegerField(
        required=False, min_value=1, default=30
    )
    payment_terms = serializers.CharField(required=False, allow_blank=True, default="")


class QuotationCreateView(APIView):
    """POST /api/quotations/ — Create a new quotation for a customer and plan."""

    def post(self, request):
        input_serializer = QuotationCreateInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        data = input_serializer.validated_data

        try:
            quotation = QuotationService.create_quotation(
                customer_id=data["customer_id"],
                plan_id=data["plan_id"],
                staff_user=request.user if request.user.is_authenticated else None,
                discount_code=data.get("discount_code") or None,
                validity_days=data.get("validity_days"),
                payment_terms=data.get("payment_terms", ""),
            )
        except Exception as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        output_serializer = QuotationSerializer(quotation)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
