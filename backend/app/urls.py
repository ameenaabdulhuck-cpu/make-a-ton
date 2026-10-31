from django.urls import path
from .views import CustomerRegisterView, ActivePlanListView, ValidateDiscountView

app_name = "accounts"

urlpatterns = [
    path("register/", CustomerRegisterView.as_view(), name="customer-register"),
    path('plans/', ActivePlanListView.as_view(), name='active-plans-list'),
    path('discounts/validate/', ValidateDiscountView.as_view(), name='discount-validate'),
]
