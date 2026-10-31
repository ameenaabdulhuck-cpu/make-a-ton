import { useState } from 'react';
import DataTable from '../../components/DataTable';
import DiscountForm from '../../components/DiscountForm';
import StatusBadge from '../../components/StatusBadge';
import TaxForm from '../../components/TaxForm';
import { useData } from '../../context/DataContext';
import { formatDate } from '../../utils/billing';

function discountStatus(discount) {
  if (discount.status !== 'Active') return 'Inactive';
  if (new Date(discount.validUntil) < new Date()) return 'Expired';
  if (discount.used >= discount.usageLimit) return 'Inactive';
  return 'Active';
}

export default function FinanceConfiguration() {
  const { discounts, taxes, saveDiscount, deleteDiscount, saveTax, deleteTax } = useData();
  const [tab, setTab] = useState('discounts');
  const [editor, setEditor] = useState(null);

  function handleSaveDiscount(data) {
    saveDiscount(data);
    setEditor(null);
  }

  function handleSaveTax(data) {
    saveTax(data);
    setEditor(null);
  }

  function handleDeleteDiscount(discount) {
    if (window.confirm(`Delete discount ${discount.code}?`)) deleteDiscount(discount.id);
  }

  function handleDeleteTax(tax) {
    if (window.confirm(`Delete tax rule "${tax.name}"?`)) deleteTax(tax.id);
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Discounts & Taxes</h1>
          <p>Define the discounts staff can offer and the tax rules applied to quotations.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditor({ type: tab === 'discounts' ? 'discount' : 'tax', item: null })}>
          {tab === 'discounts' ? 'Create discount' : 'Add tax rule'}
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="tabs" role="tablist">
            <button type="button" className={`tab ${tab === 'discounts' ? 'active' : ''}`} onClick={() => setTab('discounts')}>
              Discounts ({discounts.length})
            </button>
            <button type="button" className={`tab ${tab === 'taxes' ? 'active' : ''}`} onClick={() => setTab('taxes')}>
              Tax rules ({taxes.length})
            </button>
          </div>
          {tab === 'discounts' && <span className="text-muted">Staff discount ceilings are set per person on the Staff page.</span>}
        </div>

        {tab === 'discounts' ? (
          <DataTable
            rowKey={(row) => row.id}
            rows={discounts}
            emptyText="No discounts created yet."
            columns={[
              { key: 'code', label: 'Code', primary: true },
              { key: 'value', label: 'Value', render: (row) => (row.type === 'Percentage' ? `${row.value}%` : `$${row.value.toFixed(2)} off`) },
              { key: 'validUntil', label: 'Valid until', render: (row) => formatDate(row.validUntil) },
              { key: 'usage', label: 'Usage', render: (row) => `${row.used} / ${row.usageLimit}` },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={discountStatus(row)} /> },
              {
                key: 'actions',
                label: '',
                render: (row) => (
                  <div className="table-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditor({ type: 'discount', item: row })}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDeleteDiscount(row)}>
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
            rows={taxes}
            emptyText="No tax rules yet."
            columns={[
              { key: 'name', label: 'Tax rule', primary: true },
              { key: 'rate', label: 'Rate', render: (row) => `${row.rate}%` },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
              {
                key: 'actions',
                label: '',
                render: (row) => (
                  <div className="table-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditor({ type: 'tax', item: row })}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDeleteTax(row)}>
                      Delete
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>

      {editor?.type === 'discount' && (
        <DiscountForm
          key={editor.item?.id || 'new'}
          discount={editor.item}
          existingCodes={discounts.filter((item) => item.id !== editor.item?.id).map((item) => item.code)}
          onSave={handleSaveDiscount}
          onClose={() => setEditor(null)}
        />
      )}
      {editor?.type === 'tax' && <TaxForm key={editor.item?.id || 'new'} tax={editor.item} onSave={handleSaveTax} onClose={() => setEditor(null)} />}
    </div>
  );
}
