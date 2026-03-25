import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { apiRequest } from '../services/api.js'

const emptyForm = { name: '', email: '', phone: '', company: '', notes: '' }

export function CustomersPage() {
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setError('')
    const data = await apiRequest(`/api/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`, { token })
    setItems(data)
  }

  useEffect(() => {
    load().catch((e) => setError(e?.message || 'Failed to load customers'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const title = useMemo(() => (editingId ? `Edit customer #${editingId}` : 'Add customer'), [editingId])

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (editingId) {
        await apiRequest(`/api/customers/${editingId}`, { method: 'PUT', token, body: form })
      } else {
        await apiRequest('/api/customers', { method: 'POST', token, body: form })
      }
      setForm(emptyForm)
      setEditingId(null)
      await load()
    } catch (e2) {
      setError(e2?.message || 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  function startEdit(c) {
    setEditingId(c.id)
    setForm({
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      company: c.company || '',
      notes: c.notes || '',
    })
  }

  async function remove(id) {
    if (!confirm('Delete this customer? This will also delete their leads.')) return
    setBusy(true)
    setError('')
    try {
      await apiRequest(`/api/customers/${id}`, { method: 'DELETE', token })
      await load()
    } catch (e2) {
      setError(e2?.message || 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <div className="row row-between">
        <h1>Customers</h1>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            load().catch((e2) => setError(e2?.message || 'Search failed'))
          }}
        >
          <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-secondary">Search</button>
        </form>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <div className="grid2">
        <div className="card">
          <h2>{title}</h2>
          <form onSubmit={onSubmit} className="form">
            <label className="field">
              <div className="label">Name</div>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <div className="row">
              <label className="field grow">
                <div className="label">Email</div>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label className="field grow">
                <div className="label">Phone</div>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
            </div>
            <label className="field">
              <div className="label">Company</div>
              <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </label>
            <label className="field">
              <div className="label">Notes</div>
              <textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>

            <div className="row">
              <button className="btn" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditingId(null)
                    setForm(emptyForm)
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="card">
          <h2>Customer list</h2>
          {items.length ? (
            <div className="table">
              <div className="table-head">
                <div>Name</div>
                <div>Company</div>
                <div>Email</div>
                <div></div>
              </div>
              {items.map((c) => (
                <div key={c.id} className="table-row">
                  <div className="strong">{c.name}</div>
                  <div className="muted">{c.company || '—'}</div>
                  <div className="muted">{c.email || '—'}</div>
                  <div className="row row-right">
                    <button className="btn btn-secondary" onClick={() => startEdit(c)}>
                      Edit
                    </button>
                    <button className="btn btn-danger" onClick={() => remove(c.id)} disabled={busy}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted">No customers yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

