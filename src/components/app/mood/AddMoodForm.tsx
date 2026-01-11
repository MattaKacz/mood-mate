import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { MoodScorePicker } from "./MoodScorePicker";
import { TagSelector } from "./TagSelector";
import { NoteTextarea } from "./NoteTextarea";
import { AiSuggestionPanel } from "./AiSuggestionPanel";
import { useAddMoodMutation } from "@/components/hooks/useAddMoodMutation";
import type { MoodTag, AiSuggestionDTO } from "@/types";

interface FormData {
  score: number | null;
  note: string;
  tags: MoodTag[];
  requestSuggestion: boolean;
}

interface FormErrors {
  score?: string;
  note?: string;
  tags?: string;
  submit?: string;
}

interface AddMoodFormProps {
  onSuccess?: () => void;
  defaultRequestSuggestion?: boolean;
}

export function AddMoodForm({ onSuccess, defaultRequestSuggestion = false }: AddMoodFormProps) {
  const [formData, setFormData] = useState<FormData>({
    score: null,
    note: "",
    tags: [],
    requestSuggestion: defaultRequestSuggestion,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestionDTO | undefined>();
  const [savedEntryId, setSavedEntryId] = useState<number | null>(null);

  const { mutate, isLoading, error: mutationError, reset: resetMutation } = useAddMoodMutation();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (formData.score === null) {
      newErrors.score = "Wybierz poziom nastroju";
    } else if (formData.score < 1 || formData.score > 5) {
      newErrors.score = "Poziom nastroju musi być od 1 do 5";
    }

    if (formData.note.length > 280) {
      newErrors.note = "Notatka nie może mieć więcej niż 280 znaków";
    }

    if (formData.tags.length > 2) {
      newErrors.tags = "Możesz wybrać maksymalnie 2 tagi";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (formData.score === null) {
      return;
    }

    try {
      const result = await mutate({
        score: formData.score,
        note: formData.note.trim() || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        requestSuggestion: formData.requestSuggestion,
      });

      setShowSuccess(true);
      setSavedEntryId(result.entry.id);

      if (result.aiSuggestion) {
        setAiSuggestion(result.aiSuggestion);
      }

      // Reset form after 3 seconds
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          handleReset();
        }
      }, 3000);
    } catch {
      setErrors({
        submit: mutationError?.message || "Nie udało się zapisać wpisu. Spróbuj ponownie.",
      });
    }
  };

  const handleReset = () => {
    setFormData({
      score: null,
      note: "",
      tags: [],
      requestSuggestion: defaultRequestSuggestion,
    });
    setErrors({});
    setShowSuccess(false);
    setAiSuggestion(undefined);
    setSavedEntryId(null);
    resetMutation();
  };

  const handleHelpfulFeedback = async (helpful: boolean) => {
    if (!savedEntryId) return;

    try {
      await fetch(`/api/mood-entries/${savedEntryId}/ai-feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ helpful }),
        credentials: "same-origin",
      });

      // Update AI suggestion to indicate feedback was submitted
      setAiSuggestion((prev) =>
        prev
          ? {
              ...prev,
              status: "completed",
            }
          : undefined
      );
    } catch {
      // Silently fail - feedback is not critical
    }
  };

  if (showSuccess) {
    return (
      <div className="space-y-6">
        <Alert className="border-green-500/50 bg-green-500/10">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">
              ✅
            </span>
            <div className="flex-1 space-y-1">
              <p className="text-base font-semibold text-foreground">Wpis został zapisany!</p>
              <p className="text-sm text-muted-foreground">Twój nastrój został dodany do dziennika</p>
            </div>
          </div>
        </Alert>

        {aiSuggestion && (
          <AiSuggestionPanel
            suggestion={aiSuggestion}
            onHelpfulFeedback={handleHelpfulFeedback}
            isLoadingSuggestion={false}
          />
        )}

        <div className="flex gap-3">
          <Button onClick={handleReset} variant="outline" className="flex-1">
            Dodaj kolejny wpis
          </Button>
          <Button asChild className="flex-1">
            <a href="/app/dashboard">Wróć do dashboardu</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <div className="flex items-start gap-3">
            <span className="text-xl" aria-hidden="true">
              ⚠️
            </span>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-destructive">Wystąpił błąd</p>
              <p className="text-sm text-muted-foreground">{errors.submit}</p>
              {mutationError?.code && <p className="text-xs text-muted-foreground">Kod błędu: {mutationError.code}</p>}
            </div>
          </div>
        </Alert>
      )}

      <MoodScorePicker
        value={formData.score}
        onChange={(score) => {
          setFormData({ ...formData, score });
          setErrors({ ...errors, score: undefined });
        }}
        error={errors.score}
        disabled={isLoading}
      />

      <NoteTextarea
        value={formData.note}
        onChange={(note) => {
          setFormData({ ...formData, note });
          setErrors({ ...errors, note: undefined });
        }}
        error={errors.note}
        disabled={isLoading}
      />

      <TagSelector
        value={formData.tags}
        onChange={(tags) => {
          setFormData({ ...formData, tags });
          setErrors({ ...errors, tags: undefined });
        }}
        error={errors.tags}
        disabled={isLoading}
      />

      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
        <input
          type="checkbox"
          id="request-suggestion"
          checked={formData.requestSuggestion}
          onChange={(e) => setFormData({ ...formData, requestSuggestion: e.target.checked })}
          disabled={isLoading}
          className="h-4 w-4 rounded border-border/60 text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
        <label htmlFor="request-suggestion" className="flex-1 text-sm text-foreground">
          Otrzymaj spersonalizowaną sugestię AI
        </label>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={handleReset} disabled={isLoading} className="flex-1">
          Wyczyść
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? (
            <>
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Zapisuję...
            </>
          ) : (
            "Zapisz wpis"
          )}
        </Button>
      </div>
    </form>
  );
}
