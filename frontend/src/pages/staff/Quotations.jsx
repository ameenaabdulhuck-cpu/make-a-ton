import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import PrintFooter from '../../components/PrintFooter';
import QuotationDetail from '../../components/QuotationDetail';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { formatDate, formatMoney, getQuotationStatus } from '../../utils/billing';

const FILTERS = ['All', 'Pending', 'Accepted', 'Rejected', 'Expired'];

export default function Quotations() {
  const { user } = useAuth();
  const { quotations, customers, products, plans } = useData();
  const location = useLocation();
  const [filter, setFilter] = useState('All');
  const [viewing, setViewing] = useState(null);
  const [message, setMessage] = useState(location.state?.message || '');

  const mine = quotations
    .filter((quote) => quote.staffId === user.id)
    .map((quote) => ({ ...quote, displayStatus: getQuotationStatus(quote) }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const rows = filter === 'All' ? mine : mine.filter((quote) => quote.displayStatus === filter);

  const customerName = (id) => customers.find((item) => item.id === id)?.businessName || '-';
  const productPlan = (quote) =>
    `${products.find((item) => item.id === quote.productId)?.name || '-'} · ${plans.find((item) => item.id === quote.planId)?.name || '-'}`;

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Quotations</h1>
          <p>Quotations you have created and how each one is progressing.</p>
        </div>
        <Link to="/staff/quotations/new" className="btn btn-primary">
          New quotation
        </Link>
      </div>

      {message && (
        <div className="alert alert-success banner">
          {message}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMessage('')}>
            Dismiss
          </button>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="tabs" role="tablist">
            {FILTERS.map((item) => (
              <button key={item} type="button" className={`tab ${filter === item ? 'active' : ''}`} onClick={() => setFilter(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>
        <DataTable
          rowKey={(row) => row.id}
          rows={rows}
          onRowClick={(row) => setViewing(row)}
          emptyText="No quotations in this status."
          columns={[
            { key: 'number', label: 'Quotation', primary: true },
            { key: 'customer', label: 'Customer', render: (row) => customerName(row.customerId) },
            { key: 'plan', label: 'Product & plan', render: productPlan },
            { key: 'validUntil', label: 'Valid until', render: (row) => formatDate(row.validUntil) },
            { key: 'total', label: 'Total', align: 'right', render: (row) => formatMoney(row.total) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.displayStatus} /> },
          ]}
        />
      </div>

      {viewing && (
        <Modal title="Quotation details" wide onClose={() => setViewing(null)} footer={<PrintFooter />}>
          <QuotationDetail quotation={viewing} />
        </Modal>
      )}
    </div>
  );
}
