"""DRF endpoints for subscription plans."""

from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from app.api.v1.permissions import IsAdmin, IsStaff
from app.models import Product, SubscriptionPlan
from app.serializers import SubscriptionPlanSerializer


class PlanListView(APIView):
    """GET /api/v1/plans/ — List subscription plans."""

    permission_classes = [IsStaff]

    def get(self, request):
        plans = SubscriptionPlan.objects.select_related("product").all().order_by("plan_name")
        return Response(
            SubscriptionPlanSerializer(plans, many=True).data,
            status=status.HTTP_200_OK,
        )


class PlanDetailView(APIView):
    """GET/PUT/DELETE /api/v1/plans/<id>/ — Manage a plan."""

    permission_classes = [IsStaff]

    def get(self, request, plan_id):
        try:
            plan = SubscriptionPlan.objects.get(id=plan_id)
        except SubscriptionPlan.DoesNotExist:
            return Response(
                {"error": "Plan not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(SubscriptionPlanSerializer(plan).data, status=status.HTTP_200_OK)

    def put(self, request, plan_id):
        try:
            plan = SubscriptionPlan.objects.get(id=plan_id)
        except SubscriptionPlan.DoesNotExist:
            return Response(
                {"error": "Plan not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = SubscriptionPlanSerializer(plan, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, plan_id):
        try:
            plan = SubscriptionPlan.objects.get(id=plan_id)
        except SubscriptionPlan.DoesNotExist:
            return Response(
                {"error": "Plan not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if plan.quotations.exists() or plan.subscriptions.exists():
            return Response(
                {"error": "Cannot delete plan that is used in quotations or subscriptions."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        plan.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PlanCreateView(APIView):
    """POST /api/v1/plans/create/ — Create a new plan."""

    permission_classes = [IsStaff]

    def post(self, request):
        serializer = SubscriptionPlanSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
