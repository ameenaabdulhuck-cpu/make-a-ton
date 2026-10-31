import { useData } from '../context/DataContext';
import { formatDate, formatMoney, getInvoiceStatus, getOutstanding } from '../utils/billing';
import StatusBadge from './StatusBadge';

export default function SubscriptionDetail({ subscription }) {
  const { products, plans, invoices, payments } = useData();
  const product = products.find((item) => item.id === subscription.productId);
  const plan = plans.find((item) => item.id === subscription.planId);
  const subInvoices = invoices.filter((invoice) => invoice.subscriptionId === subscription.id);
  const subPayments = payments.filter((payment) => payment.subscriptionId === subscription.id);
  const variants = (product?.variants || []).filter((variant) => subscription.variantIds.includes(variant.id));
  const outstanding = subInvoices.reduce((sum, invoice) => sum + getOutstanding(invoice), 0);

  return (
    <div className="stack">
      <div className="card-header">
        <div>
          <h2>{product?.name}</h2>
          <p className="text-muted">
            {plan?.name} - {variants.map((variant) => variant.name).join(', ') || 'Standard'}
          </p>
        </div>
        <StatusBadge status={subscription.status} />
      </div>

      <div className="detail-list">
        <div className="detail-item">
          <span>Billing</span>
          <strong>
            {formatMoney(subscription.recurringAmount)} / {plan?.frequency?.toLowerCase()}
          </strong>
        </div>
        <div className="detail-item">
          <span>Quantity</span>
          <strong>{subscription.quantity}</strong>
        </div>
        <div className="detail-item">
          <span>Start date</span>
          <strong>{formatDate(subscription.startDate)}</strong>
        </div>
        <div className="detail-item">
          <span>Expiry date</span>
          <strong>{formatDate(subscription.expiryDate)}</strong>
        </div>
        <div className="detail-item">
          <span>Next billing</span>
          <strong>{formatDate(subscription.nextBillingDate)}</strong>
        </div>
        <div className="detail-item">
          <span>Renewal</span>
          <strong>{plan?.renewal === 'Auto' ? 'Automatic' : 'Manual'}</strong>
        </div>
        <div className="detail-item">
          <span>Outstanding</span>
          <strong className="money">{formatMoney(outstanding)}</strong>
        </div>
      </div>

      <div>
        <h3 className="section-title">Invoices</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Due</th>
                <th className="num">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {subInvoices.length === 0 && (
                <tr>
                  <td className="table-empty" colSpan={4}>No invoices yet.</td>
                </tr>
              )}
              {subInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="primary-cell">{invoice.number}</td>
                  <td>{formatDate(invoice.dueDate)}</td>
                  <td className="num money">{formatMoney(invoice.amount)}</td>
                  <td>
                    <StatusBadge status={getInvoiceStatus(invoice)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="section-title">Payments</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Method</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {subPayments.length === 0 && (
                <tr>
                  <td className="table-empty" colSpan={3}>No payments recorded.</td>
                </tr>
              )}
              {subPayments.map((payment) => (
                <tr key={payment.id}>
                  <td>{formatDate(payment.date)}</td>
                  <td>{payment.method}</td>
                  <td className="num money">{formatMoney(payment.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
