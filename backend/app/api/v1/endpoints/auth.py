"""Authentication endpoints with role-based access control."""

from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from app.models import CustomerProfile, User
from app.serializers import CustomerProfileSerializer, UserSerializer


class LoginInputSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)


class RegisterInputSerializer(serializers.Serializer):
    name = serializers.CharField(required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, min_length=9)
    businessName = serializers.CharField(required=True)
    businessType = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)


class LoginView(APIView):
    """POST /api/v1/auth/login/"""

    permission_classes = [AllowAny]

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

        if not user.is_active:
            return Response(
                {"error": "This account has been deactivated."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile = getattr(user, "customer_profile", None)
        data = {
            "id": str(user.id),
            "email": user.email,
            "name": user.get_full_name() or user.email,
            "role": user.role,
            "maxDiscountPercent": user.max_discount_percent,
        }
        if profile:
            data["companyName"] = profile.company_name
            data["customerId"] = str(profile.id)

        return Response(data, status=status.HTTP_200_OK)


class RegisterView(APIView):
    """POST /api/v1/auth/register/ - Customer registration only."""

    permission_classes = [AllowAny]

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
            last_name=" ".join(data["name"].split(" ")[1:])
            if len(data["name"].split(" ")) > 1
            else "",
            role="customer",
        )

        CustomerProfile.objects.create(
            user=user,
            company_name=data["businessName"],
            business_type=data.get("businessType", ""),
            address=data.get("address", ""),
            tax_id="",
            phone=data.get("phone", ""),
        )

        output = {
            "id": str(user.id),
            "email": user.email,
            "name": user.get_full_name() or user.email,
            "role": user.role,
        }
        return Response(output, status=status.HTTP_201_CREATED)


class MeView(APIView):
    """GET /api/v1/auth/me/ - Get current user profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = getattr(user, "customer_profile", None)
        data = UserSerializer(user).data
        if profile:
            data["customer_profile"] = CustomerProfileSerializer(profile).data
            data["companyName"] = profile.company_name
            data["customerId"] = str(profile.id)
        return Response(data, status=status.HTTP_200_OK)


class AdminCreateStaffView(APIView):
    """POST /api/v1/auth/staff/ - Admin creates staff accounts."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response(
                {"error": "Only admins can create staff accounts."},
                status=status.HTTP_403_FORBIDDEN,
            )

        email = request.data.get("email")
        password = request.data.get("password")
        name = request.data.get("name", "")
        department = request.data.get("department", "")
        max_discount = request.data.get("max_discount_percent", 10)

        if not email or not password:
            return Response(
                {"error": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {"error": "An account with this email already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            email=email,
            username=email,
            password=password,
            first_name=name.split(" ")[0] if name else "",
            last_name=" ".join(name.split(" ")[1:]) if len(name.split(" ")) > 1 else "",
            role="staff",
            max_discount_percent=max_discount,
        )

        return Response(
            {
                "id": str(user.id),
                "email": user.email,
                "name": user.get_full_name() or user.email,
                "role": user.role,
                "maxDiscountPercent": user.max_discount_percent,
            },
            status=status.HTTP_201_CREATED,
        )
