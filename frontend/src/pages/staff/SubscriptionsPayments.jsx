import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import InvoiceTable from '../../components/InvoiceTable';
import Modal from '../../components/Modal';
import RecordPaymentForm from '../../components/RecordPaymentForm';
import StatusBadge from '../../components/StatusBadge';
import SubscriptionDetail from '../../components/SubscriptionDetail';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  formatDate,
  formatMoney,
  getOutstanding,
  getInvoiceStatus,
} from '../../utils/billing';
import { listingService } from '../../services/listingService';
import { paymentService } from '../../services/paymentService';

export default function SubscriptionsPayments() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('subscriptions');
  const [viewing, setViewing] = useState(null);
  const [paying, setPaying] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [subs, invs, custs, plns, prods] = await Promise.all([
        listingService.subscriptions().catch(() => []),
        listingService.invoices().catch(() => []),
        listingService.customers().catch(() => []),
        listingService.plans().catch(() => []),
        listingService.products().catch(() => []),
      ]);
      const pays = [];
      setSubscriptions(subs);
      setInvoices(invs);
      setPayments(pays);
      setCustomers(custs);
      setPlans(plns);
      setProducts(prods);
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
        <div className="text-muted">Loading subscriptions and payments…</div>
      </div>
    );
  }

  const mySubs = subscriptions.filter((sub) => sub.staffId === user.id);
  const myInvoices = invoices.filter((invoice) => invoice.staffId === user.id);
  const outstandingInvoices = myInvoices.filter((invoice) => getOutstanding(invoice) > 0);
  const myInvoiceIds = new Set(myInvoices.map((invoice) => invoice.id));
  const myPayments = payments
    .filter((payment) => myInvoiceIds.has(payment.invoiceId))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalOutstanding = outstandingInvoices.reduce(
    (sum, invoice) => sum + getOutstanding(invoice),
    0
  );

  const customerName = (id) => customers.find((item) => item.id === id)?.businessName || '-';
  const invoiceNumber = (id) => invoices.find((item) => item.id === id)?.number || '-';
  const planLabel = (sub) => {
    const plan = plans.find((item) => item.id === sub.planId);
    const product = products.find((item) => item.id === sub.productId);
    return `${product?.name || '-'} · ${plan?.name || '-'}`;
  };

  async function handleRecordPayment(data) {
    try {
      await paymentService.record({
        quotationId: data.quotationId || "",
        invoiceId: data.invoiceId,
        amount: data.amount,
        method: data.method,
        notes: `Payment for invoice ${data.invoiceId}`,
      });
      setPaying(null);
      await loadData();
    } catch (error) {
      alert(error.message || "Failed to record payment.");
    }
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Subscriptions & Payments</h1>
          <p>Subscriptions created from your accepted quotations, and the payments you have recorded.</p>
        </div>
        <div className="stat-inline">
          <span className="text-muted">Outstanding balance</span>
          <strong className="money">{formatMoney(totalOutstanding)}</strong>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="tabs" role="tablist">
            <button type="button" className={`tab ${tab === 'subscriptions' ? 'active' : ''}`} onClick={() => setTab('subscriptions')}>
              Subscriptions ({mySubs.length})
            </button>
            <button type="button" className={`tab ${tab === 'payments' ? 'active' : ''}`} onClick={() => setTab('payments')}>
              Invoices & payments
            </button>
          </div>
        </div>

        {tab === 'subscriptions' ? (
          <DataTable
            rowKey={(row) => row.id}
            rows={mySubs}
            onRowClick={(row) => setViewing({ type: 'subscription', item: row })}
            emptyText="No subscriptions yet. They appear once a customer accepts a quotation."
            columns={[
              { key: 'customer', label: 'Customer', primary: true, render: (row) => customerName(row.customerId) },
              { key: 'plan', label: 'Product & plan', render: planLabel },
              { key: 'next', label: 'Next billing', render: (row) => formatDate(row.nextBillingDate) },
              { key: 'amount', label: 'Amount', align: 'right', render: (row) => formatMoney(row.recurringAmount) },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            ]}
          />
        ) : (
          <div className="stack">
            <div>
              <h3 className="section-title">Outstanding invoices</h3>
              <InvoiceTable
                invoices={outstandingInvoices}
                showCustomer
                emptyText="No outstanding invoices."
                action={(invoice) => (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setPaying(invoice)}>
                    Record payment
                  </button>
                )}
              />
            </div>
            <div>
              <h3 className="section-title">Payment history</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice</th>
                      <th>Customer</th>
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
                        <td>{customerName(payment.customerId)}</td>
                        <td>{payment.method}</td>
                        <td className="num money">{formatMoney(payment.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {viewing?.type === 'subscription' && (
        <Modal title="Subscription details" wide onClose={() => setViewing(null)}>
          <SubscriptionDetail subscription={viewing.item} />
        </Modal>
      )}
      {paying && <RecordPaymentForm invoice={paying} onSave={handleRecordPayment} onClose={() => setPaying(null)} />}
    </div>
  );
}
