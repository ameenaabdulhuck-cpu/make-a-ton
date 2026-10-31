import uuid
from decimal import Decimal

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Sum
from django.utils import timezone


class User(AbstractUser):
    """Custom user model for the billing app."""

    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        STAFF = "staff", "Staff"
        CUSTOMER = "customer", "Customer"

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CUSTOMER,
    )
    max_discount_percent = models.PositiveIntegerField(
        default=10,
        validators=[MinValueValidator(0)],
        help_text="Maximum discount percentage a staff member can apply.",
    )
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        ordering = ["email"]

    def __str__(self):
        return self.email

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email


class CustomerProfile(models.Model):
    """Customer profile linked to a user account."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="customer_profile",
    )
    company_name = models.CharField(max_length=255, blank=True)
    business_type = models.CharField(max_length=100, blank=True)
    address = models.TextField(blank=True)
    tax_id = models.CharField(max_length=50, blank=True)
    phone = models.CharField(max_length=20, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["company_name"]

    def __str__(self):
        return self.company_name or self.user.email


class Product(models.Model):
    """Products that can be sold on subscription."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=[("Active", "Active"), ("Inactive", "Inactive")],
        default="Active",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class ProductVariant(models.Model):
    """Variants of a product with additional pricing."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="variants_db",
    )
    name = models.CharField(max_length=255)
    extra_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0"))],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        unique_together = ["product", "name"]

    def __str__(self):
        return f"{self.product.name} - {self.name}"


class SubscriptionPlan(models.Model):
    """Subscription plans linked to products."""

    class BillingFrequency(models.TextChoices):
        DAILY = "Daily", "Daily"
        WEEKLY = "Weekly", "Weekly"
        MONTHLY = "Monthly", "Monthly"
        YEARLY = "Yearly", "Yearly"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan_name = models.CharField(max_length=255, unique=True)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="plans",
        null=True,
        blank=True,
    )
    billing_frequency = models.CharField(
        max_length=10,
        choices=BillingFrequency.choices,
    )
    base_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    auto_renew = models.BooleanField(default=False)
    can_pause = models.BooleanField(default=False)
    can_close_early = models.BooleanField(default=False)
    renewal = models.CharField(
        max_length=20,
        choices=[("Auto", "Automatic"), ("Manual", "Manual")],
        default="Auto",
    )
    pausable = models.BooleanField(default=True)
    closure_notice_days = models.PositiveIntegerField(default=14)
    status = models.CharField(
        max_length=20,
        choices=[("Active", "Active"), ("Inactive", "Inactive")],
        default="Active",
    )
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


class TaxRule(models.Model):
    """Configurable tax rules."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        help_text="Tax rate as a percentage (e.g., 8 for 8%).",
    )
    status = models.CharField(
        max_length=20,
        choices=[("Active", "Active"), ("Inactive", "Inactive")],
        default="Active",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.rate}%)"


class Discount(models.Model):
    """Discount rules that can be applied to quotations."""

    class DiscountType(models.TextChoices):
        FIXED = "fixed", "Fixed amount"
        PERCENTAGE = "percentage", "Percentage"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    discount_name = models.CharField(max_length=255, unique=True)
    discount_type = models.CharField(max_length=10, choices=DiscountType.choices)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    staff_maximum_limit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        help_text="Maximum discount a staff member is allowed to apply.",
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    usage_limit = models.PositiveIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1)]
    )
    times_used = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=[("Active", "Active"), ("Inactive", "Inactive")],
        default="Active",
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

    def is_valid(self, check_usage=True):
        """Check if the discount is currently valid and usable."""
        now = timezone.localdate()
        if self.status != "Active":
            return False, "Discount is not active."
        if self.start_date and now < self.start_date:
            return False, "Discount is not yet active."
        if self.end_date and now > self.end_date:
            return False, "Discount has expired."
        if check_usage and self.usage_limit is not None and self.times_used >= self.usage_limit:
            return False, "Discount usage limit has been reached."
        return True, "Discount is valid."

    def __str__(self):
        return self.discount_name


class Quotation(models.Model):
    """Quotations sent to customers."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PENDING = "PENDING", "Pending"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"
        EXPIRED = "EXPIRED", "Expired"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quotation_number = models.CharField(max_length=50, unique=True, blank=True)
    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name="quotations",
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.CASCADE,
        related_name="quotations",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="quotations",
        null=True,
        blank=True,
    )
    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_quotations",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    validity_days = models.PositiveIntegerField(default=30)
    payment_terms = models.CharField(max_length=200, blank=True)
    variant_ids = models.JSONField(default=list, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    subtotal = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )
    discount_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )
    tax_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )
    total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    currency = models.CharField(max_length=3, default="USD")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0"))
    tax_name = models.CharField(max_length=255, blank=True)
    discount_code_used = models.CharField(max_length=255, blank=True, null=True)
    discount_type = models.CharField(max_length=20, blank=True, null=True)
    discount_value = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0")
    )
    gateway_reference_id = models.CharField(
        max_length=255, blank=True, null=True
    )
    expires_at = models.DateTimeField(null=True, blank=True)
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

    def save(self, *args, **kwargs):
        if not self.quotation_number:
            last = Quotation.objects.exclude(quotation_number='').order_by('-created_at').first()
            if last and last.quotation_number:
                try:
                    num = int(last.quotation_number.replace('QT-', '')) + 1
                except (ValueError, AttributeError):
                    num = Quotation.objects.count() + 1
            else:
                num = Quotation.objects.count() + 1
            self.quotation_number = f"QT-{1000 + num}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quotation_number} - {self.customer} - {self.status}"


class Subscription(models.Model):
    """Subscriptions created from accepted quotations."""

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        PAUSED = "PAUSED", "Paused"
        CANCELLED = "CANCELLED", "Cancelled"
        CLOSED = "CLOSED", "Closed"
        EXPIRED = "EXPIRED", "Expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription_number = models.CharField(max_length=50, unique=True, blank=True)
    quotation = models.ForeignKey(
        Quotation,
        on_delete=models.CASCADE,
        related_name="subscriptions",
        null=True,
        blank=True,
    )
    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="subscriptions",
        null=True,
        blank=True,
    )
    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_subscriptions",
    )
    variant_ids = models.JSONField(default=list, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    recurring_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    start_date = models.DateTimeField(default=timezone.now)
    expiry_date = models.DateTimeField(null=True, blank=True)
    next_billing_date = models.DateTimeField(null=True, blank=True)
    auto_renew = models.BooleanField(default=True)
    can_pause = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.subscription_number:
            last = Subscription.objects.exclude(subscription_number='').order_by('-created_at').first()
            if last and last.subscription_number:
                try:
                    num = int(last.subscription_number.replace('SUB-', '')) + 1
                except (ValueError, AttributeError):
                    num = Subscription.objects.count() + 1
            else:
                num = Subscription.objects.count() + 1
            self.subscription_number = f"SUB-{1000 + num}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.subscription_number} - {self.customer} - {self.status}"


class Invoice(models.Model):
    """Invoices generated from subscriptions."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        UNPAID = "UNPAID", "Unpaid"
        PARTIALLY_PAID = "PARTIALLY_PAID", "Partially Paid"
        PAID = "PAID", "Paid"
        OVERDUE = "OVERDUE", "Overdue"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=50, unique=True, blank=True)
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name="invoices",
    )
    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name="invoices",
    )
    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_invoices",
    )
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )
    paid_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    issue_date = models.DateTimeField(default=timezone.now)
    due_date = models.DateTimeField(null=True, blank=True)
    currency = models.CharField(max_length=3, default="USD")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            last = Invoice.objects.exclude(invoice_number='').order_by('-created_at').first()
            if last and last.invoice_number:
                try:
                    num = int(last.invoice_number.replace('INV-', '')) + 1
                except (ValueError, AttributeError):
                    num = Invoice.objects.count() + 1
            else:
                num = Invoice.objects.count() + 1
            self.invoice_number = f"INV-{1000 + num}"
        # Auto-update status based on paid amount and due date
        if self.status != self.Status.CANCELLED:
            if self.paid_amount >= self.amount:
                self.status = self.Status.PAID
            elif self.paid_amount > 0:
                self.status = self.Status.PARTIALLY_PAID
            elif self.due_date and timezone.now() > self.due_date:
                self.status = self.Status.OVERDUE
            else:
                self.status = self.Status.UNPAID
        super().save(*args, **kwargs)

    @property
    def outstanding(self):
        return max(Decimal("0"), self.amount - self.paid_amount)

    def __str__(self):
        return f"{self.invoice_number} - {self.customer} - {self.status}"


class PaymentRecord(models.Model):
    """Payments recorded against invoices."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PENDING = "PENDING", "Pending"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="payments",
        null=True,
        blank=True,
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name="payments",
        null=True,
        blank=True,
    )
    quotation = models.ForeignKey(
        Quotation,
        on_delete=models.CASCADE,
        related_name="payment_records",
        null=True,
        blank=True,
    )
    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name="payment_records",
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.CASCADE,
        related_name="payment_records",
        null=True,
        blank=True,
    )
    amount_paid = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))]
    )
    payment_method = models.CharField(max_length=50)
    payment_date = models.DateTimeField(default=timezone.now)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_payments",
    )
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SUCCESS,
    )
    currency = models.CharField(max_length=3, default="USD")
    gateway_reference_id = models.CharField(
        max_length=255, blank=True, null=True
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

    def save(self, *args, **kwargs):
        creating = self.pk is None
        super().save(*args, **kwargs)
        # Update invoice paid amount when a payment is recorded
        if creating and self.invoice and self.status == self.Status.SUCCESS:
            invoice = self.invoice
            total_paid = invoice.payments.filter(
                status=PaymentRecord.Status.SUCCESS
            ).aggregate(total=Sum("amount_paid"))["total"] or Decimal("0")
            invoice.paid_amount = total_paid
            invoice.save()

    def __str__(self):
        return (
            f"Payment {self.id} - {self.customer} - {self.amount_paid} {self.currency}"
        )