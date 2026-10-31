from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import RegexValidator
from django.db import transaction
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .models import (
    CustomerProfile,
    Discount,
    PaymentRecord,
    Quotation,
    SubscriptionPlan,
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
    """`business_details` object. Inner fields are optional in the schema."""

    class Meta:
        model = CustomerProfile
        fields = ["company_name", "address", "tax_id"]
        extra_kwargs = {
            "company_name": {"required": False, "allow_blank": True},
            "address": {"required": False, "allow_blank": True},
            "tax_id": {"required": False, "allow_blank": True},
        }


class CustomerRegistrationSerializer(serializers.ModelSerializer):
    """Validates a customer-reg.json payload and creates User + CustomerProfile."""

    name = serializers.CharField(max_length=150)  # required, non-blank, trimmed
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
    # `business_details` is required as an object (its inner keys are not).
    business_details = BusinessDetailsSerializer(source="customer_profile")

    class Meta:
        model = User
        fields = ["id", "name", "email", "password", "business_details"]
        read_only_fields = ["id"]

    def validate_email(self, value):
        return value.strip().lower()

    def validate_password(self, value):
        # Also run Django's AUTH_PASSWORD_VALIDATORS (common passwords, etc.).
        try:
            password_validation.validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    @transaction.atomic
    def create(self, validated_data):
        profile_data = validated_data.pop("customer_profile")
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        CustomerProfile.objects.create(user=user, **profile_data)
        return user


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = [
            "id",
            "plan_name",
            "base_price",
            "billing_frequency",
            "auto_renew",
            "can_pause",
            "can_close_early",
        ]


class DiscountValidateSerializer(serializers.Serializer):
    discount_name = serializers.CharField(max_length=150)


class QuotationSerializer(serializers.ModelSerializer):
    """Serializer for the Quotation model."""

    customer_name = serializers.CharField(
        source="customer.company_name", read_only=True
    )
    plan_name = serializers.CharField(source="plan.plan_name", read_only=True)
    staff_email = serializers.EmailField(source="staff.email", read_only=True)

    class Meta:
        model = Quotation
        fields = [
            "quotation_id",
            "customer",
            "customer_name",
            "plan",
            "plan_name",
            "staff",
            "staff_email",
            "status",
            "validity_days",
            "payment_terms",
            "subtotal",
            "discount_amount",
            "tax",
            "total",
            "currency",
            "gateway_reference_id",
            "expires_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["quotation_id", "expires_at", "created_at", "updated_at"]

    def validate(self, data):
        """Ensure total is consistent with subtotal, discount and tax."""
        subtotal = data.get("subtotal", self.instance.subtotal if self.instance else 0)
        discount = data.get(
            "discount_amount",
            self.instance.discount_amount if self.instance else 0,
        )
        tax = data.get("tax", self.instance.tax if self.instance else 0)
        total = data.get("total", self.instance.total if self.instance else 0)

        expected_total = subtotal - discount + tax
        if total is not None and abs(total - expected_total) > 0.01:
            raise serializers.ValidationError(
                {
                    "total": (
                        f"Total ({total}) does not match "
                        f"subtotal ({subtotal}) - discount ({discount}) + tax ({tax}) "
                        f"= {expected_total}."
                    )
                }
            )
        return data


class PaymentRecordSerializer(serializers.ModelSerializer):
    """Serializer for the PaymentRecord model."""

    customer_name = serializers.CharField(
        source="customer.company_name", read_only=True
    )
    plan_name = serializers.CharField(source="plan.plan_name", read_only=True)
    recorded_by_email = serializers.EmailField(
        source="recorded_by.email", read_only=True
    )
    quotation_id = serializers.UUIDField(source="quotation.id", read_only=True)

    class Meta:
        model = PaymentRecord
        fields = [
            "payment_id",
            "customer",
            "customer_name",
            "plan",
            "plan_name",
            "quotation",
            "quotation_id",
            "invoice_id",
            "amount_paid",
            "payment_method",
            "payment_date",
            "recorded_by",
            "recorded_by_email",
            "notes",
            "status",
            "currency",
            "gateway_reference_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["payment_id", "quotation_id", "created_at", "updated_at"]
