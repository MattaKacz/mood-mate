# REST API Plan

## 1. Resources

- `AuthSession` – Supabase-managed user identities stored in `auth.users`.
- `UserProfile` – user preferences and FTUE state stored in `users_profile`.
- `MoodEntry` – journaling entries with mood data, tags, AI suggestion fields stored in `mood_entries`.
- `AISuggestion` – generated or fallback guidance persisted in `mood_entries.ai_response` with evaluation metadata.
- `AIErrorLog` – AI generation failure records stored in `generation_error_logs`.
- `AnalyticsEvent` – instrumentation payloads for `entry_saved`, `ai_shown`, `ai_helpful_yes/no` captured by the analytics pipeline.
- `MetaConfig` – static lookups such as tag catalogs, ritual presets, and crisis resources served from configuration.

## 2. Endpoints

### AuthSession

#### POST /auth/register

- Description: Create a new user with Supabase Auth, enforce 18+ declaration and policy consent, bootstrap default profile.
- Query Parameters: None.
- Request JSON:

```
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "acceptTerms": true,
  "confirmAdult": true,
  "skipFtue": false
}
```

- Response JSON:

```
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "accessToken": "jwt",
    "expiresAt": "2025-11-01T10:15:00Z",
    "refreshToken": "..."
  }
}
```

- Success Codes: `201 Created` user provisioned and session issued.
- Error Codes: `400 Bad Request` invalid flags or payload; `409 Conflict` email already registered; `422 Unprocessable Entity` password strength failure; `429 Too Many Requests` rate limit; `500 Internal Server Error` Supabase failure.

#### POST /auth/login

- Description: Authenticate via Supabase email/password, return session tokens.
- Query Parameters: None.
- Request JSON:

```
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

- Response JSON mirrors `POST /auth/register`.
- Success Codes: `200 OK` session issued.
- Error Codes: `400 Bad Request` malformed payload; `401 Unauthorized` invalid credentials; `423 Locked` account locked (future-proof); `429 Too Many Requests`; `500 Internal Server Error`.

#### POST /auth/logout

- Description: Invalidate the current session refresh token and client cookie.
- Query Parameters: None.
- Request JSON: empty object.
- Response JSON:

```
{
  "message": "Session terminated"
}
```

- Success Codes: `204 No Content` logout succeeded.
- Error Codes: `401 Unauthorized` missing or expired token; `500 Internal Server Error` Supabase failure.

#### POST /auth/password/reset-request

- Description: Trigger Supabase password reset email.
- Query Parameters: None.
- Request JSON:

```
{
  "email": "user@example.com"
}
```

- Response JSON:

```
{
  "message": "Reset link sent"
}
```

- Success Codes: `202 Accepted` reset email queued.
- Error Codes: `400 Bad Request` invalid email format; `404 Not Found` email not registered (optional security setting, default soft-success); `429 Too Many Requests`; `500 Internal Server Error`.

#### POST /auth/password/reset-complete

- Description: Complete password reset using Supabase-provided out-of-band token.
- Query Parameters: None.
- Request JSON:

```
{
  "oobToken": "supabase-token",
  "newPassword": "NewSecurePass456!"
}
```

- Response JSON matches login payload.
- Success Codes: `200 OK` password updated.
- Error Codes: `400 Bad Request` missing token; `401 Unauthorized` invalid or expired token; `422 Unprocessable Entity` weak password; `500 Internal Server Error`.

#### GET /auth/session

- Description: Inspect current session, refresh access token if valid refresh token provided.
- Query Parameters: None.
- Response JSON:

```
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "accessToken": "jwt",
    "expiresAt": "2025-11-01T10:15:00Z",
    "refreshToken": "..."
  }
}
```

- Success Codes: `200 OK` session valid; `204 No Content` session expired but refresh cookie present and renewal denied due to inactivity.
- Error Codes: `401 Unauthorized` invalid tokens; `500 Internal Server Error`.

### MetaConfig

#### GET /meta/tags

- Description: Return the canonical list of mood tags enforced by the API.
- Query Parameters: None.
- Response JSON:

```
{
  "tags": ["work", "stress", "sleep", "energy", "family", "health", "motivation", "rest", "relationships", "social", "study", "diet"]
}
```

- Success Codes: `200 OK` tags returned.
- Error Codes: `500 Internal Server Error` configuration failure.

#### GET /meta/ritual-presets

- Description: Expose available ritual time presets and defaults for FTUE.
- Query Parameters: None.
- Response JSON:

```
{
  "default": "21:30",
  "options": ["18:00", "21:30"]
}
```

- Success Codes: `200 OK` presets returned.
- Error Codes: `500 Internal Server Error` configuration failure.

#### GET /meta/crisis-resources

- Description: Provide static crisis contact information for banners and footer links.
- Query Parameters: Optional `locale` defaulting to `en-AU`.
- Response JSON:

```
{
  "locale": "en-AU",
  "resources": [
    {"label": "Emergency", "number": "000"},
    {"label": "Lifeline", "number": "13 11 14"},
    {"label": "Beyond Blue", "number": "1300 22 4636"}
  ]
}
```

- Success Codes: `200 OK` resources returned.
- Error Codes: `400 Bad Request` unsupported locale; `500 Internal Server Error` configuration failure.

### UserProfile

#### GET /me

- Description: Retrieve the authenticated user profile, FTUE status, and ritual configuration.
- Query Parameters: Optional `includeFtue=true` to include FTUE progress.
- Response JSON:

```
{
  "id": "uuid",
  "email": "user@example.com",
  "ritualTime": "21:30",
  "ftueState": {
    "completed": false,
    "currentStep": "set_ritual_time"
  },
  "createdAt": "2025-10-25T22:10:00Z",
  "updatedAt": "2025-10-25T22:10:00Z"
}
```

- Success Codes: `200 OK` profile returned.
- Error Codes: `401 Unauthorized` missing token; `404 Not Found` profile missing; `500 Internal Server Error`.

#### PUT /me

- Description: Update profile preferences including ritual time and FTUE completion flags.
- Query Parameters: None.
- Request JSON:

```
{
  "ritualTime": "18:00",
  "ftueState": {
    "completed": true,
    "completedAt": "2025-11-01T10:30:00Z"
  }
}
```

- Response JSON mirrors `GET /me`.
- Success Codes: `200 OK` profile updated.
- Error Codes: `400 Bad Request` invalid time format; `401 Unauthorized`; `409 Conflict` due to concurrent update; `422 Unprocessable Entity` ritual outside presets; `500 Internal Server Error`.

### MoodEntry

#### GET /mood-entries

- Description: List mood entries for the authenticated user with pagination, filtering, and sorting.
- Query Parameters: `page` default 1; `pageSize` default 10, max 50; `from` ISO date filter inclusive; `to` ISO date filter inclusive; `tag` repeatable; `sort` accepts `created_at` (default desc) or `score`.
- Response JSON:

```
{
  "entries": [
    {
      "id": 123,
      "score": 4,
      "note": "Felt productive today",
      "tags": ["work"],
      "createdAt": "2025-11-01T08:10:00Z",
      "aiSuggestion": {
        "status": "completed",
        "text": "Nice work keeping up momentum. Take a short break to celebrate your progress."}
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 24,
    "hasNext": true
  }
}
```

- Success Codes: `200 OK` entries returned.
- Error Codes: `400 Bad Request` invalid pagination; `401 Unauthorized`; `422 Unprocessable Entity` invalid tag filter; `500 Internal Server Error`.

#### GET /mood-entries/{id}

- Description: Retrieve a single mood entry detail owned by the authenticated user.
- Query Parameters: Optional `includeSuggestion=true` to force fetch of AI suggestion.
- Response JSON mirrors single entry object including full note, tags, AI suggestion, moderation flag.
- Success Codes: `200 OK` entry returned.
- Error Codes: `401 Unauthorized`; `403 Forbidden` access to another user’s entry denied; `404 Not Found` entry missing; `500 Internal Server Error`.

#### POST /mood-entries

- Description: Create a mood entry, run moderation, emit analytics, and trigger AI suggestion generation with 2.5 s timeout fallback.
- Query Parameters: Optional `dryRun=true` for validation-only responses.
- Request JSON:

```
{
  "score": 3,
  "note": "Feeling overwhelmed with deadlines",
  "tags": ["work", "stress"],
  "requestSuggestion": true
}
```

- Response JSON:

```
{
  "entry": {
    "id": 124,
    "score": 3,
    "note": "Feeling overwhelmed with deadlines",
    "tags": ["work", "stress"],
    "createdAt": "2025-11-01T09:00:00Z",
    "moderation": {
      "status": "clear",
      "matchedTerms": []
    }
  },
  "aiSuggestion": {
    "status": "fallback",
    "source": "phrasebook",
    "text": "Deadlines can pile up. Break tasks into smaller wins and ask for help if you need it.",
    "generatedAt": "2025-11-01T09:00:01Z",
    "responseTimeMs": 1200
  },
  "analytics": {
    "entrySavedEventId": "uuid",
    "aiShownEventId": "uuid"
  }
}
```

- Success Codes: `201 Created` entry stored; `202 Accepted` entry stored but AI suggestion still pending (client to poll `/mood-entries/{id}` or receive websocket update).
- Error Codes: `400 Bad Request` validation errors; `401 Unauthorized`; `409 Conflict` duplicate entry within cooldown window (optional protection); `422 Unprocessable Entity` score/tag/note constraints; `429 Too Many Requests`; `500 Internal Server Error`.

#### POST /mood-entries/{id}/ai-feedback

- Description: Record whether the AI or fallback suggestion was helpful.
- Query Parameters: None.
- Request JSON:

```
{
  "helpful": true
}
```

- Response JSON:

```
{
  "entryId": 124,
  "aiHelpful": true,
  "recordedAt": "2025-11-01T09:02:00Z"
}
```

- Success Codes: `200 OK` feedback recorded.
- Error Codes: `400 Bad Request` feedback already recorded; `401 Unauthorized`; `404 Not Found` entry missing; `409 Conflict` concurrency issue; `500 Internal Server Error`.

#### POST /mood-entries/{id}/suggestion/retry

- Description: Retry AI suggestion generation when initial attempt timed out or skipped due to moderation-safe content.
- Query Parameters: None.
- Request JSON: empty object.
- Response JSON mirrors `POST /mood-entries` `aiSuggestion` block with updated status.
- Success Codes: `202 Accepted` retry queued.
- Error Codes: `400 Bad Request` suggestion not eligible for retry; `401 Unauthorized`; `404 Not Found`; `409 Conflict` retry in-flight; `500 Internal Server Error`.

### Dashboard

#### GET /dashboard/summary

- Description: Provide streak, last seven entries, trend classification, and ritual reminder state.
- Query Parameters: Optional `tz` for timezone adjustments defaulting to profile settings.
- Response JSON:

```
{
  "streak": 5,
  "trend": "improvement",
  "entries": [
    {"id": 120, "score": 2, "createdAt": "2025-10-27T21:45:00Z", "tags": ["sleep"], "notePreview": "Slept poorly..."}
  ],
  "reminder": {
    "shouldRemind": true,
    "ritualTime": "21:30",
    "message": "You have not logged a mood since your ritual time today."
  }
}
```

- Success Codes: `200 OK` summary returned.
- Error Codes: `401 Unauthorized`; `500 Internal Server Error`.

### AnalyticsEvent

#### POST /analytics/events

- Description: Ingest anonymised analytics events ensuring no sensitive note content is submitted.
- Query Parameters: Optional `batch=true` to accept array payload.
- Request JSON:

```
{
  "events": [
    {
      "type": "entry_saved",
      "entryId": 124,
      "timestamp": "2025-11-01T09:00:00Z",
      "metadata": {
        "source": "fast_entry"
      }
    }
  ]
}
```

- Response JSON:

```
{
  "accepted": 1,
  "failed": 0
}
```

- Success Codes: `202 Accepted` events queued.
- Error Codes: `400 Bad Request` invalid event type or payload with sensitive fields; `401 Unauthorized`; `413 Payload Too Large`; `422 Unprocessable Entity` metadata validation; `429 Too Many Requests`; `500 Internal Server Error`.

### AIErrorLog

#### GET /ai/errors

- Description: Service-role endpoint for monitoring unresolved AI generation errors.
- Query Parameters: `severity` filter default `error`; `resolved` boolean; `page`; `pageSize`.
- Response JSON:

```
{
  "errors": [
    {
      "id": 55,
      "userId": "uuid",
      "model": "gpt-4o-mini",
      "errorCode": "timeout",
      "errorMessage": "Request exceeded 2500ms",
      "severity": "error",
      "createdAt": "2025-11-01T09:00:01Z"
    }
  ]
}
```

- Success Codes: `200 OK` errors listed.
- Error Codes: `401 Unauthorized`; `403 Forbidden` non-service role access; `500 Internal Server Error`.

#### PATCH /ai/errors/{id}/resolve

- Description: Mark an AI error as resolved with optional notes.
- Query Parameters: None.
- Request JSON:

```
{
  "resolved": true,
  "resolutionNote": "Increased timeout to 2500ms",
  "resolvedAt": "2025-11-01T10:00:00Z"
}
```

- Response JSON mirrors error object with updated fields.
- Success Codes: `200 OK` error updated.
- Error Codes: `400 Bad Request` invalid resolution state; `401 Unauthorized`; `403 Forbidden`; `404 Not Found`; `409 Conflict` already resolved; `500 Internal Server Error`.

### Account Management

#### DELETE /me

- Description: Permanently delete Supabase user, profile, mood entries, analytics pointers, and active sessions.
- Query Parameters: Optional `hardConfirm=true` requiring client-side re-affirmation.
- Request JSON:

```
{
  "reason": "no_longer_needed",
  "confirm": true
}
```

- Response JSON:

```
{
  "message": "Account deleted",
  "deletedAt": "2025-11-01T09:15:00Z"
}
```

- Success Codes: `202 Accepted` deletion job started; `204 No Content` deletion completed synchronously.
- Error Codes: `400 Bad Request` missing confirmation; `401 Unauthorized`; `409 Conflict` pending AI job prevents deletion; `500 Internal Server Error`.

### Health and Diagnostics

#### GET /health/live

- Description: Lightweight liveness probe for deployment orchestration.
- Query Parameters: None.
- Response JSON: `{ "status": "live" }`.
- Success Codes: `200 OK` service alive.
- Error Codes: `500 Internal Server Error` fatal state.

#### GET /health/ready

- Description: Readiness probe verifying Supabase connectivity, OpenRouter latency budget, and configuration completeness.
- Query Parameters: None.
- Response JSON includes dependency checklist.
- Success Codes: `200 OK` service ready; `503 Service Unavailable` dependency failing.
- Error Codes: `500 Internal Server Error` unexpected failure.

## 3. Authentication and Authorization

- Supabase Auth JWT access tokens delivered via `Authorization: Bearer <token>` header secure all user-facing endpoints except registration, login, password reset, and public meta endpoints. Refresh tokens stored in HttpOnly cookies for web clients.
- Rely on Supabase Row Level Security once re-enabled; until then, enforce user scoping in the API by comparing `user.id` against resource owners prior to data access.
- Service-role API keys required for `GET /ai/errors` and `PATCH /ai/errors/{id}/resolve`; keys transmitted via `x-service-key` header and validated against Supabase service key or internal secret.
- Rate limiting: 60 requests per minute per authenticated user and 10 per minute for anonymous endpoints (registration, login, reset). Burst controls via token bucket middleware.
- CORS: locked to frontend origin with `Authorization` and `Content-Type` headers exposed. Apply CSRF protection for cookie-based flows where applicable.
- Sensitive operations (account deletion) require re-authentication within last 10 minutes or submission of password to mitigate session hijacking.

## 4. Validation and Business Logic

- `UserProfile`: `ritualTime` must match preset list (`18:00`, `21:30`); FTUE flags tracked with timestamps. Updates require optimistic concurrency via `updated_at` check to avoid lost writes.
- `MoodEntry`: `score` integer 1–5 enforced server-side before insert; `note` optional with ceiling 280 characters; `tags` array limited to two items drawn from `/meta/tags` catalog; reject unknown tags and duplicate entries per day if business rule applied. Moderation module screens notes against crisis wordlist before AI calls; flagged entries respond with `moderation.status=flagged`, skip AI call, and include crisis resources.
- AI workflow: asynchronous job triggers GPT-4o-mini via OpenRouter with 2.5 s timeout; fallback phrasebook keyed by `(score, topTag)` used on failure, timeout, or moderation skip. Response payload includes `status` values `pending`, `completed`, `fallback`, `skipped` for client UI. Hash mood notes when logging `generation_error_logs` to avoid storing raw text per privacy requirement.
- Analytics: `POST /analytics/events` only permits whitelisted event types (`entry_saved`, `ai_shown`, `ai_helpful_yes`, `ai_helpful_no`), enforces omission of note content, and augments with user ID server-side. Duplicate helpful events rejected to satisfy single rating per entry.
- Dashboard trend: `GET /dashboard/summary` computes trend by comparing average scores over recent three days against prior four, returning `improvement`, `stable`, `decline`, or `insufficient_data`. Streak calculation leverages database function `app.get_user_streak` (or replicate logic in service) and caches daily results.
- Account deletion: transactionally delete `users_profile`, `mood_entries`, analytics records, and Supabase auth user. Queue background job to purge `generation_error_logs` if present. Confirm zone ensures no residual personal data remains, supporting privacy commitments.
- Error handling: API returns problem-detail JSON with `code`, `message`, and `details` fields; all logs exclude user note content. Instrumentation attaches correlation IDs for tracing AI failures and moderation outcomes.
