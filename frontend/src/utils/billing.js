export const CURRENCY = 'USD';

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 2,
});

export function formatMoney(value) {
  return moneyFormatter.format(Number(value) || 0);
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatDate(value) {
  if (!value) return '-';
  return dateFormatter.format(new Date(value));
}

export function toISODate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addByFrequency(date, frequency) {
  const next = new Date(date);
  if (frequency === 'Daily') next.setDate(next.getDate() + 1);
  if (frequency === 'Weekly') next.setDate(next.getDate() + 7);
  if (frequency === 'Monthly') next.setMonth(next.getMonth() + 1);
  if (frequency === 'Yearly') next.setFullYear(next.getFullYear() + 1);
  return next;
}

export function isBefore(dateA, dateB) {
  return new Date(dateA).getTime() < new Date(dateB).getTime();
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

export function calculateQuote({
  plan,
  product,
  variantIds = [],
  quantity = 1,
  discountType = 'Percentage',
  discountValue = 0,
  taxRate = 0,
}) {
  const variantExtra = (product?.variants || [])
    .filter((variant) => variantIds.includes(variant.id))
    .reduce((sum, variant) => sum + Number(variant.extraPrice), 0);

  const unitPrice = Number(plan.price) + variantExtra;
  const subtotal = round2(unitPrice * quantity);
  const rawDiscount =
    discountType === 'Percentage' ? subtotal * (Number(discountValue) / 100) : Number(discountValue);
  const discountAmount = round2(Math.min(subtotal, Math.max(0, rawDiscount)));
  const taxableAmount = round2(subtotal - discountAmount);
  const taxAmount = round2(taxableAmount * (Number(taxRate) / 100));
  const total = round2(taxableAmount + taxAmount);

  return { unitPrice: round2(unitPrice), subtotal, discountAmount, taxableAmount, taxAmount, total };
}

export function getEffectiveDiscountPercent(subtotal, discountType, discountValue) {
  if (!subtotal) return 0;
  if (discountType === 'Percentage') return Number(discountValue) || 0;
  return ((Number(discountValue) || 0) / subtotal) * 100;
}

export function getQuotationStatus(quotation, today = new Date()) {
  if (quotation.status === 'Pending' && isBefore(quotation.validUntil, today)) return 'Expired';
  return quotation.status;
}

export function getInvoiceStatus(invoice, today = new Date()) {
  if (invoice.paidAmount >= invoice.amount) return 'Paid';
  if (invoice.paidAmount > 0) return 'Partially Paid';
  if (isBefore(invoice.dueDate, today)) return 'Overdue';
  return 'Unpaid';
}

export function getOutstanding(invoice) {
  return Math.max(0, round2(invoice.amount - invoice.paidAmount));
}
