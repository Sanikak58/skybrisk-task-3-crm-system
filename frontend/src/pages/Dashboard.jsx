import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../auth/AuthContext.jsx'
import { apiRequest } from '../services/api.js'

export function DashboardPage() {
  const { token } = useAuth()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    async function run() {
      setError('')
      try {
        const data = await apiRequest('/api/dashboard/stats', { token })
        if (alive) setStats(data)
      } catch (e) {
        if (alive) setError(e?.message || 'Failed to load dashboard')
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [token])

  const chartData = useMemo(() => {
    const byStatus = stats?.leads_by_status || {}
    return Object.keys(byStatus).map((k) => ({ status: k, count: byStatus[k] }))
  }, [stats])

  return (
    <div className="stack">
      <div className="row">
        <h1>Dashboard</h1>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <div className="grid3">
        <div className="stat">
          <div className="stat-label">Total customers</div>
          <div className="stat-value">{stats?.total_customers ?? '—'}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total leads</div>
          <div className="stat-value">{stats?.total_leads ?? '—'}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Recent interactions</div>
          <div className="stat-value">{stats?.recent_interactions?.length ?? '—'}</div>
        </div>
      </div>

      <div className="card">
        <div className="row row-between">
          <h2>Sales pipeline</h2>
          <div className="muted">Leads by status</div>
        </div>

        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2>Recent interactions</h2>
        {stats?.recent_interactions?.length ? (
          <div className="list">
            {stats.recent_interactions.map((i) => (
              <div key={i.id} className="list-item">
                <div className="pill">{i.interaction_type}</div>
                <div className="grow">
                  <div className="strong">{i.description}</div>
                  <div className="muted">
                    Lead #{i.lead_id} • {i.date ? new Date(i.date).toLocaleString() : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="muted">No interactions yet.</div>
        )}
      </div>
    </div>
  )
}

