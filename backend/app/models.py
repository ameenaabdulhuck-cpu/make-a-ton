import uuid
from decimal import Decimal

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models


class User(AbstractUser):
    """Custom user model for the billing app."""

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=20, default="customer")
    # admin, staff, customer

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        ordering = ["email"]

    def __str__(self):
        return self.email


class CustomerProfile(models.Model):
    """Customer profile linked to a user account."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="customer_profile",
    )
    company_name = models.CharField(max_length=255, blank=True)
    address = models.TextField(blank=True)
    tax_id = models.CharField(max_length=50, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["company_name"]

    def __str__(self):
        return self.company_name or self.user.email


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
    
    # Track redemptions
    times_used = models.PositiveIntegerField(default=0)

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


class Quotation(models.Model):
    """Maps to quotation.json."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ACCEPTED = "ACCEPTED", "Accepted"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"

    quotation_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    customer = models.ForeignKey(
        "CustomerProfile",
        on_delete=models.CASCADE,
        related_name="quotations",
        help_text="Customer this quotation is issued to.",
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.CASCADE,
        related_name="quotations",
        help_text="Plan associated with this quotation.",
    )
    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_quotations",
        help_text="Staff member who created the quotation.",
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.DRAFT,
        help_text="Current status of the quotation.",
    )
    validity_days = models.PositiveIntegerField(
        help_text="Number of days the quotation remains valid."
    )
    payment_terms = models.CharField(
        max_length=200, blank=True, help_text="Payment terms (e.g. 'Net 30')."
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0"))],
        help_text="Subtotal before discount and tax.",
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0"))],
        help_text="Discount amount applied.",
    )
    tax = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0"))],
        help_text="Tax amount.",
    )
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0"))],
        help_text="Final total (subtotal - discount + tax).",
    )
    currency = models.CharField(
        max_length=3, default="USD", help_text="ISO 4217 currency code."
    )
    gateway_reference_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Payment gateway reference ID (if paid via gateway).",
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the quotation expires.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(total__gte=0),
                name="quotation_total_gte_0",
            ),
        ]

    def __str__(self):
        return f"Quotation {self.quotation_id} - {self.customer} - {self.status}"


class PaymentRecord(models.Model):
    """Maps to payment-record.json."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ACCEPTED = "ACCEPTED", "Accepted"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"
        SUCCESS = "SUCCESS", "Success"

    payment_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    customer = models.ForeignKey(
        "CustomerProfile",
        on_delete=models.CASCADE,
        related_name="payment_records",
        help_text="Customer who made the payment.",
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.CASCADE,
        related_name="payment_records",
        help_text="Plan associated with this payment.",
    )
    quotation = models.ForeignKey(
        Quotation,
        on_delete=models.CASCADE,
        related_name="payment_records",
        null=True,
        blank=True,
        help_text="Quotation this payment is linked to.",
    )
    invoice_id = models.CharField(
        max_length=255,
        help_text="Invoice this payment is recorded against.",
    )
    amount_paid = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        help_text="Amount paid.",
    )
    payment_method = models.CharField(
        max_length=50,
        help_text="Payment method (e.g. 'bank_transfer', 'card', 'upi').",
    )
    payment_date = models.DateTimeField(
        help_text="Date and time the payment was made."
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_payments",
        help_text="Staff member who recorded this payment.",
    )
    notes = models.TextField(blank=True, help_text="Additional notes about the payment.")
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PAID,
        help_text="Payment status.",
    )
    currency = models.CharField(
        max_length=3, default="USD", help_text="ISO 4217 currency code."
    )
    gateway_reference_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Payment gateway reference ID (if paid via gateway).",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-payment_date"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount_paid__gte=0),
                name="paymentrecord_amount_paid_gte_0",
            ),
        ]

    def __str__(self):
        return (
            f"Payment {self.payment_id} - {self.customer} - "
            f"{self.amount_paid} {self.currency}"
        )
