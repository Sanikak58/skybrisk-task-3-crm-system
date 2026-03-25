import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" onClick={() => navigate('/')}>
          CRM Dashboard
        </div>
        <div className="topbar-right">
          <div className="muted">
            {user?.username} {user?.role ? `(${user.role})` : ''}
          </div>
          <button className="btn btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <div className="main">
        <nav className="sidebar">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav active' : 'nav')}>
            Dashboard
          </NavLink>
          <NavLink to="/customers" className={({ isActive }) => (isActive ? 'nav active' : 'nav')}>
            Customers
          </NavLink>
          <NavLink to="/leads" className={({ isActive }) => (isActive ? 'nav active' : 'nav')}>
            Leads
          </NavLink>
        </nav>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

