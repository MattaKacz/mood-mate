# MoodMate - Plan Bazy Danych

## 1. Tabele

### 1.1. auth.users (Supabase Auth)

- **Cel:** Tabela użytkowników zarządzana przez Supabase Auth; wystawiona tylko jako referencja.
- **Kolumny**
  - `id UUID PRIMARY KEY`
  - `email VARCHAR(255) NOT NULL UNIQUE`
  - `encrypted_password VARCHAR NOT NULL`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `confirmed_at TIMESTAMPTZ`
- **Uwagi:** Kod aplikacji powinien korzystać z Supabase Auth APIs; brak bezpośrednich zapisów z migracji poza początkową konfiguracją.

### 1.2. users_profile

- **Cel:** Przechowuje preferencje i ustawienia użytkowników aplikacji MoodMate.
- **Kolumny**
  - `id UUID PRIMARY KEY REFERENCES auth.users(id)`
  - `ritual_time TIME NOT NULL DEFAULT '21:30:00'` - preferowany czas codziennego rytuału sprawdzania nastroju
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- **Uwagi:** `updated_at` automatycznie aktualizowane przez trigger `app.trg_touch_updated_at`. Domyślny czas rytuału to 21:30 zgodnie z PRD.

### 1.3. mood_entries

- **Cel:** Główna tabela przechowująca codzienne wpisy o nastroju użytkowników.
- **Kolumny**
  - `id BIGSERIAL PRIMARY KEY`
  - `user_id UUID NOT NULL REFERENCES auth.users(id)`
  - `score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5)` - ocena nastroju w skali 1-5
  - `note VARCHAR(280)` - opcjonalna notatka (max 280 znaków, jak tweet)
  - `tags app.mood_tag[] NOT NULL DEFAULT '{}' CHECK (array_length(tags, 1) <= 2)` - maksymalnie 2 tagi
  - `ai_response TEXT` - odpowiedź AI na wpis (dla analityki)
  - `ai_helpful BOOLEAN` - czy użytkownik oznaczył odpowiedź AI jako pomocną
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- **Uwagi:**
  - W PoC nie ma możliwości edycji/usuwania wpisów (będzie w MVP)
  - `updated_at` aktualizowane przez trigger `app.trg_touch_updated_at`
  - Tagi ograniczone do maksymalnie 2 zgodnie z PRD

### 1.4. generation_error_logs

- **Cel:** Logowanie błędów podczas generowania odpowiedzi AI dla wpływ na troubleshooting i analitykę.
- **Kolumny**
  - `id BIGSERIAL PRIMARY KEY`
  - `user_id UUID NOT NULL REFERENCES auth.users(id)`
  - `model VARCHAR NOT NULL` - model AI użyty do generowania
  - `source_text_hash VARCHAR NOT NULL` - hash tekstu źródłowego
  - `source_text_length INTEGER NOT NULL CHECK (source_text_length BETWEEN 1000 AND 10000)`
  - `error_code VARCHAR(100) NOT NULL`
  - `error_message TEXT NOT NULL`
  - `request_id UUID NOT NULL DEFAULT gen_random_uuid()` - do śledzenia powiązanych błędów
  - `correlation_id VARCHAR(100)` - opcjonalne powiązanie z zewnętrznymi logami
  - `severity app.error_severity NOT NULL DEFAULT 'error'`
  - `resolved_at TIMESTAMPTZ` - kiedy błąd został rozwiązany
  - `resolution_note TEXT` - notatka o rozwiązaniu
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- **Uwagi:** Partial index na nierozwiązanych błędach krytycznych dla szybkiego monitoringu.

### 1.5. Obiekty wspierające

- **Schema:** `app` - własny schemat dla obiektów aplikacji
- **Enum:** `app.mood_tag AS ENUM ('work', 'stress', 'sleep', 'energy', 'family', 'health', 'motivation', 'rest', 'relationships', 'social', 'study', 'diet')`
- **Enum:** `app.error_severity AS ENUM ('debug', 'info', 'warning', 'error', 'critical')`
- **Trigger Function:** `app.trg_touch_updated_at()` - wspólna funkcja triggerowa do automatycznego ustawiania `updated_at = now()` przed UPDATE
- **View:** `app.error_monitoring` - agregacja błędów po godzinach z ostatnich 24h dla celów monitoringowych

## 2. Relacje

- `auth.users (1:1) users_profile` via `users_profile.id`
- `auth.users (1:N) mood_entries` via `mood_entries.user_id`
- `auth.users (1:N) generation_error_logs` via `generation_error_logs.user_id`

## 3. Indeksy

### users_profile

- Primary key automatyczny na `id`

### mood_entries

- `mood_entries_user_id_idx` on `mood_entries (user_id)`
- `mood_entries_created_at_idx` on `mood_entries (created_at)`
- `mood_entries_user_id_created_at_idx` on `mood_entries (user_id, created_at DESC)` - dla efektywnego pobierania historii nastroju użytkownika

### generation_error_logs

- `generation_error_logs_user_id_idx` on `generation_error_logs (user_id)`
- `generation_error_logs_created_at_idx` on `generation_error_logs (created_at DESC)`
- `generation_error_logs_request_id_idx` on `generation_error_logs (request_id)`
- `generation_error_logs_unresolved_critical_idx` on `generation_error_logs (created_at DESC) WHERE severity = 'critical' AND resolved_at IS NULL` - partial index dla krytycznych nierozwiązanych błędów
- `generation_error_logs_user_date_idx` on `generation_error_logs (user_id, created_at DESC)`

## 4. Row-Level Security (RLS)

**Status:** RLS jest obecnie **wyłączony** na wszystkich tabelach (migracja 20251025000004).

**Poprzednie polityki (obecnie nieaktywne):**

- `users_profile`: użytkownicy mogli SELECT/INSERT/UPDATE/DELETE tylko własnych profili
- `mood_entries`: użytkownicy mogli SELECT/INSERT tylko własnych wpisów
- `generation_error_logs`: użytkownicy mogli SELECT/INSERT własnych logów, UPDATE tylko dla service_role

**Uwaga:** W wersji produkcyjnej zalecane jest ponowne włączenie RLS dla bezpieczeństwa.

## 5. Funkcje pomocnicze

### app.get_user_streak(p_user_id UUID) → INTEGER

- **Cel:** Oblicza aktualny streak (ciąg kolejnych dni z wpisami) dla użytkownika
- **Logika:**
  - Zwraca 0 jeśli brak wpisów lub ostatni wpis jest sprzed więcej niż 1 dnia
  - Liczy wstecz kolejne dni z wpisami

### app.get_weekly_trend(p_user_id UUID) → TEXT

- **Cel:** Oblicza trend nastroju w ciągu ostatniego tygodnia
- **Zwraca:** `'improvement'`, `'decline'`, `'stable'`, lub `'insufficient_data'`
- **Logika:** Porównuje średnią z ostatnich 3 dni z średnią z poprzednich 4 dni

### app.get_recent_errors(p_user_id UUID, p_days INTEGER DEFAULT 7)

- **Cel:** Pobiera ostatnie błędy AI dla użytkownika
- **Zwraca:** Tabelę z id, error_code, error_message, severity, created_at

### app.get_error_stats(p_user_id UUID, p_start_date, p_end_date)

- **Cel:** Oblicza statystyki błędów dla użytkownika w danym okresie
- **Zwraca:** total_errors, critical_errors, resolved_errors, avg_resolution_time

## 6. Uwagi dodatkowe

- Trigger `app.trg_touch_updated_at` jest aplikowany do tabel: `users_profile` i `mood_entries`
- Wszystkie funkcje używają `SECURITY DEFINER` - wykonują się z uprawnieniami właściciela funkcji
- View `app.error_monitoring` ma nadane uprawnienia SELECT dla ról `authenticated` i `service_role`
- W PoC brak możliwości edycji/usuwania wpisów nastroju - zostanie dodane w MVP
- Domyślny czas rytuału (21:30) zgodny z PRD aplikacji MoodMate
