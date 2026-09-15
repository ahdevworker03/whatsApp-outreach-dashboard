import { useEffect, useState } from 'react'
import { api, ApiError, SettingsFormInput } from '../api'

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsFormInput | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [newPattern, setNewPattern] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.getSettings()
      .then((settings) => {
        setForm({
          whatsappPhoneNumber: settings.whatsappPhoneNumber,
          whatsappPhoneNumberId: settings.whatsappPhoneNumberId,
          autoReplyPatterns: settings.autoReplyPatterns
        })
      })
      .catch((err: ApiError | Error) => {
        setLoadError(err instanceof ApiError ? `${err.message} (${err.status})` : err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  function addPattern() {
    const trimmed = newPattern.trim()
    if (!trimmed || !form) return
    setForm({ ...form, autoReplyPatterns: [...form.autoReplyPatterns, trimmed] })
    setNewPattern('')
  }

  function removePattern(index: number) {
    if (!form) return
    setForm({ ...form, autoReplyPatterns: form.autoReplyPatterns.filter((_, i) => i !== index) })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    setSaveError('')
    setSaved(false)
    try {
      const updated = await api.updateSettings(form)
      setForm({
        whatsappPhoneNumber: updated.whatsappPhoneNumber,
        whatsappPhoneNumberId: updated.whatsappPhoneNumberId,
        autoReplyPatterns: updated.autoReplyPatterns
      })
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof ApiError ? `${err.message} (${err.status})` : (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <h1>Settings</h1>
        <p>Loading...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div>
        <h1>Settings</h1>
        <div className="alert alert-error">{loadError}</div>
      </div>
    )
  }

  if (!form) return null

  return (
    <div>
      <h1>Settings</h1>

      <form onSubmit={handleSave} className="settings-form">
        <div className="form-group">
          <label htmlFor="whatsapp-phone-number">WhatsApp Phone Number</label>
          <input
            id="whatsapp-phone-number"
            type="text"
            value={form.whatsappPhoneNumber ?? ''}
            onChange={(e) => setForm({ ...form, whatsappPhoneNumber: e.target.value || null })}
          />
        </div>

        <div className="form-group">
          <label htmlFor="whatsapp-phone-number-id">WhatsApp Phone Number ID</label>
          <input
            id="whatsapp-phone-number-id"
            type="text"
            value={form.whatsappPhoneNumberId ?? ''}
            onChange={(e) => setForm({ ...form, whatsappPhoneNumberId: e.target.value || null })}
          />
        </div>

        <div className="form-group">
          <label>Auto-Reply Patterns</label>
          <p className="hint-text">
            Messages containing any of these patterns (case-insensitive) are treated as automated replies, not human responses.
          </p>

          {form.autoReplyPatterns.length === 0 ? (
            <p>No patterns configured.</p>
          ) : (
            <ul className="pattern-list">
              {form.autoReplyPatterns.map((pattern, index) => (
                <li key={index} className="pattern-list-item">
                  <span>{pattern}</span>
                  <button type="button" className="button-secondary" onClick={() => removePattern(index)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="pattern-add-row">
            <input
              type="text"
              placeholder="e.g. out of office"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addPattern()
                }
              }}
            />
            <button type="button" className="button-secondary" onClick={addPattern} disabled={!newPattern.trim()}>
              Add Pattern
            </button>
          </div>
        </div>

        {saveError && <div className="alert alert-error">{saveError}</div>}
        {saved && <div className="alert alert-success">Settings saved.</div>}

        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  )
}
