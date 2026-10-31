/**
 * Payment service - connects to Django backend payment endpoints.
 */

import { api } from "./api";

export const paymentService = {
  record: async (paymentData) => {
    const payload = {
      quotation_id: paymentData.quotationId,
      amount_paid: paymentData.amount,
      payment_method: paymentData.method,
      notes: paymentData.notes || "",
      gateway_reference_id: paymentData.gatewayReferenceId || undefined,
    };

    const data = await api.post("/payments/record/", payload);
    return {
      id: data.payment_id,
      customerId: data.customer,
      customerName: data.customer_name,
      planId: data.plan,
      planName: data.plan_name,
      quotationId: data.quotation,
      quotationIdDisplay: data.quotation_id,
      invoiceId: data.invoice_id,
      amountPaid: data.amount_paid,
      paymentMethod: data.payment_method,
      paymentDate: data.payment_date,
      recordedBy: data.recorded_by,
      recordedByEmail: data.recorded_by_email,
      notes: data.notes,
      status: data.status,
      currency: data.currency,
      gatewayReferenceId: data.gateway_reference_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  webhook: async (webhookData) => {
    const payload = {};
    if (webhookData.gatewayReferenceId) {
      payload.gateway_reference_id = webhookData.gatewayReferenceId;
    }
    if (webhookData.paymentId) {
      payload.payment_id = webhookData.paymentId;
    }
    payload.status = webhookData.status;

    const data = await api.post("/payments/webhook/", payload);
    return {
      id: data.payment_id,
      status: data.status,
      quotationId: data.quotation,
      gatewayReferenceId: data.gateway_reference_id,
    };
  },
};
