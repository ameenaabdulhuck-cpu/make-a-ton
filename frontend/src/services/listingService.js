/**
 * Listing service - connects to Django backend list endpoints.
 * Transforms backend responses to match the frontend's expected data shape.
 */

import { api } from "./api";

export const listingService = {
  customers: async () => {
    const data = await api.get("/customers/");
    return data.map((item) => ({
      id: String(item.id),
      userId: String(item.user || ""),
      companyName: item.company_name || "",
      businessName: item.company_name || "",
      name: item.company_name || "",
      email: "",
      address: item.address || "",
      taxId: item.tax_id || "",
      phone: item.phone || "",
      businessType: item.business_type || "",
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },

  plans: async () => {
    const data = await api.get("/plans/");
    return data.map((item) => ({
      id: String(item.id),
      planName: item.plan_name,
      name: item.plan_name,
      productId: String(item.product || ""),
      productName: item.product_name || "",
      billingFrequency: item.billing_frequency,
      frequency: item.billing_frequency,
      basePrice: item.base_price,
      price: item.base_price,
      autoRenew: item.auto_renew,
      canPause: item.can_pause,
      canCloseEarly: item.can_close_early,
      renewal: item.renewal,
      pausable: item.pausable,
      closureNoticeDays: item.closure_notice_days,
      status: item.status,
    }));
  },

  quotations: async () => {
    const data = await api.get("/quotations/list/");
    return data.map((item) => ({
      id: String(item.id),
      quotation_number: item.quotation_number,
      customerId: String(item.customer),
      customerName: item.customer_name,
      planId: String(item.plan),
      planName: item.plan_name,
      productId: String(item.product || ""),
      productName: item.product_name || "",
      staffId: String(item.staff || ""),
      staffEmail: item.staff_email || "",
      status: item.status,
      validityDays: item.validity_days,
      paymentTerms: item.payment_terms,
      subtotal: item.subtotal,
      discountAmount: item.discount_amount,
      tax: item.tax_amount,
      total: item.total,
      currency: item.currency,
      expiresAt: item.expires_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },

  products: async () => {
    const data = await api.get("/products/");
    return data.map((item) => ({
      id: String(item.id),
      name: item.name,
      category: item.category || "",
      description: item.description || "",
      status: item.status,
      variants: (item.variants || []).map((v) => ({
        id: String(v.id),
        name: v.name,
        extraPrice: v.extra_price,
      })),
    }));
  },

  invoices: async () => {
    const data = await api.get("/invoices/");
    return data.map((item) => ({
      id: String(item.id),
      invoice_number: item.invoice_number,
      subscriptionId: String(item.subscription || ""),
      customerId: String(item.customer),
      customerName: item.customer_name,
      staffId: String(item.staff || ""),
      amount: item.amount,
      paidAmount: item.paid_amount,
      outstanding: item.outstanding,
      status: item.status,
      issueDate: item.issue_date,
      dueDate: item.due_date,
      currency: item.currency,
    }));
  },

  subscriptions: async () => {
    const data = await api.get("/subscriptions/");
    return data.map((item) => ({
      id: String(item.id),
      subscription_number: item.subscription_number,
      customerId: String(item.customer),
      customerName: item.customer_name,
      planId: String(item.plan),
      planName: item.plan_name,
      productId: String(item.product || ""),
      productName: item.product_name || "",
      staffId: String(item.staff || ""),
      staffEmail: item.staff_email || "",
      variantIds: item.variant_ids || [],
      quantity: item.quantity,
      recurringAmount: item.recurring_amount,
      status: item.status,
      startDate: item.start_date,
      expiryDate: item.expiry_date,
      nextBillingDate: item.next_billing_date,
      autoRenew: item.auto_renew,
      canPause: item.can_pause,
    }));
  },

  taxes: async () => {
    const data = await api.get("/taxes/");
    return data.map((item) => ({
      id: String(item.id),
      name: item.name,
      rate: item.rate,
      status: item.status,
    }));
  },

  discounts: async () => {
    const data = await api.get("/discounts/");
    return data.map((item) => ({
      id: String(item.id),
      code: item.discount_name,
      type: item.discount_type,
      value: item.value,
      staffMaximumLimit: item.staff_maximum_limit,
      validUntil: item.end_date,
      usageLimit: item.usage_limit,
      used: item.times_used,
      status: item.status,
    }));
  },

};
