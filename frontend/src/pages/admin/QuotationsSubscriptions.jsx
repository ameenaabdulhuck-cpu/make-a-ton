import { useState } from 'react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import PrintFooter from '../../components/PrintFooter';
import QuotationDetail from '../../components/QuotationDetail';
import StatusBadge from '../../components/StatusBadge';
import SubscriptionDetail from '../../components/SubscriptionDetail';
import { useData } from '../../context/DataContext';
import { formatDate, formatMoney, getQuotationStatus } from '../../utils/billing';

const QUOTE_FILTERS = ['All', 'Pending', 'Accepted', 'Rejected', 'Expired'];

export default function QuotationsSubscriptions() {
  const { quotations, subscriptions, customers, staff, products, plans } = useData();
  const [tab, setTab] = useState('quotations');
  const [filter, setFilter] = useState('All');
  const [viewing, setViewing] = useState(null);

  const quotesWithStatus = quotations.map((quote) => ({ ...quote, displayStatus: getQuotationStatus(quote) }));
  const filteredQuotes = filter === 'All' ? quotesWithStatus : quotesWithStatus.filter((quote) => quote.displayStatus === filter);

  const customerName = (id) => customers.find((item) => item.id === id)?.businessName || '-';
  const staffName = (id) => staff.find((item) => item.id === id)?.name || '-';
  const productPlan = (productId, planId) =>
    `${products.find((item) => item.id === productId)?.name || '-'} · ${plans.find((item) => item.id === planId)?.name || '-'}`;

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Quotations & Subscriptions</h1>
          <p>Track every quotation sent by staff and the subscriptions that followed acceptance.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="tabs" role="tablist">
            <button type="button" className={`tab ${tab === 'quotations' ? 'active' : ''}`} onClick={() => setTab('quotations')}>
              Quotations ({quotations.length})
            </button>
            <button type="button" className={`tab ${tab === 'subscriptions' ? 'active' : ''}`} onClick={() => setTab('subscriptions')}>
              Subscriptions ({subscriptions.length})
            </button>
          </div>
          {tab === 'quotations' && (
            <div className="tabs" role="tablist">
              {QUOTE_FILTERS.map((item) => (
                <button key={item} type="button" className={`tab ${filter === item ? 'active' : ''}`} onClick={() => setFilter(item)}>
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        {tab === 'quotations' ? (
          <DataTable
            rowKey={(row) => row.id}
            rows={filteredQuotes}
            onRowClick={(row) => setViewing({ type: 'quotation', item: row })}
            emptyText="No quotations in this status."
            columns={[
              { key: 'number', label: 'Quotation', primary: true },
              { key: 'customer', label: 'Customer', render: (row) => customerName(row.customerId) },
              { key: 'staff', label: 'Staff', render: (row) => staffName(row.staffId) },
              { key: 'plan', label: 'Product & plan', render: (row) => productPlan(row.productId, row.planId) },
              { key: 'validUntil', label: 'Valid until', render: (row) => formatDate(row.validUntil) },
              { key: 'total', label: 'Total', align: 'right', render: (row) => formatMoney(row.total) },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.displayStatus} /> },
            ]}
          />
        ) : (
          <DataTable
            rowKey={(row) => row.id}
            rows={subscriptions}
            onRowClick={(row) => setViewing({ type: 'subscription', item: row })}
            emptyText="No subscriptions yet. Accepted quotations create them automatically."
            columns={[
              { key: 'customer', label: 'Customer', primary: true, render: (row) => customerName(row.customerId) },
              { key: 'plan', label: 'Product & plan', render: (row) => productPlan(row.productId, row.planId) },
              { key: 'start', label: 'Start', render: (row) => formatDate(row.startDate) },
              { key: 'expiry', label: 'Expiry', render: (row) => formatDate(row.expiryDate) },
              { key: 'amount', label: 'Amount', align: 'right', render: (row) => formatMoney(row.recurringAmount) },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            ]}
          />
        )}
      </div>

      {viewing?.type === 'quotation' && (
        <Modal title="Quotation details" wide onClose={() => setViewing(null)} footer={<PrintFooter />}>
          <QuotationDetail quotation={viewing.item} />
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
