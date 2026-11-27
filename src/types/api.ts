export type Role = 'admin' | 'asesor'

export type LeadStage = 'nuevo' | 'en_diagnostico' | 'propuesto' | 'cliente' | 'perdido'

export type ConversationStatus = 'bot' | 'humano'

export type MessageDirection = 'in' | 'out'

export interface AuthUser {
  id: string
  email: string
  role: Role
}

export interface PublicUser {
  id: string
  email: string
  name: string | null
  role: Role
  active: boolean
  createdAt: number
}

export interface ChatSummary {
  user_id: string
  phone: string | null
  name: string | null
  username: string | null
  last_seen_at: number
  opt_in: boolean
  opt_out: boolean
  opt_in_at: number | null
  opt_out_at: number | null
  opt_in_source: string | null
  opt_out_source: string | null
  status: ConversationStatus | null
  summary: string | null
  updated_at: number | null
  last_inbound_at: number | null
  lead_stage: LeadStage | null
  followup_sent_at: number | null
  last_body: string | null
  last_dir: MessageDirection | null
  last_kind: string | null
  window_open: boolean
}

export interface ConversationSummary {
  summary: string
  summaryUpdatedAt: number | null
  summaryThroughSeq: number | null
}

export interface ChatProfile {
  name: string
  company: string
  business: string
  customers: string
  channels: string
  city: string
  email: string
  pains: string[]
  interests: string[]
  notes: string[]
}

export type ChatProfilePatch = Partial<ChatProfile>

export interface ConversationMeta {
  status: ConversationStatus
  leadStage: LeadStage
  followupSentAt: number | null
  lastInboundAt: number | null
  expiresAt: number | null
  windowOpen: boolean
  optIn: boolean
  optOut: boolean
  optInAt: number | null
  optOutAt: number | null
  optInSource: string | null
  optOutSource: string | null
  canSendProactive: boolean
  canReplyToService: boolean
}

export interface ThreadMessage {
  id: string
  wamid: string
  direction: MessageDirection
  kind: string
  body: string
  status: string | null
  media_key: string | null
  created_at: number
}

export interface TemplateInfo {
  name: string
  status: string
  category: string
  language: string
  params: number
  preview: string
}

export interface LoginResponse {
  ok: boolean
  user: AuthUser
}

export interface MeResponse {
  ok: boolean
  user: AuthUser
}

export interface ChatsResponse {
  ok: boolean
  chats: ChatSummary[]
}

export interface ChatDetailResponse {
  ok: boolean
  userId: string
  status: ConversationStatus
  meta: ConversationMeta
  messages: ThreadMessage[]
  summary: ConversationSummary | null
  profile: ChatProfile
}

export interface ChatProfileResponse {
  ok: boolean
  profile: ChatProfile
}

export interface ChatSummaryRebuildResponse {
  ok: boolean
  summary: ConversationSummary | null
}

export interface TemplatesResponse {
  ok: boolean
  templates: TemplateInfo[]
}

export interface UsersResponse {
  ok: boolean
  users: PublicUser[]
}

export interface AiService {
  name: string
  description: string
  price: string
}

export interface AiSettingsMessages {
  handoff: string
  technicalError: string
  audioFailed: string
  unsupported: string
  fallback: string
}

export interface AiSettingsReplyDelay {
  minSeconds: number
  maxSeconds: number
}

export interface AiSettings {
  assistantName: string
  businessName: string
  businessDescription: string
  personality: string
  businessHours: string
  services: AiService[]
  knowledge: string
  rules: string[]
  extraInstructions: string
  messages: AiSettingsMessages
  replyDelay: AiSettingsReplyDelay
  model: string
  temperature: number | null
  maxTokens: number | null
}

export interface AiSettingsLimits {
  short: number
  medium: number
  long: number
  maxServices: number
  maxRules: number
  ruleLength: number
}

export interface AiSettingsResponse {
  ok: boolean
  settings: AiSettings
  version: number
  updatedAt: number
  defaults: {
    messages: AiSettingsMessages
  }
  limits: AiSettingsLimits
}

export interface AiSettingsMutationResponse {
  ok: boolean
  settings: AiSettings
  version: number
  updatedAt: number
}

export interface AiSettingsPreviewResponse {
  ok: boolean
  prompt: string
}

export interface AiSettingsHistoryEntry {
  version: number
  updatedAt: number
  updatedBy: string
  email: string
}

export interface AiSettingsHistoryResponse {
  ok: boolean
  versions: AiSettingsHistoryEntry[]
}

export interface ReplyResponse {
  ok: boolean
  wamid: string | null
  status: ConversationStatus
}

export interface HandoffResponse {
  ok: boolean
  status: ConversationStatus
}

export interface StageResponse {
  ok: boolean
  stage: LeadStage
  meta: ConversationMeta
}

export interface OptInResponse {
  ok: boolean
  meta: ConversationMeta
}

export interface TemplateSendResponse {
  ok: boolean
  wamid?: string | null
}

export interface MaintenanceResponse {
  ok: boolean
  result?: {
    skipped?: string
    deletedChats?: number
    deletedContacts?: number
    deletedMedia?: number
    scanned?: number
    deleted?: number
    errors?: number
  }
  info?: {
    enabled?: boolean
    days?: number
    intervalMinutes?: number
    graceHours?: number
    lastRun?: number | null
    lastDeleted?: number
    lastError?: string | null
  }
}
