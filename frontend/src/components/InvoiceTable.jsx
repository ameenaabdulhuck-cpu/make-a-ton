import { useData } from '../context/DataContext';
import { formatDate, formatMoney, getInvoiceStatus, getOutstanding } from '../utils/billing';
import StatusBadge from './StatusBadge';

export default function InvoiceTable({ invoices, showCustomer = false, onRowClick, action, emptyText }) {
  const { customers, subscriptions, plans } = useData();

  function customerName(id) {
    return customers.find((customer) => customer.id === id)?.businessName || '-';
  }

  function planName(subscriptionId) {
    const sub = subscriptions.find((item) => item.id === subscriptionId);
    return plans.find((plan) => plan.id === sub?.planId)?.name || '-';
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Invoice</th>
            {showCustomer && <th>Customer</th>}
            <th>Plan</th>
            <th>Due</th>
            <th className="num">Amount</th>
            <th className="num">Outstanding</th>
            <th>Status</th>
            {action && <th />}
          </tr>
        </thead>
        <tbody>
          {invoices.length === 0 && (
            <tr>
              <td className="table-empty" colSpan={showCustomer ? (action ? 8 : 7) : action ? 7 : 6}>
                {emptyText || 'No invoices found.'}
              </td>
            </tr>
          )}
          {invoices.map((invoice) => (
            <tr key={invoice.id} className={onRowClick ? 'clickable' : ''} onClick={onRowClick ? () => onRowClick(invoice) : undefined}>
              <td className="primary-cell">{invoice.number}</td>
              {showCustomer && <td>{customerName(invoice.customerId)}</td>}
              <td>{planName(invoice.subscriptionId)}</td>
              <td>{formatDate(invoice.dueDate)}</td>
              <td className="num money">{formatMoney(invoice.amount)}</td>
              <td className="num money">{formatMoney(getOutstanding(invoice))}</td>
              <td>
                <StatusBadge status={getInvoiceStatus(invoice)} />
              </td>
              {action && (
                <td>
                  <div className="table-actions">{action(invoice)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
