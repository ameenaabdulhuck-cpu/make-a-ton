"""URL patterns for API v1."""

from django.urls import path

from app.api.v1.endpoints.auth import (
    AdminCreateStaffView,
    LoginView,
    LogoutView,
    MeView,
    RegisterView,
)
from app.api.v1.endpoints.customers import CustomerDetailView, CustomerListView
from app.api.v1.endpoints.discounts import (
    DiscountCreateView,
    DiscountDetailView,
    DiscountListView,
    DiscountValidateView,
)
from app.api.v1.endpoints.invoices import (
    InvoiceGenerateView,
    InvoiceDetailView,
    InvoiceListView,
)
from app.api.v1.endpoints.payments import (
    PaymentRecordView,
    PaymentWebhookView,
    PaymentsListView,
)
from app.api.v1.endpoints.plans import PlanCreateView, PlanDetailView, PlanListView
from app.api.v1.endpoints.products import (
    ProductCreateView,
    ProductDetailView,
    ProductListView,
    ProductVariantListView,
)
from app.api.v1.endpoints.quotations import (
    QuotationCreateView,
    QuotationDetailView,
    QuotationListView,
    QuotationRespondView,
)
from app.api.v1.endpoints.staff import StaffDetailView, StaffListView
from app.api.v1.endpoints.subscriptions import (
    SubscriptionDetailView,
    SubscriptionListView,
    SubscriptionStatusView,
)
from app.api.v1.endpoints.taxes import (
    ActiveTaxView,
    TaxRuleCreateView,
    TaxRuleDetailView,
    TaxRuleListView,
)

urlpatterns = [
    # Authentication
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("auth/staff/", AdminCreateStaffView.as_view(), name="auth-create-staff"),
    # Staff
    path("staff/", StaffListView.as_view(), name="staff-list"),
    path("staff/<uuid:staff_id>/", StaffDetailView.as_view(), name="staff-detail"),
    # Customers
    path("customers/", CustomerListView.as_view(), name="customer-list"),
    path("customers/<uuid:customer_id>/", CustomerDetailView.as_view(), name="customer-detail"),
    # Plans
    path("plans/", PlanListView.as_view(), name="plan-list"),
    path("plans/create/", PlanCreateView.as_view(), name="plan-create"),
    path("plans/<uuid:plan_id>/", PlanDetailView.as_view(), name="plan-detail"),
    # Products
    path("products/", ProductListView.as_view(), name="product-list"),
    path("products/create/", ProductCreateView.as_view(), name="product-create"),
    path("products/<uuid:product_id>/", ProductDetailView.as_view(), name="product-detail"),
    path(
        "products/<uuid:product_id>/variants/",
        ProductVariantListView.as_view(),
        name="product-variant-list",
    ),
    # Quotations
    path("quotations/", QuotationCreateView.as_view(), name="quotation-create"),
    path("quotations/list/", QuotationListView.as_view(), name="quotation-list"),
    path("quotations/<uuid:quotation_id>/", QuotationDetailView.as_view(), name="quotation-detail"),
    path(
        "quotations/<uuid:quotation_id>/respond/",
        QuotationRespondView.as_view(),
        name="quotation-respond",
    ),
    # Subscriptions
    path("subscriptions/", SubscriptionListView.as_view(), name="subscription-list"),
    path(
        "subscriptions/<uuid:subscription_id>/",
        SubscriptionDetailView.as_view(),
        name="subscription-detail",
    ),
    path(
        "subscriptions/<uuid:subscription_id>/status/",
        SubscriptionStatusView.as_view(),
        name="subscription-status",
    ),
    # Invoices
    path("invoices/", InvoiceListView.as_view(), name="invoice-list"),
    path("invoices/generate/", InvoiceGenerateView.as_view(), name="invoice-generate"),
    path(
        "invoices/<uuid:invoice_id>/",
        InvoiceDetailView.as_view(),
        name="invoice-detail",
    ),
    # Payments
    path("payments/", PaymentsListView.as_view(), name="payment-list"),
    path("payments/record/", PaymentRecordView.as_view(), name="payment-record"),
    path("payments/webhook/", PaymentWebhookView.as_view(), name="payment-webhook"),
    # Discounts
    path("discounts/", DiscountListView.as_view(), name="discount-list"),
    path("discounts/create/", DiscountCreateView.as_view(), name="discount-create"),
    path(
        "discounts/<uuid:discount_id>/",
        DiscountDetailView.as_view(),
        name="discount-detail",
    ),
    path("discounts/validate/", DiscountValidateView.as_view(), name="discount-validate"),
    # Taxes
    path("taxes/", TaxRuleListView.as_view(), name="tax-list"),
    path("taxes/create/", TaxRuleCreateView.as_view(), name="tax-create"),
    path("taxes/<uuid:tax_id>/", TaxRuleDetailView.as_view(), name="tax-detail"),
    path("taxes/active/", ActiveTaxView.as_view(), name="tax-active"),
]
