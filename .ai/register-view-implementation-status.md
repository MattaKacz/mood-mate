# Status implementacji widoku Register

## Zrealizowane kroki

### Faza 1: Podstawowa implementacja i język polski

- Wymuszenie języka polskiego w całym strumieniu rejestracji i logowania (layouty publiczne, widoki, formularze, komunikaty błędów).
- Usunięcie residualnego i18n z komponentów auth (PasswordStrengthHint, RateLimitNotice, TermsAndPrivacyLinks, AuthSecondaryLinks) oraz spójne copy PL w formularzach.
- Refaktoryzacja dashboardu i komponentów współdzielonych (SummaryCard, EntryListCard, RitualReminderBanner, tag-catalog, walidator mood) do pojedynczych stałych PL, bez struktur językowych.
- Zaktualizowanie dokumentów `.ai/*` (plan rejestracji, status Add Mood) o informację, że MVP działa wyłącznie w języku polskim.

### Faza 2: Zarządzanie sesją (strategia B - server cookie)

- ✅ Backend ustawia httpOnly cookies (`mm_access_token`, `mm_refresh_token`) przez `persistAuthCookies` w endpoincie `/api/auth/register`
- ✅ Frontend (`RegisterView.tsx`) zmieniono z strategii A (`supabase.auth.setSession`) na strategię B (`server_cookie`)
- ✅ Po sukcesie rejestracji frontend tylko przekierowuje do `/app/ftue`, bez ręcznego zarządzania sesją
- ✅ Sesja jest w pełni zarządzana przez backend z wykorzystaniem secure, httpOnly cookies

### Faza 3: Polityka hasła

- ✅ Zweryfikowano i zsynchronizowano politykę hasła: **min 8 znaków**, max 128
- ✅ Backend validation schema (`register.schema.ts`): min 8, max 128
- ✅ Frontend viewmodel (`register.ts`): min 8, max 128
- ✅ `PasswordStrengthHint` wyświetla komunikaty zgodne z polityką
- ✅ Plan implementacji zaktualizowano - stara wzmianka o "min 6" była nieaktualna

### Komponenty zaimplementowane

- ✅ `/src/pages/register.astro` - route publiczny
- ✅ `/src/components/auth/PublicAuthLayout.astro` - wspólny layout dla auth
- ✅ `/src/components/auth/RegisterView.tsx` - główny kontener widoku
- ✅ `/src/components/auth/RegisterForm.tsx` - formularz z walidacją (react-hook-form + zod)
- ✅ `/src/components/auth/PasswordStrengthHint.tsx` - wskazówki dot. hasła
- ✅ `/src/components/auth/TermsAndPrivacyLinks.tsx` - linki do regulaminu/prywatności
- ✅ `/src/components/auth/RateLimitNotice.tsx` - komunikat o rate limit
- ✅ `/src/components/auth/AuthSecondaryLinks.tsx` - linki do login/reset hasła

### Hooki i serwisy

- ✅ `/src/components/hooks/useRegisterMutation.ts` - hook do wywołania API
- ✅ `/src/components/hooks/useRateLimitCooldown.ts` - odliczanie cooldownu
- ✅ `/src/components/hooks/useFocusOnFirstError.ts` - focus na pierwszym błędzie
- ✅ `/src/lib/services/auth/register.client.ts` - klient API z mapowaniem błędów
- ✅ `/src/lib/viewmodels/auth/register.ts` - typy frontendowe (ViewModels)

### Backend

- ✅ `/src/pages/api/auth/register.ts` - endpoint API z rate limiting
- ✅ `/src/lib/validation/auth/register.schema.ts` - walidacja Zod
- ✅ `/src/lib/utils/auth-cookies.ts` - zarządzanie httpOnly cookies
- ✅ Rate limiting: 5 prób/5min (globalny), 3 próby/10min (per email)

### Testy Playwright

- ✅ Utworzono kompleksowy plik testowy `/tests/playwright/auth.spec.ts`
- ✅ Testy rejestracji:
  - Happy path z przekierowaniem do FTUE
  - Walidacja formularza (checkboxy, format email, długość hasła)
  - Wskazówki dot. siły hasła
  - Linki do regulaminu i logowania
- ✅ Testy logowania:
  - Happy path z przekierowaniem do dashboard
  - Błąd przy niepoprawnych credentials
  - Linki do rejestracji i resetu hasła
- ✅ Testy middleware i przekierowań:
  - Zalogowany użytkownik przekierowany z `/login` do `/app/dashboard`
  - Niezalogowany przekierowany z `/app/dashboard` do `/login`
- ✅ Testy dostępności (a11y):
  - Etykiety i ARIA na polach formularza
  - `aria-live` dla komunikatów błędów
  - `aria-busy` na przycisku submit
- ✅ Testy obsługi błędów:
  - Komunikat przy błędzie sieci
  - Zachowanie danych w formularzu po błędzie

## Naprawione problemy

### Problem z auto-przekierowaniem po logowaniu

**Objaw:** Po zalogowaniu strona nie przekierowywała automatycznie do dashboardu - wymagane było ręczne odświeżenie.

**Przyczyna:**

- `LoginView.tsx` używał starej strategii A (`supabase_set_session`)
- Frontend wywoływał `supabase.auth.setSession()` i zapisywał sesję w localStorage
- Middleware sprawdzało httpOnly cookies (nie localStorage)
- Cookies były ustawione przez backend, ale frontend próbował także zarządzać sesją kliencką

**Rozwiązanie:**

1. Zmieniono strategię w `LoginView.tsx` na B (`server_cookie`)
2. Usunięto wywołanie `supabase.auth.setSession()`
3. Zmieniono `window.location.assign()` na `window.location.href` z 100ms opóźnieniem
4. Opóźnienie zagwarantowało przetworzenie Set-Cookie headers przed przekierowaniem

## Kolejne kroki

- **Manualny test flow**: Przetestować wszystkie scenariusze (happy path, błędy walidacji, 409, 422, 429)
- **Uruchomienie testów Playwright**: `npm run test` lub `npx playwright test tests/playwright/auth.spec.ts`
- **Weryfikacja FTUE**: Upewnić się, że po rejestracji redirect do `/app/ftue` działa poprawnie
- **CI/CD**: Zintegrować testy Playwright z pipeline (wymaga testowej instancji Supabase lub mock'ów)
