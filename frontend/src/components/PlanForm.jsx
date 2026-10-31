import { useState } from 'react';
import Modal from './Modal';

const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

export default function PlanForm({ plan, products, onSave, onClose }) {
  const [form, setForm] = useState({
    name: plan?.name || '',
    productId: plan?.productId || products[0]?.id || '',
    price: plan?.price ?? '',
    frequency: plan?.frequency || 'Monthly',
    renewal: plan?.renewal || 'Auto',
    pausable: plan?.pausable ?? true,
    closureNoticeDays: plan?.closureNoticeDays ?? 14,
    status: plan?.status || 'Active',
  });
  const [errors, setErrors] = useState({});

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Plan name is required.';
    if (!form.productId) nextErrors.productId = 'Choose a product for this plan.';
    if (form.price === '' || Number(form.price) <= 0) nextErrors.price = 'Enter a price greater than zero.';
    if (Number(form.closureNoticeDays) < 0) nextErrors.closureNoticeDays = 'Notice days cannot be negative.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSave({
      ...(plan ? { id: plan.id } : {}),
      name: form.name.trim(),
      productId: form.productId,
      price: Number(form.price),
      frequency: form.frequency,
      renewal: form.renewal,
      pausable: form.pausable,
      closureNoticeDays: Number(form.closureNoticeDays),
      status: form.status,
    });
  }

  return (
    <Modal
      title={plan ? 'Edit plan' : 'Create plan'}
      onClose={onClose}
      footer={
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="plan-form" className="btn btn-primary">
            {plan ? 'Save changes' : 'Create plan'}
          </button>
        </div>
      }
    >
      <form id="plan-form" className="stack" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="plan-name">Plan name</label>
            <input id="plan-name" className="input" value={form.name} onChange={(event) => updateField('name', event.target.value)} aria-invalid={Boolean(errors.name)} />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>
          <div className="field">
            <label htmlFor="plan-product">Product</label>
            <select id="plan-product" className="select" value={form.productId} onChange={(event) => updateField('productId', event.target.value)}>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            {errors.productId && <span className="field-error">{errors.productId}</span>}
          </div>
          <div className="field">
            <label htmlFor="plan-price">Price</label>
            <input id="plan-price" type="number" min="0" step="0.01" className="input" value={form.price} onChange={(event) => updateField('price', event.target.value)} aria-invalid={Boolean(errors.price)} />
            {errors.price && <span className="field-error">{errors.price}</span>}
          </div>
          <div className="field">
            <label htmlFor="plan-frequency">Billing frequency</label>
            <select id="plan-frequency" className="select" value={form.frequency} onChange={(event) => updateField('frequency', event.target.value)}>
              {FREQUENCIES.map((frequency) => (
                <option key={frequency}>{frequency}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="plan-renewal">Renewal</label>
            <select id="plan-renewal" className="select" value={form.renewal} onChange={(event) => updateField('renewal', event.target.value)}>
              <option value="Auto">Automatic</option>
              <option value="Manual">Manual</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="plan-notice">Closure notice (days)</label>
            <input id="plan-notice" type="number" min="0" className="input" value={form.closureNoticeDays} onChange={(event) => updateField('closureNoticeDays', event.target.value)} aria-invalid={Boolean(errors.closureNoticeDays)} />
            {errors.closureNoticeDays && <span className="field-error">{errors.closureNoticeDays}</span>}
          </div>
          <div className="field">
            <label htmlFor="plan-status">Status</label>
            <select id="plan-status" className="select" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
        <label className="checkbox-row">
          <input type="checkbox" checked={form.pausable} onChange={(event) => updateField('pausable', event.target.checked)} />
          Customers can pause this subscription
        </label>
      </form>
    </Modal>
  );
}
