import { useCallback, useEffect, useState } from 'react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import QuotationDetail from '../../components/QuotationDetail';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { quotationService } from '../../services/quotationService';
import { listingService } from '../../services/listingService';
import { formatDate, formatMoney, getQuotationStatus } from '../../utils/billing';

const FILTERS = ['All', 'Pending', 'Accepted', 'Rejected', 'Expired'];

export default function Quotations() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState([]);
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [viewingId, setViewingId] = useState(null);
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [qList, prods, plns] = await Promise.all([
        quotationService.list().catch(() => []),
        listingService.products().catch(() => []),
        listingService.plans().catch(() => []),
      ]);
      setQuotations(qList);
      setProducts(prods);
      setPlans(plns);
    } catch (error) {
      console.error("Failed to load quotations:", error);
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
        <div className="text-muted">Loading quotations…</div>
      </div>
    );
  }

  const mine = quotations
    .filter((quote) => quote.customerId === user.id)
    .map((quote) => ({ ...quote, displayStatus: getQuotationStatus(quote) }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const rows = filter === 'All' ? mine : mine.filter((quote) => quote.displayStatus === filter);
  const viewing = mine.find((quote) => quote.id === viewingId) || null;

  const productPlan = (quote) =>
    `${products.find((item) => item.id === quote.productId)?.name || '-'} · ${plans.find((item) => item.id === quote.planId)?.name || '-'}`;

  async function handleDecision(quote, decision) {
    if (decision === 'Rejected' && !window.confirm(`Reject quotation ${quote.number}?`)) return;
    try {
      await quotationService.respond(quote.id, decision);
      setNotice(
        decision === 'Accepted'
          ? `Quotation ${quote.number} accepted. Your subscription is now active under Subscriptions.`
          : `Quotation ${quote.number} was rejected.`,
      );
      setViewingId(null);
      await loadData();
    } catch (error) {
      alert(error.message || 'Failed to respond to quotation.');
    }
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Quotations</h1>
          <p>Review the quotations your account manager has sent you.</p>
        </div>
      </div>

      {notice && (
        <div className="alert alert-success banner">
          {notice}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNotice('')}>
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
          onRowClick={(row) => setViewingId(row.id)}
          emptyText="No quotations in this status."
          columns={[
            { key: 'number', label: 'Quotation', primary: true },
            { key: 'plan', label: 'Product & plan', render: productPlan },
            { key: 'quantity', label: 'Qty' },
            { key: 'validUntil', label: 'Valid until', render: (row) => formatDate(row.validUntil) },
            { key: 'total', label: 'Total', align: 'right', render: (row) => formatMoney(row.total) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.displayStatus} /> },
          ]}
        />
      </div>

      {viewing && (
        <Modal
          title="Quotation details"
          wide
          onClose={() => setViewingId(null)}
          footer={
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
                Download PDF
              </button>
              {viewing.displayStatus === 'Pending' && (
                <>
                  <button type="button" className="btn btn-secondary" onClick={() => handleDecision(viewing, 'Rejected')}>
                    Reject
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => handleDecision(viewing, 'Accepted')}>
                    Accept quotation
                  </button>
                </>
              )}
            </div>
          }
        >
          <QuotationDetail quotation={viewing} showCustomer={false} />
        </Modal>
      )}
    </div>
  );
}
