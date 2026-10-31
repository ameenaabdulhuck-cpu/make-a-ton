"""Authentication endpoints: login and register."""

from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from app.models import CustomerProfile, User


class LoginInputSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)


class LoginOutputSerializer(serializers.Serializer):
    id = serializers.CharField()
    email = serializers.EmailField()
    name = serializers.CharField()
    role = serializers.CharField()
    maxDiscountPercent = serializers.IntegerField(required=False)


class RegisterInputSerializer(serializers.Serializer):
    name = serializers.CharField(required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, min_length=9)
    businessName = serializers.CharField(required=True)
    businessType = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)


class RegisterOutputSerializer(serializers.Serializer):
    id = serializers.CharField()
    email = serializers.EmailField()
    name = serializers.CharField()
    role = serializers.CharField()


class LoginView(APIView):
    """POST /api/v1/auth/login/"""

    def post(self, request):
        serializer = LoginInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "Incorrect email or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(password):
            return Response(
                {"error": "Incorrect email or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile = getattr(user, "customer_profile", None)
        data = {
            "id": user.id,
            "email": user.email,
            "name": user.get_full_name() or user.email,
            "role": user.role,
        }
        if user.role == "staff":
            data["maxDiscountPercent"] = 15  # default staff discount limit
        if profile:
            data["companyName"] = profile.company_name

        return Response(data, status=status.HTTP_200_OK)


class RegisterView(APIView):
    """POST /api/v1/auth/register/"""

    def post(self, request):
        serializer = RegisterInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if User.objects.filter(email=data["email"]).exists():
            return Response(
                {"error": "An account with this email already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            email=data["email"],
            username=data["email"],
            password=data["password"],
            first_name=data["name"].split(" ")[0] if data["name"] else "",
            last_name=" ".join(data["name"].split(" ")[1:]) if len(data["name"].split(" ")) > 1 else "",
            role="customer",
        )

        CustomerProfile.objects.create(
            user=user,
            company_name=data["businessName"],
            address=data.get("address", ""),
            tax_id="",
        )

        output = {
            "id": user.id,
            "email": user.email,
            "name": user.get_full_name() or user.email,
            "role": user.role,
        }
        return Response(output, status=status.HTTP_201_CREATED)
