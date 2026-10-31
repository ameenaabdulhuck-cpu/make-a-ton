import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout';
import { DEMO_ACCOUNTS } from '../../data/seed';
import { ROLE_HOME, useAuth } from '../../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const successMessage = location.state?.message;

  function handleChange(event) {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError('Enter your email and password.');
      return;
    }
    const result = await login(form.email, form.password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(ROLE_HOME[result.role], { replace: true });
  }

  function fillDemo(account) {
    setForm({ email: account.email, password: account.password });
    setError('');
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Use your admin, staff or customer account to continue."
      footer={
        <>
          New customer? <Link to="/register">Create an account</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {successMessage && <div className="alert alert-success">{successMessage}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" value={form.email} onChange={handleChange} autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" className="input" value={form.password} onChange={handleChange} autoComplete="current-password" />
        </div>
        <div className="auth-row">
          <Link to="/forgot-password" className="text-link">Forgot password?</Link>
        </div>
        <button type="submit" className="btn btn-primary btn-block">
          Sign in
        </button>
      </form>
      <div className="demo-accounts">
        <span className="text-muted">Demo accounts</span>
        <div className="demo-buttons">
          {DEMO_ACCOUNTS.map((account) => (
            <button key={account.label} type="button" className="btn btn-secondary btn-sm" onClick={() => fillDemo(account)}>
              {account.label}
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}
