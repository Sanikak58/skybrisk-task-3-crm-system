import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('sales')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signup({ username, email, password, role })
      navigate('/')
    } catch (e2) {
      setError(e2?.message || 'Signup failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="card">
        <h1>Signup</h1>
        <p className="muted">Create your CRM account.</p>

        {error ? <div className="alert">{error}</div> : null}

        <form onSubmit={onSubmit} className="form">
          <label className="field">
            <div className="label">Username</div>
            <input value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} required />
          </label>
          <label className="field">
            <div className="label">Email</div>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">
            <div className="label">Role</div>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="sales">Sales rep</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="field">
            <div className="label">Password</div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          </label>

          <button className="btn" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <div className="muted">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  )
}

