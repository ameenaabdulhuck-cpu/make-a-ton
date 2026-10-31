import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import InvoiceTable from '../../components/InvoiceTable';
import Modal from '../../components/Modal';
import PrintFooter from '../../components/PrintFooter';
import QuotationDetail from '../../components/QuotationDetail';
import StatusBadge from '../../components/StatusBadge';
import SubscriptionDetail from '../../components/SubscriptionDetail';
import { useData } from '../../context/DataContext';
import { formatDate, formatMoney, getQuotationStatus } from '../../utils/billing';

const TABS = [
  { id: 'quotations', label: 'Quotations' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'invoices', label: 'Invoices' },
];

export default function CustomerDetail() {
  const { customerId } = useParams();
  const { customers, quotations, subscriptions, invoices, plans, products } = useData();
  const [tab, setTab] = useState('quotations');
  const [viewing, setViewing] = useState(null);

  const customer = customers.find((item) => item.id === customerId);
  if (!customer) {
    return (
      <div className="card empty-state">
        <h2>Customer not found</h2>
        <Link to="/admin/customers">Back to customers</Link>
      </div>
    );
  }

  const customerQuotes = quotations.filter((quote) => quote.customerId === customer.id);
  const customerSubs = subscriptions.filter((sub) => sub.customerId === customer.id);
  const customerInvoices = invoices.filter((invoice) => invoice.customerId === customer.id);

  function planLabel(sub) {
    const plan = plans.find((item) => item.id === sub.planId);
    const product = products.find((item) => item.id === sub.productId);
    return `${product?.name || '-'} · ${plan?.name || '-'}`;
  }

  return (
    <div className="stack">
      <div>
        <Link to="/admin/customers" className="text-link">
          &larr; Back to customers
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1>{customer.businessName}</h1>
          <p>
            {customer.name} · {customer.email}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="detail-list">
          <div className="detail-item">
            <span>Business type</span>
            <strong>{customer.businessType}</strong>
          </div>
          <div className="detail-item">
            <span>Phone</span>
            <strong>{customer.phone}</strong>
          </div>
          <div className="detail-item">
            <span>Address</span>
            <strong>{customer.address}</strong>
          </div>
          <div className="detail-item">
            <span>Registered</span>
            <strong>{formatDate(customer.createdAt)}</strong>
          </div>
          <div className="detail-item">
            <span>Active subscriptions</span>
            <strong>{customerSubs.filter((sub) => sub.status === 'Active').length}</strong>
          </div>
        </div>
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

        {tab === 'quotations' && (
          <DataTable
            rowKey={(row) => row.id}
            rows={customerQuotes}
            onRowClick={(row) => setViewing({ type: 'quotation', item: row })}
            emptyText="No quotations for this customer yet."
            columns={[
              { key: 'number', label: 'Quotation', primary: true },
              { key: 'created', label: 'Created', render: (row) => formatDate(row.createdAt) },
              { key: 'validUntil', label: 'Valid until', render: (row) => formatDate(row.validUntil) },
              { key: 'total', label: 'Total', align: 'right', render: (row) => formatMoney(row.total) },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={getQuotationStatus(row)} /> },
            ]}
          />
        )}

        {tab === 'subscriptions' && (
          <DataTable
            rowKey={(row) => row.id}
            rows={customerSubs}
            onRowClick={(row) => setViewing({ type: 'subscription', item: row })}
            emptyText="No subscriptions yet."
            columns={[
              { key: 'plan', label: 'Product & plan', primary: true, render: planLabel },
              { key: 'start', label: 'Start', render: (row) => formatDate(row.startDate) },
              { key: 'next', label: 'Next billing', render: (row) => formatDate(row.nextBillingDate) },
              { key: 'amount', label: 'Amount', align: 'right', render: (row) => formatMoney(row.recurringAmount) },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            ]}
          />
        )}

        {tab === 'invoices' && <InvoiceTable invoices={customerInvoices} emptyText="No invoices issued yet." />}
      </div>

      {viewing?.type === 'quotation' && (
        <Modal title="Quotation details" wide onClose={() => setViewing(null)} footer={<PrintFooter />}>
          <QuotationDetail quotation={viewing.item} showCustomer={false} />
        </Modal>
      )}
      {viewing?.type === 'subscription' && (
        <Modal title="Subscription details" wide onClose={() => setViewing(null)}>
          <SubscriptionDetail subscription={viewing.item} />
        </Modal>
      )}
    </div>
  );
}
