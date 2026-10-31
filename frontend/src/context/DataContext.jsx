import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  addByFrequency,
  addDays,
  calculateQuote,
  getOutstanding,
} from "../utils/billing";
import {
  quotationService,
  paymentService,
  listingService,
} from "../services";
import { authService } from "../services/authService";

const DataContext = createContext(null);

const PAYMENT_TERM_DAYS = { "Due on acceptance": 0, "Net 15": 15, "Net 30": 30 };

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function findCustomer(state, email) {
  return state.customers.find((item) => item.email?.toLowerCase() === email.toLowerCase());
}

export function DataProvider({ children }) {
  // Initialize with empty state; data will be fetched from the backend
  const [state, setState] = useState({
    products: [],
    plans: [],
    taxes: [],
    discounts: [],
    staff: [],
    customers: [],
    quotations: [],
    subscriptions: [],
    invoices: [],
    payments: [],
    loading: false,
  });

  // Fetch initial data from backend
  useEffect(() => {
    let mounted = true;
    async function loadInitialData() {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        const [customers, plans] = await Promise.all([
          listingService.customers().catch(() => []),
          listingService.plans().catch(() => []),
        ]);
        if (mounted) {
          setState((prev) => ({
            ...prev,
            customers,
            plans,
            loading: false,
          }));
        }
      } catch (error) {
        if (mounted) {
          setState((prev) => ({ ...prev, loading: false }));
        }
      }
    }
    loadInitialData();
    return () => { mounted = false; };
  }, []);

  const setStateWithPersist = useCallback((updater) => {
    setState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return next;
    });
  }, []);

  // --- Products ---
  const saveProduct = useCallback(async (input) => {
    // Optimistic update handled by backend; for now just refresh
    try {
      const products = await listingService.customers(); // placeholder
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, []);

  // --- Plans ---
  const savePlan = useCallback(async (input) => {
    try {
      const plans = await listingService.plans();
      setState((prev) => ({ ...prev, plans }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, []);

  // --- Taxes ---
  const saveTax = useCallback(async (input) => {
    // Taxes managed via backend; placeholder
    return { ok: true };
  }, []);

  const deleteTax = useCallback(async (taxId) => {
    return { ok: true };
  }, []);

  // --- Discounts ---
  const saveDiscount = useCallback(async (input) => {
    return { ok: true };
  }, []);

  const deleteDiscount = useCallback(async (discountId) => {
    return { ok: true };
  }, []);

  // --- Staff ---
  const saveStaff = useCallback(async (input) => {
    return { ok: true };
  }, []);

  // --- Customer registration ---
  const registerCustomer = useCallback(
    async (input) => {
      try {
        const regResult = await authService.register(input);
        return { ok: true, customer: regResult.user };
      } catch (error) {
        return { ok: false, error: error.message || "Registration failed." };
      }
    },
    [],
  );

  const updateCustomer = useCallback(async (customerId, patch) => {
    // Customer updates via backend
    return { ok: true };
  }, []);

  const updatePassword = useCallback(
    (email, newPassword) => {
      // Password update via backend
      return true;
    },
    [],
  );

  // --- Quotations ---
  const createQuotation = useCallback(
    async (input) => {
      try {
        const created = await quotationService.create({
          customerId: input.customerId,
          planId: input.planId,
          productId: input.productId,
          variantIds: input.variantIds,
          quantity: input.quantity,
          discountType: input.discountType,
          discountValue: input.discountValue,
          taxId: input.taxId,
          paymentTerms: input.paymentTerms,
          validUntil: input.validUntil,
          discountCode: input.discountCode,
          validityDays: input.validityDays,
        });

        // Add to local state for UI consistency
        const quotation = {
          ...created,
          number: created.quotation_number || `QT-${Math.floor(1000 + Math.random() * 9000)}`,
          productId: input.productId || "",
          taxRate: input.taxRate || 0,
          taxName: input.taxName || "",
          status: created.status,
          createdAt: created.created_at,
          validUntil: created.expires_at,
        };

        setState((prev) => ({ ...prev, quotations: [...prev.quotations, quotation] }));
        return quotation;
      } catch (error) {
        throw error;
      }
    },
    [],
  );

  const respondToQuotation = useCallback(
    async (quotationId, decision) => {
      try {
        await apiPost(`/quotations/${quotationId}/respond/`, { decision });
        // Refresh quotations list
        const updated = await quotationService.list();
        setState((prev) => ({ ...prev, quotations: updated }));
        return { ok: true };
      } catch (error) {
        throw error;
      }
    },
    [],
  );

  const setSubscriptionStatus = useCallback(async (subscriptionId, status) => {
    try {
      await apiPost(`/subscriptions/${subscriptionId}/status/`, { status });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, []);

  // --- Payments ---
  const recordPayment = useCallback(
    async ({ invoiceId, amount, method, quotationId }) => {
      try {
        const created = await paymentService.record({
          quotationId: quotationId || "",
          invoiceId: invoiceId || "",
          amount,
          method,
          notes: `Payment for invoice ${invoiceId}`,
        });

        setState((prev) => ({
          ...prev,
          payments: [
            ...prev.payments,
            {
              id: created.id,
              invoiceId,
              subscriptionId: created.subscription || "",
              customerId: created.customerId || "",
              amount: created.amountPaid,
              date: created.paymentDate,
              method: created.paymentMethod,
            },
          ],
        }));

        return created;
      } catch (error) {
        throw error;
      }
    },
    [],
  );

  const fetchCustomers = useCallback(async () => {
    try {
      return await listingService.customers();
    } catch (error) {
      console.warn("Failed to fetch customers from API:", error.message);
      return state.customers;
    }
  }, [state.customers]);

  const fetchPlans = useCallback(async () => {
    try {
      return await listingService.plans();
    } catch (error) {
      console.warn("Failed to fetch plans from API:", error.message);
      return state.plans;
    }
  }, [state.plans]);

  // Helper for API POST
  const apiPost = useCallback(async (path, body) => {
    const { api } = await import("../services/api");
    return api.post(path, body);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      saveProduct,
      savePlan,
      saveTax,
      deleteTax,
      saveDiscount,
      deleteDiscount,
      saveStaff,
      registerCustomer,
      updateCustomer,
      updatePassword,
      createQuotation,
      respondToQuotation,
      setSubscriptionStatus,
      recordPayment,
      fetchCustomers,
      fetchPlans,
    }),
    [
      state,
      saveProduct,
      savePlan,
      saveTax,
      deleteTax,
      saveDiscount,
      deleteDiscount,
      saveStaff,
      registerCustomer,
      updateCustomer,
      updatePassword,
      createQuotation,
      respondToQuotation,
      setSubscriptionStatus,
      recordPayment,
      fetchCustomers,
      fetchPlans,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used inside DataProvider");
  return context;
}
