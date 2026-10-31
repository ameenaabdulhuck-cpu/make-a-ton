import DashboardCard from '../../components/DashboardCard';
import InvoiceTable from '../../components/InvoiceTable';
import StatusBadge from '../../components/StatusBadge';
import { useData } from '../../context/DataContext';
import { formatMoney, getInvoiceStatus, getOutstanding, getQuotationStatus } from '../../utils/billing';

export default function Dashboard() {
  const { quotations, subscriptions, invoices, payments, customers, staff } = useData();

  const revenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const activeSubs = subscriptions.filter((sub) => sub.status === 'Active').length;
  const outstanding = invoices.reduce((sum, invoice) => sum + getOutstanding(invoice), 0);
  const overdueInvoices = invoices.filter((invoice) => getInvoiceStatus(invoice) === 'Overdue');
  const pendingQuotes = quotations.filter((quote) => getQuotationStatus(quote) === 'Pending').length;
  const recentQuotes = [...quotations]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  function customerName(id) {
    return customers.find((customer) => customer.id === id)?.businessName || '-';
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Admin dashboard</h1>
          <p>Revenue, subscriptions and payments across the business.</p>
        </div>
      </div>

      <div className="stat-grid">
        <DashboardCard label="Total revenue" value={formatMoney(revenue)} hint="All recorded payments" />
        <DashboardCard label="Active subscriptions" value={activeSubs} hint={`${subscriptions.length} in total`} />
        <DashboardCard label="Outstanding payments" value={formatMoney(outstanding)} hint="Unpaid invoice balances" />
        <DashboardCard label="Overdue invoices" value={overdueInvoices.length} hint="Past due and unpaid" />
        <DashboardCard label="Pending quotations" value={pendingQuotes} hint="Awaiting customer response" />
        <DashboardCard label="Team and customers" value={`${staff.length} / ${customers.length}`} hint="Staff / customers" />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h2>Recent quotations</h2>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Quote</th>
                  <th>Customer</th>
                  <th className="num">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentQuotes.map((quote) => (
                  <tr key={quote.id}>
                    <td className="primary-cell">{quote.number}</td>
                    <td>{customerName(quote.customerId)}</td>
                    <td className="num money">{formatMoney(quote.total)}</td>
                    <td>
                      <StatusBadge status={getQuotationStatus(quote)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Overdue invoices</h2>
            <span className="text-muted">Past due and unpaid</span>
          </div>
          <InvoiceTable invoices={overdueInvoices} showCustomer emptyText="No overdue invoices. Nice work." />
        </div>
      </div>
    </div>
  );
}
