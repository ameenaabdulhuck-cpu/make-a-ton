"""DRF endpoints for discounts."""

from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from app.api.v1.permissions import IsAdmin, IsStaff
from app.models import Discount
from app.serializers import DiscountSerializer


class DiscountListView(APIView):
    """GET /api/v1/discounts/ — List discounts."""

    permission_classes = [IsStaff]

    def get(self, request):
        discounts = Discount.objects.all().order_by("discount_name")
        return Response(
            DiscountSerializer(discounts, many=True).data,
            status=status.HTTP_200_OK,
        )


class DiscountDetailView(APIView):
    """GET/PUT/DELETE /api/v1/discounts/<id>/ — Manage a discount."""

    permission_classes = [IsStaff]

    def get(self, request, discount_id):
        try:
            discount = Discount.objects.get(id=discount_id)
        except Discount.DoesNotExist:
            return Response(
                {"error": "Discount not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(DiscountSerializer(discount).data, status=status.HTTP_200_OK)

    def put(self, request, discount_id):
        try:
            discount = Discount.objects.get(id=discount_id)
        except Discount.DoesNotExist:
            return Response(
                {"error": "Discount not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = DiscountSerializer(discount, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, discount_id):
        try:
            discount = Discount.objects.get(id=discount_id)
        except Discount.DoesNotExist:
            return Response(
                {"error": "Discount not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        discount.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DiscountCreateView(APIView):
    """POST /api/v1/discounts/create/ — Create a new discount."""

    permission_classes = [IsStaff]

    def post(self, request):
        serializer = DiscountSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DiscountValidateView(APIView):
    """POST /api/v1/discounts/validate/ — Validate a discount code."""

    permission_classes = [IsStaff]

    def post(self, request):
        code = request.data.get("discount_name") or request.data.get("code")
        if not code:
            return Response(
                {"error": "Discount code is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            discount = Discount.objects.get(discount_name=code)
        except Discount.DoesNotExist:
            return Response(
                {"error": "Discount code does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        is_valid, msg = discount.is_valid()
        if not is_valid:
            return Response(
                {"error": msg},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check staff discount limit
        if (
            request.user.role == "staff"
            and discount.discount_type == "percentage"
            and discount.value > request.user.max_discount_percent
        ):
            return Response(
                {
                    "error": f"Discount exceeds your limit of {request.user.max_discount_percent}%."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "discount_name": discount.discount_name,
                "discount_type": discount.discount_type,
                "value": discount.value,
                "valid": True,
            },
            status=status.HTTP_200_OK,
        )
