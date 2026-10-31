from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import RegexValidator
from django.db import transaction
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .models import (
    CustomerProfile,
    Discount,
    Invoice,
    PaymentRecord,
    Product,
    ProductVariant,
    Quotation,
    Subscription,
    SubscriptionPlan,
    TaxRule,
    User,
)

# Identical to the `pattern` in customer-reg.json:
# >= 9 chars, at least one lowercase, one uppercase and one of !@#$%^&*
PASSWORD_PATTERN = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{9,}$"

password_regex_validator = RegexValidator(
    regex=PASSWORD_PATTERN,
    message=(
        "Password must be at least 9 characters and include a lowercase letter, "
        "an uppercase letter and one special character from !@#$%%^&*."  # %% = literal %
    ),
    code="invalid_password",
)


class BusinessDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = ["company_name", "address", "tax_id"]
        extra_kwargs = {
            "company_name": {"required": False, "allow_blank": True},
            "address": {"required": False, "allow_blank": True},
            "tax_id": {"required": False, "allow_blank": True},
        }


class CustomerRegistrationSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField(
        max_length=254,
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                lookup="iexact",
                message="A user with this email already exists.",
            )
        ],
    )
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={"input_type": "password"},
        validators=[password_regex_validator],
    )
    business_details = BusinessDetailsSerializer(source="customer_profile")
    business_type = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "id", "name", "email", "password",
            "business_details", "business_type", "phone",
        ]
        read_only_fields = ["id"]

    def validate_email(self, value):
        return value.strip().lower()

    def validate_password(self, value):
        try:
            password_validation.validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    @transaction.atomic
    def create(self, validated_data):
        profile_data = validated_data.pop("customer_profile", {})
        password = validated_data.pop("password")
        business_type = validated_data.pop("business_type", "")
        phone = validated_data.pop("phone", "")
        name = validated_data.pop("name", "")
        email = validated_data["email"]

        first_name = name.split(" ")[0] if name else ""
        last_name = " ".join(name.split(" ")[1:]) if len(name.split(" ")) > 1 else ""

        user = User.objects.create_user(
            email=email,
            username=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role="customer",
        )
        CustomerProfile.objects.create(
            user=user,
            company_name=profile_data.get("company_name", ""),
            business_type=business_type,
            address=profile_data.get("address", ""),
            tax_id=profile_data.get("tax_id", ""),
            phone=phone,
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "email", "name", "first_name", "last_name",
            "role", "phone", "max_discount_percent", "is_verified",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "role", "created_at", "updated_at"]

    name = serializers.SerializerMethodField()

    def get_name(self, obj):
        return obj.get_full_name() or obj.email


class CustomerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = CustomerProfile
        fields = [
            "id", "user", "company_name", "business_type",
            "address", "tax_id", "phone", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ["id", "name", "extra_price", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProductSerializer(serializers.ModelSerializer):
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "category", "description",
            "status", "variants", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = SubscriptionPlan
        fields = [
            "id", "plan_name", "product", "product_name",
            "billing_frequency", "base_price",
            "auto_renew", "can_pause", "can_close_early",
            "renewal", "pausable", "closure_notice_days",
            "status", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TaxRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxRule
        fields = ["id", "name", "rate", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class DiscountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Discount
        fields = [
            "id", "discount_name", "discount_type", "value",
            "staff_maximum_limit", "start_date", "end_date",
            "usage_limit", "times_used", "status",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "times_used", "created_at", "updated_at"]


class QuotationSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="customer.company_name", read_only=True
    )
    plan_name = serializers.CharField(source="plan.plan_name", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    staff_email = serializers.EmailField(source="staff.email", read_only=True)
    staff_name = serializers.CharField(source="staff.get_full_name", read_only=True)

    class Meta:
        model = Quotation
        fields = [
            "id", "quotation_number", "customer", "customer_name",
            "plan", "plan_name", "product", "product_name",
            "staff", "staff_email", "staff_name",
            "status", "validity_days", "payment_terms",
            "variant_ids", "quantity",
            "subtotal", "discount_amount", "tax_amount", "total",
            "currency", "tax_rate", "tax_name",
            "discount_code_used", "discount_type", "discount_value",
            "gateway_reference_id", "expires_at",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "quotation_number", "expires_at",
            "created_at", "updated_at",
        ]


class SubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source="plan.plan_name", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    customer_name = serializers.CharField(
        source="customer.company_name", read_only=True
    )
    staff_email = serializers.EmailField(source="staff.email", read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id", "subscription_number", "quotation", "customer",
            "customer_name", "plan", "plan_name", "product",
            "product_name", "staff", "staff_email",
            "variant_ids", "quantity", "recurring_amount",
            "status", "start_date", "expiry_date",
            "next_billing_date", "auto_renew", "can_pause",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "subscription_number", "created_at", "updated_at",
        ]


class InvoiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="customer.company_name", read_only=True
    )
    subscription_number = serializers.CharField(
        source="subscription.subscription_number", read_only=True
    )
    staff_email = serializers.EmailField(source="staff.email", read_only=True)
    outstanding = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id", "invoice_number", "subscription", "subscription_number",
            "customer", "customer_name", "staff", "staff_email",
            "amount", "paid_amount", "outstanding", "status",
            "issue_date", "due_date", "currency", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "invoice_number", "paid_amount", "outstanding",
            "created_at", "updated_at",
        ]

    def get_outstanding(self, obj):
        return obj.outstanding


class PaymentRecordSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="customer.company_name", read_only=True
    )
    plan_name = serializers.CharField(source="plan.plan_name", read_only=True)
    invoice_number = serializers.CharField(
        source="invoice.invoice_number", read_only=True
    )
    quotation_number = serializers.CharField(
        source="quotation.quotation_number", read_only=True
    )
    recorded_by_email = serializers.EmailField(
        source="recorded_by.email", read_only=True
    )

    class Meta:
        model = PaymentRecord
        fields = [
            "id", "invoice", "invoice_number", "subscription",
            "quotation", "quotation_number", "customer",
            "customer_name", "plan", "plan_name",
            "amount_paid", "payment_method", "payment_date",
            "recorded_by", "recorded_by_email", "notes",
            "status", "currency", "gateway_reference_id",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
