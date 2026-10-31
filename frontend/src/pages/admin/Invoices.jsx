import { useState } from 'react';
import InvoiceDetail from '../../components/InvoiceDetail';
import InvoiceTable from '../../components/InvoiceTable';
import Modal from '../../components/Modal';
import PrintFooter from '../../components/PrintFooter';
import { useData } from '../../context/DataContext';
import { getInvoiceStatus } from '../../utils/billing';

const FILTERS = ['All', 'Unpaid', 'Partially Paid', 'Paid', 'Overdue'];

export default function Invoices() {
  const { invoices } = useData();
  const [filter, setFilter] = useState('All');
  const [viewing, setViewing] = useState(null);

  const rows = invoices.filter((invoice) => filter === 'All' || getInvoiceStatus(invoice) === filter);

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Invoices</h1>
          <p>Every invoice issued across customers, with its payment status.</p>
        </div>
      </div>

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
        <InvoiceTable invoices={rows} showCustomer onRowClick={(row) => setViewing(row)} emptyText="No invoices in this status." />
      </div>

      {viewing && (
        <Modal
          title="Invoice details"
          wide
          onClose={() => setViewing(null)}
          footer={<PrintFooter />}
        >
          <InvoiceDetail invoice={viewing} />
        </Modal>
      )}
    </div>
  );
}
