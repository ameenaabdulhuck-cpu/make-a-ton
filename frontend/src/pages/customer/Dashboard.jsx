import { Link } from 'react-router-dom';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { formatDate, formatMoney, getOutstanding, getQuotationStatus } from '../../utils/billing';

export default function Dashboard() {
  const { user } = useAuth();
  const { quotations, subscriptions, invoices, products, plans } = useData();

  const myQuotes = quotations.filter((quote) => quote.customerId === user.id);
  const awaiting = myQuotes.filter((quote) => getQuotationStatus(quote) === 'Pending');
  const mySubs = subscriptions.filter((sub) => sub.customerId === user.id);
  const activeSubs = mySubs.filter((sub) => sub.status === 'Active');
  const myInvoices = invoices.filter((invoice) => invoice.customerId === user.id);
  const outstanding = myInvoices.reduce((sum, invoice) => sum + getOutstanding(invoice), 0);
  const nextBilling = activeSubs
    .map((sub) => sub.nextBillingDate)
    .sort((a, b) => new Date(a) - new Date(b))[0];

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Welcome, {user.name.split(' ')[0]}</h1>
          <p>Your quotations, subscriptions and billing for {user.businessName}.</p>
        </div>
      </div>

      <div className="stat-grid">
        <DashboardCard label="Quotations to review" value={awaiting.length} hint="Waiting for your decision" />
        <DashboardCard label="Active subscriptions" value={activeSubs.length} hint={nextBilling ? `Next billing ${formatDate(nextBilling)}` : 'None active'} />
        <DashboardCard label="Outstanding balance" value={formatMoney(outstanding)} hint="Unpaid invoices" />
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Quotations awaiting your response</h2>
          <Link to="/customer/quotations" className="text-link">
            View quotations
          </Link>
        </div>
        {awaiting.length === 0 && <p className="text-muted">You have no quotations waiting for a response.</p>}
        {awaiting.map((quote) => (
          <div key={quote.id} className="list-row">
            <div>
              <strong>
                {quote.number} · {products.find((item) => item.id === quote.productId)?.name}
              </strong>
              <div className="text-muted">
                {plans.find((item) => item.id === quote.planId)?.name} · {formatMoney(quote.total)} · valid until {formatDate(quote.validUntil)}
              </div>
            </div>
            <StatusBadge status="Pending" />
          </div>
        ))}
      </div>
    </div>
  );
}
