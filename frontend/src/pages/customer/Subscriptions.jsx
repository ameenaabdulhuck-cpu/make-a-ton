import { useCallback, useEffect, useState } from 'react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import SubscriptionDetail from '../../components/SubscriptionDetail';
import { useAuth } from '../../context/AuthContext';
import { listingService } from '../../services/listingService';
import { formatDate, formatMoney } from '../../utils/billing';

export default function Subscriptions() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [subs, prods, plns] = await Promise.all([
        listingService.subscriptions().catch(() => []),
        listingService.products().catch(() => []),
        listingService.plans().catch(() => []),
      ]);
      setSubscriptions(subs);
      setProducts(prods);
      setPlans(plns);
    } catch (error) {
      console.error("Failed to load subscriptions:", error);
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
        <div className="text-muted">Loading subscriptions…</div>
      </div>
    );
  }

  const mySubs = subscriptions.filter((sub) => sub.customerId === user.id);
  const planLabel = (sub) => {
    const plan = plans.find((item) => item.id === sub.planId);
    const product = products.find((item) => item.id === sub.productId);
    return `${product?.name || '-'} · ${plan?.name || '-'}`;
  };

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Subscriptions</h1>
          <p>Everything you currently subscribe to, with renewal and billing dates.</p>
        </div>
      </div>

      <div className="card">
        <DataTable
          rowKey={(row) => row.id}
          rows={mySubs}
          onRowClick={setViewing}
          emptyText="No subscriptions yet. Accept a quotation to start one."
          columns={[
            { key: 'plan', label: 'Product & plan', primary: true, render: planLabel },
            { key: 'qty', label: 'Qty', render: (row) => row.quantity },
            { key: 'billing', label: 'Billing', render: (row) => `${formatMoney(row.recurringAmount)} / ${plans.find((item) => item.id === row.planId)?.frequency.toLowerCase()}` },
            { key: 'start', label: 'Start', render: (row) => formatDate(row.startDate) },
            { key: 'expiry', label: 'Expiry', render: (row) => formatDate(row.expiryDate) },
            { key: 'next', label: 'Next billing', render: (row) => formatDate(row.nextBillingDate) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
          ]}
        />
      </div>

      {viewing && (
        <Modal title="Subscription details" wide onClose={() => setViewing(null)}>
          <SubscriptionDetail subscription={viewing} />
        </Modal>
      )}
    </div>
  );
}
