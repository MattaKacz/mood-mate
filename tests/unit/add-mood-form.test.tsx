import { configure, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AddMoodForm } from "@/components/app/mood/AddMoodForm";

configure({ testIdAttribute: "data-test-id" });

const mutateMock = vi.fn();
const resetMock = vi.fn();
const mutationState = {
  isLoading: false,
  error: null as { code?: string; message?: string } | null,
};

vi.mock("@/components/hooks/useAddMoodMutation", () => ({
  useAddMoodMutation: () => ({
    mutate: mutateMock,
    isLoading: mutationState.isLoading,
    error: mutationState.error,
    reset: resetMock,
  }),
}));

vi.mock("@/components/app/mood/MoodScorePicker", () => ({
  MoodScorePicker: ({
    onChange,
    error,
    disabled,
  }: {
    onChange: (score: number | null) => void;
    error?: string;
    disabled?: boolean;
  }) => (
    <div>
      <button type="button" data-test-id="set-score" onClick={() => onChange(3)} disabled={disabled}>
        set score
      </button>
      {error ? <span data-test-id="score-error">{error}</span> : null}
    </div>
  ),
}));

vi.mock("@/components/app/mood/NoteTextarea", () => ({
  NoteTextarea: ({
    onChange,
    error,
    disabled,
  }: {
    onChange: (note: string) => void;
    error?: string;
    disabled?: boolean;
  }) => (
    <div>
      <button type="button" data-test-id="set-note-long" onClick={() => onChange("x".repeat(281))} disabled={disabled}>
        set long note
      </button>
      <button type="button" data-test-id="set-note-ok" onClick={() => onChange(" ok ")} disabled={disabled}>
        set ok note
      </button>
      {error ? <span data-test-id="note-error">{error}</span> : null}
    </div>
  ),
}));

vi.mock("@/components/app/mood/TagSelector", () => ({
  TagSelector: ({
    onChange,
    error,
    disabled,
  }: {
    onChange: (tags: string[]) => void;
    error?: string;
    disabled?: boolean;
  }) => (
    <div>
      <button type="button" data-test-id="set-tags" onClick={() => onChange(["work", "stress"])} disabled={disabled}>
        set tags
      </button>
      {error ? <span data-test-id="tags-error">{error}</span> : null}
    </div>
  ),
}));

vi.mock("@/components/app/mood/AiSuggestionPanel", () => ({
  AiSuggestionPanel: () => <div data-test-id="mock-ai-panel" />,
}));

describe("AddMoodForm", () => {
  beforeEach(() => {
    mutateMock.mockReset();
    resetMock.mockReset();
    mutationState.isLoading = false;
    mutationState.error = null;
  });

  it("pokazuje błąd, gdy nie wybrano poziomu nastroju", async () => {
    render(<AddMoodForm />);

    const form = screen.getByTestId("add-mood-form");
    fireEvent.submit(form);

    expect(await screen.findByText("Wybierz poziom nastroju")).toBeInTheDocument();
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("blokuje zapis, gdy notatka przekracza limit znaków", async () => {
    render(<AddMoodForm />);

    fireEvent.click(screen.getByTestId("set-score"));
    fireEvent.click(screen.getByTestId("set-note-long"));
    fireEvent.submit(screen.getByTestId("add-mood-form"));

    expect(await screen.findByText("Notatka nie może mieć więcej niż 280 znaków")).toBeInTheDocument();
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("wywołuje mutate z przyciętą notatką i tagami", async () => {
    mutateMock.mockResolvedValue({
      entry: { id: 1 },
    });

    render(<AddMoodForm />);

    fireEvent.click(screen.getByTestId("set-score"));
    fireEvent.click(screen.getByTestId("set-note-ok"));
    fireEvent.click(screen.getByTestId("set-tags"));
    fireEvent.submit(screen.getByTestId("add-mood-form"));

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock).toHaveBeenCalledWith({
      score: 3,
      note: "ok",
      tags: ["work", "stress"],
      requestSuggestion: false,
    });
  });
});
