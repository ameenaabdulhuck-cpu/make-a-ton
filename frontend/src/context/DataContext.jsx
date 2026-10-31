import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { seedData } from '../data/seed';
import { addByFrequency, addDays, calculateQuote, getOutstanding } from '../utils/billing';

const DataContext = createContext(null);

const PAYMENT_TERM_DAYS = { 'Due on acceptance': 0, 'Net 15': 15, 'Net 30': 30 };

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function withNumber(prefix, base, list) {
  return `${prefix}${base + list.length + 1}`;
}

function findAccount(state, email) {
  const normalized = email.trim().toLowerCase();
  const lowerEq = (value) => value.toLowerCase() === normalized;
  if (lowerEq(state.admin.email)) return { role: 'admin', record: state.admin };
  const staffMember = state.staff.find((member) => lowerEq(member.email));
  if (staffMember) return { role: 'staff', record: staffMember };
  const customer = state.customers.find((item) => lowerEq(item.email));
  if (customer) return { role: 'customer', record: customer };
  return null;
}

export function DataProvider({ children }) {
  const [state, setState] = useState(() => ({ ...seedData }));

  const isProductInUse = useCallback(
    (productId) =>
      state.quotations.some((quote) => quote.productId === productId) ||
      state.subscriptions.some((sub) => sub.productId === productId),
    [state.quotations, state.subscriptions],
  );

  const saveProduct = useCallback((input) => {
    setState((prev) => {
      const variants = input.variants.map((variant) => ({ ...variant, id: variant.id || createId('var') }));
      if (input.id) {
        return {
          ...prev,
          products: prev.products.map((item) => (item.id === input.id ? { ...item, ...input, variants } : item)),
        };
      }
      return { ...prev, products: [...prev.products, { ...input, id: createId('prod'), variants }] };
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
      return { ...prev, plans: [...prev.plans, { ...input, id: createId('plan') }] };
    });
  }, []);

  const saveTax = useCallback((input) => {
    setState((prev) => {
      if (input.id) {
        return { ...prev, taxes: prev.taxes.map((tax) => (tax.id === input.id ? { ...tax, ...input } : tax)) };
      }
      return { ...prev, taxes: [...prev.taxes, { ...input, id: createId('tax') }] };
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
      return { ...prev, discounts: [...prev.discounts, { ...input, id: createId('disc'), used: 0 }] };
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
      return { ...prev, staff: [...prev.staff, { ...input, id: createId('staff') }] };
    });
  }, []);

  const registerCustomer = useCallback(
    (input) => {
      if (findAccount(state, input.email)) {
        return { ok: false, error: 'An account with this email already exists.' };
      }
      const customer = { ...input, id: createId('cust'), createdAt: new Date().toISOString() };
      setState((prev) => ({ ...prev, customers: [...prev.customers, customer] }));
      return { ok: true, customer };
    },
    [state],
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

  const createQuotation = useCallback((input) => {
    const plan = state.plans.find((item) => item.id === input.planId);
    const product = state.products.find((item) => item.id === plan.productId);
    const tax = state.taxes.find((item) => item.id === input.taxId);
    const totals = calculateQuote({
      plan,
      product,
      variantIds: input.variantIds,
      quantity: input.quantity,
      discountType: input.discountType,
      discountValue: input.discountValue,
      taxRate: tax.rate,
    });
    const quotation = {
      ...input,
      id: createId('qt'),
      number: withNumber('QT-', 1000, state.quotations),
      productId: product.id,
      taxRate: tax.rate,
      taxName: tax.name,
      ...totals,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      validUntil: input.validUntil,
    };
    setState((prev) => ({ ...prev, quotations: [...prev.quotations, quotation] }));
    return quotation;
  }, [state.plans, state.products, state.taxes, state.quotations]);

  const respondToQuotation = useCallback(
    (quotationId, decision) => {
      setState((prev) => {
        const quote = prev.quotations.find((item) => item.id === quotationId);
        if (!quote || quote.status !== 'Pending') return prev;
        const quotations = prev.quotations.map((item) =>
          item.id === quotationId ? { ...item, status: decision, respondedAt: new Date().toISOString() } : item,
        );
        if (decision !== 'Accepted') return { ...prev, quotations };

        const plan = prev.plans.find((item) => item.id === quote.planId);
        const start = new Date();
        const subscription = {
          id: createId('sub'),
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
          status: 'Active',
        };
        const invoiceDays = PAYMENT_TERM_DAYS[quote.paymentTerms] ?? 0;
        const invoice = {
          id: createId('inv'),
          number: withNumber('INV-', 1000, prev.invoices),
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

  const recordPayment = useCallback(({ invoiceId, amount, method }) => {
    setState((prev) => {
      const invoice = prev.invoices.find((item) => item.id === invoiceId);
      if (!invoice) return prev;
      const payable = Math.min(Number(amount), getOutstanding(invoice));
      if (payable <= 0) return prev;
      const payment = {
        id: createId('pay'),
        invoiceId,
        subscriptionId: invoice.subscriptionId,
        customerId: invoice.customerId,
        amount: payable,
        date: new Date().toISOString(),
        method,
      };
      return {
        ...prev,
        payments: [...prev.payments, payment],
        invoices: prev.invoices.map((item) =>
          item.id === invoiceId ? { ...item, paidAmount: item.paidAmount + payable } : item,
        ),
      };
    });
  }, []);

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
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used inside DataProvider');
  return context;
}
