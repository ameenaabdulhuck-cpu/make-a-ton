import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useData } from './DataContext';

const AuthContext = createContext(null);

export const ROLE_HOME = {
  admin: '/admin/dashboard',
  staff: '/staff/dashboard',
  customer: '/customer/dashboard',
};

export function AuthProvider({ children }) {
  const { admin, staff, customers, findAccount } = useData();
  const [session, setSession] = useState(null);

  const login = useCallback(
    (email, password) => {
      const account = findAccount(email);
      if (!account || account.record.password !== password) {
        return { ok: false, error: 'Incorrect email or password.' };
      }
      setSession({ role: account.role, id: account.record.id });
      return { ok: true, role: account.role };
    },
    [findAccount],
  );

  const logout = useCallback(() => setSession(null), []);

  const user = useMemo(() => {
    if (!session) return null;
    if (session.role === 'admin') return { ...admin, role: 'admin' };
    if (session.role === 'staff') {
      const member = staff.find((item) => item.id === session.id);
      return member ? { ...member, role: 'staff' } : null;
    }
    const customer = customers.find((item) => item.id === session.id);
    return customer ? { ...customer, role: 'customer' } : null;
  }, [session, admin, staff, customers]);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
