import { useState } from 'react';
import DataTable from '../../components/DataTable';
import PlanForm from '../../components/PlanForm';
import ProductForm from '../../components/ProductForm';
import StatusBadge from '../../components/StatusBadge';
import { useData } from '../../context/DataContext';
import { formatMoney } from '../../utils/billing';

export default function ProductsPlans() {
  const { products, plans, saveProduct, deleteProduct, isProductInUse, savePlan } = useData();
  const [tab, setTab] = useState('products');
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState(null);

  const term = search.trim().toLowerCase();
  const filteredProducts = products.filter((item) => item.name.toLowerCase().includes(term));
  const filteredPlans = plans.filter((item) => item.name.toLowerCase().includes(term));

  function productName(id) {
    return products.find((item) => item.id === id)?.name || '-';
  }

  function handleSaveProduct(data) {
    saveProduct(data);
    setEditor(null);
  }

  function handleSavePlan(data) {
    savePlan(data);
    setEditor(null);
  }

  function handleDeleteProduct(product) {
    if (window.confirm(`Delete "${product.name}" and its plans?`)) deleteProduct(product.id);
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Products & Plans</h1>
          <p>Manage what you sell, how it is priced and how it renews.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditor({ type: tab === 'products' ? 'product' : 'plan', item: null })}>
          {tab === 'products' ? 'Add product' : 'Create plan'}
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="tabs" role="tablist">
            <button type="button" className={`tab ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>
              Products ({products.length})
            </button>
            <button type="button" className={`tab ${tab === 'plans' ? 'active' : ''}`} onClick={() => setTab('plans')}>
              Subscription plans ({plans.length})
            </button>
          </div>
          <input className="input input-search" placeholder="Search by name" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>

        {tab === 'products' ? (
          <DataTable
            rowKey={(row) => row.id}
            rows={filteredProducts}
            emptyText="No products match your search."
            columns={[
              { key: 'name', label: 'Product', primary: true },
              { key: 'category', label: 'Category' },
              { key: 'variants', label: 'Variants', render: (row) => row.variants.map((variant) => variant.name).join(', ') || '-' },
              { key: 'plans', label: 'Plans', render: (row) => plans.filter((plan) => plan.productId === row.id).length },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
              {
                key: 'actions',
                label: '',
                render: (row) => (
                  <div className="table-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditor({ type: 'product', item: row })}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDeleteProduct(row)}
                      disabled={isProductInUse(row.id)}
                      title={isProductInUse(row.id) ? 'Used in quotations or subscriptions' : 'Delete product'}
                    >
                      Delete
                    </button>
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <DataTable
            rowKey={(row) => row.id}
            rows={filteredPlans}
            emptyText="No plans match your search."
            columns={[
              { key: 'name', label: 'Plan', primary: true },
              { key: 'product', label: 'Product', render: (row) => productName(row.productId) },
              { key: 'price', label: 'Price', align: 'right', render: (row) => formatMoney(row.price) },
              { key: 'frequency', label: 'Billing' },
              { key: 'renewal', label: 'Renewal', render: (row) => <StatusBadge status={row.renewal === 'Auto' ? 'Active' : 'Manual'} /> },
              { key: 'closure', label: 'Closure notice', render: (row) => `${row.closureNoticeDays} days` },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
              {
                key: 'actions',
                label: '',
                render: (row) => (
                  <div className="table-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditor({ type: 'plan', item: row })}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => savePlan({ ...row, status: row.status === 'Active' ? 'Inactive' : 'Active' })}
                    >
                      {row.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>

      {editor?.type === 'product' && (
        <ProductForm key={editor.item?.id || 'new'} product={editor.item} onSave={handleSaveProduct} onClose={() => setEditor(null)} />
      )}
      {editor?.type === 'plan' && (
        <PlanForm key={editor.item?.id || 'new'} plan={editor.item} products={products} onSave={handleSavePlan} onClose={() => setEditor(null)} />
      )}
    </div>
  );
}
