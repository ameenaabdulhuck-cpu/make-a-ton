import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout';
import { authService } from '../../services/authService';
import { validateEmail, validatePassword } from '../../utils/validation';

const BUSINESS_TYPES = ['Food & Beverage', 'Retail', 'Logistics', 'Design Agency', 'Fitness', 'Healthcare', 'Other'];

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  businessName: '',
  businessType: BUSINESS_TYPES[0],
  phone: '',
  address: '',
};

function validateRegistration(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Full name is required.';
  errors.email = validateEmail(form.email);
  errors.password = validatePassword(form.password);
  if (form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords do not match.';
  if (!form.businessName.trim()) errors.businessName = 'Business name is required.';
  if (!form.phone.trim()) errors.phone = 'Phone number is required.';
  if (!form.address.trim()) errors.address = 'Business address is required.';
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = validateRegistration(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    try {
      await authService.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        businessName: form.businessName.trim(),
        businessType: form.businessType,
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      navigate('/login', { state: { message: 'Account created. Sign in to view your quotations.' } });
    } catch (error) {
      setErrors({ email: error.message || 'Registration failed.' });
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Register your business to receive quotations from our team."
      footer={
        <>
          Already registered? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <Field label="Full name" name="name" value={form.name} error={errors.name} onChange={handleChange} />
          <Field label="Email" name="email" type="email" value={form.email} error={errors.email} onChange={handleChange} />
          <Field label="Password" name="password" type="password" value={form.password} error={errors.password} onChange={handleChange} />
          <Field label="Confirm password" name="confirmPassword" type="password" value={form.confirmPassword} error={errors.confirmPassword} onChange={handleChange} />
          <Field label="Business name" name="businessName" value={form.businessName} error={errors.businessName} onChange={handleChange} />
          <div className="field">
            <label htmlFor="businessType">Business type</label>
            <select id="businessType" name="businessType" className="select" value={form.businessType} onChange={handleChange}>
              {BUSINESS_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>
          <Field label="Phone" name="phone" value={form.phone} error={errors.phone} onChange={handleChange} />
          <Field label="Business address" name="address" value={form.address} error={errors.address} onChange={handleChange} />
        </div>
        <p className="text-muted">Password must be at least 8 characters and include a letter and a number.</p>
        <button type="submit" className="btn btn-primary btn-block">
          Create account
        </button>
      </form>
    </AuthLayout>
  );
}

function Field({ label, name, type = 'text', value, error, onChange }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} className="input" value={value} onChange={onChange} aria-invalid={Boolean(error)} />
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
