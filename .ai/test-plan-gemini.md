# Plan Testów Aplikacji MoodMate

---

## 1. Wprowadzenie i cele testowania

### 1.1 Wprowadzenie

Niniejszy dokument przedstawia kompleksowy plan testów dla aplikacji **MoodMate**, przeznaczonej do prowadzenia dziennika nastroju z wykorzystaniem wsparcia AI. Aplikacja oparta jest na stosie technologicznym Astro, React, Supabase i Tailwind CSS, z integracją z zewnętrznym API AI (OpenRouter). Plan ten ma na celu zdefiniowanie strategii, zasobów, harmonogramu i zakresu działań związanych z zapewnieniem jakości (QA) w całym cyklu życia projektu.

### 1.2 Cele testowania

Głównym celem procesu testowania jest zapewnienie, że aplikacja MoodMate jest niezawodna, bezpieczna, wydajna i zgodna z wymaganiami funkcjonalnymi oraz niefunkcjonalnymi.

Szczegółowe cele:
- **Weryfikacja funkcjonalności:** Potwierdzenie, że wszystkie kluczowe funkcje (rejestracja, logowanie, dodawanie wpisów, pulpit, historia) działają zgodnie ze specyfikacją.
- **Zapewnienie bezpieczeństwa:** Identyfikacja i eliminacja podatności, w szczególności w zakresie autoryzacji, izolacji danych użytkowników i walidacji danych wejściowych.
- **Ocena użyteczności (Usability):** Sprawdzenie, czy interfejs użytkownika jest intuicyjny, spójny i dostępny dla użytkowników.
- **Weryfikacja integracji:** Zapewnienie poprawnego działania integracji z usługami zewnętrznymi (Supabase, OpenRouter AI).
- **Stabilność i niezawodność:** Upewnienie się, że aplikacja obsługuje błędy w sposób kontrolowany i jest odporna na nieoczekiwane zachowania.
- **Zgodność międzyprzeglądarkowa:** Potwierdzenie spójnego działania i wyglądu aplikacji w najpopularniejszych przeglądarkach internetowych.

---

## 2. Zakres testów

### 2.1 Funkcjonalności objęte testami (In-Scope)

- **Moduł publiczny (Strona główna):**
  - Wyświetlanie strony `HomeHero`.
  - Poprawność linków do rejestracji i logowania.
- **Moduł autoryzacji i zarządzania kontem:**
  - Rejestracja nowego użytkownika.
  - Logowanie i wylogowywanie.
  - Resetowanie hasła (UI i przepływ demo).
  - Obsługa sesji użytkownika (ciasteczka, middleware).
  - Rate limiting dla endpointów API autoryzacji.
- **Moduł główny aplikacji (po zalogowaniu):**
  - **Pulpit (Dashboard):**
    - Wyświetlanie podsumowania: seria (streak), trend nastroju, ostatnie wpisy.
    - Wyświetlanie przypomnienia o rytuale.
  - **Dodawanie wpisu nastroju:**
    - Formularz dodawania wpisu (walidacja, stany ładowania i błędów).
    - Wybór oceny, dodawanie notatki, wybór tagów.
    - Opcjonalne żądanie sugestii AI.
  - **Szczegóły wpisu:**
    - Wyświetlanie pełnych danych pojedynczego wpisu.
    - Wyświetlanie sugestii AI.
    - Mechanizm oceny pomocności sugestii AI (helpful/not helpful).
  - **Historia wpisów:**
    - Wyświetlanie listy wpisów z paginacją.
    - Sortowanie listy (po dacie, po ocenie).
    - Filtrowanie listy po tagach.
- **Integracja z AI (OpenRouter):**
  - Generowanie spersonalizowanych sugestii.
  - Obsługa stanów: w trakcie generowania, sukces, błąd (fallback).
- **API Backendu (`/src/pages/api`):**
  - Wszystkie endpointy (autoryzacja, pulpit, wpisy nastroju).
  - Walidacja danych wejściowych (schematy Zod).
  - Poprawność odpowiedzi HTTP (kody statusu, format danych).

### 2.2 Funkcjonalności wyłączone z testów (Out-of-Scope)

- Testy wydajnościowe pod dużym obciążeniem (stress tests, load tests) - z uwagi na charakter PoC.
- Testowanie infrastruktury Supabase i OpenRouter (zakładamy, że usługi te działają poprawnie).
- Testowanie zgodności z nieaktualnymi wersjami przeglądarek (np. Internet Explorer).
- Testy penetracyjne realizowane przez zewnętrznych specjalistów.

---

## 3. Typy testów do przeprowadzenia

W ramach projektu zostaną wykonane następujące rodzaje testów:

1.  **Testy jednostkowe (Unit Tests):**
    - **Cel:** Weryfikacja poprawności działania małych, izolowanych fragmentów kodu (funkcje, hooki, komponenty UI).
    - **Zakres:** Funkcje pomocnicze (`/lib/utils`), schematy walidacji Zod, niestandardowe hooki React (`/components/hooks`), logika serwisów backendowych (np. `summary.server.ts`).

2.  **Testy integracyjne (Integration Tests):**
    - **Cel:** Weryfikacja współpracy pomiędzy różnymi modułami, w szczególności pomiędzy frontendem a API oraz API a bazą danych (Supabase).
    - **Zakres:** Testowanie endpointów API w izolacji (wysyłanie zapytań HTTP i weryfikacja odpowiedzi oraz zmian w bazie danych), testowanie komponentów React, które komunikują się z API.

3.  **Testy End-to-End (E2E):**
    - **Cel:** Symulacja rzeczywistych scenariuszy użytkowania aplikacji z perspektywy użytkownika końcowego w przeglądarce.
    - **Zakres:** Pełne przepływy użytkownika, takie jak: rejestracja i pierwszy wpis, logowanie i przeglądanie pulpitu, dodawanie wpisu i sprawdzanie go w historii.

4.  **Testy bezpieczeństwa (Security Testing):**
    - **Cel:** Identyfikacja podstawowych podatności.
    - **Zakres:** Weryfikacja izolacji danych (użytkownik A nie może widzieć danych użytkownika B), testowanie middleware pod kątem ochrony tras prywatnych, weryfikacja walidacji danych wejściowych w celu ochrony przed XSS.

5.  **Testy regresji (Regression Testing):**
    - **Cel:** Zapewnienie, że nowe zmiany nie zepsuły istniejących funkcjonalności.
    - **Zakres:** Uruchamianie zautomatyzowanego zestawu testów (jednostkowych, integracyjnych, E2E) przy każdym nowym wdrożeniu lub pull requeście.

6.  **Testy manualne i eksploracyjne:**
    - **Cel:** Ocena użyteczności, dostępności (a11y) oraz wykrywanie błędów, które trudno zautomatyzować.
    - **Zakres:** Sprawdzanie responsywności (RWD), nawigacji klawiaturą, zgodności z czytnikami ekranu, ogólnego "czucia" aplikacji.

---

## 4. Scenariusze testowe dla kluczowych funkcjonalności

Poniżej przedstawiono przykładowe scenariusze testowe o wysokim priorytecie.

### 4.1 Moduł Autoryzacji

| ID Scenariusza | Opis | Oczekiwany rezultat | Priorytet |
| :------------- | :--- | :--- | :--- |
| AUTH-001 | Pomyślna rejestracja nowego użytkownika z poprawnymi danymi. | Użytkownik zostaje zarejestrowany, zalogowany i przekierowany na stronę FTUE (`/app/ftue`). | Krytyczny |
| AUTH-002 | Próba rejestracji z adresem e-mail, który już istnieje w systemie. | Formularz wyświetla błąd informujący, że e-mail jest już zajęty. | Krytyczny |
| AUTH-003 | Próba rejestracji bez akceptacji regulaminu lub potwierdzenia wieku. | Przycisk "Utwórz konto" jest nieaktywny lub walidacja formularza uniemożliwia wysłanie. | Wysoki |
| AUTH-004 | Pomyślne logowanie z poprawnymi danymi. | Użytkownik zostaje zalogowany i przekierowany na pulpit (`/app/dashboard`). | Krytyczny |
| AUTH-005 | Próba logowania z niepoprawnym hasłem. | Formularz wyświetla komunikat o nieprawidłowych danych logowania. | Krytyczny |
| AUTH-006 | Testowanie mechanizmu "rate limiting" przy wielokrotnych, nieudanych próbach logowania. | Po przekroczeniu limitu prób, formularz zostaje zablokowany na określony czas, a użytkownik widzi stosowny komunikat. | Wysoki |
| AUTH-007 | Pomyślne wylogowanie z aplikacji. | Użytkownik zostaje wylogowany i przekierowany na stronę logowania. Ciasteczka sesji są usuwane. | Krytyczny |
| AUTH-008 | Próba dostępu do chronionej trasy (np. `/app/dashboard`) bez zalogowania. | Użytkownik jest automatycznie przekierowywany na stronę logowania. | Krytyczny |

### 4.2 Moduł Wpisów Nastroju

| ID Scenariusza | Opis | Oczekiwany rezultat | Priorytet |
| :------------- | :--- | :--- | :--- |
| MOOD-001 | Pomyślne dodanie wpisu z oceną, notatką i dwoma tagami. | Wpis zostaje zapisany. Użytkownik widzi komunikat o sukcesie i jest przekierowywany na pulpit. | Krytyczny |
| MOOD-002 | Dodanie wpisu tylko z wymaganą oceną nastroju. | Wpis zostaje zapisany poprawnie. | Krytyczny |
| MOOD-003 | Próba dodania wpisu bez wybranej oceny nastroju. | Walidacja formularza uniemożliwia wysłanie i wyświetla błąd przy polu oceny. | Wysoki |
| MOOD-004 | Próba dodania notatki przekraczającej 280 znaków. | Walidacja formularza uniemożliwia wysłanie, a licznik znaków wskazuje przekroczenie limitu. | Wysoki |
| MOOD-005 | Dodanie wpisu z prośbą o sugestię AI. | Po zapisie wpisu, pojawia się panel z sugestią AI w stanie `completed` lub `fallback`. | Wysoki |
| MOOD-006 | Wyświetlenie szczegółów istniejącego wpisu. | Wszystkie dane wpisu (ocena, notatka, tagi, data) są poprawnie wyświetlone. | Wysoki |
| MOOD-007 | Oddanie głosu "Pomocne" na sugestię AI. | Głos zostaje zapisany w bazie danych, a przyciski do oceny znikają. | Średni |

### 4.3 Moduł Pulpitu i Historii

| ID Scenariusza | Opis | Oczekiwany rezultat | Priorytet |
| :------------- | :--- | :--- | :--- |
| DASH-001 | Poprawne obliczanie i wyświetlanie "serii" (streak). | Liczba dni z rzędu z wpisami jest poprawnie obliczana. | Wysoki |
| DASH-002 | Poprawne obliczanie i wyświetlanie trendu (wzrost, spadek, stabilny). | Trend jest obliczany na podstawie ostatnich 7 wpisów i poprawnie oznaczony ikoną. | Wysoki |
| HIST-001 | Wyświetlanie listy wpisów w historii z poprawną paginacją. | Lista zawiera poprawną liczbę wpisów, a przyciski "Następna"/"Poprzednia" działają prawidłowo. | Wysoki |
| HIST-002 | Sortowanie wpisów po dacie (rosnąco/malejąco). | Wpisy są poprawnie sortowane po kliknięciu przycisku sortowania. | Średni |
| HIST-003 | Filtrowanie wpisów po jednym tagu. | Na liście pozostają tylko wpisy zawierające wybrany tag. | Wysoki |
| HIST-004 | Filtrowanie wpisów po wielu tagach. | Na liście pozostają tylko wpisy zawierające wszystkie wybrane tagi. | Średni |

### 4.4 Testy Bezpieczeństwa

| ID Scenariusza | Opis | Oczekiwany rezultat | Priorytet |
| :------------- | :--- | :--- | :--- |
| SEC-001 | Próba odczytu danych innego użytkownika (IDOR). | Zalogowany użytkownik A próbuje uzyskać dostęp do API endpointu `/api/mood-entries/[id]` z ID wpisu należącego do użytkownika B. | API zwraca błąd 404 (Not Found), uniemożliwiając dostęp. | Krytyczny |
| SEC-002 | Testowanie zapisu notatki zawierającej skrypt (XSS). | Użytkownik dodaje wpis z notatką zawierającą `<script>alert('XSS')</script>`. | Skrypt nie jest wykonywany podczas wyświetlania notatki na stronie szczegółów wpisu lub w historii. Znaczniki są poprawnie eskejpowane. | Krytyczny |

---

## 5. Środowisko testowe

- **Środowisko deweloperskie (Lokalne):** Wykorzystywane przez deweloperów do uruchamiania testów jednostkowych i integracyjnych.
- **Środowisko Staging/Testowe:**
  - Osobna instancja aplikacji wdrożona na platformie hostingowej (np. Vercel, Netlify).
  - Osobny projekt Supabase z dedykowaną bazą danych, wypełnioną danymi testowymi.
  - Klucze API dla OpenRouter skonfigurowane dla środowiska testowego.
  - Środowisko to będzie głównym miejscem do przeprowadzania testów E2E i manualnych.
- **Środowisko produkcyjne:** Dostępne tylko do testów dymnych (smoke tests) po każdym wdrożeniu.

**Przeglądarki i urządzenia:**
- **Desktop:** Chrome (najnowsza wersja), Firefox (najnowsza wersja), Safari (najnowsza wersja).
- **Mobile:** Widok mobilny w Chrome DevTools, Safari na emulatorze iOS.

---

## 6. Narzędzia do testowania

| Typ testu | Proponowane narzędzie | Uzasadnienie |
| :--- | :--- | :--- |
| Testy jednostkowe | **Vitest** z **React Testing Library** | Zintegrowane z ekosystemem Vite, którego używa Astro. Szybkie i proste w konfiguracji. RTL do testowania komponentów React. |
| Testy integracyjne | **Vitest** z **Supertest** (lub natywnym `fetch`) | Vitest do uruchamiania testów, Supertest do łatwego wykonywania zapytań do endpointów API Astro. |
| Testy E2E | **Playwright** lub **Cypress** | Nowoczesne, potężne narzędzia do automatyzacji przeglądarki, z dobrym wsparciem dla testowania aplikacji SPA/MPA. |
| Dostępność (a11y) | **Axe** (integracja z Playwright/Cypress) | Standard branżowy do automatycznego wykrywania problemów z dostępnością. |
| CI/CD | **GitHub Actions** | Natywna integracja z GitHubem do automatycznego uruchamiania testów przy każdym pull requeście i wdrożeniu. |
| Zarządzanie błędami | **GitHub Issues** | Wbudowane w repozytorium, wystarczające dla projektu w tej skali. |

---

## 7. Harmonogram testów

Testowanie będzie procesem ciągłym, zintegrowanym z cyklem deweloperskim (np. w ramach sprintów).

- **Faza 1: Konfiguracja i testy podstawowe (Sprint 1-2):**
  - Konfiguracja środowisk testowych i narzędzi.
  - Pisanie testów jednostkowych i integracyjnych dla modułu autoryzacji.
  - Pierwsze testy E2E dla ścieżki rejestracji i logowania.
- **Faza 2: Testowanie kluczowych funkcjonalności (Sprint 3-4):**
  - Rozbudowa pokrycia testami dla modułu dodawania wpisów, pulpitu i historii.
  - Testy integracyjne dla endpointów API związanych z nastrojem.
  - Testy manualne i eksploracyjne dla nowych funkcji.
- **Faza 3: Testy regresji i stabilizacja (Przed wydaniem bety):**
  - Pełny cykl testów regresji (automatycznych i manualnych).
  - Testowanie na różnych przeglądarkach.
  - Finalne testy użyteczności i dostępności.

---

## 8. Kryteria akceptacji testów

### 8.1 Kryteria wejścia (rozpoczęcia testów)

- Dostępna jest stabilna wersja aplikacji na środowisku testowym.
- Dokumentacja techniczna i wymagania funkcjonalne są dostępne.
- Środowisko testowe jest skonfigurowane i gotowe do użycia.

### 8.2 Kryteria wyjścia (zakończenia testów)

- **100%** krytycznych scenariuszy testowych (P0) zakończonych sukcesem.
- **95%** scenariuszy o wysokim priorytecie (P1) zakończonych sukcesem.
- Brak otwartych błędów o priorytecie krytycznym (Blocker) i wysokim (Major).
- Pokrycie kodu testami jednostkowymi i integracyjnymi na poziomie co najmniej **70%**.
- Wszystkie zautomatyzowane testy E2E w CI/CD kończą się sukcesem ("zielony build").

---

## 9. Role i odpowiedzialności w procesie testowania

- **Deweloper:**
  - Odpowiedzialny za pisanie testów jednostkowych dla tworzonego kodu.
  - Poprawianie błędów zgłoszonych przez zespół QA.
  - Zapewnienie, że zmiany przechodzą przez CI/CD bez błędów.
- **Inżynier QA:**
  - Tworzenie i utrzymanie niniejszego planu testów.
  - Projektowanie i implementacja testów integracyjnych i E2E.
  - Wykonywanie testów manualnych, eksploracyjnych i regresji.
  - Raportowanie i weryfikacja błędów.
- **Product Owner / Manager Projektu:**
  - Definiowanie priorytetów dla testowanych funkcjonalności.
  - Udział w testach akceptacyjnych użytkownika (UAT).
  - Podejmowanie decyzji o wydaniu aplikacji na podstawie raportów z testów.

---

## 10. Procedury raportowania błędów

Wszystkie wykryte błędy będą raportowane w systemie **GitHub Issues**. Każde zgłoszenie powinno zawierać następujące elementy:

- **Tytuł:** Krótki, zwięzły opis problemu.
- **Projekt/Moduł:** Etykieta wskazująca obszar aplikacji, którego dotyczy błąd (np. `auth`, `dashboard`, `ui`).
- **Opis:**
  - **Kroki do reprodukcji:** Szczegółowa, ponumerowana lista kroków prowadzących do wystąpienia błędu.
  - **Obserwowany rezultat:** Co faktycznie się stało.
  - **Oczekiwany rezultat:** Jak aplikacja powinna się zachować.
- **Środowisko:** Informacje o przeglądarce, systemie operacyjnym, urządzeniu.
- **Priorytet:**
  - **Blocker:** Uniemożliwia dalsze testowanie lub korzystanie z kluczowej funkcji.
  - **Major:** Poważny błąd w kluczowej funkcjonalności.
  - **Minor:** Błąd o mniejszym znaczeniu, który nie blokuje przepływu.
  - **Trivial:** Błąd kosmetyczny, literówka.
- **Załączniki:** Zrzuty ekranu, nagrania wideo, logi z konsoli.