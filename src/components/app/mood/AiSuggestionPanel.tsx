import { Alert } from "@/components/ui/alert";
import type { AiSuggestionDTO } from "@/types";

interface AiSuggestionPanelProps {
  suggestion?: AiSuggestionDTO;
  onHelpfulFeedback?: (helpful: boolean) => void;
  isLoadingSuggestion?: boolean;
}

export function AiSuggestionPanel({ suggestion, onHelpfulFeedback, isLoadingSuggestion }: AiSuggestionPanelProps) {
  if (!suggestion && !isLoadingSuggestion) {
    return null;
  }

  if (isLoadingSuggestion || suggestion?.status === "pending") {
    return (
      <Alert className="animate-pulse border-primary/30 bg-primary/5">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-foreground">Przygotowuję sugestię...</p>
            <p className="text-sm text-muted-foreground">Chwileczkę, analizuję Twój wpis</p>
          </div>
        </div>
      </Alert>
    );
  }

  if (suggestion?.status === "skipped") {
    return null;
  }

  const isFallback = suggestion?.status === "fallback";
  const text = suggestion?.text;

  if (!text) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-gradient-to-br from-primary/5 to-primary/10 p-6 shadow-sm">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">
            💡
          </span>
          <h3 className="text-base font-semibold text-foreground">{isFallback ? "Sugestia" : "Sugestia AI"}</h3>
        </div>

        <p className="text-sm leading-relaxed text-foreground/90">{text}</p>

        {isFallback && (
          <p className="text-xs text-muted-foreground">
            Tym razem nie udało się wygenerować spersonalizowanej sugestii
          </p>
        )}
      </div>

      {onHelpfulFeedback && suggestion?.status === "completed" && (
        <div className="flex items-center gap-3 border-t border-border/50 pt-4">
          <span className="text-sm text-muted-foreground">Czy to było pomocne?</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onHelpfulFeedback(true)}
              className="rounded-lg border border-border/60 bg-background px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              👍 Tak
            </button>
            <button
              type="button"
              onClick={() => onHelpfulFeedback(false)}
              className="rounded-lg border border-border/60 bg-background px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              👎 Nie
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
