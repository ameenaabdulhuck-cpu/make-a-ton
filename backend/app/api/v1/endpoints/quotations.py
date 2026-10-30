"""DRF endpoints for quotations."""

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
    Discount,
    Invoice,
    Product,
    ProductVariant,
    Quotation,
    Subscription,
    SubscriptionPlan,
    TaxRule,
    User,
)
from app.serializers import QuotationSerializer


class QuotationCreateInputSerializer(serializers.Serializer):
    customer_id = serializers.UUIDField(required=True)
    plan_id = serializers.UUIDField(required=True)
    product_id = serializers.UUIDField(required=False, allow_null=True)
    discount_code = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    validity_days = serializers.IntegerField(required=False, min_value=1, default=30)
    payment_terms = serializers.CharField(required=False, allow_blank=True, default="")
    variant_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list
    )
    quantity = serializers.IntegerField(required=False, min_value=1, default=1)


class QuotationRespondInputSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["accept", "reject"])


class QuotationCreateView(APIView):
    """POST /api/v1/quotations/ — Staff creates a quotation."""

    permission_classes = [IsStaff]

    def post(self, request):
        serializer = QuotationCreateInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            customer = CustomerProfile.objects.get(id=data["customer_id"])
        except CustomerProfile.DoesNotExist:
            return Response(
                {"error": "Customer not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            plan = SubscriptionPlan.objects.get(id=data["plan_id"])
        except SubscriptionPlan.DoesNotExist:
            return Response(
                {"error": "Plan not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        product = None
        if data.get("product_id"):
            try:
                product = Product.objects.get(id=data["product_id"])
            except Product.DoesNotExist:
                return Response(
                    {"error": "Product not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        # Calculate pricing independently (never trust frontend totals)
        subtotal = plan.base_price
        for variant_id in data.get("variant_ids", []):
            try:
                variant = ProductVariant.objects.get(id=variant_id)
                subtotal += variant.extra_price
            except ProductVariant.DoesNotExist:
                pass
        subtotal = subtotal * data.get("quantity", 1)

        # Discount calculation
        discount_amount = Decimal("0")
        discount_code_used = None
        discount_type = None
        discount_value = Decimal("0")

        if data.get("discount_code"):
            try:
                discount = Discount.objects.get(
                    discount_name=data["discount_code"]
                )
                is_valid, msg = discount.is_valid()
                if not is_valid:
                    return Response(
                        {"error": f"Discount invalid: {msg}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                # Enforce staff discount limit
                if (
                    request.user.role == User.Role.STAFF
                    and discount.discount_type == Discount.DiscountType.PERCENTAGE
                    and discount.value > request.user.max_discount_percent
                ):
                    return Response(
                        {
                            "error": f"Discount exceeds your limit of {request.user.max_discount_percent}%."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if discount.discount_type == Discount.DiscountType.PERCENTAGE:
                    discount_amount = (subtotal * discount.value) / Decimal(100)
                else:
                    discount_amount = discount.value
                if discount_amount > subtotal:
                    discount_amount = subtotal
                discount_code_used = discount.discount_name
                discount_type = discount.discount_type
                discount_value = discount.value
            except Discount.DoesNotExist:
                return Response(
                    {"error": "Invalid discount code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Tax calculation - use active tax rule
        tax_rule = TaxRule.objects.filter(status="Active").first()
        tax_rate = tax_rule.rate if tax_rule else Decimal("0")
        tax_name = tax_rule.name if tax_rule else ""
        taxable_amount = subtotal - discount_amount
        tax_amount = (taxable_amount * tax_rate / Decimal(100)).quantize(
            Decimal("0.01")
        )
        total = subtotal - discount_amount + tax_amount

        # Expiry
        expires_at = timezone.now() + timezone.timedelta(
            days=data.get("validity_days", 30)
        )

        with transaction.atomic():
            quotation = Quotation.objects.create(
                customer=customer,
                plan=plan,
                product=product,
                staff=request.user,
                status=Quotation.Status.PENDING,
                validity_days=data.get("validity_days", 30),
                payment_terms=data.get("payment_terms", ""),
                variant_ids=[str(v) for v in data.get("variant_ids", [])],
                quantity=data.get("quantity", 1),
                subtotal=subtotal,
                discount_amount=discount_amount,
                tax_amount=tax_amount,
                total=total,
                currency="INR",
                tax_rate=tax_rate,
                tax_name=tax_name,
                discount_code_used=discount_code_used,
                discount_type=discount_type,
                discount_value=discount_value,
                expires_at=expires_at,
            )
            # Increment discount usage
            if discount_code_used:
                Discount.objects.filter(
                    discount_name=discount_code_used
                ).update(times_used=models.F("times_used") + 1)

        return Response(QuotationSerializer(quotation).data, status=status.HTTP_201_CREATED)


class QuotationListView(APIView):
    """GET /api/v1/quotations/ — List quotations with role-based filtering."""

    permission_classes = [IsStaffOrCustomer]

    def get(self, request):
        user = request.user
        if user.role == User.Role.CUSTOMER:
            quotations = Quotation.objects.filter(customer__user=user)
        else:
            quotations = Quotation.objects.all()

        quotations = quotations.select_related(
            "customer", "plan", "product", "staff"
        ).order_by("-created_at")
        return Response(
            QuotationSerializer(quotations, many=True).data,
            status=status.HTTP_200_OK,
        )


class QuotationDetailView(APIView):
    """GET /api/v1/quotations/<id>/ — Get a single quotation."""

    permission_classes = [IsStaffOrCustomer]

    def get(self, request, quotation_id):
        try:
            if request.user.role == User.Role.CUSTOMER:
                quotation = Quotation.objects.get(
                    id=quotation_id, customer__user=request.user
                )
            else:
                quotation = Quotation.objects.get(id=quotation_id)
        except Quotation.DoesNotExist:
            return Response(
                {"error": "Quotation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(QuotationSerializer(quotation).data, status=status.HTTP_200_OK)


class QuotationRespondView(APIView):
    """POST /api/v1/quotations/<id>/respond/ — Customer accepts or rejects."""

    permission_classes = [IsCustomer]

    def post(self, request, quotation_id):
        try:
            quotation = Quotation.objects.get(
                id=quotation_id, customer__user=request.user
            )
        except Quotation.DoesNotExist:
            return Response(
                {"error": "Quotation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = QuotationRespondInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        decision = serializer.validated_data["decision"]

        # Check expiry
        now = timezone.now()
        if quotation.expires_at and now > quotation.expires_at:
            quotation.status = Quotation.Status.EXPIRED
            quotation.save()
            return Response(
                {"error": "This quotation has expired and cannot be accepted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quotation.status != Quotation.Status.PENDING:
            return Response(
                {"error": f"Quotation is already {quotation.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            if decision == "accept":
                quotation.status = Quotation.Status.ACCEPTED
                quotation.save()

                # Create subscription from accepted quotation
                start = timezone.now()
                frequency = quotation.plan.billing_frequency
                if frequency == "Daily":
                    next_billing = start + timedelta(days=1)
                    expiry = start + timedelta(days=365)
                elif frequency == "Weekly":
                    next_billing = start + timedelta(weeks=1)
                    expiry = start + timedelta(days=365)
                elif frequency == "Yearly":
                    next_billing = start + timedelta(days=365)
                    expiry = start + timedelta(days=365 * 10)
                else:  # Monthly
                    next_billing = start + timedelta(days=30)
                    expiry = start + timedelta(days=365)

                subscription = Subscription.objects.create(
                    quotation=quotation,
                    customer=quotation.customer,
                    plan=quotation.plan,
                    product=quotation.product,
                    staff=quotation.staff,
                    variant_ids=quotation.variant_ids,
                    quantity=quotation.quantity,
                    recurring_amount=quotation.total,
                    status=Subscription.Status.ACTIVE,
                    start_date=start,
                    expiry_date=expiry,
                    next_billing_date=next_billing,
                    auto_renew=quotation.plan.auto_renew,
                    can_pause=quotation.plan.can_pause,
                )

                # Create initial invoice linked to subscription
                Invoice.objects.create(
                    subscription=subscription,
                    customer=quotation.customer,
                    staff=quotation.staff,
                    amount=quotation.total,
                    paid_amount=Decimal("0"),
                    status=Invoice.Status.DRAFT,
                    issue_date=start,
                    due_date=start + timedelta(days=30),
                    currency="INR",
                )

                return Response(
                    {
                        "message": "Quotation accepted. Subscription created.",
                        "quotation": QuotationSerializer(quotation).data,
                    },
                    status=status.HTTP_200_OK,
                )
            else:
                quotation.status = Quotation.Status.REJECTED
                quotation.save()
                return Response(
                    {
                        "message": "Quotation rejected.",
                        "quotation": QuotationSerializer(quotation).data,
                    },
                    status=status.HTTP_200_OK,
                )
