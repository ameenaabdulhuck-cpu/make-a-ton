import { useState } from 'react';
import Modal from './Modal';
import { formatMoney, getOutstanding } from '../utils/billing';

const PAYMENT_METHODS = ['Bank Transfer', 'Card', 'Cash', 'Cheque'];

export default function RecordPaymentForm({ invoice, onSave, onClose }) {
  const outstanding = getOutstanding(invoice);
  const [amount, setAmount] = useState(outstanding.toFixed(2));
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (value > outstanding) {
      setError(`The amount cannot exceed the outstanding balance of ${formatMoney(outstanding)}.`);
      return;
    }
    onSave({ invoiceId: invoice.id, amount: value, method });
  }

  return (
    <Modal
      title={`Record payment · ${invoice.number}`}
      onClose={onClose}
      footer={
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="payment-form" className="btn btn-primary">
            Record payment
          </button>
        </div>
      }
    >
      <form id="payment-form" className="form-grid" onSubmit={handleSubmit} noValidate>
        {error && <div className="alert alert-error form-full">{error}</div>}
        <div className="field">
          <label htmlFor="payment-amount">Amount received</label>
          <input id="payment-amount" type="number" min="0" step="0.01" className="input" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <span className="text-muted">Outstanding: {formatMoney(outstanding)}</span>
        </div>
        <div className="field">
          <label htmlFor="payment-method">Payment method</label>
          <select id="payment-method" className="select" value={method} onChange={(event) => setMethod(event.target.value)}>
            {PAYMENT_METHODS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}
