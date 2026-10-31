import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { ROLE_HOME, useAuth } from './context/AuthContext';
import Login from './pages/common/Login';
import Register from './pages/common/Register';
import PasswordReset from './pages/common/PasswordReset';
import AdminDashboard from './pages/admin/Dashboard';
import AdminProductsPlans from './pages/admin/ProductsPlans';
import StaffManagement from './pages/admin/StaffManagement';
import CustomerManagement from './pages/admin/CustomerManagement';
import CustomerDetail from './pages/admin/CustomerDetail';
import QuotationsSubscriptions from './pages/admin/QuotationsSubscriptions';
import AdminInvoices from './pages/admin/Invoices';
import FinanceConfiguration from './pages/admin/FinanceConfiguration';
import StaffDashboard from './pages/staff/Dashboard';
import StaffProductsPlans from './pages/staff/ProductsPlans';
import StaffCustomers from './pages/staff/Customers';
import StaffQuotations from './pages/staff/Quotations';
import NewQuotation from './pages/staff/NewQuotation';
import SubscriptionsPayments from './pages/staff/SubscriptionsPayments';
import CustomerDashboard from './pages/customer/Dashboard';
import CustomerQuotations from './pages/customer/Quotations';
import CustomerSubscriptions from './pages/customer/Subscriptions';
import InvoicesPaymentsProfile from './pages/customer/InvoicesPaymentsProfile';

export default function App() {
  const { user, isReady } = useAuth();

  // Show a lightweight shell while auth state is being restored from storage.
  if (!isReady) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--neutral-50)" }}>
        <div style={{ textAlign: "center", color: "var(--neutral-500)" }}>
          <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--neutral-900)", marginBottom: "0.5rem" }}>
            BrightLoop
          </div>
          <div style={{ fontSize: "0.875rem" }}>Signing you in…</div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? ROLE_HOME[user.role] : '/login'} replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<PasswordReset mode="forgot" />} />
      <Route path="/reset-password" element={<PasswordReset mode="reset" />} />

      <Route path="/admin" element={<AppLayout role="admin" />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="products" element={<AdminProductsPlans />} />
        <Route path="staff" element={<StaffManagement />} />
        <Route path="customers" element={<CustomerManagement />} />
        <Route path="customers/:customerId" element={<CustomerDetail />} />
        <Route path="quotations" element={<QuotationsSubscriptions />} />
        <Route path="invoices" element={<AdminInvoices />} />
        <Route path="finance" element={<FinanceConfiguration />} />
      </Route>

      <Route path="/staff" element={<AppLayout role="staff" />}>
        <Route path="dashboard" element={<StaffDashboard />} />
        <Route path="products" element={<StaffProductsPlans />} />
        <Route path="customers" element={<StaffCustomers />} />
        <Route path="quotations" element={<StaffQuotations />} />
        <Route path="quotations/new" element={<NewQuotation />} />
        <Route path="subscriptions" element={<SubscriptionsPayments />} />
      </Route>

      <Route path="/customer" element={<AppLayout role="customer" />}>
        <Route path="dashboard" element={<CustomerDashboard />} />
        <Route path="quotations" element={<CustomerQuotations />} />
        <Route path="subscriptions" element={<CustomerSubscriptions />} />
        <Route path="billing" element={<InvoicesPaymentsProfile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
