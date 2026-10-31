import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { addDays, calculateQuote, formatMoney, getEffectiveDiscountPercent, toISODate } from '../../utils/billing';

const PAYMENT_TERMS = ['Due on acceptance', 'Net 15', 'Net 30'];

export default function NewQuotation() {
  const { user } = useAuth();
  const { customers, products, plans, taxes, createQuotation } = useData();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeProducts = products.filter((item) => item.status === 'Active');
  const activeTaxes = taxes.filter((item) => item.status === 'Active');
  const [form, setForm] = useState({
    customerId: searchParams.get('customer') || '',
    productId: '',
    planId: '',
    variantIds: [],
    quantity: 1,
    discountType: 'Percentage',
    discountValue: 0,
    taxId: activeTaxes[0]?.id || '',
    paymentTerms: 'Net 15',
    validUntil: toISODate(addDays(new Date(), 30)),
  });
  const [errors, setErrors] = useState({});

  const planOptions = plans.filter((plan) => plan.productId === form.productId && plan.status === 'Active');
  const product = activeProducts.find((item) => item.id === form.productId);
  const plan = planOptions.find((item) => item.id === form.planId);
  const tax = activeTaxes.find((item) => item.id === form.taxId);

  const preview = useMemo(() => {
    if (!plan || !tax) return null;
    return calculateQuote({
      plan,
      product,
      variantIds: form.variantIds,
      quantity: Number(form.quantity) || 0,
      discountType: form.discountType,
      discountValue: Number(form.discountValue) || 0,
      taxRate: tax.rate,
    });
  }, [plan, tax, product, form.variantIds, form.quantity, form.discountType, form.discountValue]);

  const effectivePercent = preview ? getEffectiveDiscountPercent(preview.subtotal, form.discountType, form.discountValue) : 0;
  const overLimit = effectivePercent > user.maxDiscountPercent + 1e-9;

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function handleProductChange(productId) {
    setForm((prev) => ({ ...prev, productId, planId: '', variantIds: [] }));
    setErrors((prev) => ({ ...prev, productId: undefined }));
  }

  function toggleVariant(variantId) {
    setForm((prev) => ({
      ...prev,
      variantIds: prev.variantIds.includes(variantId)
        ? prev.variantIds.filter((id) => id !== variantId)
        : [...prev.variantIds, variantId],
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!form.customerId) nextErrors.customerId = 'Select a customer.';
    if (!form.productId) nextErrors.productId = 'Select a product.';
    if (!form.planId) nextErrors.planId = 'Select a subscription plan.';
    if (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 1) nextErrors.quantity = 'Quantity must be a whole number of at least 1.';
    if (Number(form.discountValue) < 0) nextErrors.discountValue = 'Discount cannot be negative.';
    if (overLimit) nextErrors.discountValue = `Your discount limit is ${user.maxDiscountPercent}%.`;
    if (!form.taxId) nextErrors.taxId = 'Select a tax rule.';
    if (!form.validUntil || new Date(`${form.validUntil}T23:59:59`) < new Date()) nextErrors.validUntil = 'Validity must be a future date.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    createQuotation({
      staffId: user.id,
      customerId: form.customerId,
      planId: form.planId,
      variantIds: form.variantIds,
      quantity: Number(form.quantity),
      discountType: form.discountType,
      discountValue: Number(form.discountValue) || 0,
      taxId: form.taxId,
      paymentTerms: form.paymentTerms,
      validUntil: new Date(`${form.validUntil}T23:59:59`).toISOString(),
    });
    navigate('/staff/quotations', { state: { message: 'Quotation created and shared with the customer.' } });
  }

  return (
    <div className="stack">
      <div>
        <Link to="/staff/quotations" className="text-link">
          &larr; Back to quotations
        </Link>
      </div>
      <div className="page-header">
        <div>
          <h1>New quotation</h1>
          <p>Build a quotation, review the totals and share it with the customer.</p>
        </div>
      </div>

      <form className="split-layout quote-builder" onSubmit={handleSubmit} noValidate>
        <div className="card stack">
          <h2>Customer and product</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="quote-customer">Customer</label>
              <select id="quote-customer" className="select" value={form.customerId} onChange={(event) => updateField('customerId', event.target.value)}>
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.businessName} ({customer.name})
                  </option>
                ))}
              </select>
              {errors.customerId && <span className="field-error">{errors.customerId}</span>}
            </div>
            <div className="field">
              <label htmlFor="quote-product">Product</label>
              <select id="quote-product" className="select" value={form.productId} onChange={(event) => handleProductChange(event.target.value)}>
                <option value="">Select a product</option>
                {activeProducts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              {errors.productId && <span className="field-error">{errors.productId}</span>}
            </div>
            <div className="field">
              <label htmlFor="quote-plan">Subscription plan</label>
              <select id="quote-plan" className="select" value={form.planId} onChange={(event) => updateField('planId', event.target.value)} disabled={!product}>
                <option value="">Select a plan</option>
                {planOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {formatMoney(item.price)} / {item.frequency.toLowerCase()}
                  </option>
                ))}
              </select>
              {errors.planId && <span className="field-error">{errors.planId}</span>}
            </div>
            <div className="field">
              <label htmlFor="quote-quantity">Quantity</label>
              <input id="quote-quantity" type="number" min="1" className="input" value={form.quantity} onChange={(event) => updateField('quantity', event.target.value)} />
              {errors.quantity && <span className="field-error">{errors.quantity}</span>}
            </div>
          </div>

          {product && (
            <div className="field">
              <span className="field-label">Variants</span>
              <div className="chip-list">
                {product.variants.map((variant) => (
                  <label key={variant.id} className={`chip chip-toggle ${form.variantIds.includes(variant.id) ? 'selected' : ''}`}>
                    <input type="checkbox" checked={form.variantIds.includes(variant.id)} onChange={() => toggleVariant(variant.id)} />
                    {variant.name}
                    {variant.extraPrice > 0 && ` +${formatMoney(variant.extraPrice)}`}
                  </label>
                ))}
              </div>
            </div>
          )}

          <h2>Discount, tax and terms</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="quote-discount-type">Discount type</label>
              <select id="quote-discount-type" className="select" value={form.discountType} onChange={(event) => updateField('discountType', event.target.value)}>
                <option>Percentage</option>
                <option>Fixed</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="quote-discount">Discount value</label>
              <input id="quote-discount" type="number" min="0" step="0.01" className="input" value={form.discountValue} onChange={(event) => updateField('discountValue', event.target.value)} aria-invalid={Boolean(errors.discountValue)} />
              <span className={overLimit ? 'field-error' : 'text-muted'}>
                {errors.discountValue || `Your limit: up to ${user.maxDiscountPercent}% off`}
              </span>
            </div>
            <div className="field">
              <label htmlFor="quote-tax">Tax rule</label>
              <select id="quote-tax" className="select" value={form.taxId} onChange={(event) => updateField('taxId', event.target.value)}>
                {activeTaxes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.rate}%)
                  </option>
                ))}
              </select>
              {errors.taxId && <span className="field-error">{errors.taxId}</span>}
            </div>
            <div className="field">
              <label htmlFor="quote-terms">Payment terms</label>
              <select id="quote-terms" className="select" value={form.paymentTerms} onChange={(event) => updateField('paymentTerms', event.target.value)}>
                {PAYMENT_TERMS.map((term) => (
                  <option key={term}>{term}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="quote-valid">Valid until</label>
              <input id="quote-valid" type="date" className="input" value={form.validUntil} onChange={(event) => updateField('validUntil', event.target.value)} />
              {errors.validUntil && <span className="field-error">{errors.validUntil}</span>}
            </div>
          </div>
        </div>

        <aside className="card summary-card">
          <h2>Summary</h2>
          {preview ? (
            <div className="summary-box">
              <div className="summary-row">
                <span>Unit price</span>
                <span className="money">{formatMoney(preview.unitPrice)}</span>
              </div>
              <div className="summary-row">
                <span>Subtotal</span>
                <span className="money">{formatMoney(preview.subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Discount</span>
                <span className="money">-{formatMoney(preview.discountAmount)}</span>
              </div>
              <div className="summary-row">
                <span>
                  {tax.name} ({tax.rate}%)
                </span>
                <span className="money">{formatMoney(preview.taxAmount)}</span>
              </div>
              <div className="summary-row total">
                <span>Total per billing cycle</span>
                <span className="money">{formatMoney(preview.total)}</span>
              </div>
            </div>
          ) : (
            <p className="text-muted">Choose a product and plan to see the totals.</p>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={overLimit}>
            Create and share quotation
          </button>
          <p className="text-muted">The customer will see this quotation and can accept or reject it.</p>
        </aside>
      </form>
    </div>
  );
}
