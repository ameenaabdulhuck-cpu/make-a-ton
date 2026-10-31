import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import { useData } from '../../context/DataContext';
import { formatDate } from '../../utils/billing';

export default function CustomerManagement() {
  const { customers, subscriptions } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const term = search.trim().toLowerCase();
  const rows = customers.filter((customer) =>
    `${customer.name} ${customer.businessName} ${customer.email} ${customer.businessType}`.toLowerCase().includes(term),
  );

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p>Every registered customer, with their subscriptions and billing history.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>All customers ({customers.length})</h2>
          <input className="input input-search" placeholder="Search name, business or email" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <DataTable
          rowKey={(row) => row.id}
          rows={rows}
          onRowClick={(row) => navigate(`/admin/customers/${row.id}`)}
          emptyText="No customers match your search."
          columns={[
            { key: 'businessName', label: 'Business', primary: true },
            { key: 'name', label: 'Contact' },
            { key: 'email', label: 'Email' },
            { key: 'businessType', label: 'Type' },
            { key: 'createdAt', label: 'Registered', render: (row) => formatDate(row.createdAt) },
            {
              key: 'subs',
              label: 'Active subscriptions',
              render: (row) => subscriptions.filter((sub) => sub.customerId === row.id && sub.status === 'Active').length,
            },
          ]}
        />
      </div>
    </div>
  );
}
