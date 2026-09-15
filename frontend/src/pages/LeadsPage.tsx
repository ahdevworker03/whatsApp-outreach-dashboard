import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError, Lead, LeadStatus, ImportLeadsResult } from '../api'

const STATUS_OPTIONS: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'FOLLOWUP_1_SENT',
  'FOLLOWUP_2_SENT',
  'REPLIED',
  'COMPLETED',
  'FAILED'
]

const PAGE_SIZE = 20

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [importResult, setImportResult] = useState<ImportLeadsResult | null>(null)
  const [importError, setImportError] = useState('')
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadLeads = useCallback(() => {
    setLoading(true)
    setError('')
    api.getLeads(statusFilter || undefined, page, PAGE_SIZE)
      .then((result) => {
        setLeads(result.leads)
        setTotal(result.total)
      })
      .catch((err: ApiError | Error) => {
        setError(err instanceof ApiError ? `${err.message} (${err.status})` : err.message)
      })
      .finally(() => setLoading(false))
  }, [statusFilter, page])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value as LeadStatus | '')
    setPage(1)
  }

  async function handleImport(file: File) {
    setImporting(true)
    setImportError('')
    setImportResult(null)
    try {
      const result = await api.importLeads(file)
      setImportResult(result)
      setPage(1)
      loadLeads()
    } catch (err) {
      setImportError(err instanceof ApiError ? `${err.message} (${err.status})` : (err as Error).message)
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleDelete(lead: Lead) {
    setDeleteError(null)
    setDeletingId(lead.id)
    try {
      await api.deleteLead(lead.id)
      loadLeads()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setDeleteError({
          id: lead.id,
          message: 'This lead has already been contacted and cannot be deleted.'
        })
      } else {
        setDeleteError({
          id: lead.id,
          message: err instanceof ApiError ? `${err.message} (${err.status})` : (err as Error).message
        })
      }
    } finally {
      setDeletingId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <h1>Leads</h1>

      <section className="import-section">
        <h2>Import Leads</h2>
        <div className="form-group">
          <label htmlFor="lead-file">CSV or Excel file</label>
          <input
            ref={fileInputRef}
            id="lead-file"
            type="file"
            accept=".csv,.xlsx"
            disabled={importing}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImport(file)
            }}
          />
        </div>

        {importing && <p>Importing...</p>}

        {importError && (
          <div className="alert alert-error">{importError}</div>
        )}

        {importResult && (
          <div className="alert alert-success">
            Imported: {importResult.imported} · Duplicates: {importResult.duplicates} · Failed: {importResult.failed}
          </div>
        )}
      </section>

      <section className="filter-section">
        <div className="form-group">
          <label htmlFor="status-filter">Filter by status</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </section>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p>Loading...</p>
      ) : leads.length === 0 ? (
        <p>No leads found.</p>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Phone</th>
                <th>Name</th>
                <th>Business Name</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>{lead.phone}</td>
                  <td>{lead.name || '—'}</td>
                  <td>{lead.businessName || '—'}</td>
                  <td>
                    <span className={`status-badge status-${lead.status.toLowerCase()}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td>{new Date(lead.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="button-secondary"
                      disabled={deletingId === lead.id}
                      onClick={() => handleDelete(lead)}
                    >
                      {deletingId === lead.id ? 'Deleting...' : 'Delete'}
                    </button>
                    {deleteError?.id === lead.id && (
                      <div className="alert alert-error inline-alert">{deleteError.message}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button
              className="button-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>Page {page} of {totalPages} ({total} total)</span>
            <button
              className="button-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}
