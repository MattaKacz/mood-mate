# Testy E2E - Dokumentacja

## Wymagania

### Środowisko testowe

Testy E2E wymagają skonfigurowanego pliku `.env.test` w głównym katalogu projektu:

```sh
# Instancja testowa Supabase
SUPABASE_URL=your_test_supabase_url
SUPABASE_KEY=your_test_supabase_key

# Wyłączenie rate limitingu dla testów E2E
TEST_DISABLE_RATE_LIMITING=true
```

### Dlaczego `TEST_DISABLE_RATE_LIMITING=true`?

Rate limiting jest niezbędny w produkcji, ale w testach E2E:

- Testy działają równolegle (`fullyParallel: true`)
- Wszystkie testy pochodzą z tego samego IP (localhost)
- Bez wyłączenia rate limitingu, testy zaczynają się blokować po ~5-6 równoległych rejestracji

**Rozwiązanie:** Zmienna `TEST_DISABLE_RATE_LIMITING=true` wyłącza rate limiting tylko w środowisku testowym, pozostawiając pełną ochronę w development i produkcji.

### Testowanie rate limitingu

Pomimo wyłączenia rate limitingu globalnie, jeden dedykowany test sprawdza jego działanie przez mockowanie odpowiedzi API z kodem 429. Zobacz test: `"wyświetla komunikat przy przekroczeniu rate limitu"` w `auth.spec.ts`.

## Uruchamianie testów

```sh
# Uruchom wszystkie testy E2E
npm run test:e2e

# Uruchom testy w trybie UI
npm run test:e2e:ui

# Pokaż raport z ostatniego uruchomienia
npm run test:e2e:report
```

## Struktura testów

```
tests/
├── playwright/
│   ├── pages/              # Page Object Model
│   │   ├── base.page.ts    # Klasa bazowa dla wszystkich Page Objects
│   │   ├── auth.page.ts    # Page Objects dla auth (RegisterPage, LoginPage)
│   │   ├── add-mood.page.ts # Page Object dla dodawania nastroju
│   │   └── index.ts        # Eksporty
│   ├── auth.spec.ts        # Testy autentykacji (rejestracja, logowanie)
│   ├── add-mood.spec.ts    # Testy dodawania nastroju
│   └── ...
└── README.md               # Ta dokumentacja
```

## Page Object Model

Wszystkie testy używają wzorca Page Object Model (POM) dla lepszej maintainability:

```typescript
// Przykład użycia
const registerPage = new RegisterPage(page);
await registerPage.gotoRegister();
await registerPage.fillEmail("test@example.com");
await registerPage.fillPassword("Password123!");
await registerPage.acceptTerms();
await registerPage.acceptAdult();
await registerPage.submit();
```

## Debugowanie

### Trace Viewer

Jeśli test się nie powiedzie, Playwright automatycznie zapisuje trace. Aby go zobaczyć:

```sh
npx playwright show-trace test-results/<ścieżka-do-trace.zip>
```

### Tryb Debug

```sh
npx playwright test --debug
```

### Headful Mode (przeglądarka widoczna)

```sh
npx playwright test --headed
```

## Najlepsze praktyki

1. **Unikalne emaile w testach rejestracji:**
   - Używaj `generateTestEmail()` do generowania unikalnych emaili
   - Format: `test-{timestamp}-{random}@example.com`

2. **Oczekiwanie na elementy:**
   - Używaj `await expect(element).toBeVisible()` zamiast `waitForTimeout`
   - Sprawdzaj stan formularza: `await expect(form).toHaveAttribute("data-ready", "true")`

3. **Mockowanie API:**
   - Dla testów błędów, mockuj odpowiedzi API zamiast wywoływać prawdziwy backend
   - Używaj `page.route()` z parametrem `{ times: 1 }` dla jednorazowych mock'ów

4. **Asercje:**
   - Sprawdzaj zarówno UI jak i URL po krytycznych akcjach
   - Weryfikuj loading states i komunikaty błędów

## Troubleshooting

### Timeout podczas przekierowania

**Problem:** `TimeoutError: page.waitForURL: Timeout exceeded`

**Możliwe przyczyny:**

1. Rate limiting nie jest wyłączony - sprawdź `.env.test`
2. Backend Supabase nie odpowiada
3. Błąd w logice przekierowania

**Rozwiązanie:**

```sh
# Sprawdź czy zmienna jest ustawiona
cat .env.test | grep TEST_DISABLE_RATE_LIMITING

# Upewnij się że backend działa
npm run dev

# Uruchom test z trace
npx playwright test --trace on
```

### Testy przechodzą lokalnie, ale nie w CI

1. Upewnij się, że `.env.test` jest skopiowany w CI (lub zmienne są ustawione w secrets)
2. Sprawdź czy Supabase testowy jest dostępny z CI
3. Zwiększ timeout w `playwright.config.ts` dla wolniejszych środowisk
