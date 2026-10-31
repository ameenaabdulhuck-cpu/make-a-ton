import { useState } from 'react';
import Modal from './Modal';

const EMPTY_VARIANT = { name: '', extraPrice: 0 };

export default function ProductForm({ product, onSave, onClose }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    category: product?.category || '',
    description: product?.description || '',
    status: product?.status || 'Active',
    variants: product?.variants?.length ? product.variants.map((variant) => ({ ...variant })) : [{ ...EMPTY_VARIANT }],
  });
  const [errors, setErrors] = useState({});

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function updateVariant(index, name, value) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, position) => (position === index ? { ...variant, [name]: value } : variant)),
    }));
  }

  function addVariant() {
    setForm((prev) => ({ ...prev, variants: [...prev.variants, { ...EMPTY_VARIANT }] }));
  }

  function removeVariant(index) {
    setForm((prev) => ({ ...prev, variants: prev.variants.filter((_, position) => position !== index) }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Product name is required.';
    if (form.variants.some((variant) => !variant.name.trim())) nextErrors.variants = 'Every variant needs a name.';
    if (form.variants.some((variant) => Number(variant.extraPrice) < 0)) nextErrors.variants = 'Additional prices cannot be negative.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSave({
      ...(product ? { id: product.id } : {}),
      name: form.name.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      status: form.status,
      variants: form.variants.map((variant) => ({ ...variant, extraPrice: Number(variant.extraPrice) || 0 })),
    });
  }

  return (
    <Modal
      title={product ? 'Edit product' : 'Add product'}
      onClose={onClose}
      wide
      footer={
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="product-form" className="btn btn-primary">
            {product ? 'Save changes' : 'Add product'}
          </button>
        </div>
      }
    >
      <form id="product-form" className="stack" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="product-name">Product name</label>
            <input id="product-name" className="input" value={form.name} onChange={(event) => updateField('name', event.target.value)} aria-invalid={Boolean(errors.name)} />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>
          <div className="field">
            <label htmlFor="product-category">Category</label>
            <input id="product-category" className="input" value={form.category} onChange={(event) => updateField('category', event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="product-status">Status</label>
            <select id="product-status" className="select" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="product-description">Description</label>
          <textarea id="product-description" className="textarea" value={form.description} onChange={(event) => updateField('description', event.target.value)} />
        </div>

        <div className="stack-sm">
          <div className="card-header">
            <span className="section-title">Variants and additional pricing</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addVariant}>
              + Add variant
            </button>
          </div>
          {form.variants.map((variant, index) => (
            <div key={index} className="variant-row">
              <input
                className="input"
                placeholder="Variant name"
                aria-label={`Variant ${index + 1} name`}
                value={variant.name}
                onChange={(event) => updateVariant(index, 'name', event.target.value)}
              />
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="Extra price"
                aria-label={`Variant ${index + 1} additional price`}
                value={variant.extraPrice}
                onChange={(event) => updateVariant(index, 'extraPrice', event.target.value)}
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeVariant(index)} disabled={form.variants.length === 1}>
                Remove
              </button>
            </div>
          ))}
          {errors.variants && <span className="field-error">{errors.variants}</span>}
        </div>
      </form>
    </Modal>
  );
}
