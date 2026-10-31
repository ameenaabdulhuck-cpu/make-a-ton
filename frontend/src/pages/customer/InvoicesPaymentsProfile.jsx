import { useCallback, useEffect, useState } from 'react';
import InvoiceDetail from '../../components/InvoiceDetail';
import InvoiceTable from '../../components/InvoiceTable';
import Modal from '../../components/Modal';
import PrintFooter from '../../components/PrintFooter';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { listingService } from '../../services/listingService';
import { formatDate, formatMoney, getOutstanding } from '../../utils/billing';
import { validatePassword } from '../../utils/validation';

const TABS = [
  { id: 'invoices', label: 'Invoices' },
  { id: 'payments', label: 'Payment history' },
  { id: 'profile', label: 'Profile' },
];

export default function InvoicesPaymentsProfile() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('invoices');
  const [viewing, setViewing] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invs, pays, subs, plns, prods, custs] = await Promise.all([
        listingService.invoices().catch(() => []),
        listingService.payments ? listingService.payments().catch(() => []) : [],
        listingService.subscriptions().catch(() => []),
        listingService.plans().catch(() => []),
        listingService.products().catch(() => []),
        listingService.customers().catch(() => []),
      ]);
      setInvoices(invs);
      setPayments(pays);
      setSubscriptions(subs);
      setPlans(plns);
      setProducts(prods);
      setCustomers(custs);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="stack" style={{ padding: "40px", textAlign: "center" }}>
        <div className="text-muted">Loading invoices and payments…</div>
      </div>
    );
  }

  const myInvoices = invoices.filter((invoice) => invoice.customerId === user.id);
  const myInvoiceIds = new Set(myInvoices.map((invoice) => invoice.id));
  const myPayments = payments
    .filter((payment) => myInvoiceIds.has(payment.invoiceId))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const outstanding = myInvoices.reduce((sum, invoice) => sum + getOutstanding(invoice), 0);
  const invoiceNumber = (id) => invoices.find((invoice) => invoice.id === id)?.number || '-';
  const subscriptionLabel = (id) => {
    const sub = subscriptions.find((item) => item.id === id);
    const plan = plans.find((item) => item.id === sub?.planId);
    const product = products.find((item) => item.id === sub?.productId);
    return `${product?.name || '-'} · ${plan?.name || '-'}`;
  };

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Invoices, payments & profile</h1>
          <p>Your billing history and personal account details.</p>
        </div>
        {tab !== 'profile' && (
          <div className="stat-inline">
            <span className="text-muted">Outstanding balance</span>
            <strong className="money">{formatMoney(outstanding)}</strong>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="tabs" role="tablist">
            {TABS.map((item) => (
              <button key={item.id} type="button" className={`tab ${tab === item.id ? 'active' : ''}`} onClick={() => setTab(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'invoices' && (
          <InvoiceTable invoices={myInvoices} onRowClick={setViewing} emptyText="No invoices issued yet." />
        )}

        {tab === 'payments' && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice</th>
                  <th>Subscription</th>
                  <th>Method</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {myPayments.length === 0 && (
                  <tr>
                    <td className="table-empty" colSpan={5}>No payments recorded yet.</td>
                  </tr>
                )}
                {myPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.date)}</td>
                    <td className="primary-cell">{invoiceNumber(payment.invoiceId)}</td>
                    <td>{subscriptionLabel(payment.subscriptionId)}</td>
                    <td>{payment.method}</td>
                    <td className="num money">{formatMoney(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'profile' && <ProfilePanel user={user} />}
      </div>

      {viewing && (
        <Modal title="Invoice details" wide onClose={() => setViewing(null)} footer={<PrintFooter />}>
          <InvoiceDetail invoice={viewing} showCustomer={false} />
        </Modal>
      )}
    </div>
  );
}

function ProfilePanel({ user }) {
  const { updateCustomer } = useData();
  const [details, setDetails] = useState({
    name: user.name,
    businessName: user.businessName,
    businessType: user.businessType,
    phone: user.phone,
    address: user.address,
  });
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});

  function handleDetailsSubmit(event) {
    event.preventDefault();
    if (!details.name.trim() || !details.businessName.trim() || !details.phone.trim() || !details.address.trim()) {
      setDetailsSaved(false);
      setDetailsError('Name, business name, phone and address are required.');
      return;
    }
    setDetailsError('');
    updateCustomer(user.id, {
      name: details.name.trim(),
      businessName: details.businessName.trim(),
      businessType: details.businessType.trim(),
      phone: details.phone.trim(),
      address: details.address.trim(),
    });
    setDetailsSaved(true);
  }

  function handlePasswordSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (passwords.current !== user.password) nextErrors.current = 'Current password is incorrect.';
    nextErrors.next = validatePassword(passwords.next);
    if (passwords.confirm !== passwords.next) nextErrors.confirm = 'Passwords do not match.';
    const cleaned = Object.fromEntries(Object.entries(nextErrors).filter(([, message]) => message));
    setPasswordErrors(cleaned);
    if (Object.keys(cleaned).length > 0) return;

    updateCustomer(user.id, { password: passwords.next });
    setPasswords({ current: '', next: '', confirm: '' });
    setPasswordMessage('Your password has been changed.');
  }

  return (
    <div className="grid-2 profile-grid">
      <form className="stack" onSubmit={handleDetailsSubmit} noValidate>
        <h2>Personal and business details</h2>
        {detailsError && <div className="alert alert-error">{detailsError}</div>}
        {detailsSaved && <div className="alert alert-success">Your details have been saved.</div>}
        <div className="field">
          <label htmlFor="profile-name">Full name</label>
          <input id="profile-name" className="input" value={details.name} onChange={(event) => setDetails((prev) => ({ ...prev, name: event.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor="profile-email">Email</label>
          <input id="profile-email" className="input" value={user.email} disabled />
        </div>
        <div className="field">
          <label htmlFor="profile-business">Business name</label>
          <input id="profile-business" className="input" value={details.businessName} onChange={(event) => setDetails((prev) => ({ ...prev, businessName: event.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor="profile-type">Business type</label>
          <input id="profile-type" className="input" value={details.businessType} onChange={(event) => setDetails((prev) => ({ ...prev, businessType: event.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor="profile-phone">Phone</label>
          <input id="profile-phone" className="input" value={details.phone} onChange={(event) => setDetails((prev) => ({ ...prev, phone: event.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor="profile-address">Business address</label>
          <textarea id="profile-address" className="textarea" value={details.address} onChange={(event) => setDetails((prev) => ({ ...prev, address: event.target.value }))} />
        </div>
        <div>
          <button type="submit" className="btn btn-primary">
            Save details
          </button>
        </div>
      </form>

      <form className="stack" onSubmit={handlePasswordSubmit} noValidate>
        <h2>Change password</h2>
        {passwordMessage && <div className="alert alert-success">{passwordMessage}</div>}
        <PasswordField id="current-pass" label="Current password" value={passwords.current} error={passwordErrors.current} onChange={(value) => setPasswords((prev) => ({ ...prev, current: value }))} />
        <PasswordField id="next-pass" label="New password" value={passwords.next} error={passwordErrors.next} onChange={(value) => setPasswords((prev) => ({ ...prev, next: value }))} />
        <PasswordField id="confirm-pass" label="Confirm new password" value={passwords.confirm} error={passwordErrors.confirm} onChange={(value) => setPasswords((prev) => ({ ...prev, confirm: value }))} />
        <div>
          <button type="submit" className="btn btn-primary">
            Update password
          </button>
        </div>
      </form>
    </div>
  );
}

function PasswordField({ id, label, value, error, onChange }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="password" className="input" value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} />
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
