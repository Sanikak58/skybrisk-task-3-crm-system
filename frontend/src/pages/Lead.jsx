import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { apiRequest } from '../services/api.js'

const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']
const TYPES = ['note', 'call', 'email']

export function LeadPage() {
  const { id } = useParams()
  const leadId = Number(id)
  const { token, user } = useAuth()
  const navigate = useNavigate()

  const [lead, setLead] = useState(null)
  const [interactions, setInteractions] = useState([])
  const [customers, setCustomers] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [edit, setEdit] = useState({ customer_id: '', status: 'new', assigned_to_id: '', notes: '' })
  const [newIx, setNewIx] = useState({ interaction_type: 'note', description: '' })

  async function loadAll() {
    setError('')
    const [leads, ix, cs] = await Promise.all([
      apiRequest('/api/leads', { token }),
      apiRequest(`/api/interactions?lead_id=${leadId}`, { token }),
      apiRequest('/api/customers', { token }),
    ])
    const l = leads.find((x) => x.id === leadId)
    if (!l) throw new Error('Lead not found')
    setLead(l)
    setInteractions(ix)
    setCustomers(cs)
    setEdit({
      customer_id: String(l.customer_id),
      status: l.status,
      assigned_to_id: l.assigned_to_id ? String(l.assigned_to_id) : '',
      notes: l.notes || '',
    })
  }

  useEffect(() => {
    loadAll().catch((e) => setError(e?.message || 'Failed to load lead'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, token])

  const customerOptions = useMemo(
    () => customers.map((c) => ({ id: c.id, label: `${c.name}${c.company ? ` • ${c.company}` : ''}` })),
    [customers],
  )

  async function saveLead(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await apiRequest(`/api/leads/${leadId}`, {
        method: 'PUT',
        token,
        body: {
          customer_id: Number(edit.customer_id),
          status: edit.status,
          assigned_to_id: edit.assigned_to_id ? Number(edit.assigned_to_id) : null,
          notes: edit.notes || null,
        },
      })
      await loadAll()
    } catch (e2) {
      setError(e2?.message || 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function addInteraction(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await apiRequest('/api/interactions', {
        method: 'POST',
        token,
        body: {
          lead_id: leadId,
          interaction_type: newIx.interaction_type,
          description: newIx.description,
        },
      })
      setNewIx({ interaction_type: 'note', description: '' })
      await loadAll()
    } catch (e2) {
      setError(e2?.message || 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  async function deleteInteraction(ixId) {
    if (!confirm('Delete this interaction?')) return
    setBusy(true)
    setError('')
    try {
      await apiRequest(`/api/interactions/${ixId}`, { method: 'DELETE', token })
      await loadAll()
    } catch (e2) {
      setError(e2?.message || 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <div className="row row-between">
        <div className="row">
          <button className="btn btn-secondary" onClick={() => navigate('/leads')}>
            ← Back
          </button>
          <h1 style={{ margin: 0 }}>Lead #{leadId}</h1>
        </div>
        <div className="muted">{lead?.customer?.name ? <Link to="/customers">Customer: {lead.customer.name}</Link> : ''}</div>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <div className="grid2">
        <div className="card">
          <h2>Lead details</h2>
          <form onSubmit={saveLead} className="form">
            <label className="field">
              <div className="label">Customer</div>
              <select value={edit.customer_id} onChange={(e) => setEdit({ ...edit, customer_id: e.target.value })} required>
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
                <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field grow">
                <div className="label">Assigned to (user id)</div>
                <input value={edit.assigned_to_id} onChange={(e) => setEdit({ ...edit, assigned_to_id: e.target.value })} />
              </label>
            </div>

            <label className="field">
              <div className="label">Notes</div>
              <textarea rows={4} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
            </label>

            <button className="btn" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Log interaction</h2>
          <form onSubmit={addInteraction} className="form">
            <div className="row">
              <label className="field grow">
                <div className="label">Type</div>
                <select
                  value={newIx.interaction_type}
                  onChange={(e) => setNewIx({ ...newIx, interaction_type: e.target.value })}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field grow">
                <div className="label">Description</div>
                <input
                  value={newIx.description}
                  onChange={(e) => setNewIx({ ...newIx, description: e.target.value })}
                  required
                />
              </label>
            </div>
            <button className="btn" disabled={busy}>
              {busy ? 'Saving…' : 'Add interaction'}
            </button>
          </form>

          <div className="spacer" />
          <h2>Interactions</h2>
          {interactions.length ? (
            <div className="list">
              {interactions.map((i) => (
                <div key={i.id} className="list-item">
                  <div className="pill">{i.interaction_type}</div>
                  <div className="grow">
                    <div className="strong">{i.description}</div>
                    <div className="muted">{i.date ? new Date(i.date).toLocaleString() : ''}</div>
                  </div>
                  <button className="btn btn-danger" onClick={() => deleteInteraction(i.id)} disabled={busy}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted">No interactions yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

