"""DRF endpoints for invoices."""

from decimal import Decimal
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from app.api.v1.permissions import IsCustomer, IsStaff, IsStaffOrCustomer
from app.models import Invoice, PaymentRecord, Subscription, User
from app.serializers import InvoiceSerializer


class InvoiceListView(APIView):
    """GET /api/v1/invoices/ — List invoices with role-based filtering."""

    permission_classes = [IsStaffOrCustomer]

    def get(self, request):
        user = request.user
        if user.role == User.Role.CUSTOMER:
            invoices = Invoice.objects.filter(customer__user=user)
        else:
            invoices = Invoice.objects.all()

        invoices = invoices.select_related(
            "customer", "subscription", "staff"
        ).order_by("-created_at")
        return Response(
            InvoiceSerializer(invoices, many=True).data,
            status=status.HTTP_200_OK,
        )


class InvoiceDetailView(APIView):
    """GET /api/v1/invoices/<id>/ — Get a single invoice."""

    permission_classes = [IsStaffOrCustomer]

    def get(self, request, invoice_id):
        try:
            if request.user.role == User.Role.CUSTOMER:
                invoice = Invoice.objects.get(id=invoice_id, customer__user=request.user)
            else:
                invoice = Invoice.objects.get(id=invoice_id)
        except Invoice.DoesNotExist:
            return Response(
                {"error": "Invoice not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_200_OK)


class InvoiceGenerateView(APIView):
    """POST /api/v1/invoices/generate/ — Staff generates an invoice for a subscription."""

    permission_classes = [IsStaff]

    def post(self, request):
        subscription_id = request.data.get("subscription_id")
        if not subscription_id:
            return Response(
                {"error": "subscription_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            subscription = Subscription.objects.get(id=subscription_id)
        except Subscription.DoesNotExist:
            return Response(
                {"error": "Subscription not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if there's already an unpaid invoice for this subscription
        existing = Invoice.objects.filter(
            subscription=subscription,
        ).exclude(status=Invoice.Status.CANCELLED).first()
        if existing:
            return Response(
                {
                    "error": f"An invoice already exists ({existing.invoice_number}).",
                    "invoice": InvoiceSerializer(existing).data,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        due_date = timezone.now() + timezone.timedelta(days=30)
        invoice = Invoice.objects.create(
            subscription=subscription,
            customer=subscription.customer,
            staff=request.user,
            amount=subscription.recurring_amount,
            paid_amount=Decimal("0"),
            status=Invoice.Status.DRAFT,
            issue_date=timezone.now(),
            due_date=due_date,
            currency="USD",
        )

        return Response(
            InvoiceSerializer(invoice).data,
            status=status.HTTP_201_CREATED,
        )


