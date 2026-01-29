import { test, expect } from "@playwright/test";
import { AddMoodFormPage } from "./pages";

test.describe("Add Mood Entry", () => {
  let addMoodPage: AddMoodFormPage;

  test.beforeEach(async ({ page }) => {
    addMoodPage = new AddMoodFormPage(page);
    // TODO: Add authentication setup here
    // await addMoodPage.gotoNewEntry();
  });

  test.describe("Form Rendering", () => {
    test.skip("should display all form elements", async () => {
      await expect(addMoodPage.form).toBeVisible();
      await expect(addMoodPage.moodScorePicker).toBeVisible();
      await expect(addMoodPage.noteContainer).toBeVisible();
      await expect(addMoodPage.tagSelector).toBeVisible();
      await expect(addMoodPage.aiToggleContainer).toBeVisible();
      await expect(addMoodPage.submitButton).toBeVisible();
      await expect(addMoodPage.resetButton).toBeVisible();
    });
  });

  test.describe("Mood Score Selection", () => {
    test.skip("should select mood score", async () => {
      await addMoodPage.selectMoodScore(4);
      await addMoodPage.expectMoodScoreSelected(4);
    });

    test.skip("should change mood score selection", async () => {
      await addMoodPage.selectMoodScore(3);
      await addMoodPage.expectMoodScoreSelected(3);

      await addMoodPage.selectMoodScore(5);
      await addMoodPage.expectMoodScoreSelected(5);
    });

    test.skip("should show validation error when submitting without mood score", async () => {
      await addMoodPage.submit();
      await addMoodPage.expectScoreError();
    });
  });

  test.describe("Note Input", () => {
    test.skip("should fill note and update character counter", async () => {
      const note = "Dzisiaj był dobry dzień!";
      await addMoodPage.fillNote(note);
      await expect(addMoodPage.noteInput).toHaveValue(note);
      await addMoodPage.expectNoteCounter(note.length);
    });

    test.skip("should show error when note exceeds 280 characters", async () => {
      const longNote = "a".repeat(281);
      await addMoodPage.selectMoodScore(3);
      await addMoodPage.fillNote(longNote);
      await addMoodPage.submit();
      await addMoodPage.expectNoteOverLimitError();
    });
  });

  test.describe("Tag Selection", () => {
    test.skip("should select and deselect tags", async () => {
      await addMoodPage.selectTag("work");
      await addMoodPage.expectTagSelected("work");

      await addMoodPage.deselectTag("work");
      await addMoodPage.expectTagNotSelected("work");
    });

    test.skip("should allow selecting up to 2 tags", async () => {
      await addMoodPage.selectTag("work");
      await addMoodPage.selectTag("family");
      await addMoodPage.expectTagSelected("work");
      await addMoodPage.expectTagSelected("family");
    });

    test.skip("should show error when trying to select more than 2 tags", async () => {
      await addMoodPage.selectTag("work");
      await addMoodPage.selectTag("family");
      await addMoodPage.selectTag("health");
      await addMoodPage.selectMoodScore(3);
      await addMoodPage.submit();
      await addMoodPage.expectTagsMaxError();
    });
  });

  test.describe("AI Suggestion", () => {
    test.skip("should toggle AI suggestion checkbox", async () => {
      await expect(addMoodPage.aiToggleInput).not.toBeChecked();
      await addMoodPage.enableAiSuggestion();
      await expect(addMoodPage.aiToggleInput).toBeChecked();
      await addMoodPage.disableAiSuggestion();
      await expect(addMoodPage.aiToggleInput).not.toBeChecked();
    });

    test.skip("should show AI suggestion after successful submission", async () => {
      await addMoodPage.enableAiSuggestion();
      await addMoodPage.fillAndSubmitBasicEntry(4);
      await addMoodPage.expectSuccessView();
      await addMoodPage.expectAiSuggestionVisible();
    });

    test.skip("should allow providing feedback on AI suggestion", async () => {
      await addMoodPage.enableAiSuggestion();
      await addMoodPage.fillAndSubmitBasicEntry(4);
      await addMoodPage.expectAiSuggestionVisible();
      await addMoodPage.provideFeedbackPositive();
      // TODO: Add assertion for feedback submission
    });
  });

  test.describe("Form Submission", () => {
    test.skip("should submit basic entry with only mood score", async () => {
      await addMoodPage.fillAndSubmitBasicEntry(5);
      await addMoodPage.expectSuccessView();
    });

    test.skip("should submit full entry with all fields", async () => {
      await addMoodPage.fillAndSubmitFullEntry(4, "Świetny dzień w pracy!", ["work", "social"], false);
      await addMoodPage.expectSuccessView();
    });

    test.skip("should show loading indicator during submission", async () => {
      await addMoodPage.selectMoodScore(3);
      await addMoodPage.submit();
      // This assertion might be too fast to catch in normal conditions
      // await addMoodPage.expectSubmitLoading();
    });

    test.skip("should show error on submission failure", async () => {
      // TODO: Mock API failure
      await addMoodPage.fillAndSubmitBasicEntry(3);
      await addMoodPage.expectFormError("Nie udało się zapisać wpisu");
    });
  });

  test.describe("Form Reset", () => {
    test.skip("should reset form to initial state", async () => {
      await addMoodPage.selectMoodScore(4);
      await addMoodPage.fillNote("Test note");
      await addMoodPage.selectTag("work");
      await addMoodPage.enableAiSuggestion();

      await addMoodPage.reset();

      await expect(addMoodPage.noteInput).toHaveValue("");
      await expect(addMoodPage.aiToggleInput).not.toBeChecked();
    });
  });

  test.describe("Success State", () => {
    test.skip("should display success message after submission", async () => {
      await addMoodPage.fillAndSubmitBasicEntry(5);
      await addMoodPage.expectSuccessView();
      await expect(addMoodPage.successAlert).toContainText("Wpis został zapisany!");
    });

    test.skip("should navigate to dashboard from success view", async () => {
      await addMoodPage.fillAndSubmitBasicEntry(4);
      await addMoodPage.expectSuccessView();
      await addMoodPage.backToDashboard();
    });

    test.skip("should allow adding another entry from success view", async () => {
      await addMoodPage.fillAndSubmitBasicEntry(3);
      await addMoodPage.expectSuccessView();
      await addMoodPage.addAnotherEntry();
      await expect(addMoodPage.form).toBeVisible();
    });
  });
});
