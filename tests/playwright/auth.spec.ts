import { test, expect } from "@playwright/test";
import { LoginPage, RegisterPage } from "./pages";

/**
 * E2E testy dla flow autentykacji (rejestracja + logowanie)
 *
 * Uwaga: Te testy wymagają działającego backendu Supabase z migracjami.
 * W środowisku CI należy użyć testowej instancji Supabase lub mock'ów.
 */

// Helper do generowania unikalnego emaila dla testów
function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `test-${timestamp}-${random}@example.com`;
}

const TEST_PASSWORD = "TestPassword123!";

test.describe("Rejestracja użytkownika", () => {
  test("pomyślna rejestracja z przekierowaniem do FTUE", async ({ page }) => {
    const testEmail = generateTestEmail();

    const registerPage = new RegisterPage(page);
    await registerPage.gotoRegister();
    await expect(registerPage.heading).toBeVisible();

    // Wypełnij formularz
    await registerPage.fillEmail(testEmail);
    await registerPage.fillPassword(TEST_PASSWORD);

    // Zaznacz checkboxy i poczekaj na zmianę stanu
    await registerPage.acceptTerms();
    await registerPage.acceptAdult();

    // Sprawdź czy przycisk submit jest aktywny
    await expect(registerPage.submitButton).toBeEnabled();

    // Wyślij formularz
    await registerPage.submit();

    // Sprawdź loading state
    await expect(registerPage.submitButtonLoading).toBeVisible();

    // Poczekaj na przekierowanie
    await page.waitForURL(/\/(app\/ftue|app\/dashboard)/, { timeout: 10000 });

    await expect(page).toHaveURL(/\/app\//);
  });

  test("walidacja - blokada submit bez zaznaczenia checkboxów", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.gotoRegister();

    await registerPage.fillEmail("test@example.com");
    await registerPage.fillPassword(TEST_PASSWORD);

    // Checkboxy nie zaznaczone - przycisk powinien być disabled
    await expect(registerPage.submitButton).toBeDisabled();
  });

  test("walidacja - niepoprawny format emaila", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.gotoRegister();

    await registerPage.fillEmail("niepoprawny-email");
    await registerPage.fillPassword(TEST_PASSWORD);
    await registerPage.acceptTerms();
    await registerPage.acceptAdult();

    await registerPage.submit();

    // Sprawdź błąd walidacji
    await expect(registerPage.invalidEmailError).toBeVisible();
  });

  test("walidacja - zbyt krótkie hasło", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.gotoRegister();

    await registerPage.fillEmail("test@example.com");
    await registerPage.fillPassword("short");
    await registerPage.acceptTerms();
    await registerPage.acceptAdult();

    await registerPage.submit();

    // Sprawdź błąd walidacji (min 8 znaków) - użyj bardziej specyficznego selektora
    await expect(registerPage.minPasswordLengthError).toBeVisible();
  });

  test("wyświetla wskazówkę dot. siły hasła", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.gotoRegister();

    // Sprawdź czy PasswordStrengthHint jest widoczny (wielokrotny match - weź pierwszy)
    await expect(registerPage.passwordHint).toBeVisible();

    // Wpisz hasło i sprawdź live feedback
    await registerPage.fillPassword(TEST_PASSWORD);
    await expect(registerPage.passwordStrongHint).toBeVisible();
  });

  test("linki do regulaminu i polityki prywatności", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.gotoRegister();

    // Sprawdź czy linki istnieją (są w tekście checkboxa)
    await expect(registerPage.termsLink).toHaveAttribute("href", "/terms");
    await expect(registerPage.privacyLink).toHaveAttribute("href", "/privacy");
  });

  test("link do logowania dla istniejących użytkowników", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.gotoRegister();

    await expect(registerPage.loginLink).toBeVisible();
    await expect(registerPage.loginLink).toHaveAttribute("href", "/login");
  });
});

test.describe("Logowanie użytkownika", () => {
  test("pomyślne logowanie z przekierowaniem do dashboard", async ({ page, context }) => {
    // Najpierw zarejestruj użytkownika
    const testEmail = generateTestEmail();

    const registerPage = new RegisterPage(page);
    const loginPage = new LoginPage(page);

    await registerPage.gotoRegister();
    await registerPage.fillEmail(testEmail);
    await registerPage.fillPassword(TEST_PASSWORD);
    await registerPage.acceptTerms();
    await registerPage.acceptAdult();
    await registerPage.submit();

    // Poczekaj na przekierowanie po rejestracji
    await page.waitForURL(/\/app\//, { timeout: 10000 });

    // Wyloguj się (usuń cookies)
    await context.clearCookies();

    // Przejdź do strony logowania
    await loginPage.gotoLogin();
    await expect(loginPage.heading).toBeVisible();

    // Wypełnij formularz logowania
    await loginPage.fillEmail(testEmail);
    await loginPage.fillPassword(TEST_PASSWORD);

    await expect(loginPage.submitButton).toBeEnabled();

    // Zaloguj się
    await loginPage.submit();

    // Sprawdź loading state
    await expect(loginPage.submitButtonLoading).toBeVisible();

    // Poczekaj na przekierowanie do dashboard
    await page.waitForURL("/app/dashboard", { timeout: 10000 });

    // Sprawdź czy jesteśmy na dashboardzie
    await expect(page).toHaveURL("/app/dashboard");
  });

  test("błąd przy niepoprawnym haśle", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoLogin();
    await page.route(
      "**/api/auth/login",
      async (route) => {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ message: "Nieprawidłowy email lub hasło." }),
        });
      },
      { times: 1 }
    );

    await loginPage.fillEmail("test@example.com");
    await loginPage.fillPassword("WrongPassword123!");

    await loginPage.submit();

    // Sprawdź komunikat błędu - użytkownik nie istnieje lub złe hasło
    // Backend zwraca "Nieprawidłowy email lub hasło"
    await expect(loginPage.invalidCredentialsError).toBeVisible();
  });

  test("link do rejestracji dla nowych użytkowników", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoLogin();

    await expect(loginPage.registerLink).toBeVisible();
    await expect(loginPage.registerLink).toHaveAttribute("href", "/register");
  });

  test("link do resetu hasła", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoLogin();

    await expect(loginPage.resetLink).toBeVisible();
    await expect(loginPage.resetLink).toHaveAttribute("href", "/forgot-password");
  });
});

test.describe("Middleware i przekierowania", () => {
  test("zalogowany użytkownik jest przekierowany z /login do /app/dashboard", async ({ page }) => {
    // Najpierw zarejestruj i zaloguj użytkownika
    const testEmail = generateTestEmail();

    const registerPage = new RegisterPage(page);
    await registerPage.gotoRegister();
    await registerPage.fillEmail(testEmail);
    await registerPage.fillPassword(TEST_PASSWORD);
    await registerPage.acceptTerms();
    await registerPage.acceptAdult();
    await registerPage.submit();

    await page.waitForURL(/\/app\//, { timeout: 10000 });

    // Teraz spróbuj wejść na /login - powinien przekierować do /app/dashboard
    await page.goto("/login");
    await page.waitForURL("/app/dashboard", { timeout: 5000 });
    await expect(page).toHaveURL("/app/dashboard");
  });

  test("niezalogowany użytkownik jest przekierowany z /app/dashboard do /login", async ({ page }) => {
    await page.goto("/app/dashboard");

    // Powinien przekierować do /login z query param redirectTo
    await page.waitForURL(/\/login\?redirectTo=/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fapp%2Fdashboard/);
  });
});

test.describe("Dostępność (a11y)", () => {
  test("formularz rejestracji ma odpowiednie etykiety i ARIA", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.gotoRegister();

    // Sprawdź czy pola mają powiązane etykiety
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.emailInput).toHaveAttribute("autocomplete", "email");
    await expect(registerPage.emailInput).toHaveAttribute("inputmode", "email");

    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.passwordInput).toHaveAttribute("type", "password");
    await expect(registerPage.passwordInput).toHaveAttribute("autocomplete", "new-password");

    // Sprawdź checkboxy
    await expect(registerPage.termsCheckbox).toBeVisible();
    // aria-describedby może mieć dynamiczny ID, sprawdźmy że istnieje
    await expect(registerPage.termsCheckbox).toHaveAttribute("aria-describedby", /.+/);

    await expect(registerPage.adultCheckbox).toBeVisible();
  });

  test("komunikaty błędów mają aria-live", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.gotoRegister();

    // Wypełnij formularz z błędami
    await registerPage.fillEmail("invalid-email");
    await registerPage.fillPassword("short");
    await registerPage.acceptTerms();
    await registerPage.acceptAdult();

    await registerPage.submit();

    // Sprawdź czy kontener błędów ma aria-live (jest ich kilka - weź ten z formularza rejestracji)
    await expect(registerPage.errorContainer).toBeVisible();
  });

  test("przycisk submit ma aria-busy podczas ładowania", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.gotoRegister();

    const testEmail = generateTestEmail();
    await registerPage.fillEmail(testEmail);
    await registerPage.fillPassword(TEST_PASSWORD);
    await registerPage.acceptTerms();
    await registerPage.acceptAdult();

    // Intercept request z opóźnieniem aby złapać stan loading
    await page.route(
      "**/api/auth/register",
      async (route) => {
        // Opóźnij odpowiedź o 500ms aby mieć czas złapać aria-busy="true"
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      },
      { times: 1 }
    );

    // Kliknij i natychmiast sprawdź aria-busy
    const clickPromise = registerPage.submitButtonTestId.click();

    // Poczekaj chwilę na start submitu
    await page.waitForTimeout(50);

    // Teraz sprawdź aria-busy
    await expect(registerPage.submitButtonTestId).toHaveAttribute("aria-busy", "true");

    // Poczekaj na zakończenie kliknięcia
    await clickPromise;
  });
});

test.describe("Obsługa błędów", () => {
  test("wyświetla komunikat przy błędzie sieci", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.gotoRegister();

    const testEmail = generateTestEmail();
    await registerPage.fillEmail(testEmail);
    await registerPage.fillPassword(TEST_PASSWORD);
    await registerPage.acceptTerms();
    await registerPage.acceptAdult();

    // Symuluj błąd sieci
    await page.route("**/api/auth/register", (route) => route.abort("failed"));

    await registerPage.submit();

    // Sprawdź komunikat błędu (tekst dokładny z register.client.ts linia 57)
    await expect(registerPage.networkErrorMessage).toBeVisible();
  });

  test("zachowuje dane w formularzu po błędzie", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.gotoRegister();

    const testEmail = "test@example.com";
    await registerPage.fillEmail(testEmail);
    await registerPage.fillPassword("short"); // zbyt krótkie hasło
    await registerPage.acceptTerms();
    await registerPage.acceptAdult();

    await registerPage.submit();

    // Sprawdź błąd walidacji - użyj specyficznego selektora dla komunikatu błędu
    await expect(registerPage.minPasswordLengthError).toBeVisible();

    // Poczekaj chwilę na zakończenie walidacji
    await page.waitForTimeout(100);

    // Sprawdź czy email jest zachowany (react-hook-form normalizuje: trim + toLowerCase)
    await expect(registerPage.emailInput).toHaveValue(testEmail);
  });
});
