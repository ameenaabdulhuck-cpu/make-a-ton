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
import { api } from "../services/api";

const DataContext = createContext(null);

const PAYMENT_TERM_DAYS = { "Due on acceptance": 0, "Net 15": 15, "Net 30": 30 };

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function findCustomer(state, email) {
  return state.customers.find((item) => item.email?.toLowerCase() === email.toLowerCase());
}

function findAccount(state, email) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;
  const staff = state.staff.find((item) => item.email?.trim().toLowerCase() === normalized);
  const customer = state.customers.find((item) => item.email?.trim().toLowerCase() === normalized);
  return staff ? { role: 'staff', record: staff } : customer ? { role: 'customer', record: customer } : null;
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
    loading: true,
  });

  const isProductInUse = useCallback(
    (productId) =>
      state.quotations.some((quote) => quote.productId === productId) ||
      state.subscriptions.some((sub) => sub.productId === productId),
    [state.quotations, state.subscriptions],
  );

  // Fetch ALL initial data from backend on mount
  useEffect(() => {
    let mounted = true;
    async function loadInitialData() {
      try {
        const [
          products,
          plans,
          taxes,
          discounts,
          staff,
          customers,
          quotations,
          subscriptions,
          invoices,
          payments,
        ] = await Promise.all([
          listingService.products().catch(() => []),
          listingService.plans().catch(() => []),
          listingService.taxes().catch(() => []),
          listingService.discounts().catch(() => []),
          listingService.staff().catch(() => []),
          listingService.customers().catch(() => []),
          listingService.quotations().catch(() => []),
          listingService.subscriptions().catch(() => []),
          listingService.invoices().catch(() => []),
          listingService.payments().catch(() => []),
        ]);
        if (mounted) {
          setState({
            products,
            plans,
            taxes,
            discounts,
            staff,
            customers,
            quotations,
            subscriptions,
            invoices,
            payments,
            loading: false,
          });
        }
      } catch (error) {
        console.error("Failed to load initial data:", error);
        if (mounted) {
          setState((prev) => ({ ...prev, loading: false }));
        }
      }
    }
    loadInitialData();
    return () => { mounted = false; };
  }, []);

  // --- Products ---
  const saveProduct = useCallback(async (input) => {
    try {
      if (input.id) {
        await api.put(`/products/${input.id}/`, {
          name: input.name,
          category: input.category,
          description: input.description,
          status: input.status,
        });
      } else {
        await api.post("/products/create/", {
          name: input.name,
          category: input.category,
          description: input.description,
          status: input.status,
          variants: input.variants || [],
        });
      }
      // Refresh products
      const updated = await listingService.products();
      setState((prev) => ({ ...prev, products: updated }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, []);

  const deleteProduct = useCallback(async (productId) => {
    try {
      await api.delete(`/products/${productId}/`);
      const updated = await listingService.products();
      setState((prev) => ({ ...prev, products: updated }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, []);

  // --- Plans ---
  const savePlan = useCallback(async (input) => {
    try {
      if (input.id) {
        await api.put(`/plans/${input.id}/`, {
          plan_name: input.name,
          product_id: input.productId,
          billing_frequency: input.frequency,
          base_price: input.price,
          auto_renew: input.autoRenew,
          can_pause: input.canPause,
          can_close_early: input.canCloseEarly,
          renewal: input.renewal,
          pausable: input.pausable,
          closure_notice_days: input.closureNoticeDays,
          status: input.status,
        });
      } else {
        await api.post("/plans/create/", {
          plan_name: input.name,
          product_id: input.productId,
          billing_frequency: input.frequency,
          base_price: input.price,
          auto_renew: input.autoRenew,
          can_pause: input.canPause,
          can_close_early: input.canCloseEarly,
          renewal: input.renewal,
          pausable: input.pausable,
          closure_notice_days: input.closureNoticeDays,
          status: input.status,
        });
      }
      const updated = await listingService.plans();
      setState((prev) => ({ ...prev, plans: updated }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, []);

  // --- Taxes ---
  const saveTax = useCallback(async (input) => {
    try {
      if (input.id) {
        await api.put(`/taxes/${input.id}/`, {
          name: input.name,
          rate: input.rate,
          status: input.status,
        });
      } else {
        await api.post("/taxes/create/", {
          name: input.name,
          rate: input.rate,
          status: input.status,
        });
      }
      const updated = await listingService.taxes();
      setState((prev) => ({ ...prev, taxes: updated }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, []);

  const deleteTax = useCallback(async (taxId) => {
    try {
      await api.delete(`/taxes/${taxId}/`);
      const updated = await listingService.taxes();
      setState((prev) => ({ ...prev, taxes: updated }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, []);

  // --- Discounts ---
  const saveDiscount = useCallback(async (input) => {
    try {
      if (input.id) {
        await api.put(`/discounts/${input.id}/`, {
          discount_name: input.code,
          discount_type: input.type,
          value: input.value,
          staff_maximum_limit: input.staffMaximumLimit,
          end_date: input.validUntil,
          usage_limit: input.usageLimit,
          status: input.status,
        });
      } else {
        await api.post("/discounts/create/", {
          discount_name: input.code,
          discount_type: input.type,
          value: input.value,
          staff_maximum_limit: input.staffMaximumLimit,
          end_date: input.validUntil,
          usage_limit: input.usageLimit,
          status: input.status,
        });
      }
      const updated = await listingService.discounts();
      setState((prev) => ({ ...prev, discounts: updated }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, []);

  const deleteDiscount = useCallback(async (discountId) => {
    try {
      await api.delete(`/discounts/${discountId}/`);
      const updated = await listingService.discounts();
      setState((prev) => ({ ...prev, discounts: updated }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, []);

  // --- Staff ---
  const saveStaff = useCallback(async (input) => {
    try {
      await api.post("/auth/staff/", {
        email: input.email,
        password: input.password || "TempPass123!",
        name: input.name,
        department: input.department,
        max_discount_percent: input.maxDiscountPercent,
      });
      const updated = await listingService.customers();
      setState((prev) => ({ ...prev, customers: updated }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
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
    try {
      await api.patch(`/customers/${customerId}/`, patch);
      const updated = await listingService.customers();
      setState((prev) => ({ ...prev, customers: updated }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, []);

  const updatePassword = useCallback(
    async (email, newPassword) => {
      try {
        await api.post("/auth/login/", { email, password: newPassword });
        return true;
      } catch (error) {
        return false;
      }
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

        // Refresh quotations list
        const updated = await quotationService.list();
        setState((prev) => ({ ...prev, quotations: updated }));
        return created;
      } catch (error) {
        throw error;
      }
    },
    [],
  );

  const respondToQuotation = useCallback(
    async (quotationId, decision) => {
      try {
        await quotationService.respond(quotationId, decision);
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
      await api.post(`/subscriptions/${subscriptionId}/status/`, { status });
      const updated = await listingService.subscriptions();
      setState((prev) => ({ ...prev, subscriptions: updated }));
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

        // Refresh invoices and payments
        const [invs, subs] = await Promise.all([
          listingService.invoices(),
          listingService.subscriptions(),
        ]);
        setState((prev) => ({
          ...prev,
          invoices: invs,
          subscriptions: subs,
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

  const value = useMemo(
    () => ({
      ...state,
      isProductInUse,
      saveProduct,
      deleteProduct,
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
      findAccount,
    }),
    [
      state,
      isProductInUse,
      saveProduct,
      deleteProduct,
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
      findAccount,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used inside DataProvider");
  return context;
}
