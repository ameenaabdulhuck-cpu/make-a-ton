"""DRF endpoints for payments."""

from decimal import Decimal

from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from app.services.payment_service import PaymentService
from app.serializers import PaymentRecordSerializer


class PaymentRecordInputSerializer(serializers.Serializer):
    """Input validation for POST /api/payments/record/."""

    quotation_id = serializers.CharField(required=True)
    amount_paid = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=True, min_value=Decimal("0")
    )
    payment_method = serializers.CharField(required=True)
    payment_date = serializers.DateTimeField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    gateway_reference_id = serializers.CharField(
        required=False, allow_blank=True, default=""
    )


class PaymentWebhookInputSerializer(serializers.Serializer):
    """Input validation for POST /api/payments/webhook/."""

    gateway_reference_id = serializers.CharField(required=False, allow_blank=True)
    payment_id = serializers.CharField(required=False, allow_blank=True)
    status = serializers.CharField(required=True)


class PaymentRecordView(APIView):
    """POST /api/payments/record/ — Log a pending payment linked to a quotation."""

    def post(self, request):
        input_serializer = PaymentRecordInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        data = input_serializer.validated_data

        try:
            payment_record = PaymentService.record_payment(
                quotation_id=data["quotation_id"],
                amount_paid=data["amount_paid"],
                payment_method=data["payment_method"],
                recorded_by=request.user if request.user.is_authenticated else None,
                payment_date=data.get("payment_date"),
                notes=data.get("notes", ""),
                gateway_reference_id=data.get("gateway_reference_id") or None,
            )
        except Exception as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        output_serializer = PaymentRecordSerializer(payment_record)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class PaymentWebhookView(APIView):
    """POST /api/payments/webhook/ — Handle payment gateway status updates."""

    def post(self, request):
        input_serializer = PaymentWebhookInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        data = input_serializer.validated_data

        try:
            payment_record = PaymentService.handle_webhook(
                gateway_reference_id=data.get("gateway_reference_id") or None,
                payment_id=data.get("payment_id") or None,
                status=data["status"],
            )
        except Exception as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        output_serializer = PaymentRecordSerializer(payment_record)
        return Response(output_serializer.data, status=status.HTTP_200_OK)
