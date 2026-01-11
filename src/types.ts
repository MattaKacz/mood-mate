import type { Tables, TablesInsert, TablesUpdate } from "./db/database.types";

/**
 * Reużywalne aliasy dla rekordów tabel bazodanowych wykorzystywanych przez API.
 */
export type UserProfileRow = Tables<"users_profile">;
export type MoodEntryRow = Tables<"mood_entries">;
export type GenerationErrorLogRow = Tables<"generation_error_logs">;

export type NewMoodEntryRow = TablesInsert<"mood_entries">;
export type UpdateMoodEntryRow = TablesUpdate<"mood_entries">;
export type UpdateUserProfileRow = TablesUpdate<"users_profile">;

export type MoodTag = MoodEntryRow["tags"][number];

export type IsoTimestamp = MoodEntryRow["created_at"];

/**
 * Modele komend dla modułu autoryzacji.
 */
export interface RegisterCommand {
  email: string;
  password: string;
  acceptTerms: boolean;
  confirmAdult: boolean;
  skipFtue: boolean;
}

export interface LoginCommand {
  email: string;
  password: string;
}

export type LogoutCommand = Record<string, never>;

export interface PasswordResetRequestCommand {
  email: string;
}

export interface PasswordResetCompleteCommand {
  oobToken: string;
  newPassword: string;
}

/**
 * DTO sesji autoryzacji zwracane przez endpointy register/login/session.
 */
export interface AuthenticatedUserDTO {
  id: MoodEntryRow["user_id"]; // identyfikator Supabase użytkownika spójny z mood_entries.user_id
  email: string;
}

export interface AuthSessionDTO {
  user: AuthenticatedUserDTO;
  session: {
    accessToken: string;
    expiresAt: IsoTimestamp;
    refreshToken: string;
  };
}

export interface MessageDTO {
  message: string;
}

/**
 * Meta dane statyczne.
 */
export interface TagCatalogDTO {
  tags: MoodTag[];
}

export interface RitualPresetDTO {
  default: UserProfileRow["ritual_time"];
  options: UserProfileRow["ritual_time"][];
}

export interface CrisisResourceDTO {
  label: string;
  number: string;
}

export interface CrisisResourcesDTO {
  locale: string;
  resources: CrisisResourceDTO[];
}

/**
 * Profile użytkownika.
 */
export interface FtueStateDTO {
  completed: boolean;
  currentStep?: string;
  completedAt?: IsoTimestamp;
}

export interface UserProfileDTO {
  id: UserProfileRow["id"];
  email: AuthenticatedUserDTO["email"];
  ritualTime: UserProfileRow["ritual_time"];
  ftueState?: FtueStateDTO;
  createdAt: UserProfileRow["created_at"];
  updatedAt: UserProfileRow["updated_at"];
}

export interface UpdateUserProfileCommand {
  ritualTime?: UserProfileRow["ritual_time"];
  ftueState?: FtueStateDTO;
}

/**
 * Wpisy nastroju.
 */
export type ModerationStatus = "clear" | "flagged";

export interface MoodEntryModerationDTO {
  status: ModerationStatus;
  matchedTerms: string[];
}

export type AiSuggestionStatus = "pending" | "completed" | "fallback" | "skipped";

export interface AiSuggestionDTO {
  status: AiSuggestionStatus;
  text?: NonNullable<MoodEntryRow["ai_response"]>;
  source?: string;
  generatedAt?: IsoTimestamp;
  responseTimeMs?: number;
}

export interface MoodEntryBaseDTO {
  id: MoodEntryRow["id"];
  score: MoodEntryRow["score"];
  note: MoodEntryRow["note"];
  tags: MoodEntryRow["tags"];
  createdAt: MoodEntryRow["created_at"];
}

export interface MoodEntryListItemDTO extends MoodEntryBaseDTO {
  aiSuggestion?: AiSuggestionDTO;
}

export interface MoodEntryDetailDTO extends MoodEntryBaseDTO {
  aiSuggestion?: AiSuggestionDTO;
  moderation?: MoodEntryModerationDTO;
  aiHelpful?: MoodEntryRow["ai_helpful"];
  updatedAt: MoodEntryRow["updated_at"];
}

export interface MoodEntriesPaginationDTO {
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
}

export interface MoodEntriesListDTO {
  entries: MoodEntryListItemDTO[];
  pagination: MoodEntriesPaginationDTO;
}

export type TrendDirection = "up" | "steady" | "down";

export interface DashboardRitualReminderDTO {
  time: string;
  isDue: boolean;
}

export interface DashboardSummaryDTO {
  streak: number;
  trendDirection: TrendDirection;
  trendDelta: number;
  entries: MoodEntryListItemDTO[];
  ritualReminder?: DashboardRitualReminderDTO;
}

export interface CreateMoodEntryCommand {
  score: NewMoodEntryRow["score"];
  note?: NewMoodEntryRow["note"];
  tags?: NewMoodEntryRow["tags"];
  requestSuggestion?: boolean;
}

export interface AiFeedbackCommand {
  helpful: Exclude<MoodEntryRow["ai_helpful"], null>;
}

export type RetrySuggestionCommand = Record<string, never>;

export interface MoodEntryCreationResponseDTO {
  entry: MoodEntryDetailDTO;
  aiSuggestion?: AiSuggestionDTO;
  analytics?: {
    entrySavedEventId: string;
    aiShownEventId?: string;
  };
}

/**
 * Zdarzenia analityczne.
 */
export type AnalyticsEventType = "entry_saved" | "ai_shown" | "ai_helpful_yes" | "ai_helpful_no";

export interface AnalyticsEventDTO {
  type: AnalyticsEventType;
  entryId?: MoodEntryRow["id"];
  timestamp: IsoTimestamp;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsEventsCommand {
  events: AnalyticsEventDTO[];
}

export interface AnalyticsIngestResponseDTO {
  accepted: number;
  failed: number;
}

/**
 * Błędy generowania AI.
 */
export type AiErrorSeverity = GenerationErrorLogRow["severity"];

export interface AiErrorLogDTO {
  id: GenerationErrorLogRow["id"];
  userId: GenerationErrorLogRow["user_id"];
  model: GenerationErrorLogRow["model"];
  errorCode: GenerationErrorLogRow["error_code"];
  errorMessage: GenerationErrorLogRow["error_message"];
  severity: AiErrorSeverity;
  createdAt: GenerationErrorLogRow["created_at"];
  correlationId?: GenerationErrorLogRow["correlation_id"];
  requestId?: GenerationErrorLogRow["request_id"];
  resolvedAt?: GenerationErrorLogRow["resolved_at"];
  resolutionNote?: GenerationErrorLogRow["resolution_note"];
  sourceTextHash: GenerationErrorLogRow["source_text_hash"];
  sourceTextLength: GenerationErrorLogRow["source_text_length"];
}

export interface AiErrorListDTO {
  errors: AiErrorLogDTO[];
}

export interface ResolveAiErrorCommand {
  resolved: boolean;
  resolutionNote?: GenerationErrorLogRow["resolution_note"];
  resolvedAt?: GenerationErrorLogRow["resolved_at"];
}

/**
 * Zarządzanie kontem.
 */
export interface DeleteAccountCommand {
  reason: string;
  confirm: boolean;
  hardConfirm?: boolean;
}

export interface DeleteAccountResponseDTO {
  message: string;
  deletedAt: IsoTimestamp;
}

/**
 * Endpointy zdrowia.
 */
export interface HealthStatusDTO {
  status: "live" | "ready";
  details?: Record<string, unknown>;
}
