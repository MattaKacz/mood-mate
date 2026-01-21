import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./base.page";

export class DashboardPage extends BasePage {
  readonly heading: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole("heading", { level: 1 });
  }

  async gotoDashboard() {
    await this.goto("/app/dashboard");
    await expect(this.page).toHaveURL("/app/dashboard");
  }
}
