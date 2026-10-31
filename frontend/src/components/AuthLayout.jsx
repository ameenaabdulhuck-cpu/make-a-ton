import { Link } from 'react-router-dom';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <div className="auth-visual">
        <Link to="/login" className="auth-brand">
          <span className="brand-mark">B</span>
          BrightLoop
        </Link>
        <div className="auth-visual-copy">
          <h1>Subscriptions, quotations and billing in one place.</h1>
          <p>Turn customer requests into recurring revenue with clear quotes, automatic subscriptions and organised invoices.</p>
        </div>
      </div>
      <div className="auth-form-side">
        <div className="auth-card">
          <div className="auth-heading">
            <h2>{title}</h2>
            <p className="text-muted">{subtitle}</p>
          </div>
          {children}
          {footer && <div className="auth-footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
