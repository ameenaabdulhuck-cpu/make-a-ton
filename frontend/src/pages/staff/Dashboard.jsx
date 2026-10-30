import { Link } from 'react-router-dom';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { formatDate, formatMoney, getInvoiceStatus, getOutstanding, getQuotationStatus } from '../../utils/billing';

export default function Dashboard() {
  const { user } = useAuth();
  const { quotations, subscriptions, invoices, customers, products, plans } = useData();

  const myQuotes = quotations
    .filter((quote) => quote.staffId === (user?.id || ""))
    .map((quote) => ({ ...quote, displayStatus: getQuotationStatus(quote) }));
  const mySubs = subscriptions.filter((sub) => sub.staffId === (user?.id || ""));
  const myInvoices = invoices.filter((invoice) => invoice.staffId === (user?.id || ""));
  const outstanding = myInvoices.reduce((sum, invoice) => sum + getOutstanding(invoice), 0);
  const count = (status) => myQuotes.filter((quote) => quote.displayStatus === status).length;
  const recent = [...myQuotes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  function customerName(id) {
    return customers.find((customer) => customer.id === id)?.businessName || '-';
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Welcome, {user.name.split(' ')[0]}</h1>
          <p>Your quotations, subscriptions and balances at a glance.</p>
        </div>
        <Link to="/staff/quotations/new" className="btn btn-primary">
          New quotation
        </Link>
      </div>

      <div className="stat-grid">
        <DashboardCard label="Pending quotations" value={count('Pending')} hint="Waiting for the customer" />
        <DashboardCard label="Accepted quotations" value={count('Accepted')} hint="Converted to subscriptions" />
        <DashboardCard label="Active subscriptions" value={mySubs.filter((sub) => sub.status === 'Active').length} hint="From your quotations" />
        <DashboardCard label="Outstanding balance" value={formatMoney(outstanding)} hint="Across your invoices" />
        <DashboardCard label="Customers" value={customers.length} hint="Available to quote" />
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Recent quotations</h2>
          <Link to="/staff/quotations" className="text-link">
            View all
          </Link>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quotation</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Valid until</th>
                <th className="num">Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td className="table-empty" colSpan={6}>
                    You have not created any quotations yet.
                  </td>
                </tr>
              )}
              {recent.map((quote) => (
                <tr key={quote.id}>
                  <td className="primary-cell">{quote.number}</td>
                  <td>{customerName(quote.customerId)}</td>
                  <td>{products.find((item) => item.id === quote.productId)?.name} · {plans.find((item) => item.id === quote.planId)?.name}</td>
                  <td>{formatDate(quote.validUntil)}</td>
                  <td className="num money">{formatMoney(quote.total)}</td>
                  <td>
                    <StatusBadge status={quote.displayStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Invoices needing attention</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Due</th>
                <th className="num">Outstanding</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {myInvoices.filter((invoice) => getOutstanding(invoice) > 0).length === 0 && (
                <tr>
                  <td className="table-empty" colSpan={5}>All invoices are settled.</td>
                </tr>
              )}
              {myInvoices
                .filter((invoice) => getOutstanding(invoice) > 0)
                .map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="primary-cell">{invoice.number}</td>
                    <td>{customerName(invoice.customerId)}</td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td className="num money">{formatMoney(getOutstanding(invoice))}</td>
                    <td>
                      <StatusBadge status={getInvoiceStatus(invoice)} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
