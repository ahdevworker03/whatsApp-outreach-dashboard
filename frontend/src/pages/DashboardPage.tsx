import { useEffect, useState } from 'react'
import { api, ApiError } from '../api'

interface Stats {
  total_leads: number
  contacted: number
  replied: number
  waiting_for_followup: number
  completed: number
  failed: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDashboardStats()
      .then(setStats)
      .catch((err: ApiError | Error) => {
        const message = err instanceof ApiError
          ? `${err.message} (${err.status})`
          : err.message
        setError(message)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1>Dashboard</h1>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : stats ? (
        <div className="stats-grid">
          <StatCard label="Total Leads" value={stats.total_leads} />
          <StatCard label="Contacted" value={stats.contacted} />
          <StatCard label="Replied" value={stats.replied} />
          <StatCard label="Waiting for Follow-up" value={stats.waiting_for_followup} />
          <StatCard label="Completed" value={stats.completed} />
          <StatCard label="Failed" value={stats.failed} />
        </div>
      ) : null}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  )
}

const styles = `
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 24px;
  }

  .stat-card {
    background: white;
    padding: 20px;
    border-radius: 4px;
    border: 1px solid #ddd;
  }

  .stat-label {
    font-size: 14px;
    color: #666;
    margin-bottom: 8px;
  }

  .stat-value {
    font-size: 32px;
    font-weight: 600;
    color: #0066cc;
  }
`

if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = styles
  document.head.appendChild(style)
}
