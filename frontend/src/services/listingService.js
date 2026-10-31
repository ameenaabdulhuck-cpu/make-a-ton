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
      userId: item.user,
      companyName: item.company_name || "",
      businessName: item.company_name || "",
      name: item.company_name || "",
      email: "",
      address: item.address || "",
      taxId: item.tax_id || "",
      phone: "",
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
      productId: "", // Backend doesn't expose productId on plan list; set empty
      billingFrequency: item.billing_frequency,
      frequency: item.billing_frequency,
      basePrice: item.base_price,
      price: item.base_price,
      autoRenew: item.auto_renew,
      canPause: item.can_pause,
      canCloseEarly: item.can_close_early,
      status: "Active",
    }));
  },

  quotations: async () => {
    const data = await api.get("/quotations/list/");
    return data.map((item) => ({
      id: item.quotation_id,
      customerId: item.customer,
      customerName: item.customer_name,
      planId: item.plan,
      planName: item.plan_name,
      staffId: item.staff,
      staffEmail: item.staff_email,
      status: item.status,
      validityDays: item.validity_days,
      paymentTerms: item.payment_terms,
      subtotal: item.subtotal,
      discountAmount: item.discount_amount,
      tax: item.tax,
      total: item.total,
      currency: item.currency,
      expiresAt: item.expires_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },
};
