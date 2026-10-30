"""DRF endpoints for payments."""

from datetime import timedelta
from decimal import Decimal

from django.db import models, transaction
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from app.api.v1.permissions import IsCustomer, IsStaff, IsStaffOrCustomer
from app.models import (
    CustomerProfile,
    Invoice,
    PaymentRecord,
    Quotation,
    Subscription,
    SubscriptionPlan,
    User,
)
from app.serializers import PaymentRecordSerializer


class PaymentsListView(APIView):
    """GET /api/v1/payments/ — List payments with role-based filtering."""

    permission_classes = [IsStaffOrCustomer]

    def get(self, request):
        user = request.user
        if user.role == User.Role.CUSTOMER:
            payments = PaymentRecord.objects.filter(customer__user=user)
        else:
            payments = PaymentRecord.objects.all()

        payments = payments.select_related(
            "customer", "invoice", "subscription", "quotation", "recorded_by"
        ).order_by("-payment_date")
        return Response(
            PaymentRecordSerializer(payments, many=True).data,
            status=status.HTTP_200_OK,
        )


class PaymentRecordInputSerializer(serializers.Serializer):
    """Input validation for POST /api/payments/record/."""

    quotation_id = serializers.UUIDField(required=False, allow_null=True)
    invoice_id = serializers.UUIDField(required=False, allow_null=True)
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

    gateway_reference_id = serializers.CharField(
        required=False, allow_blank=True
    )
    payment_id = serializers.CharField(required=False, allow_blank=True)
    status = serializers.CharField(required=True)


class PaymentRecordView(APIView):
    """POST /api/v1/payments/record/ — Record a payment against an invoice or quotation."""

    permission_classes = [IsStaff]

    def post(self, request):
        serializer = PaymentRecordInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        quotation = None
        invoice = None
        subscription = None
        customer = None
        plan = None

        if data.get("invoice_id"):
            try:
                invoice = Invoice.objects.get(id=data["invoice_id"])
                customer = invoice.customer
                plan = invoice.subscription.plan if invoice.subscription else None
                subscription = invoice.subscription
            except Invoice.DoesNotExist:
                return Response(
                    {"error": "Invoice not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        elif data.get("quotation_id"):
            try:
                quotation = Quotation.objects.get(id=data["quotation_id"])
                customer = quotation.customer
                plan = quotation.plan
            except Quotation.DoesNotExist:
                return Response(
                    {"error": "Quotation not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            return Response(
                {"error": "Either invoice_id or quotation_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not customer:
            return Response(
                {"error": "Cannot determine customer for payment."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        amount_paid = data["amount_paid"]

        # Validate against invoice outstanding if applicable
        if invoice:
            if amount_paid > invoice.outstanding:
                return Response(
                    {
                        "error": f"Amount exceeds outstanding balance of {invoice.outstanding}."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        with transaction.atomic():
            payment_record = PaymentRecord.objects.create(
                invoice=invoice,
                subscription=subscription,
                quotation=quotation,
                customer=customer,
                plan=plan,
                amount_paid=amount_paid,
                payment_method=data["payment_method"],
                payment_date=data.get("payment_date") or timezone.now(),
                recorded_by=request.user,
                notes=data.get("notes", ""),
                status=PaymentRecord.Status.SUCCESS,
                currency="INR",
                gateway_reference_id=data.get("gateway_reference_id") or None,
            )

            # Update invoice paid amount
            if invoice:
                total_paid = invoice.payments.filter(
                    status=PaymentRecord.Status.SUCCESS
                ).aggregate(total=models.Sum("amount_paid"))["total"] or Decimal("0")
                invoice.paid_amount = total_paid
                invoice.save()

        return Response(
            PaymentRecordSerializer(payment_record).data,
            status=status.HTTP_201_CREATED,
        )


class PaymentWebhookView(APIView):
    """POST /api/v1/payments/webhook/ — Handle payment gateway status updates."""

    permission_classes = [IsStaff]

    def post(self, request):
        serializer = PaymentWebhookInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if not data.get("gateway_reference_id") and not data.get("payment_id"):
            return Response(
                {"error": "Either gateway_reference_id or payment_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if data.get("payment_id"):
                payment_record = PaymentRecord.objects.get(
                    id=data["payment_id"]
                )
            else:
                payment_record = PaymentRecord.objects.get(
                    gateway_reference_id=data["gateway_reference_id"]
                )
        except PaymentRecord.DoesNotExist:
            return Response(
                {"error": "Payment record not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_status = data["status"].upper()
        if new_status not in (
            PaymentRecord.Status.SUCCESS,
            PaymentRecord.Status.FAILED,
        ):
            return Response(
                {"error": "Status must be SUCCESS or FAILED."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            old_status = payment_record.status
            payment_record.status = new_status
            payment_record.gateway_reference_id = (
                data.get("gateway_reference_id")
                or payment_record.gateway_reference_id
            )
            payment_record.save()

            # If payment succeeded and linked to invoice, update invoice
            if (
                new_status == PaymentRecord.Status.SUCCESS
                and old_status != PaymentRecord.Status.SUCCESS
                and payment_record.invoice
            ):
                invoice = payment_record.invoice
                total_paid = invoice.payments.filter(
                    status=PaymentRecord.Status.SUCCESS
                ).aggregate(total=models.Sum("amount_paid"))["total"] or Decimal("0")
                invoice.paid_amount = total_paid
                invoice.save()

        return Response(
            PaymentRecordSerializer(payment_record).data,
            status=status.HTTP_200_OK,
        )
