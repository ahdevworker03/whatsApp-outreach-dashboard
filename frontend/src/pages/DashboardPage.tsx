import { useEffect, useState } from 'react'
import { api, ApiError, DashboardStats } from '../api'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
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
