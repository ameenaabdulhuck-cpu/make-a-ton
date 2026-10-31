import { useState } from 'react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import SubscriptionDetail from '../../components/SubscriptionDetail';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { formatDate, formatMoney } from '../../utils/billing';

export default function Subscriptions() {
  const { user } = useAuth();
  const { subscriptions, plans, products } = useData();
  const [viewing, setViewing] = useState(null);

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
