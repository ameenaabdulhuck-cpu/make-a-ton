"""DRF endpoints for customers."""

from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from app.api.v1.permissions import IsAdmin, IsStaff
from app.models import CustomerProfile
from app.serializers import CustomerProfileSerializer


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
    """GET /api/v1/customers/<id>/ — Get a single customer."""

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
