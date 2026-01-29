# Architektura UI dla MoodMate

## 1. Przegląd struktury UI

MoodMate ma architekturę **hybrydową**: część publiczna jest renderowana jako strony Astro (szybkie, lekkie, SEO), a część zalogowana działa jako **jedna aplikacja kliencka (app-shell)** osadzona w Astro, z routowaniem po stronie klienta i wspólnymi providerami (sesja, cache danych, toasty, obsługa błędów).

### 1.1. Strefy aplikacji

- **Public (Astro)**
  - Logowanie, rejestracja, reset hasła, polityka prywatności/warunki, zasoby kryzysowe.
  - Cel: szybki onboarding + zgodność (18+, zgody, privacy).
- **Private (App-shell, React)**
  - Dashboard, fast entry (dodanie nastroju), szczegół wpisu, (opcjonalnie) historia, ustawienia, usunięcie konta, FTUE wizard.
  - Cel: płynna interakcja bez przeładowań, obsługa stanów asynchronicznych (AI), prywatność (brak persystencji treści na dysku).

### 1.2. Globalne zasady UX / a11y / bezpieczeństwa

- **Auth guard (3 stany)**: `loading` (sprawdzanie sesji), `authenticated`, `unauthenticated`.
  - Źródło prawdy: `GET /auth/session`. `401` → automatyczny redirect do `/login` (bez „migania” prywatnych treści).
- **Dane profilu jako warunek renderowania**:
  - Po pozytywnym `GET /auth/session` UI pobiera `GET /me` i trzyma profil w query-cache; `ftueState` steruje FTUE (bez dublowania stanu w localStorage).
- **Prywatność**:
  - Brak persystencji dyskowej dla treści wpisów (note, tagi) w UI.
  - Analityka i logi UI: **nigdy** nie zawierają `note` ani pełnych treści wpisów.
- **Dostępność**:
  - Pełna obsługa klawiaturą, focus management w modalach, `aria-*` w kontrolkach formularzy.
  - Widoczny focus, czytelne komunikaty błędów, poprawne role (np. `radiogroup` dla nastroju).
- **Stany błędów i limitów**:
  - `422/400`: błędy walidacji mapowane na pola formularzy.
  - `429`: jasny komunikat + blokada akcji + „spróbuj ponownie” po czasie.
  - Sieć/`5xx`: globalne toasty + retry, bez utraty danych z formularza.
- **Moderacja**:
  - Jeśli notatka trafia na listę kryzysową: UI nie wysyła jej do AI (zgodnie z backendem), pokazuje baner/modał z zasobami AU i umożliwia „Edit” lub „Save without AI”.

### 1.3. Integracja z API – podstawowy kontrakt UI

- **Sesja i stan zalogowania**
  - `GET /auth/session` (inicjalny „handshake” w app-shell + okresowe odświeżanie).
  - `POST /auth/logout` (wylogowanie).
- **Profil**
  - `GET /me` (profil + `ftueState` + `ritualTime`).
  - `PUT /me` (zmiana `ritualTime`, FTUE completion; ewentualnie `timezone` – patrz pytania).
- **Meta-konfiguracja**
  - `GET /meta/tags` (katalog tagów jako źródło prawdy).
  - `GET /meta/ritual-presets` (opcje/domyślna).
  - `GET /meta/crisis-resources` (treść „Crisis resources” i banerów).
- **Wpisy nastroju**
  - `POST /mood-entries` (zapis wpisu; sugestia AI może być od razu albo „pending”).
  - `GET /dashboard/summary` (streak, trend, 7 dni, reminder).
  - `GET /mood-entries` (historia/paginacja/filtry – jeśli widok History wchodzi do PoC).
  - `GET /mood-entries/{id}` (szczegół wpisu + status sugestii).
  - `POST /mood-entries/{id}/ai-feedback` (helpful / not helpful).
  - `POST /mood-entries/{id}/suggestion/retry` (retry sugestii, jeśli eligible).
- **Reset hasła**
  - `POST /auth/password/reset-request`
  - `POST /auth/password/reset-complete`

### 1.4. Napięcia / sprzeczności do wykrycia (i jak UI je „absorbuje”)

- **Reminder: UI vs API**
  - Notatki sugerują liczenie przypomnienia po stronie UI, ale API plan zwraca gotowy blok `reminder` w `GET /dashboard/summary` i przyjmuje `tz`.
  - UI powinien umieć działać w obu trybach: preferować `reminder` z API, a lokalne liczenie traktować jako fallback (albo odwrotnie – do decyzji).
- **Timezone w Settings**
  - Notatki zakładają pole „timezone”, ale próbki `GET /me`/`PUT /me` go nie zawierają.
  - UI może: (a) ukryć „timezone” do czasu wsparcia w API, (b) trzymać timezone tylko w UI (ryzykowne – sprzeczne z „źródłem prawdy w profilu”), (c) rozszerzyć API.

### 1.5. Pytania do doprecyzowania (celowo na końcu, bo wpływają na routy i widoki)

- **Router**: wybieramy React Router czy TanStack Router (ze wsparciem „modal jako route” i deep linków)?
- **Profile timezone**: czy `timezone` ma być polem w `users_profile` i wspierane przez `GET/PUT /me`?
- **Retry AI**: czy `POST /mood-entries/{id}/suggestion/retry` na pewno istnieje w implementacji i jakie są reguły „eligible”?
- **Polling UX**: po 8 s bez rozstrzygnięcia – pokazujemy „still processing”, czy od razu fallback (jeśli backend już go ma)?
- **History**: czy widok `/app/history` wchodzi do PoC, czy zostaje dopiero po Dashboard + modal szczegółu?

## 2. Lista widoków

Poniżej każdy widok zawiera: nazwę, ścieżkę, cel, kluczowe informacje, komponenty oraz względy UX/a11y/bezpieczeństwa.

### 2.1. Widoki publiczne (Astro)

#### 2.1.1. Login
- **Nazwa widoku**: Login
- **Ścieżka widoku**: `/login`
- **Główny cel**: zalogować użytkownika i przekierować do strefy prywatnej.
- **Kluczowe informacje**:
  - Formularz email/hasło
  - Linki: Register, Forgot password, Privacy/Terms
- **Kluczowe komponenty widoku**:
  - Formularz logowania (RHF + walidacja)
  - Globalny „status” błędu (np. „Invalid credentials”)
- **UX, dostępność i bezpieczeństwo**:
  - Nie ujawniać szczegółów błędów (`401` jako komunikat ogólny).
  - Obsługa `429` (cooldown + disabled submit).
  - Focus po błędzie na pierwszym błędnym polu; `aria-live` dla komunikatów.
- **Integracje API**:
  - `POST /auth/login`
  - (opcjonalnie) po sukcesie `GET /auth/session` dla potwierdzenia i redirect.

#### 2.1.2. Register
- **Nazwa widoku**: Register
- **Ścieżka widoku**: `/register`
- **Główny cel**: rejestracja z wymuszeniem 18+ i zgód.
- **Kluczowe informacje**:
  - Email, hasło (min. siła)
  - Checkboxy: 18+ (confirmAdult), Terms/Privacy (acceptTerms)
  - Link do polityki prywatności i disclaimerów
- **Kluczowe komponenty widoku**:
  - Formularz rejestracji z walidacją siły hasła (UI + backend)
  - Sekcja „Terms/Privacy” z linkami
- **UX, dostępność i bezpieczeństwo**:
  - Przycisk submit disabled bez zaznaczenia checkboxów.
  - `409` (email istnieje) → komunikat neutralny; brak enumeracji kont.
- **Integracje API**:
  - `POST /auth/register`

#### 2.1.3. Forgot password (reset request)
- **Nazwa widoku**: Reset hasła – prośba
- **Ścieżka widoku**: `/password/reset`
- **Główny cel**: wysłać email z linkiem resetu.
- **Kluczowe informacje**:
  - Pole email + komunikat potwierdzenia (soft-success).
- **Kluczowe komponenty widoku**:
  - Formularz email, ekran sukcesu „If the email exists…”
- **UX, dostępność i bezpieczeństwo**:
  - Nie ujawniać, czy email istnieje (`404` może być soft-success).
- **Integracje API**:
  - `POST /auth/password/reset-request`

#### 2.1.4. Reset password (complete)
- **Nazwa widoku**: Reset hasła – ustaw nowe
- **Ścieżka widoku**: `/password/reset/complete`
- **Główny cel**: przyjąć token (oobToken) i ustawić nowe hasło.
- **Kluczowe informacje**:
  - Nowe hasło + potwierdzenie, komunikat o sukcesie
- **Kluczowe komponenty widoku**:
  - Formularz nowego hasła
- **UX, dostępność i bezpieczeństwo**:
  - Obsługa `401` (token wygasł) z CTA „Send again”.
- **Integracje API**:
  - `POST /auth/password/reset-complete`

#### 2.1.5. Privacy / Terms
- **Nazwa widoku**: Privacy Policy / Terms
- **Ścieżka widoku**: `/privacy` oraz `/terms` (lub jedna strona z zakładkami)
- **Główny cel**: spełnić wymagania zgód i dostarczyć disclaimer („not medical advice”).
- **Kluczowe informacje**:
  - Treść polityki (EN, AU), disclaimer
  - Link powrotny do login/register
- **Kluczowe komponenty widoku**:
  - Statyczna treść (Astro) + anchor links
- **UX, dostępność i bezpieczeństwo**:
  - Czytelna typografia, spis treści, fokus/klawiatura.

#### 2.1.6. Crisis resources (public)
- **Nazwa widoku**: Crisis resources
- **Ścieżka widoku**: `/crisis-resources`
- **Główny cel**: stały, łatwy dostęp do numerów AU.
- **Kluczowe informacje**:
  - Emergency 000, Lifeline 13 11 14, Beyond Blue 1300 22 4636
- **Kluczowe komponenty widoku**:
  - Lista kontaktów + możliwość „tap-to-call” na mobile
- **UX, dostępność i bezpieczeństwo**:
  - Widoczne ostrzeżenie, że aplikacja nie jest pomocą kryzysową.
- **Integracje API**:
  - Preferowane: `GET /meta/crisis-resources` (z fallbackiem statycznym).

### 2.2. Strefa prywatna (App-shell, React)

#### 2.2.1. App Shell (root)
- **Nazwa widoku**: App Shell (Layout)
- **Ścieżka widoku**: `/app/*` (kontener dla widoków prywatnych)
- **Główny cel**: zapewnić wspólny layout, providerów, guard i nawigację.
- **Kluczowe informacje**:
  - Stan auth (`loading`/`authenticated`/`unauthenticated`)
  - Globalny profil (`GET /me`) i meta (`/meta/*`)
- **Kluczowe komponenty widoku**:
  - `AuthGuard`
  - `QueryCacheProvider`
  - `ErrorBoundary`
  - `ToastProvider`
  - `AnalyticsClientProvider`
  - `CrisisResourcesLink` (stały link)
- **UX, dostępność i bezpieczeństwo**:
  - Podczas `loading`: skeleton/loader bez treści wrażliwych.
  - Po `401`: natychmiastowy redirect do `/login` + czyszczenie wrażliwych danych z pamięci.
- **Integracje API**:
  - `GET /auth/session` (inicjalnie + refetch)
  - `GET /me` (po zalogowaniu)
  - `GET /meta/tags`, `GET /meta/ritual-presets`, `GET /meta/crisis-resources`

#### 2.2.2. FTUE Wizard (max 3 kroki)
- **Nazwa widoku**: FTUE Wizard
- **Ścieżka widoku**: `/app/ftue`
- **Główny cel**: przeprowadzić użytkownika przez onboarding (max 3 ekrany) z opcją Skip.
- **Kluczowe informacje**:
  - Krok 1: wartość produktu (krótkie)
  - Krok 2: ustawienie `ritualTime` (presety)
  - Krok 3: pierwszy wpis (może przekierować do `/app/entry/new`)
- **Kluczowe komponenty widoku**:
  - Progress indicator (3 kroki max)
  - CTA: Next / Skip
  - Formularz ritual time (presety)
- **UX, dostępność i bezpieczeństwo**:
  - Skip nie „psuje” profilu: stan FTUE zapisany w `ftueState` w profilu.
  - Nie trzymać FTUE w localStorage jako źródło prawdy.
- **Integracje API**:
  - `GET /me` (warunek wejścia)
  - `PUT /me` (zapis `ritualTime` i/lub `ftueState.completed`)

#### 2.2.3. Dashboard
- **Nazwa widoku**: Dashboard
- **Ścieżka widoku**: `/app/dashboard` (landing po zalogowaniu)
- **Główny cel**: szybki wgląd (streak, trend, 7 dni) i CTA „Add mood”.
- **Kluczowe informacje**:
  - Streak, trend (poprawa/stabilnie/spadek)
  - Lista ostatnich 7 wpisów (data, emoji/score, tagi, preview notatki)
  - Reminder po ritual time (w dniu dzisiejszym)
- **Kluczowe komponenty widoku**:
  - `DashboardSummaryCard` (streak + trend)
  - `EntryList7Days` (klik → modal szczegółu wpisu)
  - CTA `AddMoodButton` → `/app/entry/new`
  - `RitualReminderBanner` (warunkowy)
- **UX, dostępność i bezpieczeństwo**:
  - Puste stany (brak wpisów) z CTA.
  - Preview notatki nie powinien ujawniać zbyt wiele na małym ekranie (prywatność „over the shoulder”).
  - „Crisis resources” link zawsze dostępny (w topbar/stopce).
- **Integracje API**:
  - `GET /dashboard/summary` (z `tz` jeśli wspierane)
  - (opcjonalnie) `GET /mood-entries/{id}` przy otwarciu szczegółu

#### 2.2.4. Fast entry (Add mood)
- **Nazwa widoku**: Add mood (Fast entry)
- **Ścieżka widoku**: `/app/entry/new`
- **Główny cel**: zapisać wpis w ≤30s, bez przeładowania, z natychmiastowym potwierdzeniem.
- **Kluczowe informacje**:
  - Score 1–5 (emoji), wymagane
  - Note (opcjonalne, limit 280), licznik znaków
  - Tags: maks. 2 z katalogu (UI blokuje 3. wybór)
  - Sugestia AI (sekcja asynchroniczna, nie blokuje zapisu)
- **Kluczowe komponenty widoku**:
  - `MoodScorePicker` jako `radiogroup`
  - `NoteTextarea` z licznikiem i walidacją
  - `TagSelectorChips` (max 2, źródło: `/meta/tags` + fallback)
  - `SaveButton` + inline success („Saved”)
  - `ModerationDecisionModal` (Edit vs Save without AI)
  - `AiSuggestionPanel` (statusy: `pending/loading`, `completed`, `fallback`, `skipped`)
- **UX, dostępność i bezpieczeństwo**:
  - Optimistic UI: wpis natychmiast pojawia się na liście (tempId) i jest reconcile po odpowiedzi.
  - Po błędzie zapisu: zachować dane w formularzu + przycisk Retry.
  - Moderacja: przy trafieniu UI wyjaśnia, że sugestia AI nie zostanie wygenerowana; pokazuje zasoby AU.
  - W modalu: trap focus, jasne CTA, ESC zamyka tylko gdy to bezpieczne (nie traci danych).
- **Integracje API**:
  - `POST /mood-entries` (z `requestSuggestion: true/false`)
  - Jeśli `202 Accepted`: polling `GET /mood-entries/{id}` (budżet ~8s, interwał ~1s z backoff)
  - Jeśli feedback: `POST /mood-entries/{id}/ai-feedback`
  - Retry sugestii: `POST /mood-entries/{id}/suggestion/retry` (jeśli dostępne/eligible)
  - Analityka: `POST /analytics/events` (`entry_saved`, `ai_shown`, `ai_helpful_yes/no`) – bez `note`

#### 2.2.5. Entry detail (modal jako route)
- **Nazwa widoku**: Szczegół wpisu
- **Ścieżka widoku**: `/app/entries/:id` (modal na desktop, pełny ekran na mobile)
- **Główny cel**: podejrzeć pełny wpis: data/godzina, score/emoji, tagi, pełna notatka, status sugestii.
- **Kluczowe informacje**:
  - createdAt (z uwzględnieniem timezone)
  - score, tags, note (pełne)
  - `aiSuggestion` + ewentualny „helpful” status
  - `moderation` status (clear/flagged) + matched terms (ostrożnie w UI)
- **Kluczowe komponenty widoku**:
  - `EntryDetailModal`
  - `AiSuggestionCard` + `HelpfulButtons`
  - Link do „Crisis resources” jeśli moderacja flagged
- **UX, dostępność i bezpieczeństwo**:
  - Deep link: URL działa wprost (odświeżenie strony) i odtwarza stan modalu.
  - Prywatność: opcjonalny „tap to reveal note” (jeśli ryzyko „over the shoulder”).
- **Integracje API**:
  - `GET /mood-entries/{id}`
  - `POST /mood-entries/{id}/ai-feedback`
  - `POST /mood-entries/{id}/suggestion/retry` (jeśli status pending/failed/skipped i eligible)

#### 2.2.6. History (opcjonalne w PoC)
- **Nazwa widoku**: History
- **Ścieżka widoku**: `/app/history`
- **Główny cel**: lista wpisów z paginacją i filtrowaniem po tagach.
- **Kluczowe informacje**:
  - Lista wpisów (sort desc po dacie)
  - Filtr po tagu/tagach (jeśli wspierane)
  - Zakres dat (opcjonalnie)
- **Kluczowe komponenty widoku**:
  - `HistoryFilters` (tag chips, date range)
  - `EntryListPaginated` + `PaginationControls`
  - Klik w element → `/app/entries/:id`
- **UX, dostępność i bezpieczeństwo**:
  - „Empty state” dla filtrów (brak wyników).
  - Debounce filtrów i czytelne oznaczenie aktywnych filtrów.
- **Integracje API**:
  - `GET /mood-entries` (`page`, `pageSize`, `tag`, `from`, `to`, `sort`)

#### 2.2.7. Settings
- **Nazwa widoku**: Settings
- **Ścieżka widoku**: `/app/settings`
- **Główny cel**: zarządzanie ritual time, (opcjonalnie) timezone, działania konta (delete, logout).
- **Kluczowe informacje**:
  - Aktualny `ritualTime`
  - (opcjonalnie) timezone
  - Akcje: Logout, Delete account
- **Kluczowe komponenty widoku**:
  - `RitualTimePresetSelector` (18:00 / 21:30)
  - `TimezoneSelector` (tylko jeśli API wspiera)
  - `DangerZone` z CTA „Delete account”
  - `LogoutButton`
- **UX, dostępność i bezpieczeństwo**:
  - Zmiana ritual time: natychmiastowa informacja o sukcesie/błędzie.
  - Delete account: modal z nieodwracalnym potwierdzeniem.
- **Integracje API**:
  - `GET /me`, `PUT /me`
  - `POST /auth/logout`
  - `DELETE /me`

#### 2.2.8. Delete account (modal)
- **Nazwa widoku**: Delete account confirm
- **Ścieżka widoku**: `/app/settings/delete-account` (modal jako route)
- **Główny cel**: potwierdzić nieodwracalne usunięcie konta i danych.
- **Kluczowe informacje**:
  - Ostrzeżenie o trwałym usunięciu
  - Checkbox/tekst potwierdzający (np. „I understand”)
- **Kluczowe komponenty widoku**:
  - `ConfirmDialog` (z wymuszeniem świadomej akcji)
  - `DeleteAccountButton`
- **UX, dostępność i bezpieczeństwo**:
  - Domyślnie focus na „Cancel”.
  - Po sukcesie: wylogowanie i redirect do `/login` (bez pozostawiania danych w pamięci).
- **Integracje API**:
  - `DELETE /me`

#### 2.2.9. App Not Found / Error boundary
- **Nazwa widoku**: 404/500 (private)
- **Ścieżka widoku**: `/app/*` (fallback routera)
- **Główny cel**: bezpiecznie obsłużyć brak routy lub błąd runtime.
- **Kluczowe informacje**:
  - Prosty komunikat, link do Dashboard, przycisk „Reload”
- **Kluczowe komponenty widoku**:
  - `NotFoundState`
  - `ErrorBoundaryFallback`
- **UX, dostępność i bezpieczeństwo**:
  - Nie wyświetlać szczegółów błędów mogących zawierać dane.

## 3. Mapa podróży użytkownika

### 3.1. Główny przypadek użycia: rejestracja → FTUE → pierwszy wpis → sugestia AI

1. Użytkownik wchodzi na `/register`.
2. Wypełnia email/hasło, zaznacza **18+** i **zgodę na Terms/Privacy**.
3. UI wysyła `POST /auth/register`.
4. Po sukcesie: wejście do `/app/*`:
   - App-shell robi `GET /auth/session` → `GET /me`.
5. Jeśli `ftueState.completed = false`, auth guard przekierowuje do `/app/ftue`.
6. FTUE:
   - Krok presetów ritual time → `PUT /me`.
   - Krok „pierwszy wpis” → przejście do `/app/entry/new`.
7. Fast entry:
   - Użytkownik wybiera score (wymagane), opcjonalnie note i tagi (max 2).
   - UI waliduje lokalnie (280 znaków, max 2 tagi, score required).
8. Po Submit:
   - UI wysyła `POST /mood-entries`.
   - UI emituje `entry_saved` do `POST /analytics/events` (bez `note`).
9. Sugestia AI:
   - Jeśli odpowiedź ma status „completed/fallback/skipped”: UI pokazuje tekst i emituje `ai_shown`.
   - Jeśli `202` i status „pending”: UI pokazuje stan `pending` i zaczyna polling `GET /mood-entries/{id}` (budżet ~8s).
10. Użytkownik ocenia „Helpful / Not helpful”:
    - UI wysyła `POST /mood-entries/{id}/ai-feedback`
    - UI wysyła `ai_helpful_yes/no` do `POST /analytics/events`.

### 3.2. Powrót użytkownika: dashboard → reminder → szybki wpis

1. Użytkownik wraca do `/app/dashboard`.
2. UI pobiera `GET /dashboard/summary` (krótki TTL).
3. Jeśli `reminder.shouldRemind = true`, UI pokazuje łagodny banner + CTA „Add mood”.
4. CTA otwiera `/app/entry/new` (modal desktop / full-screen mobile).

### 3.3. Moderacja: treść kryzysowa

1. Użytkownik wpisuje notatkę z frazą trafiającą w wordlist/regex.
2. Po próbie zapisu (lub pre-check w UI, jeśli istnieje) UI pokazuje **modal decyzyjny**:
   - **Edit** → wraca do edycji notatki.
   - **Save without AI** → `POST /mood-entries` z `requestSuggestion=false` (lub backend sam „skips”).
3. UI pokazuje banner „Crisis resources” (AU) i nie wysyła notatki do modelu.

### 3.4. Błędy i retry

- **`422/400`**: błędy pól w formie inline + zachowanie danych.
- **`429`**: komunikat o limicie, disable submit, informacja o ponowieniu.
- **`5xx`/sieć**: toast „Something went wrong” + Retry (bez kasowania formularza).
- **AI pending timeout (UI)**: po przekroczeniu budżetu pollingowego:
  - stan „Still processing” + CTA „Retry suggestion” (jeśli endpoint retry) albo „Check later” (wróć do szczegółu wpisu).

## 4. Układ i struktura nawigacji

### 4.1. Nawigacja publiczna

- Minimalna (topbar/stopka): linki do `/privacy`, `/terms`, `/crisis-resources`.
- Na `/login` i `/register`: linki krzyżowe (Login ↔ Register) + „Forgot password”.

### 4.2. Nawigacja w app-shell

- **Globalny układ**
  - Topbar: logo, (opcjonalnie) „Add mood” jako główne CTA, menu użytkownika.
  - Mobile: dolna nawigacja (np. Dashboard / History / Settings) – jeśli History wchodzi.
- **Routy główne**
  - `/app/dashboard` (home)
  - `/app/settings`
  - `/app/history` (opcjonalnie)
- **Routy modalowe (deep linki)**
  - `/app/entry/new` jako modal (desktop) lub pełny ekran (mobile), ale ten sam URL.
  - `/app/entries/:id` jako modal/pełny ekran.
  - `/app/settings/delete-account` jako modal.
- **Reguły redirectów**
  - `unauthenticated` → `/login`
  - `authenticated` + `ftueState.completed=false` → `/app/ftue` (z zachowaniem celu po ukończeniu)

## 5. Kluczowe komponenty

Poniżej komponenty wielokrotnego użycia, które spajają architekturę UI:

- **AuthGuard**: stan `loading/auth/guest`, redirecty na `401`, ochrona prywatnych rout.
- **ApiClient**: jednolite wywołania HTTP + mapowanie błędów (`422` → pola, `429` → rate-limit UI).
- **QueryCacheProvider**: cache danych (krótki TTL dla `GET /dashboard/summary`, refetch-on-focus dla krytycznych danych).
- **AnalyticsClient**: whitelist eventów + runtime assertions blokujące wysyłkę `note`; kolejka w pamięci z ograniczonym retry.
- **AppShellLayout**: topbar/bottom-nav, stały link „Crisis resources”.
- **ModalRouteContainer**: modale jako routy z trap focus i poprawnym `aria-*`.
- **CrisisBanner / CrisisResourcesPanel**: treści z `/meta/crisis-resources` + fallback statyczny.
- **MoodScorePicker**: `radiogroup` 1–5, pełna obsługa klawiaturą.
- **TagSelectorChips**: wybór max 2 tagów, blokada 3. wyboru z komunikatem; źródło `/meta/tags`.
- **NoteTextareaWithCounter**: limit 280, komunikaty inline, `aria-describedby` do licznika/błędu.
- **AiSuggestionPanel**: stany `pending/completed/fallback/skipped`, logika polling/retry.
- **EntryList**: wariant 7-dniowy (dashboard) i paginowany (history), z linkami do szczegółu.
- **EntryDetailView**: pokaz pełnych danych, akcje helpful, retry sugestii.
- **RitualTimePresetSelector**: presety 18:00/21:30 + zapis do profilu.
- **ConfirmDangerDialog**: usunięcie konta, wymuszenie świadomej akcji.
- **ErrorBoundaryFallback + NotFoundState**: bezpieczne ekrany błędów.

### 5.1. Mapowanie historyjek użytkownika (US) → widoki / elementy UI

- **US-001** → `/register` (checkbox 18+, zgody, linki do `/privacy`), redirect do `/app/ftue`
- **US-002** → `/login` + `LogoutButton` w `/app/settings`
- **US-003** → `/password/reset` i `/password/reset/complete`
- **US-004** → `/app/ftue` (max 3 kroki, Skip)
- **US-005** → `/app/ftue` + `/app/settings` (ritual presets)
- **US-006 / US-007 / US-008 / US-009** → `/app/entry/new` (score required, note limit, tag limit 2)
- **US-010 / US-011** → `AiSuggestionPanel` w `/app/entry/new` i `/app/entries/:id` (timeout/fallback/pending)
- **US-012** → `HelpfulButtons` + integracja `POST /mood-entries/{id}/ai-feedback`
- **US-013 / US-027 / US-030** → `ModerationDecisionModal` + `CrisisBanner` + `/crisis-resources`
- **US-014 / US-015 / US-016** → `/app/dashboard` (streak, trend, reminder)
- **US-017** → `/app/history` (jeśli wchodzi) + filtry po tagach
- **US-018** → `/app/settings/delete-account` + `DELETE /me`
- **US-019** → `AuthGuard` oparty o `GET /auth/session` (utrzymanie sesji / redirect przy wygaśnięciu)
- **US-020** → a11y i RWD w całej aplikacji (modal/full-screen, klawiatura, focus states)
- **US-021** → `/privacy` + linki w `/login`, `/register` i stały link w app-shell + disclaimer
- **US-022** → `AnalyticsClient` + wywołania `POST /analytics/events` (bez `note`)
- **US-023** → retry dla zapisu i retry sugestii + jednolite komunikaty błędów
- **US-024** → wszystkie copy w UI w EN (architektura zakłada i18n brak; teksty jako stałe EN)
- **US-025** → walidacja hasła w `/register` + obsługa `422`
- **US-026** → `/app/entries/:id` jako modal route
- **US-028** → `/app/settings` (zmiana ritual time po FTUE)
- **US-029** → brak logowania treści w UI + analytics whitelist


