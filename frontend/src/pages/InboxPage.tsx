import { useCallback, useEffect, useState } from 'react'
import { api, ApiError, ConversationDetail, ConversationListItem, ConversationStatus, Message } from '../api'

const PAGE_SIZE = 20
const CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000

// Mirrors inbox.service.ts's replyToConversation exactly: eligibility is
// anchored to the lead's most recent INBOUND message, not the conversation's
// lastMessageAt (which also moves on outbound sends). Computed client-side
// from the same message history the detail view already has, so the reply
// box can be disabled before the user ever attempts a send, not only after
// a 409 comes back.
function isWithinCustomerServiceWindow(messages: Message[]): boolean {
  const lastInbound = [...messages].reverse().find((m) => m.direction === 'INBOUND')
  if (!lastInbound) return false
  return Date.now() - new Date(lastInbound.createdAt).getTime() < CUSTOMER_SERVICE_WINDOW_MS
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | ''>('')
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [selectedId, setSelectedId] = useState<string | null>(null)

  const loadList = useCallback(() => {
    setListLoading(true)
    setListError('')
    api.getInbox(statusFilter || undefined, page, PAGE_SIZE)
      .then((result) => {
        setConversations(result.conversations)
        setTotal(result.total)
      })
      .catch((err: ApiError | Error) => {
        setListError(err instanceof ApiError ? `${err.message} (${err.status})` : err.message)
      })
      .finally(() => setListLoading(false))
  }, [statusFilter, page])

  useEffect(() => {
    loadList()
  }, [loadList])

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value as ConversationStatus | '')
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <h1>Inbox</h1>

      <div className="inbox-layout">
        <div className="inbox-list-pane">
          <div className="form-group">
            <label htmlFor="conv-status-filter">Filter by status</label>
            <select
              id="conv-status-filter"
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          {listError && <div className="alert alert-error">{listError}</div>}

          {listLoading ? (
            <p>Loading...</p>
          ) : conversations.length === 0 ? (
            <p>No conversations found.</p>
          ) : (
            <>
              <ul className="conversation-list">
                {conversations.map((conv) => (
                  <li key={conv.id}>
                    <button
                      className={`conversation-list-item ${selectedId === conv.id ? 'selected' : ''}`}
                      onClick={() => setSelectedId(conv.id)}
                    >
                      <div className="conversation-list-item-header">
                        <span>{conv.lead.name || conv.lead.phone}</span>
                        <span className={`status-badge status-${conv.status.toLowerCase()}`}>{conv.status}</span>
                      </div>
                      <div className="conversation-list-item-sub">
                        {conv.lead.phone}
                        {conv.lastMessageAt && ` · ${new Date(conv.lastMessageAt).toLocaleString()}`}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="pagination">
                <button className="button-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </button>
                <span>Page {page} of {totalPages} ({total} total)</span>
                <button className="button-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </button>
              </div>
            </>
          )}
        </div>

        <div className="inbox-detail-pane">
          {selectedId ? (
            <ConversationDetailView
              conversationId={selectedId}
              onStatusChanged={loadList}
            />
          ) : (
            <p>Select a conversation to view its history.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ConversationDetailView({
  conversationId,
  onStatusChanged
}: {
  conversationId: string
  onStatusChanged: () => void
}) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [replyText, setReplyText] = useState('')
  const [replyError, setReplyError] = useState('')
  const [sending, setSending] = useState(false)

  const [closeError, setCloseError] = useState('')
  const [closing, setClosing] = useState(false)

  const loadConversation = useCallback(() => {
    setLoading(true)
    setLoadError('')
    api.getConversation(conversationId)
      .then(setConversation)
      .catch((err: ApiError | Error) => {
        setLoadError(err instanceof ApiError ? `${err.message} (${err.status})` : err.message)
      })
      .finally(() => setLoading(false))
  }, [conversationId])

  useEffect(() => {
    setReplyText('')
    setReplyError('')
    setCloseError('')
    loadConversation()
  }, [loadConversation])

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!replyText.trim()) return
    setSending(true)
    setReplyError('')
    try {
      await api.replyToConversation(conversationId, replyText)
      setReplyText('')
    } catch (err) {
      setReplyError(err instanceof ApiError ? err.message : (err as Error).message)
    } finally {
      setSending(false)
      // A failed send still persists a FAILED message row (inbox.service.ts
      // creates it before re-throwing) — reload either way so the history
      // reflects the new SENT or FAILED row immediately.
      loadConversation()
    }
  }

  async function handleClose() {
    setClosing(true)
    setCloseError('')
    try {
      const updated = await api.closeConversation(conversationId)
      setConversation((prev) => (prev ? { ...prev, status: updated.status } : prev))
      onStatusChanged()
    } catch (err) {
      setCloseError(err instanceof ApiError ? err.message : (err as Error).message)
    } finally {
      setClosing(false)
    }
  }

  if (loading) return <p>Loading...</p>
  if (loadError) return <div className="alert alert-error">{loadError}</div>
  if (!conversation) return null

  const messages = conversation.lead.messages
  const withinWindow = isWithinCustomerServiceWindow(messages)

  return (
    <div>
      <div className="conversation-detail-header">
        <div>
          <h2>{conversation.lead.name || conversation.lead.phone}</h2>
          <p className="hint-text">{conversation.lead.phone}</p>
        </div>
        <div className="campaign-actions">
          <span className={`status-badge status-${conversation.status.toLowerCase()}`}>{conversation.status}</span>
          <button
            className="button-secondary"
            disabled={conversation.status === 'CLOSED' || closing}
            onClick={handleClose}
          >
            {conversation.status === 'CLOSED' ? 'Closed' : closing ? 'Closing...' : 'Mark Closed'}
          </button>
        </div>
      </div>

      {closeError && <div className="alert alert-error">{closeError}</div>}

      <div className="message-history">
        {messages.length === 0 ? (
          <p>No messages yet.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`message-row message-${msg.direction.toLowerCase()}`}>
              <div className={`message-bubble ${msg.status === 'FAILED' ? 'message-bubble-failed' : ''}`}>
                <div className="message-content">{msg.content}</div>
                <div className="message-meta">
                  {msg.direction === 'INBOUND' ? 'Received' : 'Sent'} · {new Date(msg.createdAt).toLocaleString()}
                  {msg.status === 'FAILED' && <span className="message-failed-label"> · Failed to send</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {withinWindow ? (
        <form onSubmit={handleReply} className="reply-box">
          <div className="form-group">
            <label htmlFor="reply-text">Reply</label>
            <textarea
              id="reply-text"
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={sending}
            />
          </div>
          <button type="submit" disabled={sending || !replyText.trim()}>
            {sending ? 'Sending...' : 'Send'}
          </button>
          {replyError && <div className="alert alert-error">Failed to send: {replyError}</div>}
        </form>
      ) : (
        <div className="alert alert-warning">
          Outside the 24-hour customer service window — no inbound message from this lead in the last 24 hours. A free-text reply cannot be sent.
        </div>
      )}
    </div>
  )
}
