import { useData } from '../context/DataContext';
import { formatDate, formatMoney, getInvoiceStatus, getOutstanding } from '../utils/billing';
import StatusBadge from './StatusBadge';

export default function InvoiceDetail({ invoice, showCustomer = true }) {
  const { customers, subscriptions, plans, payments } = useData();
  const customer = customers.find((item) => item.id === invoice.customerId);
  const subscription = subscriptions.find((item) => item.id === invoice.subscriptionId);
  const plan = plans.find((item) => item.id === subscription?.planId);
  const invoicePayments = payments.filter((payment) => payment.invoiceId === invoice.id);
  const status = getInvoiceStatus(invoice);

  return (
    <div className="printable">
      <div className="card-header">
        <div>
          <h2>Invoice {invoice.number}</h2>
          <p className="text-muted">Issued {formatDate(invoice.issueDate)}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="detail-list">
        {showCustomer && customer && (
          <div className="detail-item">
            <span>Billed to</span>
            <strong>{customer.businessName}</strong>
            <div className="text-muted">{customer.address}</div>
          </div>
        )}
        <div className="detail-item">
          <span>Plan</span>
          <strong>{plan?.name || '-'}</strong>
        </div>
        <div className="detail-item">
          <span>Due date</span>
          <strong>{formatDate(invoice.dueDate)}</strong>
        </div>
        <div className="detail-item">
          <span>Amount</span>
          <strong className="money">{formatMoney(invoice.amount)}</strong>
        </div>
        <div className="detail-item">
          <span>Paid</span>
          <strong className="money">{formatMoney(invoice.paidAmount)}</strong>
        </div>
        <div className="detail-item">
          <span>Outstanding</span>
          <strong className="money">{formatMoney(getOutstanding(invoice))}</strong>
        </div>
      </div>

      <div>
        <h3 className="section-title">Payments received</h3>
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
              {invoicePayments.length === 0 && (
                <tr>
                  <td className="table-empty" colSpan={3}>No payments yet.</td>
                </tr>
              )}
              {invoicePayments.map((payment) => (
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
