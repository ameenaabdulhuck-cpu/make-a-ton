/**
 * Quotation service - connects to Django backend quotation endpoints.
 * Transforms backend responses to match the frontend's expected data shape.
 */

import { api } from "./api";

/**
 * Transform a backend quotation into the frontend's expected shape.
 * The frontend expects: id, number, staffId, customerId, planId, productId,
 * variantIds, quantity, discountType, discountValue, taxId, paymentTerms,
 * status, createdAt, validUntil, unitPrice, subtotal, discountAmount,
 * taxAmount, taxRate, taxName, total
 */
function transformQuotation(backendQuote, planLookup = {}, productLookup = {}) {
  const plan = planLookup[backendQuote.plan] || {};
  const product = productLookup[plan.productId] || {};

  // Compute variant IDs from the plan/product (frontend tracks these separately)
  const variantIds = [];

  // Build a quotation number from the ID
  const number = `QT-${backendQuote.quotation_id.slice(-4).toUpperCase()}`;

  return {
    id: backendQuote.quotation_id,
    number,
    staffId: backendQuote.staff || "",
    customerId: backendQuote.customer || "",
    planId: backendQuote.plan || "",
    productId: plan.productId || "",
    variantIds,
    quantity: 1,
    discountType: "Percentage",
    discountValue: 0,
    taxId: "",
    paymentTerms: backendQuote.payment_terms || "",
    status: backendQuote.status,
    createdAt: backendQuote.created_at,
    validUntil: backendQuote.expires_at || "",
    unitPrice: Number(backendQuote.subtotal) || 0,
    subtotal: Number(backendQuote.subtotal) || 0,
    discountAmount: Number(backendQuote.discount_amount) || 0,
    taxAmount: Number(backendQuote.tax) || 0,
    taxRate: 0,
    taxName: "",
    total: Number(backendQuote.total) || 0,
  };
}

export const quotationService = {
  create: async (quotationData) => {
    // Map frontend field names to backend expected fields
    const payload = {
      customer_id: quotationData.customerId,
      plan_id: quotationData.planId,
      validity_days: quotationData.validityDays || 30,
      payment_terms: quotationData.paymentTerms || "",
    };

    if (quotationData.discountCode) {
      payload.discount_code = quotationData.discountCode;
    }

    const data = await api.post("/quotations/", payload);
    return {
      id: data.quotation_id,
      customerId: data.customer,
      customerName: data.customer_name,
      planId: data.plan,
      planName: data.plan_name,
      staffId: data.staff,
      staffEmail: data.staff_email,
      status: data.status,
      validityDays: data.validity_days,
      paymentTerms: data.payment_terms,
      subtotal: data.subtotal,
      discountAmount: data.discount_amount,
      tax: data.tax,
      total: data.total,
      currency: data.currency,
      gatewayReferenceId: data.gateway_reference_id,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  list: async () => {
    const data = await api.get("/quotations/list/");

    // Also fetch plans and products to enrich the transformation
    let plans = [];
    let products = [];
    try {
      const plansResp = await api.get("/plans/");
      plans = plansResp;
    } catch (_) {}
    try {
      const productsResp = await api.get("/products/");
      products = productsResp;
    } catch (_) {}

    const planLookup = {};
    plans.forEach((p) => {
      planLookup[p.id] = p;
    });
    const productLookup = {};
    products.forEach((p) => {
      productLookup[p.id] = p;
    });

    return data.map((item) => transformQuotation(item, planLookup, productLookup));
  },
};
