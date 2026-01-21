import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./base.page";

export class RegisterPage extends BasePage {
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly termsCheckbox: Locator;
  readonly adultCheckbox: Locator;
  readonly submitButton: Locator;
  readonly submitButtonLoading: Locator;
  readonly submitButtonTestId: Locator;
  readonly registerForm: Locator;
  readonly loginLink: Locator;
  readonly termsLink: Locator;
  readonly privacyLink: Locator;
  readonly passwordHint: Locator;
  readonly passwordStrongHint: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole("heading", { level: 1, name: "Załóż konto MoodMate" });
    this.emailInput = page.getByLabel("Adres email");
    this.passwordInput = page.getByLabel("Hasło");
    this.termsCheckbox = page.getByRole("checkbox", { name: "Akceptuję Regulamin i Politykę prywatności" }).first();
    this.adultCheckbox = page.getByRole("checkbox", { name: "Potwierdzam, że mam 18 lat lub więcej" }).first();
    this.submitButton = page.getByRole("button", { name: "Utwórz konto" });
    this.submitButtonLoading = page.getByRole("button", { name: /Tworzę konto/ });
    this.submitButtonTestId = page.getByTestId("register-submit");
    this.registerForm = page.getByTestId("register-form");
    this.loginLink = page.getByRole("link", { name: /Zaloguj się/i });
    this.termsLink = page.getByRole("link", { name: "Regulamin" });
    this.privacyLink = page.getByRole("link", { name: "Politykę prywatności" });
    this.passwordHint = page.getByText(/Użyj co najmniej 8 znaków/i).first();
    this.passwordStrongHint = page.getByText(/Wygląda dobrze/i);
  }

  get minPasswordLengthError() {
    return this.page.locator('[data-slot="form-message"]').filter({ hasText: /Użyj co najmniej 8 znaków/ });
  }

  get invalidEmailError() {
    return this.page.getByText(/Podaj poprawny adres email/i);
  }

  get errorContainer() {
    return this.registerForm.locator('div[aria-live="polite"][aria-atomic="true"]').first();
  }

  get networkErrorMessage() {
    return this.page.getByText(/Nie udało się połączyć z serwerem. Spróbuj ponownie za chwilę./i);
  }

  async gotoRegister() {
    await this.goto("/register");
    await expect(this.registerForm).toHaveAttribute("data-ready", "true");
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async acceptTerms() {
    await this.termsCheckbox.click();
    await expect(this.termsCheckbox).toBeChecked();
  }

  async acceptAdult() {
    await this.adultCheckbox.click();
    await expect(this.adultCheckbox).toBeChecked();
  }

  async submit() {
    await this.submitButton.click();
  }
}

export class LoginPage extends BasePage {
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly submitButtonLoading: Locator;
  readonly loginForm: Locator;
  readonly registerLink: Locator;
  readonly resetLink: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole("heading", { level: 1, name: "Zaloguj się do MoodMate" });
    this.emailInput = page.getByLabel("Adres email");
    this.passwordInput = page.getByLabel("Hasło");
    this.submitButton = page.getByRole("button", { name: "Zaloguj się" });
    this.submitButtonLoading = page.getByRole("button", { name: /Loguję/ });
    this.loginForm = page.getByTestId("login-form");
    this.registerLink = page.getByRole("link", { name: /Załóż je/i });
    this.resetLink = page.getByRole("link", { name: /Zapomniałeś hasła/i });
  }

  get invalidCredentialsError() {
    return this.page.getByText(/Nieprawidłowy email lub hasło/i);
  }

  async gotoLogin() {
    await this.goto("/login");
    await expect(this.loginForm).toHaveAttribute("data-ready", "true");
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }
}
