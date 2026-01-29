# Specyfikacja Techniczna Modułu Autentykacji (Auth Spec)

## Status dokumentu

**Wersja:** 1.0  
**Data:** 2026-01-11  
**Na podstawie:** PRD (US-001, US-002, US-003), Tech Stack

---

## 1. Architektura Interfejsu Użytkownika

### Koncepcja Ogólna (Hybrid Rendering)

Ze względu na specyfikę Astro 5, zastosujemy model hybrydowy:

- **Strony (Astro):** Statyczne ramy (szkielet) serwowane z serwera, zapewniające szybkie ładowanie LCP (Largest Contentful Paint) i SEO.
- **Komponenty Interaktywne (React):** Formularze i obsługa stanu walidacji jako "wyspy" (`client:load`).
- **Layout:** Dedykowany `AuthLayout` dla stron logowania/rejestracji, pozbawiony nawigacji aplikacyjnej, skupiony na formularzu.
- **Języki:** Copy w PL jako domyślne; kluczowe akcje (CTA, walidacje) powinny mieć możliwość przełączenia na EN w publicznych widokach (US-024).

### Struktura Stron i Komponentów

#### A. Layouty

1. **`src/layouts/AuthLayout.astro`**
   - Prosty kontener centrujący treść wertykalnie i horyzontalnie.
   - Brak bocznego paska nawigacji i stopki aplikacyjnej.
   - Slot na formularz.
   - Widoczny link do "Powrót do strony głównej" (jeśli dotyczy) lub linki pomocnicze (Polityka Prywatności).

#### B. Strony (Routing)

Wszystkie strony w `src/pages/` będą chronione (dla niezalogowanych) lub dostępne publicznie (dla zalogowanych przekierowanie do dashboard/FTUE) przez istniejący `middleware`.

1. **`/login` (`src/pages/login.astro`)**
   - Używa `AuthLayout`.
   - Zawiera komponent React: `<LoginForm client:load />`.
   - Link do rejestracji: "Nie masz konta? Zarejestruj się".
   - Link do resetu hasła: "Zapomniałeś hasła?".

2. **`/register` (`src/pages/register.astro`)**
   - Używa `AuthLayout`.
   - Zawiera komponent React: `<RegisterForm client:load />`.
   - Link do logowania: "Masz już konto? Zaloguj się".

3. **`/forgot-password` (`src/pages/forgot-password.astro`)** (Nowa strona)
   - Używa `AuthLayout`.
   - Zawiera komponent React: `<ForgotPasswordForm client:load />`.
   - Realizuje US-003.

4. **`/auth/reset-password` (`src/pages/auth/reset-password.astro`)** (Nowa strona)
   - Landing page dla linku z e-maila resetującego hasło.
   - Zawiera komponent React: `<UpdatePasswordForm client:load />`.

#### C. Komponenty React (`src/components/auth/`)

Użycie biblioteki `react-hook-form` z walidacją `zod` oraz komponentów UI z `shadcn/ui`.

1. **`LoginForm.tsx`**
   - Pola: Email, Hasło.
   - Akcja: `POST /api/auth/signin`.
   - Obsługa błędów: Wyświetlanie generycznego komunikatu "Błędny login lub hasło" (zgodnie z US-002).

2. **`RegisterForm.tsx`**
   - Pola: Email, Hasło.
   - Checkbox 1 (Wymagany): "Mam ukończone 18 lat i akceptuję Regulamin" (Self-attestation, US-001).
   - Checkbox 2 (Informacyjny): Link do Polityki Prywatności (zgodnie z US-021).
   - Walidacja hasła: Min. 8 znaków (US-025).
   - Akcja: `POST /api/auth/register`.

3. **`ForgotPasswordForm.tsx`**
   - Pola: Email.
   - Akcja: `POST /api/auth/reset-request`.
   - Feedback: "Jeśli konto istnieje, wysłaliśmy link..." (Security through obscurity).

4. **`UpdatePasswordForm.tsx`**
   - Pola: Nowe hasło, Powtórz hasło.
   - Akcja: `POST /api/auth/update-password`.

5. **`DeleteAccountButton.tsx`** (light)
   - CTA do usunięcia konta i danych (US-018).
   - Akcja: `POST /api/auth/delete-account`.
   - Wymaga potwierdzenia (modal); po sukcesie wylogowanie i redirect do `/login`.

---

## 2. Logika Backendowa (API & Middleware)

W Astro 5 preferowanym sposobem obsługi formularzy i sesji są Server Actions lub Endpointy API. Ze względu na istniejący middleware i ciasteczka, wykorzystamy API do mutacji (logowanie, rejestracja), natomiast stan sesji będzie przekazywany deklaratywnie z serwera (SSR).

### Inicjalizacja Stanu Autentykacji (Server -> Client)

Zamiast dedykowanego endpointu do pobierania sesji (np. `GET /api/auth/session`), dane zalogowanego użytkownika są pobierane po stronie serwera Astro (z `Astro.locals` lub `supabase.auth.getUser()`) i przekazywane jako propsy do komponentów Reacta ("Island Architecture").

- **W Astro (`src/pages/*.astro`):**

```astro
const {user} = Astro.locals; // lub await supabase.auth.getUser()
```

- **W React:**

Inicjalizacja sklepu (np. Context/Zustand) następuje synchronicznie przy montowaniu komponentu, wykorzystując przekazane dane.

```tsx
<AppShell user={user}>
  <DashboardView client:load user={user} />
</AppShell>
```

### Middleware (`src/middleware/index.ts`)

Istniejący middleware wymaga rozszerzenia logiki przekierowań, aby obsłużyć FTUE.

- **Obecnie:** Jeśli `isAuthenticated` -> redirect `/app/dashboard`.
- **Zmiana:**
  - Po weryfikacji sesji, middleware powinien sprawdzić w `locals` (lub szybkim zapytaniu DB) flagę np. `profile.is_onboarded`.
  - Jeśli `isAuthenticated` && `!is_onboarded` -> redirect `/app/ftue`.
  - Jeśli `isAuthenticated` && `is_onboarded` -> redirect `/app/dashboard`.
  - To wymaga, aby tabela `users_profile` miała pole `is_onboarded` (boolean, default false).

### API Endpoints (`src/pages/api/auth/`)

Endpointy te będą działać jako proxy między formularzem React a Supabase Auth, zarządzając ciasteczkami sesyjnymi (`mm_access_token`, `mm_refresh_token`), których JavaScript w przeglądarce nie powinien widzieć/modyfikować.

1. **`POST /api/auth/login`** (`login.ts`)
   - Body: `{ email, password }`.
   - Logic:
     1. `supabase.auth.signInWithPassword({ email, password })`.
     2. On Success: Pobierz `access_token` i `refresh_token`.
     3. Set-Cookie: `mm_access_token` i `mm_refresh_token` (HttpOnly, Secure, SameSite=Lax, Max-Age zgodny z wygasaniem tokena).
     4. Zwróć JSON `{ success: true, redirect: "/app/dashboard" }` (lub FTUE, zależnie od logiki).

2. **`POST /api/auth/register`** (`register.ts`)
   - Body: `{ email, password, legal_accepted }`.
   - Walidacja: Sprawdzenie `legal_accepted === true`.
   - Logic:
     1. `supabase.auth.signUp({ email, password })`.
     2. **WAŻNE:** Dla celów PoC wyłączamy "Confirm Email" w Supabase, aby `signUp` od razu zwracało sesję.
     3. Trigger DB (opisany w sekcji 3) tworzy wpis w `users_profile`.
     4. Set-Cookie: Ustawienie tokenów jak w login.
     5. Zwróć JSON `{ success: true, redirect: "/app/ftue" }`.

3. **`POST /api/auth/signout`** (`logout.ts`)
   - Logic:
     1. `supabase.auth.signOut()`.
     2. Clear-Cookie: Usunięcie `mm_access_token` i `mm_refresh_token`.
     3. Redirect: `/login`.

4. **`POST /api/auth/reset-request`** (Nowy)
   - Body: `{ email }`.
   - Logic: `supabase.auth.resetPasswordForEmail(email, { redirectTo: '.../auth/reset-password' })`.

5. **`POST /api/auth/update-password`** (Nowy)
   - Body: `{ password }`.
   - Wymaga ważnej sesji (użytkownik jest "zalogowany" linkiem z maila, Supabase obsługuje ten stan wymiany tokena w URL na sesję).
   - Logic: `supabase.auth.updateUser({ password })`.

6. **`POST /api/auth/delete-account`** (Nowy, US-018)
   - Wymaga uwierzytelnionego użytkownika.
   - Kroki:
     1. Zabezpieczyć CSRF (np. token w formularzu lub nagłówek).
     2. Wywołać funkcję serwisową (RPC) w DB, która:
        - usuwa wpisy użytkownika z `mood_entries`,
        - usuwa rekord z `users_profile`,
        - usuwa użytkownika z `auth.users`.
     3. Clear-Cookie: `mm_access_token`, `mm_refresh_token`.
     4. Zwrócić redirect `/login`.

---

## 3. System Autentykacji (Supabase)

### Konfiguracja Projektu Supabase

1. **Auth Providers:** Email/Password enabled.
2. **Email Confirmation:** **Disabled** (na potrzeby PoC i wymogu "fast entry", zgodnie z US-001 "Po poprawnej rejestracji użytkownik jest zalogowany").
3. **Redirect URLs:** Dodanie domeny aplikacji (np. `http://localhost:3000/**`, `https://mood-mate.app/**`).
4. **Session Persistence (US-019):** W middleware używamy `auth.setSession` na bazie ciasteczek; przeglądarka utrzymuje sesję dzięki `mm_access_token`/`mm_refresh_token` (HttpOnly, Secure, SameSite=Lax). Brak dodatkowego endpointu sesyjnego — stan przekazywany SSR→props.

### Model Danych (Baza Danych)

Wymagane zmiany/weryfikacja w tabelach:

1. **`public.users_profile`**
   - Tabela musi istnieć i być powiązana z `auth.users` relacją 1:1.
   - **Trigger:** `after insert on auth.users` -> funkcja tworząca wiersz w `public.users_profile`.
   - **Kolumny:**
     - `id` (uuid, PK, references auth.users).
     - `is_onboarded` (boolean, default false) - kluczowe dla routingu FTUE.
     - `ritual_time` (time, nullable) - dla US-005.

### Bezpieczeństwo

- **RLS (Row Level Security):** Wszystkie operacje na `users_profile` muszą mieć polityki RLS pozwalające na dostęp tylko właścicielowi (`auth.uid() = id`).
- **Walidacja 18+:** Odbywa się na poziomie formularza (wymagany checkbox) i API (odrzucenie requestu bez flagi), ale nie zapisujemy wieku w bazie (zgodnie z minimalizacją danych). Sam fakt rejestracji jest "self-attestation".

---

## Plan Wdrożenia

1. Uzupełnienie brakujących stron w `src/pages/` (forgot-password, reset).
2. Implementacja komponentów formularzy w `src/components/auth/` (React).
3. Aktualizacja endpointów API w `src/pages/api/auth/` o obsługę ciasteczek.
4. Dostosowanie `src/middleware/index.ts` (przekierowanie FTUE).
5. Weryfikacja triggera w bazie danych Supabase (tworzenie profilu).
