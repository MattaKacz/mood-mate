import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./base.page";

export class AddMoodFormPage extends BasePage {
  // Main form
  readonly form: Locator;
  readonly successView: Locator;
  readonly successAlert: Locator;
  readonly formErrorAlert: Locator;

  // Mood Score Picker
  readonly moodScorePicker: Locator;
  readonly moodScoreOptions: Locator;

  // Note Textarea
  readonly noteContainer: Locator;
  readonly noteInput: Locator;
  readonly noteCounter: Locator;

  // Tag Selector
  readonly tagSelector: Locator;
  readonly tagOptions: Locator;

  // AI Suggestion
  readonly aiToggleContainer: Locator;
  readonly aiToggleInput: Locator;
  readonly aiSuggestionLoading: Locator;
  readonly aiSuggestionPanel: Locator;
  readonly aiSuggestionText: Locator;
  readonly aiSuggestionHelpfulYes: Locator;
  readonly aiSuggestionHelpfulNo: Locator;

  // Form Actions
  readonly resetButton: Locator;
  readonly submitButton: Locator;
  readonly submitLoadingIndicator: Locator;

  // Success Actions
  readonly addAnotherButton: Locator;
  readonly backToDashboardButton: Locator;

  constructor(page: Page) {
    super(page);

    // Main form
    this.form = page.getByTestId("add-mood-form");
    this.successView = page.getByTestId("add-mood-success");
    this.successAlert = page.getByTestId("add-mood-success-alert");
    this.formErrorAlert = page.getByTestId("add-mood-form-error");

    // Mood Score Picker
    this.moodScorePicker = page.getByTestId("mood-score-picker");
    this.moodScoreOptions = page.getByTestId("mood-score-options");

    // Note Textarea
    this.noteContainer = page.getByTestId("mood-note");
    this.noteInput = page.getByTestId("mood-note-input");
    this.noteCounter = page.getByTestId("mood-note-counter");

    // Tag Selector
    this.tagSelector = page.getByTestId("mood-tag-selector");
    this.tagOptions = page.getByTestId("mood-tag-options");

    // AI Suggestion
    this.aiToggleContainer = page.getByTestId("add-mood-ai-toggle");
    this.aiToggleInput = page.getByTestId("add-mood-ai-toggle-input");
    this.aiSuggestionLoading = page.getByTestId("ai-suggestion-loading");
    this.aiSuggestionPanel = page.getByTestId("ai-suggestion-panel");
    this.aiSuggestionText = page.getByTestId("ai-suggestion-text");
    this.aiSuggestionHelpfulYes = page.getByTestId("ai-suggestion-helpful-yes");
    this.aiSuggestionHelpfulNo = page.getByTestId("ai-suggestion-helpful-no");

    // Form Actions
    this.resetButton = page.getByTestId("add-mood-reset");
    this.submitButton = page.getByTestId("add-mood-submit");
    this.submitLoadingIndicator = page.getByTestId("add-mood-submit-loading");

    // Success Actions
    this.addAnotherButton = page.getByTestId("add-mood-add-another");
    this.backToDashboardButton = page.getByTestId("add-mood-back-dashboard");
  }

  // Navigation
  async gotoNewEntry() {
    await this.goto("/app/entry/new");
    await expect(this.form).toBeVisible();
  }

  // Mood Score Actions
  async selectMoodScore(score: 1 | 2 | 3 | 4 | 5) {
    const moodScoreButton = this.page.getByTestId(`mood-score-${score}`);
    await moodScoreButton.click();
    await expect(moodScoreButton).toHaveAttribute("aria-checked", "true");
  }

  getMoodScoreButton(score: 1 | 2 | 3 | 4 | 5): Locator {
    return this.page.getByTestId(`mood-score-${score}`);
  }

  async expectMoodScoreSelected(score: 1 | 2 | 3 | 4 | 5) {
    await expect(this.getMoodScoreButton(score)).toHaveAttribute("aria-checked", "true");
  }

  // Note Actions
  async fillNote(text: string) {
    await this.noteInput.fill(text);
  }

  async expectNoteCounter(current: number, max = 280) {
    await expect(this.noteCounter).toHaveText(`${current} / ${max}`);
  }

  // Tag Actions
  async selectTag(tagId: string) {
    const tagButton = this.page.getByTestId(`mood-tag-${tagId}`);
    await tagButton.click();
    await expect(tagButton).toHaveAttribute("aria-pressed", "true");
  }

  async deselectTag(tagId: string) {
    const tagButton = this.page.getByTestId(`mood-tag-${tagId}`);
    await tagButton.click();
    await expect(tagButton).toHaveAttribute("aria-pressed", "false");
  }

  getTagButton(tagId: string): Locator {
    return this.page.getByTestId(`mood-tag-${tagId}`);
  }

  async expectTagSelected(tagId: string) {
    await expect(this.getTagButton(tagId)).toHaveAttribute("aria-pressed", "true");
  }

  async expectTagNotSelected(tagId: string) {
    await expect(this.getTagButton(tagId)).toHaveAttribute("aria-pressed", "false");
  }

  // AI Suggestion Actions
  async toggleAiSuggestion() {
    await this.aiToggleInput.click();
  }

  async enableAiSuggestion() {
    const isChecked = await this.aiToggleInput.isChecked();
    if (!isChecked) {
      await this.aiToggleInput.click();
    }
    await expect(this.aiToggleInput).toBeChecked();
  }

  async disableAiSuggestion() {
    const isChecked = await this.aiToggleInput.isChecked();
    if (isChecked) {
      await this.aiToggleInput.click();
    }
    await expect(this.aiToggleInput).not.toBeChecked();
  }

  async expectAiSuggestionVisible() {
    await expect(this.aiSuggestionPanel).toBeVisible();
  }

  async expectAiSuggestionLoading() {
    await expect(this.aiSuggestionLoading).toBeVisible();
  }

  async provideFeedbackPositive() {
    await this.aiSuggestionHelpfulYes.click();
  }

  async provideFeedbackNegative() {
    await this.aiSuggestionHelpfulNo.click();
  }

  // Form Actions
  async submit() {
    await this.submitButton.click();
  }

  async reset() {
    await this.resetButton.click();
  }

  async expectSubmitLoading() {
    await expect(this.submitLoadingIndicator).toBeVisible();
  }

  async expectFormError(errorText: string) {
    await expect(this.formErrorAlert).toBeVisible();
    await expect(this.formErrorAlert).toContainText(errorText);
  }

  // Success State Actions
  async expectSuccessView() {
    await expect(this.successView).toBeVisible();
    await expect(this.successAlert).toBeVisible();
  }

  async addAnotherEntry() {
    await this.addAnotherButton.click();
    await expect(this.form).toBeVisible();
  }

  async backToDashboard() {
    await this.backToDashboardButton.click();
    await expect(this.page).toHaveURL("/app/dashboard");
  }

  // Complex Workflows
  async fillAndSubmitBasicEntry(score: 1 | 2 | 3 | 4 | 5) {
    await this.selectMoodScore(score);
    await this.submit();
  }

  async fillAndSubmitFullEntry(score: 1 | 2 | 3 | 4 | 5, note: string, tags: string[], requestAi = false) {
    await this.selectMoodScore(score);
    await this.fillNote(note);

    for (const tag of tags) {
      await this.selectTag(tag);
    }

    if (requestAi) {
      await this.enableAiSuggestion();
    }

    await this.submit();
  }

  // Validation Helpers
  async expectFieldError(fieldName: "score" | "note" | "tags", errorText: string) {
    const errorLocator = this.page.getByText(errorText).first();
    await expect(errorLocator).toBeVisible();
  }

  async expectScoreError() {
    await this.expectFieldError("score", "Wybierz poziom nastroju");
  }

  async expectNoteOverLimitError() {
    await this.expectFieldError("note", "Notatka nie może mieć więcej niż 280 znaków");
  }

  async expectTagsMaxError() {
    await this.expectFieldError("tags", "Możesz wybrać maksymalnie 2 tagi");
  }
}
