"""URL patterns for API v1."""

from django.urls import path

from app.api.v1.endpoints.quotations import QuotationCreateView
from app.api.v1.endpoints.payments import (
    PaymentRecordView,
    PaymentWebhookView,
)

urlpatterns = [
    path("quotations/", QuotationCreateView.as_view(), name="quotation-create"),
    path("payments/record/", PaymentRecordView.as_view(), name="payment-record"),
    path(
        "payments/webhook/", PaymentWebhookView.as_view(), name="payment-webhook"
    ),
]
