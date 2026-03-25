import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { apiRequest } from '../services/api.js'

const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

export function LeadsPage() {
  const { token, user } = useAuth()
  const [customers, setCustomers] = useState([])
  const [items, setItems] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [assignedToFilter, setAssignedToFilter] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [form, setForm] = useState({ customer_id: '', status: 'new', assigned_to_id: '', notes: '' })

  async function load() {
    setError('')
    const qs = new URLSearchParams()
    if (statusFilter) qs.set('status', statusFilter)
    if (assignedToFilter) qs.set('assigned_to_id', assignedToFilter)
    const url = `/api/leads${qs.toString() ? `?${qs.toString()}` : ''}`
    const data = await apiRequest(url, { token })
    setItems(data)
  }

  useEffect(() => {
    let alive = true
    async function run() {
      try {
        const cs = await apiRequest('/api/customers', { token })
        if (alive) setCustomers(cs)
        await load()
      } catch (e) {
        if (alive) setError(e?.message || 'Failed to load leads')
      }
    }
    run()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const customerOptions = useMemo(() => customers.map((c) => ({ id: c.id, label: `${c.name}${c.company ? ` • ${c.company}` : ''}` })), [customers])

  async function onCreate(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await apiRequest('/api/leads', {
        method: 'POST',
        token,
        body: {
          customer_id: Number(form.customer_id),
          status: form.status,
          assigned_to_id: form.assigned_to_id ? Number(form.assigned_to_id) : null,
          notes: form.notes || null,
        },
      })
      setForm({ customer_id: '', status: 'new', assigned_to_id: '', notes: '' })
      await load()
    } catch (e2) {
      setError(e2?.message || 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    if (!confirm('Delete this lead?')) return
    setBusy(true)
    setError('')
    try {
      await apiRequest(`/api/leads/${id}`, { method: 'DELETE', token })
      await load()
    } catch (e2) {
      setError(e2?.message || 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function exportCsv() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:5001'}/api/export/leads.csv`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Export failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'leads.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e?.message || 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <div className="row row-between">
        <h1>Leads</h1>
        <div className="row">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            style={{ width: 180 }}
            placeholder="Assigned user id"
            value={assignedToFilter}
            onChange={(e) => setAssignedToFilter(e.target.value)}
          />
          <button className="btn btn-secondary" onClick={() => load().catch((e) => setError(e?.message || 'Filter failed'))}>
            Apply
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setStatusFilter('')
              setAssignedToFilter('')
              load().catch((e) => setError(e?.message || 'Reload failed'))
            }}
          >
            Reset
          </button>
          {user?.role === 'admin' ? (
            <button className="btn btn-secondary" onClick={exportCsv} disabled={busy}>
              Export CSV
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <div className="grid2">
        <div className="card">
          <h2>Add lead</h2>
          <form onSubmit={onCreate} className="form">
            <label className="field">
              <div className="label">Customer</div>
              <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required>
                <option value="" disabled>
                  Select customer…
                </option>
                {customerOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="row">
              <label className="field grow">
                <div className="label">Status</div>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field grow">
                <div className="label">Assigned to (user id)</div>
                <input
                  placeholder="Optional"
                  value={form.assigned_to_id}
                  onChange={(e) => setForm({ ...form, assigned_to_id: e.target.value })}
                />
              </label>
            </div>

            <label className="field">
              <div className="label">Notes</div>
              <textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>

            <button className="btn" disabled={busy}>
              {busy ? 'Creating…' : 'Create lead'}
            </button>

            <div className="muted">
              Tip: Only admins can export CSV. Create one admin account on signup to unlock export.
            </div>
          </form>
        </div>

        <div className="card">
          <div className="row row-between">
            <h2>Lead list</h2>
            <div className="muted">{items.length} leads</div>
          </div>

          {items.length ? (
            <div className="list">
              {items.map((l) => (
                <div key={l.id} className="list-item">
                  <div className="pill">{l.status}</div>
                  <div className="grow">
                    <div className="strong">
                      <Link to={`/leads/${l.id}`}>{l.customer?.name || `Lead #${l.id}`}</Link>
                    </div>
                    <div className="muted">
                      {l.customer?.company || '—'} • interactions: {l.interactions_count}
                      {l.assigned_to ? ` • assigned: ${l.assigned_to}` : ''}
                    </div>
                  </div>
                  <button className="btn btn-danger" onClick={() => remove(l.id)} disabled={busy}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted">No leads yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

