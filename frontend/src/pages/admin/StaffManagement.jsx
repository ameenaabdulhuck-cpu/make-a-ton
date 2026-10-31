import { useState } from 'react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import { useData } from '../../context/DataContext';
import { validateEmail, validatePassword } from '../../utils/validation';

function StaffForm({ member, onSave, onClose, findAccount }) {
  const [form, setForm] = useState({
    name: member?.name || '',
    email: member?.email || '',
    password: '',
    phone: member?.phone || '',
    department: member?.department || '',
    maxDiscountPercent: member?.maxDiscountPercent ?? 10,
    status: member?.status || 'Active',
  });
  const [errors, setErrors] = useState({});

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Name is required.';
    nextErrors.email = validateEmail(form.email);
    const existing = findAccount(form.email);
    if (!nextErrors.email && existing && existing.record.id !== member?.id) {
      nextErrors.email = 'This email is already in use.';
    }
    if (!member) nextErrors.password = validatePassword(form.password);
    if (form.maxDiscountPercent === '' || Number(form.maxDiscountPercent) < 0 || Number(form.maxDiscountPercent) > 100) {
      nextErrors.maxDiscountPercent = 'Enter a limit between 0 and 100.';
    }
    const cleaned = Object.fromEntries(Object.entries(nextErrors).filter(([, message]) => message));
    setErrors(cleaned);
    if (Object.keys(cleaned).length > 0) return;

    onSave({
      ...(member ? { id: member.id } : { password: form.password }),
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      department: form.department.trim(),
      maxDiscountPercent: Number(form.maxDiscountPercent),
      status: form.status,
    });
  }

  return (
    <Modal
      title={member ? 'Edit staff member' : 'Add staff member'}
      onClose={onClose}
      footer={
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="staff-form" className="btn btn-primary">
            {member ? 'Save changes' : 'Add staff member'}
          </button>
        </div>
      }
    >
      <form id="staff-form" className="form-grid" onSubmit={handleSubmit} noValidate>
        <Field label="Full name" name="name" value={form.name} error={errors.name} onChange={(value) => updateField('name', value)} />
        <Field label="Work email" name="email" type="email" value={form.email} error={errors.email} onChange={(value) => updateField('email', value)} />
        {!member && (
          <Field label="Temporary password" name="password" type="password" value={form.password} error={errors.password} onChange={(value) => updateField('password', value)} />
        )}
        <Field label="Phone" name="phone" value={form.phone} onChange={(value) => updateField('phone', value)} />
        <Field label="Department" name="department" value={form.department} onChange={(value) => updateField('department', value)} />
        <Field
          label="Max discount (%)"
          name="maxDiscountPercent"
          type="number"
          value={form.maxDiscountPercent}
          error={errors.maxDiscountPercent}
          onChange={(value) => updateField('maxDiscountPercent', value)}
        />
        <div className="field">
          <label htmlFor="staff-status">Status</label>
          <select id="staff-status" className="select" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, name, type = 'text', value, error, onChange }) {
  return (
    <div className="field">
      <label htmlFor={`staff-${name}`}>{label}</label>
      <input id={`staff-${name}`} type={type} className="input" value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} />
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

export default function StaffManagement() {
  const { staff, saveStaff, findAccount } = useData();
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState(null);

  const term = search.trim().toLowerCase();
  const rows = staff.filter((member) => `${member.name} ${member.email} ${member.department}`.toLowerCase().includes(term));

  function handleSave(data) {
    saveStaff(data);
    setEditor(null);
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Staff</h1>
          <p>Create staff accounts and set how far each person can discount a quotation.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditor({ member: null })}>
          Add staff member
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>All staff ({staff.length})</h2>
          <input className="input input-search" placeholder="Search staff" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <DataTable
          rowKey={(row) => row.id}
          rows={rows}
          emptyText="No staff members match your search."
          columns={[
            { key: 'name', label: 'Name', primary: true },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'department', label: 'Department' },
            { key: 'maxDiscountPercent', label: 'Max discount', render: (row) => `${row.maxDiscountPercent}%` },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            {
              key: 'actions',
              label: '',
              render: (row) => (
                <div className="table-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditor({ member: row })}>
                    Edit
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {editor && (
        <StaffForm
          key={editor.member?.id || 'new'}
          member={editor.member}
          onSave={handleSave}
          onClose={() => setEditor(null)}
          findAccount={findAccount}
        />
      )}
    </div>
  );
}
