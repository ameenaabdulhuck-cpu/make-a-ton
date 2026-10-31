from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models


class SubscriptionPlan(models.Model):
    """Maps to subscription-plans.json."""

    class BillingFrequency(models.TextChoices):
        DAILY = "Daily", "Daily"
        WEEKLY = "Weekly", "Weekly"
        MONTHLY = "Monthly", "Monthly"
        YEARLY = "Yearly", "Yearly"

    plan_name = models.CharField(max_length=150, unique=True)
    billing_frequency = models.CharField(
        max_length=10, choices=BillingFrequency.choices
    )
    base_price = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0"))]
    )

    # `lifecycle_options` object, flattened into columns.
    auto_renew = models.BooleanField(default=False)
    can_pause = models.BooleanField(default=False)
    can_close_early = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["plan_name"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(base_price__gte=0),
                name="subscriptionplan_base_price_gte_0",
            ),
        ]

    def __str__(self):
        return f"{self.plan_name} ({self.billing_frequency})"


class Discount(models.Model):
    """Maps to discount.json (DiscountRule)."""

    class DiscountType(models.TextChoices):
        FIXED = "fixed", "Fixed amount"
        PERCENTAGE = "percentage", "Percentage"

    discount_name = models.CharField(max_length=150, unique=True)
    discount_type = models.CharField(max_length=10, choices=DiscountType.choices)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    # Same unit as `discount_type` (currency amount, or percent).
    staff_maximum_limit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        help_text="Maximum discount a staff member is allowed to apply.",
    )

    # `validity` object, flattened. Both optional (open-ended when null).
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    # null = unlimited
    usage_limit = models.PositiveIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1)]
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["discount_name"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(value__gt=0), name="discount_value_gt_0"
            ),
            models.CheckConstraint(
                condition=models.Q(staff_maximum_limit__gte=0),
                name="discount_staff_limit_gte_0",
            ),
            models.CheckConstraint(
                condition=~models.Q(discount_type="percentage")
                | (models.Q(value__lte=100) & models.Q(staff_maximum_limit__lte=100)),
                name="discount_percentage_lte_100",
            ),
            models.CheckConstraint(
                condition=models.Q(start_date__isnull=True)
                | models.Q(end_date__isnull=True)
                | models.Q(end_date__gte=models.F("start_date")),
                name="discount_end_date_gte_start_date",
            ),
        ]

    def clean(self):
        errors = {}
        if self.discount_type == self.DiscountType.PERCENTAGE:
            if self.value is not None and self.value > 100:
                errors["value"] = "A percentage discount cannot exceed 100."
            if self.staff_maximum_limit is not None and self.staff_maximum_limit > 100:
                errors["staff_maximum_limit"] = "A percentage limit cannot exceed 100."
        if self.start_date and self.end_date and self.end_date < self.start_date:
            errors["end_date"] = "end_date cannot be before start_date."
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return self.discount_name
