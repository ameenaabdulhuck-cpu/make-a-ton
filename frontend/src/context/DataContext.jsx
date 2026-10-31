import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { seedData } from "../data/seed";
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

const DATA_STORAGE_KEY = "brightloop-data";

const PAYMENT_TERM_DAYS = { "Due on acceptance": 0, "Net 15": 15, "Net 30": 30 };

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function withNumber(prefix, base, list) {
  return `${prefix}${base + list.length + 1}`;
}

function findAccount(state, email) {
  const normalized = email.trim().toLowerCase();
  const lowerEq = (value) => value.toLowerCase() === normalized;
  if (lowerEq(state.admin.email)) return { role: "admin", record: state.admin };
  const staffMember = state.staff.find((member) => lowerEq(member.email));
  if (staffMember) return { role: "staff", record: staffMember };
  const customer = state.customers.find((item) => lowerEq(item.email));
  if (customer) return { role: "customer", record: customer };
  return null;
}

function loadPersistedData() {
  try {
    const stored = localStorage.getItem(DATA_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.products && parsed.plans) {
        return parsed;
      }
    }
  } catch (_) {
    // Ignore malformed storage
  }
  return null;
}

function persistData(state) {
  try {
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(state));
  } catch (_) {
    // Ignore storage errors
  }
}

export function DataProvider({ children }) {
  const persisted = loadPersistedData();
  const [state, setState] = useState(() => (persisted ? persisted : { ...seedData }));

  // Persist state to localStorage whenever it changes so data survives refresh.
  useEffect(() => {
    persistData(state);
  }, [state]);

  // --- Local state mutations (synced to localStorage via the effect above) ---

  const isProductInUse = useCallback(
    (productId) =>
      state.quotations.some((quote) => quote.productId === productId) ||
      state.subscriptions.some((sub) => sub.productId === productId),
    [state.quotations, state.subscriptions],
  );

  const saveProduct = useCallback((input) => {
    setState((prev) => {
      const variants = input.variants.map((variant) => ({ ...variant, id: variant.id || createId("var") }));
      if (input.id) {
        return {
          ...prev,
          products: prev.products.map((item) => (item.id === input.id ? { ...item, ...input, variants } : item)),
        };
      }
      return { ...prev, products: [...prev.products, { ...input, id: createId("prod"), variants }] };
    });
  }, []);

  const deleteProduct = useCallback((productId) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.filter((item) => item.id !== productId),
      plans: prev.plans.filter((plan) => plan.productId !== productId),
    }));
  }, []);

  const savePlan = useCallback((input) => {
    setState((prev) => {
      if (input.id) {
        return { ...prev, plans: prev.plans.map((plan) => (plan.id === input.id ? { ...plan, ...input } : plan)) };
      }
      return { ...prev, plans: [...prev.plans, { ...input, id: createId("plan") }] };
    });
  }, []);

  const saveTax = useCallback((input) => {
    setState((prev) => {
      if (input.id) {
        return { ...prev, taxes: prev.taxes.map((tax) => (tax.id === input.id ? { ...tax, ...input } : tax)) };
      }
      return { ...prev, taxes: [...prev.taxes, { ...input, id: createId("tax") }] };
    });
  }, []);

  const deleteTax = useCallback((taxId) => {
    setState((prev) => ({ ...prev, taxes: prev.taxes.filter((tax) => tax.id !== taxId) }));
  }, []);

  const saveDiscount = useCallback((input) => {
    setState((prev) => {
      if (input.id) {
        return { ...prev, discounts: prev.discounts.map((item) => (item.id === input.id ? { ...item, ...input } : item)) };
      }
      return { ...prev, discounts: [...prev.discounts, { ...input, id: createId("disc"), used: 0 }] };
    });
  }, []);

  const deleteDiscount = useCallback((discountId) => {
    setState((prev) => ({ ...prev, discounts: prev.discounts.filter((item) => item.id !== discountId) }));
  }, []);

  const saveStaff = useCallback((input) => {
    setState((prev) => {
      if (input.id) {
        return { ...prev, staff: prev.staff.map((member) => (member.id === input.id ? { ...member, ...input } : member)) };
      }
      return { ...prev, staff: [...prev.staff, { ...input, id: createId("staff") }] };
    });
  }, []);

  const registerCustomer = useCallback(
    async (input) => {
      try {
        const regResult = await authService.register(input);
        return { ok: true, customer: regResult.user };
      } catch (error) {
        return { ok: false, error: error.message || "An account with this email already exists." };
      }
    },
    [],
  );

  const updateCustomer = useCallback((customerId, patch) => {
    setState((prev) => ({
      ...prev,
      customers: prev.customers.map((customer) => (customer.id === customerId ? { ...customer, ...patch } : customer)),
    }));
  }, []);

  const updatePassword = useCallback(
    (email, newPassword) => {
      const account = findAccount(state, email);
      if (!account) return false;
      const targetId = account.record.id;
      const apply = (record) => (record.id === targetId ? { ...record, password: newPassword } : record);
      setState((prev) => ({
        ...prev,
        admin: apply(prev.admin),
        staff: prev.staff.map(apply),
        customers: prev.customers.map(apply),
      }));
      return true;
    },
    [state],
  );

  const createQuotation = useCallback(
    async (input) => {
      try {
        const created = await quotationService.create({
          customerId: input.customerId,
          planId: input.planId,
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
          id: created.id,
          number: `QT-${Math.floor(1000 + Math.random() * 9000)}`,
          productId: input.productId || "",
          taxRate: input.taxRate || 0,
          taxName: input.taxName || "",
          status: created.status,
          createdAt: created.createdAt,
          validUntil: created.expiresAt,
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
    (quotationId, decision) => {
      setState((prev) => {
        const quote = prev.quotations.find((item) => item.id === quotationId);
        if (!quote || quote.status !== "Pending") return prev;
        const quotations = prev.quotations.map((item) =>
          item.id === quotationId ? { ...item, status: decision, respondedAt: new Date().toISOString() } : item,
        );
        if (decision !== "Accepted") return { ...prev, quotations };

        const plan = prev.plans.find((item) => item.id === quote.planId);
        const start = new Date();
        const subscription = {
          id: createId("sub"),
          quotationId: quote.id,
          customerId: quote.customerId,
          staffId: quote.staffId,
          productId: quote.productId,
          planId: quote.planId,
          variantIds: quote.variantIds,
          quantity: quote.quantity,
          recurringAmount: quote.total,
          startDate: start.toISOString(),
          expiryDate: addDays(addByFrequency(start, plan.frequency), 364).toISOString(),
          nextBillingDate: addByFrequency(start, plan.frequency).toISOString(),
          status: "Active",
        };
        const invoiceDays = PAYMENT_TERM_DAYS[quote.paymentTerms] ?? 0;
        const invoice = {
          id: createId("inv"),
          number: withNumber("INV-", 1000, prev.invoices),
          subscriptionId: subscription.id,
          customerId: quote.customerId,
          staffId: quote.staffId,
          amount: quote.total,
          paidAmount: 0,
          issueDate: start.toISOString(),
          dueDate: addDays(start, invoiceDays).toISOString(),
        };
        return {
          ...prev,
          quotations,
          subscriptions: [...prev.subscriptions, subscription],
          invoices: [...prev.invoices, invoice],
        };
      });
    },
    [],
  );

  const setSubscriptionStatus = useCallback((subscriptionId, status) => {
    setState((prev) => ({
      ...prev,
      subscriptions: prev.subscriptions.map((sub) => (sub.id === subscriptionId ? { ...sub, status } : sub)),
    }));
  }, []);

  const recordPayment = useCallback(
    async ({ invoiceId, amount, method, quotationId }) => {
      try {
        const created = await paymentService.record({
          quotationId: quotationId || "",
          amount,
          method,
          notes: `Payment for invoice ${invoiceId}`,
        });

        // Update local invoice state
        setState((prev) => {
          const invoice = prev.invoices.find((item) => item.id === invoiceId);
          if (!invoice) return prev;
          const payable = Math.min(Number(amount), getOutstanding(invoice));
          if (payable <= 0) return prev;
          return {
            ...prev,
            payments: [
              ...prev.payments,
              {
                id: created.id,
                invoiceId,
                subscriptionId: invoice.subscriptionId,
                customerId: invoice.customerId,
                amount: payable,
                date: created.paymentDate,
                method: created.paymentMethod,
              },
            ],
            invoices: prev.invoices.map((item) =>
              item.id === invoiceId ? { ...item, paidAmount: item.paidAmount + payable } : item,
            ),
          };
        });

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
      console.warn("Failed to fetch customers from API, using local data:", error.message);
      return state.customers;
    }
  }, [state.customers]);

  const fetchPlans = useCallback(async () => {
    try {
      return await listingService.plans();
    } catch (error) {
      console.warn("Failed to fetch plans from API, using local data:", error.message);
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
      findAccount: (email) => findAccount(state, email),
      createQuotation,
      respondToQuotation,
      setSubscriptionStatus,
      recordPayment,
      fetchCustomers,
      fetchPlans,
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
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used inside DataProvider");
  return context;
}
