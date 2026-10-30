"""Service layer for quotation creation and pricing logic."""

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from ..models import CustomerProfile, Discount, Quotation, SubscriptionPlan

# Standard tax rate (18%). Override via settings if needed.
STANDARD_TAX_RATE = Decimal("0.18")

# Default validity period in days when not specified.
DEFAULT_VALIDITY_DAYS = 30


class QuotationService:
    """Business logic for creating quotations from plans and discounts."""

    @classmethod
    def create_quotation(
        cls,
        customer_id: str,
        plan_id: str,
        staff_user=None,
        discount_code: str | None = None,
        validity_days: int | None = None,
        payment_terms: str = "",
    ) -> Quotation:
        """
        Create a Quotation record for a customer and plan.

        Steps:
        1. Resolve customer and plan.
        2. Subtotal = plan base_price.
        3. If discount_code provided, validate and compute discount amount.
        4. Tax = standard rate applied to (subtotal - discount).
        5. Total = subtotal - discount + tax.
        6. Set expiry = now + validity_days.
        7. Persist and return the Quotation instance.
        """
        # 1. Resolve customer and plan.
        try:
            customer = CustomerProfile.objects.get(id=customer_id)
        except CustomerProfile.DoesNotExist as exc:
            raise NotFound(f"Customer with id {customer_id} not found.") from exc

        try:
            plan = SubscriptionPlan.objects.get(id=plan_id)
        except SubscriptionPlan.DoesNotExist as exc:
            raise NotFound(f"Plan with id {plan_id} not found.") from exc

        # 2. Subtotal from plan base price.
        subtotal = plan.base_price

        # 3. Discount calculation.
        discount_amount = Decimal("0")
        applied_discount = None
        if discount_code and discount_code.strip():
            try:
                applied_discount = Discount.objects.get(discount_name=discount_code)
            except Discount.DoesNotExist as exc:
                raise ValidationError(
                    f"Discount code '{discount_code}' is invalid."
                ) from exc

            now = timezone.localdate()
            if applied_discount.start_date and now < applied_discount.start_date:
                raise ValidationError(
                    f"Discount code '{discount_code}' is not yet active."
                )
            if applied_discount.end_date and now > applied_discount.end_date:
                raise ValidationError(
                    f"Discount code '{discount_code}' has expired."
                )
            if (
                applied_discount.usage_limit is not None
                and applied_discount.usage_limit <= 0
            ):
                raise ValidationError(
                    f"Discount code '{discount_code}' has reached its usage limit."
                )

            if applied_discount.discount_type == Discount.DiscountType.PERCENTAGE:
                discount_amount = (subtotal * applied_discount.value) / Decimal(100)
            else:
                discount_amount = applied_discount.value

            # Discount cannot exceed subtotal.
            if discount_amount > subtotal:
                discount_amount = subtotal

        # 4. Tax calculation on the discounted amount.
        taxable_amount = subtotal - discount_amount
        tax = (taxable_amount * STANDARD_TAX_RATE).quantize(Decimal("0.01"))

        # 5. Final total.
        total = subtotal - discount_amount + tax

        # 6. Expiry timestamp.
        days = validity_days if validity_days is not None else DEFAULT_VALIDITY_DAYS
        expires_at = timezone.now() + timedelta(days=days)

        # 7. Persist.
        quotation = Quotation.objects.create(
            customer=customer,
            plan=plan,
            staff=staff_user,
            status=Quotation.Status.DRAFT,
            validity_days=days,
            payment_terms=payment_terms,
            subtotal=subtotal,
            discount_amount=discount_amount,
            tax=tax,
            total=total,
            currency="INR",
            expires_at=expires_at,
        )

        return quotation
