import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(usernameOrEmail, password)
      navigate('/')
    } catch (e2) {
      setError(e2?.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="card">
        <h1>Login</h1>
        <p className="muted">Sign in to manage customers, leads, and interactions.</p>

        {error ? <div className="alert">{error}</div> : null}

        <form onSubmit={onSubmit} className="form">
          <label className="field">
            <div className="label">Username or Email</div>
            <input value={usernameOrEmail} onChange={(e) => setUsernameOrEmail(e.target.value)} required />
          </label>
          <label className="field">
            <div className="label">Password</div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>

          <button className="btn" disabled={busy}>
            {busy ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <div className="muted">
          No account? <Link to="/signup">Create one</Link>
        </div>
      </div>
    </div>
  )
}

