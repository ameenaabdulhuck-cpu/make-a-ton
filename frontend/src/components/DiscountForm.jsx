import { useState } from 'react';
import Modal from './Modal';

export default function DiscountForm({ discount, existingCodes, onSave, onClose }) {
  const [form, setForm] = useState({
    code: discount?.code || '',
    type: discount?.type || 'Percentage',
    value: discount?.value ?? '',
    validUntil: discount?.validUntil ? discount.validUntil.slice(0, 10) : '',
    usageLimit: discount?.usageLimit ?? 100,
    status: discount?.status || 'Active',
  });
  const [errors, setErrors] = useState({});

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const code = form.code.trim().toUpperCase();
    const nextErrors = {};
    if (!code) nextErrors.code = 'Discount code is required.';
    else if (existingCodes.includes(code)) nextErrors.code = 'This code already exists.';
    if (form.value === '' || Number(form.value) <= 0) nextErrors.value = 'Enter a value greater than zero.';
    if (form.type === 'Percentage' && Number(form.value) > 100) nextErrors.value = 'Percentage cannot exceed 100.';
    if (!form.validUntil) nextErrors.validUntil = 'Choose an expiry date.';
    if (Number(form.usageLimit) < 1) nextErrors.usageLimit = 'Usage limit must be at least 1.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSave({
      ...(discount ? { id: discount.id } : {}),
      code,
      type: form.type,
      value: Number(form.value),
      validUntil: new Date(`${form.validUntil}T23:59:59`).toISOString(),
      usageLimit: Number(form.usageLimit),
      status: form.status,
    });
  }

  return (
    <Modal
      title={discount ? 'Edit discount' : 'Create discount'}
      onClose={onClose}
      footer={
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="discount-form" className="btn btn-primary">
            {discount ? 'Save changes' : 'Create discount'}
          </button>
        </div>
      }
    >
      <form id="discount-form" className="form-grid" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="discount-code">Code</label>
          <input id="discount-code" className="input" value={form.code} onChange={(event) => updateField('code', event.target.value)} aria-invalid={Boolean(errors.code)} />
          {errors.code && <span className="field-error">{errors.code}</span>}
        </div>
        <div className="field">
          <label htmlFor="discount-type">Type</label>
          <select id="discount-type" className="select" value={form.type} onChange={(event) => updateField('type', event.target.value)}>
            <option>Percentage</option>
            <option>Fixed</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="discount-value">{form.type === 'Percentage' ? 'Percentage (%)' : 'Amount ($)'}</label>
          <input id="discount-value" type="number" min="0" step="0.01" className="input" value={form.value} onChange={(event) => updateField('value', event.target.value)} aria-invalid={Boolean(errors.value)} />
          {errors.value && <span className="field-error">{errors.value}</span>}
        </div>
        <div className="field">
          <label htmlFor="discount-valid">Valid until</label>
          <input id="discount-valid" type="date" className="input" value={form.validUntil} onChange={(event) => updateField('validUntil', event.target.value)} aria-invalid={Boolean(errors.validUntil)} />
          {errors.validUntil && <span className="field-error">{errors.validUntil}</span>}
        </div>
        <div className="field">
          <label htmlFor="discount-limit">Usage limit</label>
          <input id="discount-limit" type="number" min="1" className="input" value={form.usageLimit} onChange={(event) => updateField('usageLimit', event.target.value)} aria-invalid={Boolean(errors.usageLimit)} />
          {errors.usageLimit && <span className="field-error">{errors.usageLimit}</span>}
        </div>
        <div className="field">
          <label htmlFor="discount-status">Status</label>
          <select id="discount-status" className="select" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}
