## Plan implementacji widoku Register

## 1. Przegląd

Widok **Register** umożliwia rejestrację użytkownika e-mail/hasło z wymuszeniem deklaracji **18+** oraz akceptacji **Terms/Privacy**, zgodnie z PRD (US-001, US-021, US-025). Po sukcesie powinien bezpiecznie przeprowadzić użytkownika do strefy prywatnej i FTUE.

- **Zakres widoku**: tylko rejestracja (bez FTUE i bez logowania).
- **Język interfejsu**: PL (UI w całości w języku polskim).  
  Uwaga: aktualna implementacja backendu także zwraca komunikaty po polsku — UI powinien prezentować użytkownikowi tylko neutralne komunikaty PL bez zdradzania szczegółów backendu.
- Mechanizm i18n został usunięty w fazie MVP. Nie dodawaj żadnych przełączników językowych ani zależności tłumaczeniowych, dopóki produkt nie wejdzie w kolejny etap.

**Rozstrzygnięte kwestie implementacyjne**

- ✅ **Ścieżka endpointu**: `POST /api/auth/register` (zgodnie z rzeczywistą implementacją Astro)
- ✅ **Utrwalenie sesji po rejestracji**: Zaimplementowano **strategię B (server cookie)**:
  - Backend ustawia httpOnly cookies (`mm_access_token`, `mm_refresh_token`) przez `persistAuthCookies`
  - Frontend po `201` tylko przekierowuje do `/app/ftue`, bez wywoływania `supabase.auth.setSession`
  - Sesja jest w pełni zarządzana po stronie serwera (secure, httpOnly)
- ✅ **Siła hasła**: Backend i frontend wymuszają spójną politykę: **min 8 znaków**, max 128 znaków
  - Backend: `register.schema.ts` (Zod validation)
  - Frontend: `register.ts` (viewmodel `defaultPasswordPolicy`)
  - UI: `PasswordStrengthHint` wyświetla edukacyjne komunikaty zgodne z polityką

## 2. Routing widoku

- **Public route (Astro)**: `/register`
- **Plik routingu**: `src/pages/register.astro`
- **Przekierowania**
  - **Po sukcesie rejestracji**: docelowo `/app/ftue` (a guard FTUE decyduje co dalej) lub `/app/dashboard` jeśli `skipFtue=true` będzie realnie wspierane.
  - **Jeśli użytkownik jest już zalogowany**: natychmiastowy redirect do `/app/dashboard` (mechanizm wykrycia zależy od decyzji o sesji: A/B).

## 3. Struktura komponentów

Proponowana struktura (publiczny widok w Astro + interaktywny React):

- `RegisterPage` (Astro)
  - `PublicAuthLayout` (Astro, opcjonalnie – wspólny layout dla `/login`, `/register`, resetu)
    - `RegisterView` (React)
      - `RegisterCard`
        - `RegisterForm`
          - `EmailField`
          - `PasswordField` + `PasswordStrengthHint`
          - `AdultCheckbox`
          - `TermsCheckbox` + `TermsAndPrivacyLinks`
          - `FormStatusAlert` (błąd globalny / sukces)
          - `RateLimitNotice` (429 cooldown)
          - `SubmitButton`
        - `AuthSecondaryLinks` (link do `/login`, ewentualnie `/password/reset`)

## 4. Szczegóły komponentów

### RegisterPage (`src/pages/register.astro`)

- **Opis komponentu**: strona routingu `/register`. Renderuje layout i osadza React.
- **Główne elementy**:
- `<Layout title="Załóż konto MoodMate" />`
  - `<main>` jako landmark
  - `<RegisterView client:load />` (lub `client:visible`, jeśli chcemy opóźnić JS)
- **Obsługiwane zdarzenia**: brak (deleguje do React).
- **Warunki walidacji**: brak (deleguje do React).
- **Typy**: brak.
- **Propsy**:
  - `title?: string`
  - (opcjonalnie) `redirectTo?: string` jako query param do zachowania celu.

### PublicAuthLayout (`src/components/auth/PublicAuthLayout.astro`) – opcjonalny, ale zalecany

- **Opis komponentu**: wspólna rama dla publicznych ekranów auth (spójna typografia, szerokość kontenera, stopka z linkami).
- **Główne elementy**:
  - `<main class="min-h-screen flex items-center justify-center p-4">`
  - slot na treść karty
  - stopka z linkiem do `/crisis-resources` (US-030) i (opcjonalnie) krótkim disclaimerem „not medical advice”.
- **Obsługiwane zdarzenia**: brak.
- **Warunki walidacji**: brak.
- **Typy**: brak.
- **Propsy**:
  - `heading: string`
  - `subheading?: string`

### RegisterView (`src/components/auth/RegisterView.tsx`)

- **Opis komponentu**: kontener logiki widoku (stan, integracja API, redirect). Renderuje kartę z formularzem.
- **Główne elementy**:
  - shadcn/ui: `Card`, `CardHeader`, `CardContent`, `CardFooter`
  - `RegisterForm`
  - `AuthSecondaryLinks`
- **Obsługiwane zdarzenia**:
  - `onSuccess(session: AuthSessionDTO)` z `RegisterForm`
  - `onNavigateToLogin()`
- **Warunki walidacji**: brak bezpośrednio; walidacja w `RegisterForm`.
- **Typy**:
  - DTO: `AuthSessionDTO`, `MessageDTO`
  - ViewModel: `RegisterSuccessAction` (opis w sekcji „Typy”)
- **Propsy (interfejs)**:
  - `initialRedirectTo?: string` (opcjonalnie z query string)

### RegisterForm (`src/components/auth/RegisterForm.tsx`)

- **Opis komponentu**: formularz rejestracji z walidacją klienta i obsługą stanów błędów (w tym 429).
- **Główne elementy**:
  - `<form noValidate>`
  - pola:
    - Email: `Input` + `Label` + `FormMessage`
    - Password: `Input type="password"` + `PasswordStrengthHint`
    - Checkbox 18+ (`confirmAdult`)
    - Checkbox Terms/Privacy (`acceptTerms`) + linki
  - `Alert` dla błędu globalnego
  - `Button type="submit"`
- **Obsługiwane zdarzenia**:
  - `onSubmit(values)`
  - `onChange` pól (RHF)
  - `onBlur` (walidacja i UX focus)
- **Warunki walidacji (zgodnie z API + PRD)**
  - `email`
    - wymagany
    - trim + lowercase
    - poprawny format email
    - max 255 znaków
  - `password`
    - wymagane
    - min: **8 znaków** (zsynchronizowane backend + frontend)
    - max 128 znaków
    - komunikat edukacyjny w `PasswordStrengthHint`
  - `acceptTerms`
    - musi być `true` (wymuszone także przez backend: `400`)
    - UX: submit disabled dopóki false
  - `confirmAdult`
    - musi być `true` (wymuszone także przez backend: `400`)
    - UX: submit disabled dopóki false
  - `skipFtue`
    - domyślnie `false` (pole ukryte; ewentualnie sterowane query paramem/feature flagą)
- **Typy**
  - DTO: `RegisterCommand`, `AuthSessionDTO`, `MessageDTO`
  - ViewModel: `RegisterFormValues`, `RegisterFormErrorState`, `RateLimitState`
- **Propsy (interfejs)**:
  - `onSuccess: (session: AuthSessionDTO) => void`
  - `onError?: (error: RegisterFormErrorState) => void`
  - `defaultEmail?: string`
  - `defaultSkipFtue?: boolean`

### PasswordStrengthHint (`src/components/auth/PasswordStrengthHint.tsx`)

- **Opis komponentu**: krótka, nieinwazyjna pomoc dot. hasła (PRD: „komunikat edukacyjny”).
- **Główne elementy**:
  - tekst PL (np. „Użyj co najmniej 8 znaków. Dodaj cyfrę i symbol.”)
  - opcjonalnie prosty wskaźnik (bez zewnętrznych bibliotek w PoC)
- **Obsługiwane zdarzenia**: brak.
- **Warunki walidacji**: brak (tylko pomoc).
- **Typy**: `PasswordPolicyVM`.
- **Propsy**:
  - `policy: PasswordPolicyVM`
  - `currentPassword?: string` (opcjonalnie do live feedback)

### TermsAndPrivacyLinks (`src/components/auth/TermsAndPrivacyLinks.tsx`)

- **Opis komponentu**: linki do `/terms` i `/privacy` + krótkie copy.
- **Główne elementy**:
  - `<a href="/terms">Regulamin</a>`, `<a href="/privacy">Politykę prywatności</a>`
- **Obsługiwane zdarzenia**: klik linków.
- **Warunki walidacji**: brak.
- **Typy**: brak.
- **Propsy**: brak.

### RateLimitNotice (`src/components/auth/RateLimitNotice.tsx`)

- **Opis komponentu**: UI dla `429 Too Many Requests` (cooldown + disabled submit).
- **Główne elementy**:
  - `Alert` z komunikatem PL
  - licznik czasu do ponowienia (jeśli mamy `X-RateLimit-Reset`)
- **Obsługiwane zdarzenia**: brak (tylko render).
- **Warunki walidacji**: brak.
- **Typy**: `RateLimitState`.
- **Propsy**:
  - `rateLimit: RateLimitState`

### AuthSecondaryLinks (`src/components/auth/AuthSecondaryLinks.tsx`)

- **Opis komponentu**: link do `/login` oraz (opcjonalnie) „Forgot password”.
- **Główne elementy**: anchor/linki, mały tekst.
- **Obsługiwane zdarzenia**: klik linków.
- **Warunki walidacji**: brak.
- **Typy**: brak.
- **Propsy**:
  - `showForgotPassword?: boolean`

## 5. Typy

Poniższe typy powinny zostać dodane jako **frontendowe ViewModel** (nie do `src/types.ts`, bo to typy współdzielone z backendem), np. w `src/lib/viewmodels/auth/register.ts`.

### DTO (już istnieją)

- **`RegisterCommand`** (`src/types.ts`)
  - `email: string`
  - `password: string`
  - `acceptTerms: boolean`
  - `confirmAdult: boolean`
  - `skipFtue: boolean`
- **`AuthSessionDTO`** (`src/types.ts`)
  - `user: { id: string; email: string }`
  - `session: { accessToken: string; expiresAt: string; refreshToken: string }`
- **`MessageDTO`** (`src/types.ts`)
  - `message: string`

### ViewModel (nowe)

- **`RegisterFormValues`**
  - Cel: wartości formularza w UI (1:1 z payloadem).
  - Pola:
    - `email: string`
    - `password: string`
    - `acceptTerms: boolean`
    - `confirmAdult: boolean`
    - `skipFtue: boolean`
- **`RegisterSubmitState`**
  - Cel: sterowanie UI i blokadą submit.
  - Proponowany union:
    - `"idle" | "submitting" | "success" | "error" | "rate_limited"`
- **`RateLimitState`**
  - Cel: obsługa 429 i odliczania.
  - Pola:
    - `isLimited: boolean`
    - `resetAt?: string` (ISO; z headera `X-RateLimit-Reset` jeśli dostępny)
    - `remainingSeconds?: number` (wyliczane w hooku)
- **`RegisterFormErrorState`**
  - Cel: trzymanie błędów w formie bezpiecznej (PL), bez ujawniania szczegółów.
  - Pola:
    - `globalMessage?: string` (PL)
    - `fieldErrors?: Partial<Record<keyof RegisterFormValues, string>>` (PL)
    - `requestId?: string` (z `X-Request-Id`, tylko do debug; domyślnie nie wyświetlać)
    - `httpStatus?: number`
- **`PasswordPolicyVM`**
  - Cel: jedna definicja zasad hasła dla UI (łatwa zmiana gdy backend zostanie zaostrzony).
  - Pola:
    - `minLength: number`
    - `maxLength: number`
    - `recommendations: string[]` (PL)
- **`RegisterSuccessAction`**
  - Cel: unifikacja „co robimy po sukcesie” zależnie od strategii sesji.
  - Pola:
    - `redirectTo: string`
    - `persistSession: "supabase_set_session" | "server_cookie" | "none"`

## 6. Zarządzanie stanem

- **Stan formularza**: najlepiej `react-hook-form` + opcjonalnie `zod` resolver (spójność z backendem).  
  Uwaga: w `package.json` nie ma obecnie `react-hook-form` ani `zod` jako dependency — trzeba dodać (patrz kroki).
- **Stan requestu**:
  - `submitState: RegisterSubmitState`
  - `errorState: RegisterFormErrorState | null`
  - `rateLimit: RateLimitState`
- **Custom hooki (zalecane)**
  - `useRegisterMutation()`
    - enkapsuluje `fetch('/api/auth/register')`, mapuje statusy i nagłówki
  - `useRateLimitCooldown(rateLimit: RateLimitState)`
    - odliczanie do `resetAt`, wystawia `remainingSeconds`
  - `useFocusOnFirstError(formState)`
    - po submit z błędami ustawia focus na pierwszym błędnym polu (wymóg UX z UI plan)

## 7. Integracja API

### Endpoint

- **Metoda**: `POST`
- **URL (realny wg implementacji Astro)**: `/api/auth/register`
- **Request body**: `RegisterCommand` (JSON)
- **Success**: `201` z payloadem `AuthSessionDTO`
- **Error**:
  - `400` → `MessageDTO` (walidacja/zgody)
  - `409` → `MessageDTO` (email istnieje)
  - `422` → `MessageDTO` (słabe hasło)
  - `429` → `MessageDTO` + (częściowo) nagłówki `X-RateLimit-Reset`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`
  - `500` → `MessageDTO`

### Mapowanie odpowiedzi na UI (proponowane)

- **201**:
  - Wywołać `onSuccess(session)`.
  - Następnie:
    - strategia A: `supabase.auth.setSession({ access_token, refresh_token })` (wymaga klientowego Supabase i PUBLIC env) → redirect.
    - strategia B: redirect (zakładając, że backend ustawia cookie).
- **409**: pokazać **neutralny** komunikat PL (bez enumeracji), np. „Nie udało się utworzyć konta. Spróbuj zalogować się istniejącym kontem.”
- **422**: komunikat PL + wskazówka dot. hasła; opcjonalnie zmapować jako błąd pola `password`.
- **400**:
  - jeśli wynika ze zgód: zmapować na pola checkboxów,
  - jeśli walidacja email/hasła: zmapować na pola (heurystyka opisana niżej).
- **429**:
  - ustawić `rateLimit.isLimited=true`,
  - jeśli jest `X-RateLimit-Reset`: policzyć cooldown,
  - zablokować submit do czasu resetu.

### Heurystyka mapowania błędów backendu na pola (bez ścisłego polegania na treści)

Ponieważ backend zwraca `message` po polsku i nie ma ustrukturyzowanych „field errors”, UI powinien:

- Preferować mapping po **HTTP status**.
- Dodatkowo (opcjonalnie) rozpoznać pole po fragmencie treści:
  - zawiera `email` → `email`
  - zawiera `Hasło`/`password` → `password`
  - zawiera `regulamin`/`Terms` → `acceptTerms`
  - zawiera `pełnoletni`/`adult` → `confirmAdult`
    I zawsze finalnie pokazać PL komunikat dla użytkownika (a nie surową treść z backendu).

## 8. Interakcje użytkownika

- **Wpisanie email/hasła** → walidacja inline po blur i/lub przy submit.
- **Zaznaczenie checkboxów**:
  - dopóki oba niezaznaczone → `SubmitButton` disabled (UI plan).
- **Submit**:
  - pokazanie stanu loading (disabled + spinner),
  - po błędzie: zachowanie danych w formularzu,
  - focus na pierwszym błędnym polu i `aria-live` dla komunikatu globalnego.
- **429**:
  - pokazanie cooldownu i blokada akcji.
- **Linki**:
  - „Zaloguj się” → `/login`
  - „Regulamin” → `/terms`
  - „Polityka prywatności” → `/privacy`

## 9. Warunki i walidacja

### Warunki z API i jak weryfikować w UI

- **Email**
  - UI: wymagany, format email, max 255, `trim().toLowerCase()`.
  - Wpływ na UI: błąd pola + blokada submit jeśli invalid.
- **Password**
  - UI: **min 8** (zsynchronizowane z backendem), max 128.
  - Wpływ na UI: błąd pola, komunikat edukacyjny w `PasswordStrengthHint`.
- **acceptTerms / confirmAdult**
  - UI: oba muszą być `true`.
  - Wpływ na UI:
    - submit disabled gdy któreś false,
    - błędy inline przy próbie submit bez zaznaczenia (żeby było czytelne dla a11y).
- **Rate limiting**
  - UI: po `429` przejść w tryb cooldown, blokować submit, pokazać licznik (jeśli mamy reset time).

## 10. Obsługa błędów

- **400 Validation failed**: mapować na pola, nie pokazywać surowego tekstu; globalnie „Sprawdź formularz i spróbuj ponownie.”
- **409 Conflict**: neutralny komunikat bez enumeracji, dodatkowe CTA: „Przejdź do logowania”.
- **422 Weak password**: błąd pola `password` + wskazówka PL.
- **429 Too Many Requests**:
  - UI przechodzi w `rate_limited`, blokuje submit,
  - jeśli brak `X-RateLimit-Reset`, fallback: blokada na np. 60s + komunikat „Spróbuj ponownie później.”
- **5xx / sieć / timeout**:
  - globalny alert PL,
  - przycisk „Spróbuj ponownie” (re-submission),
  - bez czyszczenia pól.
- **Bezpieczeństwo/logowanie**:
  - nie logować do konsoli wartości `email/password` ani całych payloadów,
  - jeśli trzymamy `requestId`, to wyłącznie do debug (opcjonalnie w UI ukryty).

## 11. Kroki implementacji

1. ✅ **Potwierdzono decyzje**:
   - Sesję utrwalamy przez **server cookie** (strategia B - httpOnly cookies)
   - Endpoint API: `/api/auth/register` (zgodnie z implementacją Astro)
   - Polityka hasła: **min 8 znaków** (zsynchronizowane backend + frontend)
2. ✅ **Dodano wszystkie zależności**:
   - `react-hook-form`, `@hookform/resolvers`, `zod` - wszystkie zainstalowane w `package.json`
3. ✅ **Dodano wymagane komponenty shadcn/ui**:
   - `Input`, `Label`, `Checkbox`, `Alert`, `Button`, `Card`, `Form` - wszystkie w `src/components/ui/`
4. ✅ **Utworzono route** `src/pages/register.astro`:
   - Używa `Layout.astro` i `PublicAuthLayout.astro`
   - Renderuje `RegisterView` z `client:load`
5. ✅ **Zaimplementowano UI**:
   - `RegisterView.tsx` - główny kontener z logiką sukcesu
   - `RegisterForm.tsx` - formularz z react-hook-form + zod resolver
   - Wszystkie komponenty pomocnicze (PasswordStrengthHint, TermsAndPrivacyLinks, RateLimitNotice, AuthSecondaryLinks)
   - Focus management przez `useFocusOnFirstError`
6. ✅ **Zaimplementowano integrację API**:
   - `src/lib/services/auth/register.client.ts` z obsługą wszystkich statusów
   - Mapowanie błędów na neutralne komunikaty PL
   - Obsługa rate-limit headers i countdown
7. ✅ **Zaimplementowano logikę sukcesu (strategia B)**:
   - Backend ustawia httpOnly cookies przez `persistAuthCookies`
   - Frontend po `201` tylko wykonuje redirect do `/app/ftue`
8. ✅ **Dopracowano copy PL + security**:
   - Wszystkie komunikaty w języku polskim
   - Neutralne błędy bez enumeracji użytkowników
   - Brak surowych komunikatów backendu w UI
9. ⏳ **Testy manualne i automatyczne** (do wykonania):
   - Manualny test scenariuszy (happy path, błędy walidacji, 409, 422, 429, offline)
   - Testy Playwright dla flow rejestracji
   - Weryfikacja integracji z FTUE
