import { test, expect, type Page } from "@playwright/test";
import { LoginPage, RegisterPage } from "./pages";

/**
 * E2E testy dla flow autentykacji (rejestracja + logowanie)
 *
 * Uwaga: Te testy wymagają działającego backendu Supabase z migracjami.
 * W środowisku CI należy użyć testowej instancji Supabase lub mock'ów.
 */

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Brak wymaganej zmiennej środowiskowej: ${name}`);
  }
  return value;
}

const E2E_LOGIN_EMAIL = getRequiredEnv("E2E_USERNAME");
const E2E_LOGIN_PASSWORD = getRequiredEnv("E2E_PASSWORD");

// Helper do generowania unikalnego emaila dla testów (ten sam domenowy login)
function generateTestEmail(): string {
  const [localPart, domain] = E2E_LOGIN_EMAIL.split("@");
  const safeLocal = (localPart ?? "e2e").replace(/[^a-z0-9._-]/gi, "");
  const timestamp = Date.now();
  return `${safeLocal}+${timestamp}@${domain ?? "example.com"}`;
}

const TEST_PASSWORD = "TestPassword123!";
const REGISTER_ENDPOINT = "/api/auth/register";
const LOGIN_ENDPOINT = "/api/auth/login";

async function mockAuthSuccess(page: Page, endpoint: string, email: string, status = 201, delayMs = 0) {
  const now = Date.now();
  const session = {
    user: {
      id: `e2e-user-${now}`,
      email,
    },
    session: {
      accessToken: `e2e-access-${now}`,
      refreshToken: `e2e-refresh-${now}`,
      expiresAt: new Date(now + 60 * 60 * 1000).toISOString(),
    },
  };

  await page.route(
    `**${endpoint}`,
    async (route) => {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(session),
      });
    },
    { times: 1 }
  );

  return session;
}

async function fillRegisterForm(
  registerPage: RegisterPage,
  email: string,
  password = TEST_PASSWORD,
  { acceptTerms = true, acceptAdult = true } = {}
) {
  await registerPage.fillEmail(email);
  await registerPage.fillPassword(password);

  if (acceptTerms) {
    await registerPage.acceptTerms();
  }

  if (acceptAdult) {
    await registerPage.acceptAdult();
  }
}

async function registerWithSupabase({
  page,
  email,
  password = TEST_PASSWORD,
  waitForRedirect = true,
}: {
  page: Page;
  email: string;
  password?: string;
  waitForRedirect?: boolean;
}) {
  const registerPage = new RegisterPage(page);
  await registerPage.gotoRegister();
  await expect(registerPage.heading).toBeVisible();

  await fillRegisterForm(registerPage, email, password);
  await expect(registerPage.submitButton).toBeEnabled();

  const registerResponsePromise = page.waitForResponse((response) => response.url().includes(REGISTER_ENDPOINT));

  await registerPage.submit();

  const registerResponse = await registerResponsePromise;
  const registerStatus = registerResponse.status();
  const registerPayload = await registerResponse.json().catch(() => null);
  expect(registerStatus, `register response: ${JSON.stringify(registerPayload)}`).toBeGreaterThanOrEqual(200);
  expect(registerStatus, `register response: ${JSON.stringify(registerPayload)}`).toBeLessThan(300);

  if (waitForRedirect) {
    await page.waitForURL(/\/(app\/ftue|app\/dashboard)/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/app\//);
  }

  return { registerPage };
}

async function loginWithSupabase({
  page,
  email,
  password = TEST_PASSWORD,
}: {
  page: Page;
  email: string;
  password?: string;
}) {
  const loginPage = new LoginPage(page);
  await loginPage.gotoLogin();
  await expect(loginPage.heading).toBeVisible();

  await loginPage.fillEmail(email);
  await loginPage.fillPassword(password);
  await expect(loginPage.submitButton).toBeEnabled();

  const loginResponsePromise = page.waitForResponse((response) => response.url().includes(LOGIN_ENDPOINT));

  await loginPage.submit();

  const loginResponse = await loginResponsePromise;
  const loginStatus = loginResponse.status();
  const loginPayload = await loginResponse.json().catch(() => null);
  expect(loginStatus, `login response: ${JSON.stringify(loginPayload)}`).toBeGreaterThanOrEqual(200);
  expect(loginStatus, `login response: ${JSON.stringify(loginPayload)}`).toBeLessThan(300);

  await page.waitForURL("/app/dashboard", { timeout: 10000 });
  await expect(page).toHaveURL("/app/dashboard");

  return { loginPage };
}

test.describe("Rejestracja użytkownika", () => {
  test("pomyślna rejestracja z przekierowaniem do FTUE", async ({ page }) => {
    const testEmail = generateTestEmail();

    await registerWithSupabase({ page, email: testEmail });
  });

  test("walidacja - blokada submit bez zaznaczenia checkboxów", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.gotoRegister();

    await fillRegisterForm(registerPage, "test@example.com", TEST_PASSWORD, {
      acceptTerms: false,
      acceptAdult: false,
    });

    // Checkboxy nie zaznaczone - przycisk powinien być disabled
    await expect(registerPage.submitButton).toBeDisabled();
  });

  test("walidacja - niepoprawny format emaila", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.gotoRegister();

    await fillRegisterForm(registerPage, "niepoprawny-email");

    await registerPage.submit();

    // Sprawdź błąd walidacji
    await expect(registerPage.invalidEmailError).toBeVisible();
  });

  test("walidacja - zbyt krótkie hasło", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.gotoRegister();

    await fillRegisterForm(registerPage, "test@example.com", "short");

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
  test("pomyślne logowanie z przekierowaniem do dashboard", async ({ page }) => {
    await loginWithSupabase({ page, email: E2E_LOGIN_EMAIL, password: E2E_LOGIN_PASSWORD });
  });

  test("błąd przy niepoprawnym haśle", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoLogin();
    await page.route(
      `**${LOGIN_ENDPOINT}`,
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
    await loginWithSupabase({ page, email: E2E_LOGIN_EMAIL, password: E2E_LOGIN_PASSWORD });

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
    await fillRegisterForm(registerPage, "invalid-email", "short");

    await registerPage.submit();

    // Sprawdź czy kontener błędów ma aria-live (jest ich kilka - weź ten z formularza rejestracji)
    await expect(registerPage.errorContainer).toBeVisible();
  });

  test("przycisk submit ma aria-busy podczas ładowania", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.gotoRegister();

    const testEmail = generateTestEmail();
    await fillRegisterForm(registerPage, testEmail);

    // Intercept request z opóźnieniem aby złapać stan loading
    await mockAuthSuccess(page, REGISTER_ENDPOINT, testEmail, 201, 500);

    // Kliknij i natychmiast sprawdź aria-busy
    const clickPromise = registerPage.submitButtonTestId.click();

    // Teraz sprawdź aria-busy
    await expect(registerPage.submitButtonTestId).toHaveAttribute("aria-busy", "true", { timeout: 2000 });

    // Poczekaj na zakończenie kliknięcia
    await clickPromise;
  });
});

test.describe("Obsługa błędów", () => {
  test("wyświetla komunikat przy przekroczeniu rate limitu", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.gotoRegister();

    const testEmail = generateTestEmail();
    await fillRegisterForm(registerPage, testEmail);

    // Symuluj przekroczenie rate limitu (429)
    const resetAt = new Date(Date.now() + 60000).toISOString();
    await page.route(
      `**${REGISTER_ENDPOINT}`,
      async (route) => {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          headers: {
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": resetAt,
          },
          body: JSON.stringify({ message: "Za dużo prób. Odczekaj chwilę i spróbuj ponownie." }),
        });
      },
      { times: 1 }
    );

    await registerPage.submit();

    // Sprawdź komunikat rate limitu
    const rateLimitNotice = page.getByText(/Za dużo prób. Odczekaj chwilę i spróbuj ponownie/i);
    await expect(rateLimitNotice).toBeVisible();

    // Sprawdź że przycisk jest zablokowany
    await expect(registerPage.submitButtonTestId).toBeDisabled();
  });

  test("wyświetla komunikat przy błędzie sieci", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.gotoRegister();

    const testEmail = generateTestEmail();
    await fillRegisterForm(registerPage, testEmail);

    // Symuluj błąd sieci
    await page.route(`**${REGISTER_ENDPOINT}`, (route) => route.abort("failed"));

    await registerPage.submit();

    // Sprawdź komunikat błędu (tekst dokładny z register.client.ts linia 57)
    await expect(registerPage.networkErrorMessage).toBeVisible();
  });

  test("zachowuje dane w formularzu po błędzie", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.gotoRegister();

    const testEmail = "test@example.com";
    await fillRegisterForm(registerPage, testEmail, "short"); // zbyt krótkie hasło

    await registerPage.submit();

    // Sprawdź błąd walidacji - użyj specyficznego selektora dla komunikatu błędu
    await expect(registerPage.minPasswordLengthError).toBeVisible();

    // Sprawdź czy email jest zachowany (react-hook-form normalizuje: trim + toLowerCase)
    await expect(registerPage.emailInput).toHaveValue(testEmail);
  });
});
