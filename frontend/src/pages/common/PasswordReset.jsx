import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout';
import { useData } from '../../context/DataContext';
import { validateEmail, validatePassword } from '../../utils/validation';

export default function PasswordReset({ mode = 'forgot' }) {
  const { findAccount, updatePassword } = useData();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  function handleForgot(event) {
    event.preventDefault();
    const emailError = validateEmail(email);
    setErrors({ email: emailError });
    if (emailError) return;
    setSent(true);
  }

  function handleReset(event) {
    event.preventDefault();
    const nextErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: confirmPassword === password ? '' : 'Passwords do not match.',
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    if (!findAccount(email)) {
      setErrors({ email: 'No account was found for this email.' });
      return;
    }
    updatePassword(email, password);
    navigate('/login', { state: { message: 'Your password has been reset. Sign in with the new password.' } });
  }

  if (mode === 'forgot') {
    return (
      <AuthLayout
        title="Forgot password"
        subtitle="Enter the email linked to your account and we will send reset instructions."
        footer={<Link to="/login">Back to sign in</Link>}
      >
        {sent ? (
          <div className="auth-form">
            <div className="alert alert-success">
              If an account exists for {email.trim()}, reset instructions are on their way.
            </div>
            <Link to="/reset-password" className="btn btn-primary btn-block">
              I have a reset code
            </Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleForgot} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" className="input" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(errors.email)} />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              Send reset link
            </button>
          </form>
        )}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Choose a new password for your account."
      footer={<Link to="/login">Back to sign in</Link>}
    >
      <form className="auth-form" onSubmit={handleReset} noValidate>
        <div className="field">
          <label htmlFor="reset-email">Email</label>
          <input id="reset-email" type="email" className="input" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(errors.email)} />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>
        <div className="field">
          <label htmlFor="new-password">New password</label>
          <input id="new-password" type="password" className="input" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(errors.password)} />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>
        <div className="field">
          <label htmlFor="confirm-password">Confirm new password</label>
          <input id="confirm-password" type="password" className="input" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} aria-invalid={Boolean(errors.confirmPassword)} />
          {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
        </div>
        <button type="submit" className="btn btn-primary btn-block">
          Update password
        </button>
      </form>
    </AuthLayout>
  );
}
