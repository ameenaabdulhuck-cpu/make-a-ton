/**
 * Quotation service - connects to Django backend quotation endpoints.
 * Transforms backend responses to match the frontend's expected data shape.
 */

import { api } from "./api";

/**
 * Transform a backend quotation into the frontend's expected shape.
 */
function transformQuotation(backendQuote, planLookup = {}, productLookup = {}) {
  const plan = planLookup[backendQuote.plan] || {};
  const product = productLookup[backendQuote.product] || {};

  // Parse variant_ids from JSON array
  const variantIds = Array.isArray(backendQuote.variant_ids)
    ? backendQuote.variant_ids.map(String)
    : [];

  // Build a quotation number from backend
  const number = backendQuote.quotation_number || `QT-${String(backendQuote.id).slice(-4).toUpperCase()}`;

  return {
    id: String(backendQuote.id),
    number,
    quotation_number: backendQuote.quotation_number,
    staffId: String(backendQuote.staff || ""),
    customerId: String(backendQuote.customer || ""),
    planId: String(backendQuote.plan || ""),
    productId: String(backendQuote.product || ""),
    variantIds,
    quantity: backendQuote.quantity || 1,
    discountType: backendQuote.discount_type || "Percentage",
    discountValue: Number(backendQuote.discount_value) || 0,
    taxId: "",
    paymentTerms: backendQuote.payment_terms || "",
    status: backendQuote.status,
    createdAt: backendQuote.created_at,
    validUntil: backendQuote.expires_at || "",
    unitPrice: Number(backendQuote.subtotal) || 0,
    subtotal: Number(backendQuote.subtotal) || 0,
    discountAmount: Number(backendQuote.discount_amount) || 0,
    taxAmount: Number(backendQuote.tax_amount) || 0,
    taxRate: Number(backendQuote.tax_rate) || 0,
    taxName: backendQuote.tax_name || "",
    total: Number(backendQuote.total) || 0,
    customerName: backendQuote.customer_name || "",
    planName: backendQuote.plan_name || "",
    productName: backendQuote.product_name || "",
    staffEmail: backendQuote.staff_email || "",
  };
}

export const quotationService = {
  create: async (quotationData) => {
    // Map frontend field names to backend expected fields
    const payload = {
      customer_id: quotationData.customerId,
      plan_id: quotationData.planId,
      product_id: quotationData.productId || null,
      validity_days: quotationData.validityDays || 30,
      payment_terms: quotationData.paymentTerms || "",
      variant_ids: quotationData.variantIds || [],
      quantity: quotationData.quantity || 1,
    };

    if (quotationData.discountCode) {
      payload.discount_code = quotationData.discountCode;
    }

    const data = await api.post("/quotations/", payload);

    // Transform to frontend shape
    return {
      id: String(data.id),
      quotation_number: data.quotation_number,
      customerId: String(data.customer),
      customerName: data.customer_name,
      planId: String(data.plan),
      planName: data.plan_name,
      productId: String(data.product || ""),
      productName: data.product_name,
      staffId: String(data.staff || ""),
      staffEmail: data.staff_email,
      status: data.status,
      validityDays: data.validity_days,
      paymentTerms: data.payment_terms,
      subtotal: data.subtotal,
      discountAmount: data.discount_amount,
      tax: data.tax_amount,
      total: data.total,
      currency: data.currency,
      gatewayReferenceId: data.gateway_reference_id,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      quantity: data.quantity,
      variantIds: data.variant_ids || [],
      discountCodeUsed: data.discount_code_used,
      discountType: data.discount_type,
      discountValue: data.discount_value,
      taxRate: data.tax_rate,
      taxName: data.tax_name,
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
      planLookup[String(p.id)] = p;
    });
    const productLookup = {};
    products.forEach((p) => {
      productLookup[String(p.id)] = p;
    });

    return data.map((item) => transformQuotation(item, planLookup, productLookup));
  },

  respond: async (quotationId, decision) => {
    const data = await api.post(`/quotations/${quotationId}/respond/`, {
      decision,
    });
    return data;
  },
};
