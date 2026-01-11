import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { AiSuggestionPanel } from "@/components/app/mood/AiSuggestionPanel";
import { getMoodTagLabel } from "@/lib/constants/tag-catalog";
import type { MoodEntryDetailDTO } from "@/types";

const MOOD_FACES: Record<number, string> = {
  1: "😞",
  2: "😕",
  3: "😐",
  4: "🙂",
  5: "😄",
};

const MOOD_LABELS: Record<number, string> = {
  1: "Bardzo źle",
  2: "Słabo",
  3: "Średnio",
  4: "Dobrze",
  5: "Świetnie",
};

interface EntryDetailViewProps {
  entryId: string;
}

export function EntryDetailView({ entryId }: EntryDetailViewProps) {
  const [entry, setEntry] = useState<MoodEntryDetailDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const loadEntry = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/mood-entries/${entryId}`, {
        credentials: "same-origin",
      });

      if (response.status === 401) {
        window.location.href = `/login?redirectTo=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      if (response.status === 404) {
        setError("Wpis nie został znaleziony");
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load entry");
      }

      const data = (await response.json()) as MoodEntryDetailDTO;
      setEntry(data);
      setFeedbackSubmitted(data.aiHelpful !== undefined);
    } catch {
      setError("Nie udało się załadować wpisu. Spróbuj ponownie.");
    } finally {
      setIsLoading(false);
    }
  }, [entryId]);

  useEffect(() => {
    loadEntry();
  }, [loadEntry]);

  const handleHelpfulFeedback = async (helpful: boolean) => {
    if (!entry || feedbackSubmitted) return;

    try {
      await fetch(`/api/mood-entries/${entry.id}/ai-feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ helpful }),
        credentials: "same-origin",
      });

      setFeedbackSubmitted(true);
      setEntry({
        ...entry,
        aiHelpful: helpful,
      });
    } catch {
      // Silently fail - feedback is not critical
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Ładowanie wpisu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-destructive/50 bg-destructive/10">
        <div className="flex items-start gap-3">
          <span className="text-xl" aria-hidden="true">
            ⚠️
          </span>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-semibold text-destructive">Błąd</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={loadEntry}>
                Spróbuj ponownie
              </Button>
              <Button asChild size="sm">
                <a href="/app/dashboard">Wróć do dashboardu</a>
              </Button>
            </div>
          </div>
        </div>
      </Alert>
    );
  }

  if (!entry) {
    return null;
  }

  const moodEmoji = MOOD_FACES[entry.score] ?? "😐";
  const moodLabel = MOOD_LABELS[entry.score] ?? "Nieznany";
  const date = new Date(entry.createdAt);
  const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <a href="/app/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Wróć do dashboardu
          </a>
        </Button>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex items-start gap-4">
            <span className="text-5xl" aria-hidden="true">
              {moodEmoji}
            </span>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-foreground">{moodLabel}</h1>
              <p className="text-sm text-muted-foreground">
                {dateFormatter.format(date)} o {timeFormatter.format(date)}
              </p>
            </div>
          </div>

          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-primary/50 bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                >
                  {getMoodTagLabel(tag)}
                </span>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {entry.note ? (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-foreground">Notatka</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{entry.note}</p>
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">Brak notatki dla tego wpisu</p>
          )}

          {entry.aiSuggestion && entry.aiSuggestion.text && (
            <div>
              <AiSuggestionPanel
                suggestion={entry.aiSuggestion}
                onHelpfulFeedback={!feedbackSubmitted ? handleHelpfulFeedback : undefined}
                isLoadingSuggestion={false}
              />
              {feedbackSubmitted && entry.aiHelpful !== undefined && (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  {entry.aiHelpful ? (
                    <>
                      <ThumbsUp className="h-4 w-4" />
                      <span>Oznaczono jako pomocne</span>
                    </>
                  ) : (
                    <>
                      <ThumbsDown className="h-4 w-4" />
                      <span>Oznaczono jako niepomocne</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
