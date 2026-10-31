import { useAuth } from '../context/AuthContext';

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="text-muted">Welcome back, {user.name.split(' ')[0]}</div>
      <div className="navbar-user">
        <div className="avatar">{initials(user.name)}</div>
        <div className="user-meta">
          <strong>{user.name}</strong>
          <span>{user.email}</span>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={logout}>
          Log out
        </button>
      </div>
    </header>
  );
}
