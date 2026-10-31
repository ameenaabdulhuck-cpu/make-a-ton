import { useState } from 'react';
import Modal from './Modal';

export default function TaxForm({ tax, onSave, onClose }) {
  const [form, setForm] = useState({
    name: tax?.name || '',
    rate: tax?.rate ?? '',
    status: tax?.status || 'Active',
  });
  const [errors, setErrors] = useState({});

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Tax name is required.';
    if (form.rate === '' || Number(form.rate) < 0 || Number(form.rate) > 100) nextErrors.rate = 'Enter a rate between 0 and 100.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSave({
      ...(tax ? { id: tax.id } : {}),
      name: form.name.trim(),
      rate: Number(form.rate),
      status: form.status,
    });
  }

  return (
    <Modal
      title={tax ? 'Edit tax rule' : 'Add tax rule'}
      onClose={onClose}
      footer={
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="tax-form" className="btn btn-primary">
            {tax ? 'Save changes' : 'Add tax rule'}
          </button>
        </div>
      }
    >
      <form id="tax-form" className="form-grid" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="tax-name">Tax name</label>
          <input id="tax-name" className="input" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} aria-invalid={Boolean(errors.name)} />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>
        <div className="field">
          <label htmlFor="tax-rate">Rate (%)</label>
          <input id="tax-rate" type="number" min="0" max="100" step="0.01" className="input" value={form.rate} onChange={(event) => setForm((prev) => ({ ...prev, rate: event.target.value }))} aria-invalid={Boolean(errors.rate)} />
          {errors.rate && <span className="field-error">{errors.rate}</span>}
        </div>
        <div className="field">
          <label htmlFor="tax-status">Status</label>
          <select id="tax-status" className="select" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}
