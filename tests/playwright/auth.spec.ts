import { test, expect, type Page } from "@playwright/test";

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

async function waitForRegisterForm(page: Page) {
  await expect(page.getByTestId("register-form")).toHaveAttribute("data-ready", "true");
}

async function gotoRegister(page: Page) {
  await page.goto("/register");
  await waitForRegisterForm(page);
}

async function waitForLoginForm(page: Page) {
  await expect(page.getByTestId("login-form")).toHaveAttribute("data-ready", "true");
}

async function gotoLogin(page: Page) {
  await page.goto("/login");
  await waitForLoginForm(page);
}

test.describe("Rejestracja użytkownika", () => {
  test("pomyślna rejestracja z przekierowaniem do FTUE", async ({ page }) => {
    const testEmail = generateTestEmail();

    await gotoRegister(page);
    await expect(page.getByRole("heading", { level: 1, name: "Załóż konto MoodMate" })).toBeVisible();

    // Wypełnij formularz
    await page.getByLabel("Adres email").fill(testEmail);
    await page.getByLabel("Hasło").fill(TEST_PASSWORD);

    // Zaznacz checkboxy i poczekaj na zmianę stanu
    const termsCheckbox = page.getByRole("checkbox", { name: "Akceptuję Regulamin i Politykę prywatności" }).first();
    await termsCheckbox.click();
    await expect(termsCheckbox).toBeChecked();

    const adultCheckbox = page.getByRole("checkbox", { name: "Potwierdzam, że mam 18 lat lub więcej" }).first();
    await adultCheckbox.click();
    await expect(adultCheckbox).toBeChecked();

    // Sprawdź czy przycisk submit jest aktywny
    const submitButton = page.getByRole("button", { name: "Utwórz konto" });
    await expect(submitButton).toBeEnabled();

    // Wyślij formularz
    await submitButton.click();

    // Sprawdź loading state
    await expect(page.getByRole("button", { name: /Tworzę konto/ })).toBeVisible();

    // Poczekaj na przekierowanie
    await page.waitForURL(/\/(app\/ftue|app\/dashboard)/, { timeout: 10000 });

    await expect(page).toHaveURL(/\/app\//);
  });

  test("walidacja - blokada submit bez zaznaczenia checkboxów", async ({ page }) => {
    await gotoRegister(page);

    await page.getByLabel("Adres email").fill("test@example.com");
    await page.getByLabel("Hasło").fill(TEST_PASSWORD);

    // Checkboxy nie zaznaczone - przycisk powinien być disabled
    const submitButton = page.getByRole("button", { name: "Utwórz konto" });
    await expect(submitButton).toBeDisabled();
  });

  test("walidacja - niepoprawny format emaila", async ({ page }) => {
    await gotoRegister(page);

    await page.getByLabel("Adres email").fill("niepoprawny-email");
    await page.getByLabel("Hasło").fill(TEST_PASSWORD);
    await page.getByText("Akceptuję Regulamin i Politykę prywatności", { exact: true }).click();
    await page.getByText("Potwierdzam, że mam 18 lat lub więcej", { exact: true }).click();

    await page.getByRole("button", { name: "Utwórz konto" }).click();

    // Sprawdź błąd walidacji
    await expect(page.getByText(/Podaj poprawny adres email/i)).toBeVisible();
  });

  test("walidacja - zbyt krótkie hasło", async ({ page }) => {
    await gotoRegister(page);

    await page.getByLabel("Adres email").fill("test@example.com");
    await page.getByLabel("Hasło").fill("short");
    await page.getByText("Akceptuję Regulamin i Politykę prywatności", { exact: true }).click();
    await page.getByText("Potwierdzam, że mam 18 lat lub więcej", { exact: true }).click();

    await page.getByRole("button", { name: "Utwórz konto" }).click();

    // Sprawdź błąd walidacji (min 8 znaków) - użyj bardziej specyficznego selektora
    const errorMessage = page.locator('[data-slot="form-message"]').filter({ hasText: /Użyj co najmniej 8 znaków/ });
    await expect(errorMessage).toBeVisible();
  });

  test("wyświetla wskazówkę dot. siły hasła", async ({ page }) => {
    await gotoRegister(page);

    // Sprawdź czy PasswordStrengthHint jest widoczny (wielokrotny match - weź pierwszy)
    await expect(page.getByText(/Użyj co najmniej 8 znaków/i).first()).toBeVisible();

    // Wpisz hasło i sprawdź live feedback
    await page.getByLabel("Hasło").fill(TEST_PASSWORD);
    await expect(page.getByText(/Wygląda dobrze/i)).toBeVisible();
  });

  test("linki do regulaminu i polityki prywatności", async ({ page }) => {
    await gotoRegister(page);

    // Sprawdź czy linki istnieją (są w tekście checkboxa)
    await expect(page.getByRole("link", { name: "Regulamin" })).toHaveAttribute("href", "/terms");
    await expect(page.getByRole("link", { name: "Politykę prywatności" })).toHaveAttribute("href", "/privacy");
  });

  test("link do logowania dla istniejących użytkowników", async ({ page }) => {
    await gotoRegister(page);

    const loginLink = page.getByRole("link", { name: /Zaloguj się/i });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute("href", "/login");
  });
});

test.describe("Logowanie użytkownika", () => {
  test("pomyślne logowanie z przekierowaniem do dashboard", async ({ page, context }) => {
    // Najpierw zarejestruj użytkownika
    const testEmail = generateTestEmail();

    await gotoRegister(page);
    await page.getByLabel("Adres email").fill(testEmail);
    await page.getByLabel("Hasło").fill(TEST_PASSWORD);
    await page.getByText("Akceptuję Regulamin i Politykę prywatności", { exact: true }).click();
    await page.getByText("Potwierdzam, że mam 18 lat lub więcej", { exact: true }).click();
    await page.getByRole("button", { name: "Utwórz konto" }).click();

    // Poczekaj na przekierowanie po rejestracji
    await page.waitForURL(/\/app\//, { timeout: 10000 });

    // Wyloguj się (usuń cookies)
    await context.clearCookies();

    // Przejdź do strony logowania
    await gotoLogin(page);
    await expect(page.getByRole("heading", { level: 1, name: "Zaloguj się do MoodMate" })).toBeVisible();

    // Wypełnij formularz logowania
    await page.getByLabel("Adres email").fill(testEmail);
    await page.getByLabel("Hasło").fill(TEST_PASSWORD);

    const submitButton = page.getByRole("button", { name: "Zaloguj się" });
    await expect(submitButton).toBeEnabled();

    // Zaloguj się
    await submitButton.click();

    // Sprawdź loading state
    await expect(page.getByRole("button", { name: /Loguję/ })).toBeVisible();

    // Poczekaj na przekierowanie do dashboard
    await page.waitForURL("/app/dashboard", { timeout: 10000 });

    // Sprawdź czy jesteśmy na dashboardzie
    await expect(page).toHaveURL("/app/dashboard");
  });

  test("błąd przy niepoprawnym haśle", async ({ page }) => {
    await gotoLogin(page);
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

    await page.getByLabel("Adres email").fill("test@example.com");
    await page.getByLabel("Hasło").fill("WrongPassword123!");

    await page.getByRole("button", { name: "Zaloguj się" }).click();

    // Sprawdź komunikat błędu - użytkownik nie istnieje lub złe hasło
    // Backend zwraca "Nieprawidłowy email lub hasło"
    await expect(page.getByText(/Nieprawidłowy email lub hasło/i)).toBeVisible();
  });

  test("link do rejestracji dla nowych użytkowników", async ({ page }) => {
    await gotoLogin(page);

    const registerLink = page.getByRole("link", { name: /Załóż je/i });
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveAttribute("href", "/register");
  });

  test("link do resetu hasła", async ({ page }) => {
    await gotoLogin(page);

    const resetLink = page.getByRole("link", { name: /Zapomniałeś hasła/i });
    await expect(resetLink).toBeVisible();
    await expect(resetLink).toHaveAttribute("href", "/password/reset");
  });
});

test.describe("Middleware i przekierowania", () => {
  test("zalogowany użytkownik jest przekierowany z /login do /app/dashboard", async ({ page }) => {
    // Najpierw zarejestruj i zaloguj użytkownika
    const testEmail = generateTestEmail();

    await gotoRegister(page);
    await page.getByLabel("Adres email").fill(testEmail);
    await page.getByLabel("Hasło").fill(TEST_PASSWORD);
    await page.getByText("Akceptuję Regulamin i Politykę prywatności", { exact: true }).click();
    await page.getByText("Potwierdzam, że mam 18 lat lub więcej", { exact: true }).click();
    await page.getByRole("button", { name: "Utwórz konto" }).click();

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
    await gotoRegister(page);

    // Sprawdź czy pola mają powiązane etykiety
    const emailInput = page.getByLabel("Adres email");
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("autocomplete", "email");
    await expect(emailInput).toHaveAttribute("inputmode", "email");

    const passwordInput = page.getByLabel("Hasło");
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");
    await expect(passwordInput).toHaveAttribute("autocomplete", "new-password");

    // Sprawdź checkboxy
    const termsCheckbox = page.getByLabel("Akceptuję Regulamin i Politykę prywatności");
    await expect(termsCheckbox).toBeVisible();
    // aria-describedby może mieć dynamiczny ID, sprawdźmy że istnieje
    await expect(termsCheckbox).toHaveAttribute("aria-describedby", /.+/);

    const adultCheckbox = page.getByLabel("Potwierdzam, że mam 18 lat lub więcej");
    await expect(adultCheckbox).toBeVisible();
  });

  test("komunikaty błędów mają aria-live", async ({ page }) => {
    await gotoRegister(page);

    // Wypełnij formularz z błędami
    await page.getByLabel("Adres email").fill("invalid-email");
    await page.getByLabel("Hasło").fill("short");
    await page.getByText("Akceptuję Regulamin i Politykę prywatności", { exact: true }).click();
    await page.getByText("Potwierdzam, że mam 18 lat lub więcej", { exact: true }).click();

    await page.getByRole("button", { name: "Utwórz konto" }).click();

    // Sprawdź czy kontener błędów ma aria-live (jest ich kilka - weź ten z formularza rejestracji)
    const errorContainer = page
      .getByTestId("register-form")
      .locator('div[aria-live="polite"][aria-atomic="true"]')
      .first();
    await expect(errorContainer).toBeVisible();
  });

  test("przycisk submit ma aria-busy podczas ładowania", async ({ page }) => {
    await gotoRegister(page);

    const testEmail = generateTestEmail();
    await page.getByLabel("Adres email").fill(testEmail);
    await page.getByLabel("Hasło").fill(TEST_PASSWORD);
    await page.getByText("Akceptuję Regulamin i Politykę prywatności", { exact: true }).click();
    await page.getByText("Potwierdzam, że mam 18 lat lub więcej", { exact: true }).click();

    const submitButton = page.getByTestId("register-submit");

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
    const clickPromise = submitButton.click();

    // Poczekaj chwilę na start submitu
    await page.waitForTimeout(50);

    // Teraz sprawdź aria-busy
    await expect(submitButton).toHaveAttribute("aria-busy", "true");

    // Poczekaj na zakończenie kliknięcia
    await clickPromise;
  });
});

test.describe("Obsługa błędów", () => {
  test("wyświetla komunikat przy błędzie sieci", async ({ page }) => {
    await gotoRegister(page);

    const testEmail = generateTestEmail();
    await page.getByLabel("Adres email").fill(testEmail);
    await page.getByLabel("Hasło").fill(TEST_PASSWORD);
    await page.getByText("Akceptuję Regulamin i Politykę prywatności", { exact: true }).click();
    await page.getByText("Potwierdzam, że mam 18 lat lub więcej", { exact: true }).click();

    // Symuluj błąd sieci
    await page.route("**/api/auth/register", (route) => route.abort("failed"));

    await page.getByRole("button", { name: "Utwórz konto" }).click();

    // Sprawdź komunikat błędu (tekst dokładny z register.client.ts linia 57)
    await expect(page.getByText(/Nie udało się połączyć z serwerem. Spróbuj ponownie za chwilę./i)).toBeVisible();
  });

  test("zachowuje dane w formularzu po błędzie", async ({ page }) => {
    await gotoRegister(page);

    const testEmail = "test@example.com";
    await page.getByLabel("Adres email").fill(testEmail);
    await page.getByLabel("Hasło").fill("short"); // zbyt krótkie hasło
    await page.getByText("Akceptuję Regulamin i Politykę prywatności", { exact: true }).click();
    await page.getByText("Potwierdzam, że mam 18 lat lub więcej", { exact: true }).click();

    await page.getByRole("button", { name: "Utwórz konto" }).click();

    // Sprawdź błąd walidacji - użyj specyficznego selektora dla komunikatu błędu
    const errorMessage = page.locator('[data-slot="form-message"]').filter({ hasText: /Użyj co najmniej 8 znaków/ });
    await expect(errorMessage).toBeVisible();

    // Poczekaj chwilę na zakończenie walidacji
    await page.waitForTimeout(100);

    // Sprawdź czy email jest zachowany (react-hook-form normalizuje: trim + toLowerCase)
    const emailInput = page.getByLabel("Adres email");
    await expect(emailInput).toHaveValue(testEmail);
  });
});
