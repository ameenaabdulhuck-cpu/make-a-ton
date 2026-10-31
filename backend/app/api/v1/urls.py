"""URL patterns for API v1."""

from django.urls import path

from app.api.v1.endpoints.auth import LoginView, RegisterView
from app.api.v1.endpoints.listings import (
    CustomerListView,
    PlanListView,
    QuotationListView,
)
from app.api.v1.endpoints.payments import (
    PaymentRecordView,
    PaymentWebhookView,
)
from app.api.v1.endpoints.quotations import QuotationCreateView

urlpatterns = [
    path("quotations/", QuotationCreateView.as_view(), name="quotation-create"),
    path("quotations/list/", QuotationListView.as_view(), name="quotation-list"),
    path("payments/record/", PaymentRecordView.as_view(), name="payment-record"),
    path("payments/webhook/", PaymentWebhookView.as_view(), name="payment-webhook"),
    path("customers/", CustomerListView.as_view(), name="customer-list"),
    path("plans/", PlanListView.as_view(), name="plan-list"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
]
