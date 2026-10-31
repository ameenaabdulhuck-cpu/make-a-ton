from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import RegexValidator
from django.db import transaction
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .models import CustomerProfile, User, SubscriptionPlan, Discount

PASSWORD_PATTERN = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{9,}$"

password_regex_validator = RegexValidator(
    regex=PASSWORD_PATTERN,
    message=(
        "Password must be at least 9 characters and include a lowercase letter, "
        "an uppercase letter and one special character from !@#$%%^&*."
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

    class Meta:
        model = User
        fields = ["id", "name", "email", "password", "business_details"]
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
        profile_data = validated_data.pop("customer_profile")
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        CustomerProfile.objects.create(user=user, **profile_data)
        return user


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'plan_name', 'base_price', 'billing_frequency', 
            'auto_renew', 'can_pause', 'can_close_early'
        ]


class DiscountValidateSerializer(serializers.Serializer):
    discount_name = serializers.CharField(max_length=150)