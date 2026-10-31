from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import SubscriptionPlan, Discount
from .serializers import (
    CustomerRegistrationSerializer, 
    SubscriptionPlanSerializer, 
    DiscountValidateSerializer
)


class CustomerRegisterView(generics.CreateAPIView):
    serializer_class = CustomerRegistrationSerializer
    permission_classes = [AllowAny]
    authentication_classes = [] 

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "customer": serializer.data,
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class ActivePlanListView(generics.ListAPIView):
    """
    GET /api/plans/
    Returns a list of all subscription plans.
    """
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer


class ValidateDiscountView(APIView):
    """
    POST /api/discounts/validate/
    Validates a discount code and returns its value or an error code.
    """
    def post(self, request, *args, **kwargs):
        serializer = DiscountValidateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        discount_name = serializer.validated_data['discount_name']
        now = timezone.now().date()

        try:
            discount = Discount.objects.get(discount_name__iexact=discount_name)
        except Discount.DoesNotExist:
            return Response(
                {"error_code": "INVALID_CODE", "message": "Discount code does not exist."},
                status=status.HTTP_404_NOT_FOUND
            )

        if discount.start_date and now < discount.start_date:
            return Response(
                {"error_code": "NOT_YET_VALID", "message": "This discount code is not valid yet."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if discount.end_date and now > discount.end_date:
            return Response(
                {"error_code": "EXPIRED_CODE", "message": "This discount code has expired."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Enforce usage limits
        if discount.usage_limit is not None and discount.times_used >= discount.usage_limit:
            return Response(
                {"error_code": "USAGE_LIMIT_REACHED", "message": "This discount code has reached its usage limit."},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            "discount_name": discount.discount_name,
            "discount_type": discount.discount_type,
            "value": discount.value
        }, status=status.HTTP_200_OK)
