"""DRF endpoints for customers."""

from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from app.api.v1.permissions import IsAdmin, IsStaff
from app.models import CustomerProfile, User
from app.serializers import CustomerProfileSerializer, UserSerializer


class CustomerListView(APIView):
    """GET /api/v1/customers/ — List customers."""

    permission_classes = [IsStaff]

    def get(self, request):
        customers = CustomerProfile.objects.select_related("user").all().order_by("company_name")
        return Response(
            CustomerProfileSerializer(customers, many=True).data,
            status=status.HTTP_200_OK,
        )


class CustomerDetailView(APIView):
    """GET/PUT/PATCH /api/v1/customers/<id>/ — Manage a customer."""

    permission_classes = [IsStaff]

    def get(self, request, customer_id):
        try:
            customer = CustomerProfile.objects.get(id=customer_id)
        except CustomerProfile.DoesNotExist:
            return Response(
                {"error": "Customer not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(CustomerProfileSerializer(customer).data, status=status.HTTP_200_OK)

    def _map_frontend_fields(self, data):
        """Map frontend field names to model field names."""
        mapped = {}
        field_map = {
            "name": None,  # Special: split into first_name/last_name
            "businessName": "company_name",
            "businessType": "business_type",
            "phone": "phone",
            "address": "address",
            "taxId": "tax_id",
        }
        for key, value in data.items():
            if key == "name" and value:
                parts = value.strip().split(" ", 1)
                mapped["first_name"] = parts[0]
                mapped["last_name"] = parts[1] if len(parts) > 1 else ""
            elif key in field_map and field_map[key]:
                mapped[field_map[key]] = value
            elif key not in ("businessName", "businessType"):
                mapped[key] = value
        return mapped

    def put(self, request, customer_id):
        try:
            customer = CustomerProfile.objects.get(id=customer_id)
        except CustomerProfile.DoesNotExist:
            return Response(
                {"error": "Customer not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Map frontend field names
        profile_data = self._map_frontend_fields(request.data)

        # Update CustomerProfile
        profile_serializer = CustomerProfileSerializer(
            customer, data=profile_data, partial=True
        )
        if not profile_serializer.is_valid():
            return Response(profile_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        profile_serializer.save()

        # Update User if name fields provided
        if "first_name" in profile_data or "last_name" in profile_data:
            user = customer.user
            user_data = {}
            if "first_name" in profile_data:
                user_data["first_name"] = profile_data["first_name"]
            if "last_name" in profile_data:
                user_data["last_name"] = profile_data["last_name"]
            user_serializer = UserSerializer(user, data=user_data, partial=True)
            if not user_serializer.is_valid():
                return Response(user_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            user_serializer.save()

        return Response(CustomerProfileSerializer(customer).data, status=status.HTTP_200_OK)

    def patch(self, request, customer_id):
        return self.put(request, customer_id)
