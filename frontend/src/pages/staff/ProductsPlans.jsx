import { useState } from 'react';
import DataTable from '../../components/DataTable';
import { useData } from '../../context/DataContext';
import { formatMoney } from '../../utils/billing';

export default function ProductsPlans() {
  const { products, plans } = useData();
  const [search, setSearch] = useState('');
  const term = search.trim().toLowerCase();

  const activeProducts = products.filter((product) => product.status === 'Active' && product.name.toLowerCase().includes(term));
  const activePlans = plans.filter((plan) => plan.status === 'Active');
  const productName = (id) => products.find((item) => item.id === id)?.name || '-';

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Products & Plans</h1>
          <p>Reference the products, variants and billing plans you can quote.</p>
        </div>
        <input className="input input-search" placeholder="Search products" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

      <div className="product-grid">
        {activeProducts.length === 0 && <div className="card empty-state">No products match your search.</div>}
        {activeProducts.map((product) => (
          <div key={product.id} className="card product-card">
            <div>
              <span className="text-muted">{product.category}</span>
              <h3>{product.name}</h3>
            </div>
            <p className="text-muted">{product.description}</p>
            <div className="chip-list">
              {product.variants.map((variant) => (
                <span key={variant.id} className="chip">
                  {variant.name}
                  {variant.extraPrice > 0 && ` +${formatMoney(variant.extraPrice)}`}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Subscription plans</h2>
        </div>
        <DataTable
          rowKey={(row) => row.id}
          rows={activePlans}
          emptyText="No active plans available."
          columns={[
            { key: 'name', label: 'Plan', primary: true },
            { key: 'product', label: 'Product', render: (row) => productName(row.productId) },
            { key: 'price', label: 'Price', align: 'right', render: (row) => formatMoney(row.price) },
            { key: 'frequency', label: 'Billing frequency' },
            { key: 'renewal', label: 'Renewal', render: (row) => (row.renewal === 'Auto' ? 'Automatic' : 'Manual') },
            { key: 'pausable', label: 'Pausable', render: (row) => (row.pausable ? 'Yes' : 'No') },
            { key: 'closure', label: 'Closure notice', render: (row) => `${row.closureNoticeDays} days` },
          ]}
        />
      </div>
    </div>
  );
}
