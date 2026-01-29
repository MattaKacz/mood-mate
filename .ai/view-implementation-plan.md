# API Endpoint Implementation Plan: POST /auth/register

## 1. Przegląd punktu końcowego

- Lokalizacja dokumentu: `.ai/view-implementation-plan.md`
- Cel: utworzenie konta użytkownika w Supabase Auth wraz z podstawowym profilem w `users_profile`.
- Funkcjonalność: wymuszenie akceptacji regulaminu oraz potwierdzenia pełnoletności przed rejestracją; opcjonalne pominięcie FTUE.
- Integracje: Supabase Auth (signUp, session) i baza danych `users_profile`.
- Zależności: kontekst Astro API (`context.locals.supabase`), schemat walidacji Zod, ewentualny limiter zapytań.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/auth/register`
- Parametry w URL: brak
- Treść JSON: `{ email, password, acceptTerms, confirmAdult, skipFtue }`
- Zasady walidacji: email RFC + normalizacja, hasło min. 6 znaków (zalecenie 12+, cyfra, symbol), `acceptTerms` i `confirmAdult` muszą być `true`, `skipFtue` opcjonalny (domyślnie `false`, wymaga potwierdzenia docelowego magazynu)

## 3. Wykorzystywane typy

- `RegisterCommand` z `src/types.ts` jako wejściowy kontrakt.
- `AuthSessionDTO` oraz zagnieżdżony `AuthenticatedUserDTO` jako schemat odpowiedzi.
- `MessageDTO` dla komunikatów błędów.
- `UserProfileRow` jako model wstawianego profilu.
- Nowy typ pomocniczy `RegisterResult` w `src/lib/services/auth/register.service.ts` (wynik logiki usługowej).

## 4. Szczegóły odpowiedzi

- Kod powodzenia: `201 Created`
- Body zgodne z `AuthSessionDTO`
- Nagłówki obowiązkowe: `Content-Type: application/json`
- Nagłówki przyszłościowe: `Set-Cookie` dla trzymania sesji po stronie klienta (do decyzji biznesowej)
- Scenariusze błędów i kody: 400 (walidacja/warunki), 409 (email zajęty), 422 (hasło odrzucone), 429 (limit), 500 (pozostałe błędy)

## 5. Przepływ danych

1. Parsowanie `Request` i walidacja z użyciem Zod (`src/lib/validation/auth/register.schema.ts`).
2. Walidacja biznesowa (`acceptTerms`, `confirmAdult`), z natychmiastowym zwrotem 400 przy niespełnieniu.
3. Zastosowanie guardu anty-spam (np. `ensureRateLimit`) przed wywołaniem Supabase.
4. `context.locals.supabase.auth.signUp({ email, password })` – obsługa wyników sukces/błąd.
5. Wstawienie rekordu profilu: `supabase.from('users_profile').insert({ id: user.id })` z kontrolą błędów.
6. W razie błędu przy profilu: logowanie, próba sprzątnięcia (`auth.admin.deleteUser`) lub zgłoszenie manualne.
7. Obsługa `skipFtue`: jeśli wymaga zapisania, wywołać dedykowany serwis (wymaga doprecyzowania schematu danych).
8. Złożenie odpowiedzi `AuthSessionDTO` i zwrot 201.

## 6. Względy bezpieczeństwa

- Walidacja wejścia (email normalizowany do lowercase, trimming, Zod).
- Wymuszenie zgód (`acceptTerms`, `confirmAdult`) przed rejestracją.
- Ograniczenie enumeracji kont: komunikaty błędów neutralne, bez potwierdzania istnienia emaila.
- Rate limiting po IP i emailu, aby ograniczyć brute-force.
- Ochrona sekretów: użycie `import.meta.env` i `context.locals.supabase` bez ujawniania kluczy.
- Logowanie wrażliwych zdarzeń z minimalizacją danych osobowych.

## 7. Obsługa błędów

- Mapowanie kodów Supabase: `user_already_exists` → 409, `weak_password` → 422, `over_request_rate_limit` → 429.
- Błędy walidacji Zod → 400 z `MessageDTO` opisującym pola.
- Problemy z insert do `users_profile` → 500 po logowaniu i próbie rollbacku.
- Nieobsłużone wyjątki → 500 z korelacyjnym `requestId` w logach.
- `generation_error_logs` nie jest używana; błędy zapisywane w loggerze aplikacyjnym.

## 8. Rozważania dotyczące wydajności

- Operacje sieciowe ograniczone do pojedynczego wywołania Auth i jednego wstawienia do bazy.
- Brak konieczności równoległości – zależność od ID użytkownika.
- Stosować lekkie logowanie i metryki (np. `register.duration`).
- Monitorować efektywność rate limitera, aby nie powodował zatorów.

## 9. Etapy wdrożenia

1. Utworzenie schematu Zod dla `RegisterCommand` w `src/lib/validation/auth/register.schema.ts`.
2. Implementacja serwisu `registerUser` w `src/lib/services/auth/register.service.ts` z wywołaniami Supabase i bootstrapem profilu.
3. Dodanie endpointu `src/pages/api/auth/register.ts` (`export const POST`, `export const prerender = false`) korzystającego z serwisu.
4. Integracja limitera żądań oraz loggera błędów w warstwie API.
5. Dodanie mapowania błędów Supabase → HTTP w serwisie lub wspólnym helperze.
6. Przygotowanie testów jednostkowych (mock Supabase) i e2e dla scenariuszy sukces/błąd.
7. Aktualizacja dokumentacji (`.ai/api-plan.md`) i doprecyzowanie przechowywania `skipFtue`.
8. Weryfikacja operacyjna: konfiguracja zmiennych środowiskowych, alertów i dashboardów.
