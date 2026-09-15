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

  getCampaign: () =>
    apiCall('/campaign'),

  createCampaign: (data: unknown) =>
    apiCall('/campaign', { method: 'POST', body: data }),

  updateCampaign: (id: string, data: unknown) =>
    apiCall(`/campaign/${id}`, { method: 'PATCH', body: data }),

  updateCampaignStatus: (id: string, status: string) =>
    apiCall(`/campaign/${id}/status`, {
      method: 'PATCH',
      body: { status }
    }),

  sendMessage: (leadId: string) =>
    apiCall('/messages/send', { method: 'POST', body: { lead_id: leadId } }),

  getInbox: (status?: string, page = 1, limit = 50) =>
    apiCall<{ conversations: unknown[]; total: number }>(
      `/inbox?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}`
    ),

  getConversation: (id: string) =>
    apiCall(`/inbox/${id}`),

  replyToConversation: (id: string, message: string) =>
    apiCall(`/inbox/${id}/reply`, {
      method: 'POST',
      body: { message }
    }),

  updateConversationStatus: (id: string, status: string) =>
    apiCall(`/inbox/${id}/status`, {
      method: 'PATCH',
      body: { status }
    }),

  getSettings: () =>
    apiCall('/settings'),

  updateSettings: (data: unknown) =>
    apiCall('/settings', { method: 'PATCH', body: data })
}

export { ApiError }

interface DashboardStats {
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
