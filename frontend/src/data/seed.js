import { addByFrequency, addDays, calculateQuote } from '../utils/billing';

const now = new Date();

const product = {
  'prod-1': { id: 'prod-1', name: 'Office Coffee Supply', category: 'Supplies', description: 'Monthly coffee beans and brewing supplies delivered to your office.', status: 'Active', variants: [
    { id: 'var-1', name: 'Arabica 250g', extraPrice: 0 },
    { id: 'var-2', name: 'Dark Roast 500g', extraPrice: 12 },
    { id: 'var-3', name: 'Decaf 250g', extraPrice: 4 },
  ] },
  'prod-2': { id: 'prod-2', name: 'Cloud Storage', category: 'Software', description: 'Secure encrypted cloud storage for teams with shared folders.', status: 'Active', variants: [
    { id: 'var-4', name: '100 GB', extraPrice: 0 },
    { id: 'var-5', name: '1 TB', extraPrice: 25 },
  ] },
  'prod-3': { id: 'prod-3', name: 'Cleaning Services', category: 'Services', description: 'Scheduled cleaning visits for offices and retail spaces.', status: 'Inactive', variants: [
    { id: 'var-6', name: 'Standard visit', extraPrice: 0 },
    { id: 'var-7', name: 'Deep clean', extraPrice: 40 },
  ] },
};

const plan = {
  'plan-1': { id: 'plan-1', name: 'Coffee Monthly', productId: 'prod-1', price: 120, frequency: 'Monthly', renewal: 'Auto', pausable: true, closureNoticeDays: 14, status: 'Active' },
  'plan-2': { id: 'plan-2', name: 'Coffee Weekly', productId: 'prod-1', price: 35, frequency: 'Weekly', renewal: 'Auto', pausable: true, closureNoticeDays: 7, status: 'Active' },
  'plan-3': { id: 'plan-3', name: 'Cloud Yearly', productId: 'prod-2', price: 480, frequency: 'Yearly', renewal: 'Manual', pausable: false, closureNoticeDays: 30, status: 'Active' },
  'plan-4': { id: 'plan-4', name: 'Cleaning Monthly', productId: 'prod-3', price: 200, frequency: 'Monthly', renewal: 'Auto', pausable: true, closureNoticeDays: 14, status: 'Inactive' },
};

const staff = [
  { id: 'staff-1', name: 'Daniel Reyes', email: 'daniel@subhub.com', password: 'Staff@123', phone: '+1 555 010 2001', department: 'Sales', maxDiscountPercent: 15, status: 'Active' },
  { id: 'staff-2', name: 'Priya Nair', email: 'priya@subhub.com', password: 'Staff@123', phone: '+1 555 010 2002', department: 'Account Management', maxDiscountPercent: 10, status: 'Active' },
];

const customers = [
  { id: 'cust-1', name: 'Ava Thompson', email: 'ava@bluebirdcafe.com', password: 'Customer@123', businessName: 'Bluebird Cafe', businessType: 'Food & Beverage', phone: '+1 555 020 3001', address: '42 Harbor Street, Portland', createdAt: addDays(now, -120).toISOString() },
  { id: 'cust-2', name: 'Ravi Patel', email: 'ravi@patellogistics.com', password: 'Customer@123', businessName: 'Patel Logistics', businessType: 'Logistics', phone: '+1 555 020 3002', address: '900 Freight Ave, Chicago', createdAt: addDays(now, -80).toISOString() },
  { id: 'cust-3', name: 'Sofia Marin', email: 'sofia@marinstudio.com', password: 'Customer@123', businessName: 'Marin Studio', businessType: 'Design Agency', phone: '+1 555 020 3003', address: '17 Canal Road, Austin', createdAt: addDays(now, -40).toISOString() },
  { id: 'cust-4', name: 'Liam O Connor', email: 'liam@northwindgym.com', password: 'Customer@123', businessName: 'Northwind Gym', businessType: 'Fitness', phone: '+1 555 020 3004', address: '5 Summit Way, Denver', createdAt: addDays(now, -10).toISOString() },
];

const taxes = [
  { id: 'tax-1', name: 'Sales Tax', rate: 8, status: 'Active' },
  { id: 'tax-2', name: 'Service Charge', rate: 5, status: 'Active' },
  { id: 'tax-3', name: 'Legacy VAT', rate: 10, status: 'Inactive' },
];

const discounts = [
  { id: 'disc-1', code: 'WELCOME10', type: 'Percentage', value: 10, validUntil: addDays(now, 90).toISOString(), usageLimit: 100, used: 14, status: 'Active' },
  { id: 'disc-2', code: 'FLAT50', type: 'Fixed', value: 50, validUntil: addDays(now, -5).toISOString(), usageLimit: 20, used: 20, status: 'Active' },
];

function buildQuotationRecord(seed) {
  const selectedPlan = plan[seed.planId];
  const selectedProduct = product[selectedPlan.productId];
  const selectedTax = taxes.find((tax) => tax.id === seed.taxId);
  const totals = calculateQuote({
    plan: selectedPlan,
    product: selectedProduct,
    variantIds: seed.variantIds,
    quantity: seed.quantity,
    discountType: seed.discountType,
    discountValue: seed.discountValue,
    taxRate: selectedTax.rate,
  });
  return {
    ...seed,
    productId: selectedProduct.id,
    taxRate: selectedTax.rate,
    taxName: selectedTax.name,
    ...totals,
    createdAt: addDays(now, seed.createdOffset).toISOString(),
    validUntil: addDays(now, seed.validOffset).toISOString(),
  };
}

const quotationSeeds = [
  { id: 'qt-1', number: 'QT-1001', staffId: 'staff-1', customerId: 'cust-1', planId: 'plan-1', variantIds: ['var-2'], quantity: 2, discountType: 'Percentage', discountValue: 10, taxId: 'tax-1', paymentTerms: 'Net 15', status: 'Accepted', createdOffset: -40, validOffset: -10 },
  { id: 'qt-2', number: 'QT-1002', staffId: 'staff-1', customerId: 'cust-2', planId: 'plan-3', variantIds: ['var-5'], quantity: 3, discountType: 'Percentage', discountValue: 5, taxId: 'tax-1', paymentTerms: 'Net 30', status: 'Pending', createdOffset: -3, validOffset: 25 },
  { id: 'qt-3', number: 'QT-1003', staffId: 'staff-2', customerId: 'cust-3', planId: 'plan-2', variantIds: ['var-1'], quantity: 1, discountType: 'Percentage', discountValue: 8, taxId: 'tax-2', paymentTerms: 'Due on acceptance', status: 'Rejected', createdOffset: -20, validOffset: 10 },
  { id: 'qt-4', number: 'QT-1004', staffId: 'staff-2', customerId: 'cust-4', planId: 'plan-1', variantIds: ['var-3'], quantity: 1, discountType: 'Percentage', discountValue: 0, taxId: 'tax-1', paymentTerms: 'Net 15', status: 'Pending', createdOffset: -25, validOffset: -4 },
];

const quotations = quotationSeeds.map(buildQuotationRecord);
const acceptedQuote = quotations.find((quote) => quote.id === 'qt-1');

const subscriptions = [
  {
    id: 'sub-1',
    quotationId: acceptedQuote.id,
    customerId: acceptedQuote.customerId,
    staffId: acceptedQuote.staffId,
    productId: acceptedQuote.productId,
    planId: acceptedQuote.planId,
    variantIds: acceptedQuote.variantIds,
    quantity: acceptedQuote.quantity,
    recurringAmount: acceptedQuote.total,
    startDate: addDays(now, -40).toISOString(),
    expiryDate: addDays(now, 320).toISOString(),
    nextBillingDate: addByFrequency(addDays(now, -40), plan['plan-1'].frequency).toISOString(),
    status: 'Active',
  },
];

const invoices = [
  { id: 'inv-1', number: 'INV-1001', subscriptionId: 'sub-1', customerId: 'cust-1', staffId: 'staff-1', amount: acceptedQuote.total, paidAmount: acceptedQuote.total, issueDate: addDays(now, -40).toISOString(), dueDate: addDays(now, -25).toISOString() },
  { id: 'inv-2', number: 'INV-1002', subscriptionId: 'sub-1', customerId: 'cust-1', staffId: 'staff-1', amount: acceptedQuote.total, paidAmount: 100, issueDate: addDays(now, -10).toISOString(), dueDate: addDays(now, -2).toISOString() },
];

const payments = [
  { id: 'pay-1', invoiceId: 'inv-1', subscriptionId: 'sub-1', customerId: 'cust-1', amount: acceptedQuote.total, date: addDays(now, -30).toISOString(), method: 'Bank Transfer' },
  { id: 'pay-2', invoiceId: 'inv-2', subscriptionId: 'sub-1', customerId: 'cust-1', amount: 100, date: addDays(now, -8).toISOString(), method: 'Card' },
];

export const seedData = {
  admin: { id: 'admin-1', name: 'Olivia Admin', email: 'admin@subhub.com', password: 'Admin@123' },
  products: Object.values(product),
  plans: Object.values(plan),
  staff,
  customers,
  taxes,
  discounts,
  quotations,
  subscriptions,
  invoices,
  payments,
};

export const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@subhub.com', password: 'Admin@123' },
  { label: 'Staff', email: 'daniel@subhub.com', password: 'Staff@123' },
  { label: 'Customer', email: 'ava@bluebirdcafe.com', password: 'Customer@123' },
];
