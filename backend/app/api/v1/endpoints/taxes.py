"""DRF endpoints for tax rules."""

from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from app.api.v1.permissions import IsStaff
from app.models import TaxRule
from app.serializers import TaxRuleSerializer


class TaxRuleListView(APIView):
    """GET /api/v1/taxes/ — List tax rules."""

    permission_classes = [IsStaff]

    def get(self, request):
        taxes = TaxRule.objects.all().order_by("name")
        return Response(
            TaxRuleSerializer(taxes, many=True).data,
            status=status.HTTP_200_OK,
        )


class TaxRuleDetailView(APIView):
    """GET/PUT/DELETE /api/v1/taxes/<id>/ — Manage a tax rule."""

    permission_classes = [IsStaff]

    def get(self, request, tax_id):
        try:
            tax = TaxRule.objects.get(id=tax_id)
        except TaxRule.DoesNotExist:
            return Response(
                {"error": "Tax rule not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(TaxRuleSerializer(tax).data, status=status.HTTP_200_OK)

    def put(self, request, tax_id):
        try:
            tax = TaxRule.objects.get(id=tax_id)
        except TaxRule.DoesNotExist:
            return Response(
                {"error": "Tax rule not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = TaxRuleSerializer(tax, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, tax_id):
        try:
            tax = TaxRule.objects.get(id=tax_id)
        except TaxRule.DoesNotExist:
            return Response(
                {"error": "Tax rule not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        tax.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TaxRuleCreateView(APIView):
    """POST /api/v1/taxes/create/ — Create a new tax rule."""

    permission_classes = [IsStaff]

    def post(self, request):
        serializer = TaxRuleSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ActiveTaxView(APIView):
    """GET /api/v1/taxes/active/ — Get the currently active tax rule."""

    permission_classes = [IsStaff]

    def get(self, request):
        tax = TaxRule.objects.filter(status="Active").first()
        if not tax:
            return Response(
                {"error": "No active tax rule found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(TaxRuleSerializer(tax).data, status=status.HTTP_200_OK)
