import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_BY_ROLE = {
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/products', label: 'Products & Plans' },
    { to: '/admin/staff', label: 'Staff' },
    { to: '/admin/customers', label: 'Customers' },
    { to: '/admin/quotations', label: 'Quotations & Subscriptions' },
    { to: '/admin/invoices', label: 'Invoices' },
    { to: '/admin/finance', label: 'Discounts & Taxes' },
  ],
  staff: [
    { to: '/staff/dashboard', label: 'Dashboard' },
    { to: '/staff/products', label: 'Products & Plans' },
    { to: '/staff/customers', label: 'Customers' },
    { to: '/staff/quotations', label: 'Quotations' },
    { to: '/staff/subscriptions', label: 'Subscriptions & Payments' },
  ],
  customer: [
    { to: '/customer/dashboard', label: 'Dashboard' },
    { to: '/customer/quotations', label: 'Quotations' },
    { to: '/customer/subscriptions', label: 'Subscriptions' },
    { to: '/customer/billing', label: 'Invoices & Profile' },
  ],
};

const ROLE_LABEL = { admin: 'Admin Console', staff: 'Staff Workspace', customer: 'Customer Portal' };

export default function Sidebar() {
  const { user } = useAuth();
  const links = NAV_BY_ROLE[user.role];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">B</span>
        BrightLoop
      </div>
      <div className="sidebar-role">{ROLE_LABEL[user.role]}</div>
      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
