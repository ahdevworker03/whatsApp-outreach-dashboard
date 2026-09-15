const API_BASE = '/api/v1'

interface ApiOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

class ApiError extends Error {
  constructor(
    public status: number,
    public code?: string,
    message?: string
  ) {
    super(message || `API error (${status})`)
  }
}

async function apiCall<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const token = import.meta.env.VITE_API_TOKEN
  if (!token) {
    throw new Error('API_TOKEN not configured')
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers
  }

  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers
  }

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body)
  }

  const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions)
  const data = await response.json() as unknown

  if (!response.ok) {
    const error = data as { error?: string; code?: string }
    throw new ApiError(
      response.status,
      error.code,
      error.error || `HTTP ${response.status}`
    )
  }

  return data as T
}

export const api = {
  getDashboardStats: () =>
    apiCall<DashboardStats>('/dashboard/stats'),

  getLeads: (status?: LeadStatus, page = 1, limit = 50) =>
    apiCall<{ leads: Lead[]; total: number }>(
      `/leads?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}`
    ),

  importLeads: async (file: File): Promise<ImportLeadsResult> => {
    const token = import.meta.env.VITE_API_TOKEN
    if (!token) throw new Error('API_TOKEN not configured')

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE}/leads/import`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    const data = await response.json() as unknown

    if (!response.ok) {
      const error = data as { error?: string; code?: string }
      throw new ApiError(response.status, error.code, error.error || `HTTP ${response.status}`)
    }

    return data as ImportLeadsResult
  },

  deleteLead: (id: string) =>
    apiCall<{ deleted: true }>(`/leads/${id}`, { method: 'DELETE' }),

  // GET /api/v1/campaign returns 404 when no campaign is configured yet
  // (docs/architecture/05-api-design.md documents 200-only, but the actual
  // controller 404s — see backend/src/campaigns/campaign.controller.ts).
  // Surfaced here as null, a valid "nothing configured yet" state for the
  // page to render, rather than an error to throw.
  getCampaign: async (): Promise<Campaign | null> => {
    try {
      return await apiCall<Campaign>('/campaign')
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return null
      }
      throw err
    }
  },

  createCampaign: (data: CampaignFormInput) =>
    apiCall<Campaign>('/campaign', { method: 'POST', body: toCampaignRequestBody(data) }),

  updateCampaign: (id: string, data: Partial<CampaignFormInput>) =>
    apiCall<Campaign>(`/campaign/${id}`, { method: 'PATCH', body: toCampaignRequestBody(data) }),

  updateCampaignStatus: (id: string, status: CampaignStatus) =>
    apiCall<Campaign>(`/campaign/${id}/status`, {
      method: 'PATCH',
      body: { status }
    }),

  sendMessage: (leadId: string) =>
    apiCall<Message>('/messages/send', { method: 'POST', body: { lead_id: leadId } }),

  getInbox: (status?: ConversationStatus, page = 1, limit = 50) =>
    apiCall<{ conversations: ConversationListItem[]; total: number }>(
      `/inbox?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}`
    ),

  getConversation: (id: string) =>
    apiCall<ConversationDetail>(`/inbox/${id}`),

  replyToConversation: (id: string, message: string) =>
    apiCall<Message>(`/inbox/${id}/reply`, {
      method: 'POST',
      body: { message }
    }),

  // The backend only accepts "CLOSED" here (inbox.controller.ts's
  // updateInboxStatus rejects any other value) — typed narrowly to match.
  closeConversation: (id: string) =>
    apiCall<ConversationListItem>(`/inbox/${id}/status`, {
      method: 'PATCH',
      body: { status: 'CLOSED' }
    }),

  getSettings: () =>
    apiCall<Settings>('/settings'),

  updateSettings: (data: Partial<SettingsFormInput>) =>
    apiCall<Settings>('/settings', { method: 'PATCH', body: toSettingsRequestBody(data) })
}

export { ApiError }

export interface DashboardStats {
  total_leads: number
  contacted: number
  replied: number
  waiting_for_followup: number
  completed: number
  failed: number
}

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'FOLLOWUP_1_SENT'
  | 'FOLLOWUP_2_SENT'
  | 'REPLIED'
  | 'COMPLETED'
  | 'FAILED'

export interface Lead {
  id: string
  phone: string
  name: string | null
  businessName: string | null
  sourceFile: string | null
  status: LeadStatus
  campaignId: string | null
  createdAt: string
  updatedAt: string
  followup1DueAt: string | null
  followup2DueAt: string | null
}

export interface ImportLeadsResult {
  imported: number
  duplicates: number
  failed: number
}

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'

export interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  initialTemplateId: string
  followup1TemplateId: string
  followup1DelayHours: number
  followup2TemplateId: string
  followup2DelayHours: number
  dailyLimit: number
  createdAt: string
  updatedAt: string
}

export interface CampaignFormInput {
  name: string
  initialTemplateId: string
  followup1TemplateId: string
  followup1DelayHours: number
  followup2TemplateId: string
  followup2DelayHours: number
  dailyLimit?: number
}

// POST/PATCH /api/v1/campaign expect snake_case (docs/architecture/05-api-
// design.md section 4); everything else in this client stays camelCase to
// match what the backend returns, so the mapping lives only at the edge.
function toCampaignRequestBody(data: Partial<CampaignFormInput>): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  if (data.name !== undefined) body.name = data.name
  if (data.initialTemplateId !== undefined) body.initial_template_id = data.initialTemplateId
  if (data.followup1TemplateId !== undefined) body.followup1_template_id = data.followup1TemplateId
  if (data.followup1DelayHours !== undefined) body.followup1_delay_hours = data.followup1DelayHours
  if (data.followup2TemplateId !== undefined) body.followup2_template_id = data.followup2TemplateId
  if (data.followup2DelayHours !== undefined) body.followup2_delay_hours = data.followup2DelayHours
  if (data.dailyLimit !== undefined) body.daily_limit = data.dailyLimit
  return body
}

export type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'RECEIVED'

export interface Message {
  id: string
  leadId: string
  campaignId: string
  direction: 'OUTBOUND' | 'INBOUND'
  type: 'TEMPLATE' | 'TEXT'
  content: string
  status: MessageStatus
  metaMessageId: string | null
  isAutoReply: boolean
  sentAt: string | null
  deliveredAt: string | null
  readAt: string | null
  failedAt: string | null
  createdAt: string
}

export type ConversationStatus = 'ACTIVE' | 'CLOSED'

export interface ConversationListItem {
  id: string
  leadId: string
  status: ConversationStatus
  lastMessageAt: string | null
  automationStopped: boolean
  createdAt: string
  updatedAt: string
  lead: Lead
}

export interface ConversationDetail extends Omit<ConversationListItem, 'lead'> {
  lead: Lead & { messages: Message[] }
  withinCustomerServiceWindow: boolean
}

export interface Settings {
  id: string
  whatsappPhoneNumber: string | null
  whatsappPhoneNumberId: string | null
  autoReplyPatterns: string[]
  updatedAt: string
}

export interface SettingsFormInput {
  whatsappPhoneNumber: string | null
  whatsappPhoneNumberId: string | null
  autoReplyPatterns: string[]
}

// PATCH /api/v1/settings expects snake_case (docs/architecture/05-api-
// design.md section 8), same edge-mapping pattern as toCampaignRequestBody.
function toSettingsRequestBody(data: Partial<SettingsFormInput>): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  if (data.whatsappPhoneNumber !== undefined) body.whatsapp_phone_number = data.whatsappPhoneNumber
  if (data.whatsappPhoneNumberId !== undefined) body.whatsapp_phone_number_id = data.whatsappPhoneNumberId
  if (data.autoReplyPatterns !== undefined) body.auto_reply_patterns = data.autoReplyPatterns
  return body
}
