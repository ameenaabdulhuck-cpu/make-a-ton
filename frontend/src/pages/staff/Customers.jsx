import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { useData } from '../../context/DataContext';
import { formatDate, formatMoney, getQuotationStatus } from '../../utils/billing';

export default function Customers() {
  const { customers, subscriptions, quotations, plans, products } = useData();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const term = search.trim().toLowerCase();
  const rows = customers.filter((customer) =>
    `${customer.name} ${customer.businessName} ${customer.email}`.toLowerCase().includes(term),
  );

  const selected = useMemo(() => customers.find((item) => item.id === selectedId) || null, [customers, selectedId]);
  const selectedSubs = selected ? subscriptions.filter((sub) => sub.customerId === selected.id) : [];
  const selectedQuotes = selected ? quotations.filter((quote) => quote.customerId === selected.id) : [];

  function planLabel(sub) {
    const plan = plans.find((item) => item.id === sub.planId);
    const product = products.find((item) => item.id === sub.productId);
    return `${product?.name || '-'} · ${plan?.name || '-'}`;
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p>Search for a customer, then select them to review or start a quotation.</p>
        </div>
      </div>

      <div className="split-layout">
        <div className="card">
          <div className="card-header">
            <h2>Customers ({customers.length})</h2>
            <input className="input input-search" placeholder="Search by name or business" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <DataTable
            rowKey={(row) => row.id}
            rows={rows}
            selectedKey={selectedId}
            onRowClick={(row) => setSelectedId(row.id)}
            emptyText="No customers match your search."
            columns={[
              { key: 'businessName', label: 'Business', primary: true },
              { key: 'name', label: 'Contact' },
              { key: 'businessType', label: 'Type' },
            ]}
          />
        </div>

        <div className="card customer-panel">
          {!selected && (
            <div className="empty-state">
              <h3>No customer selected</h3>
              <p>Select a customer from the list to see their details and subscriptions.</p>
            </div>
          )}
          {selected && (
            <>
              <div className="card-header">
                <div>
                  <h2>{selected.businessName}</h2>
                  <p className="text-muted">
                    {selected.name} · {selected.email}
                  </p>
                </div>
                <Link to={`/staff/quotations/new?customer=${selected.id}`} className="btn btn-primary btn-sm">
                  Create quotation
                </Link>
              </div>

              <div className="detail-list">
                <div className="detail-item">
                  <span>Phone</span>
                  <strong>{selected.phone}</strong>
                </div>
                <div className="detail-item">
                  <span>Address</span>
                  <strong>{selected.address}</strong>
                </div>
              </div>

              <div>
                <h3 className="section-title">Subscriptions</h3>
                {selectedSubs.length === 0 && <p className="text-muted">No subscriptions yet.</p>}
                {selectedSubs.map((sub) => (
                  <div key={sub.id} className="list-row">
                    <div>
                      <strong>{planLabel(sub)}</strong>
                      <div className="text-muted">
                        {formatMoney(sub.recurringAmount)} · next billing {formatDate(sub.nextBillingDate)}
                      </div>
                    </div>
                    <StatusBadge status={sub.status} />
                  </div>
                ))}
              </div>

              <div>
                <h3 className="section-title">Quotations</h3>
                {selectedQuotes.length === 0 && <p className="text-muted">No quotations sent yet.</p>}
                {selectedQuotes.map((quote) => (
                  <div key={quote.id} className="list-row">
                    <div>
                      <strong>{quote.number}</strong>
                      <div className="text-muted">
                        {formatMoney(quote.total)} · valid until {formatDate(quote.validUntil)}
                      </div>
                    </div>
                    <StatusBadge status={getQuotationStatus(quote)} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
