import { Label } from "@/components/ui/label";

const MOOD_LEVELS = [
  { score: 1, emoji: "😞", label: "Bardzo źle" },
  { score: 2, emoji: "😕", label: "Słabo" },
  { score: 3, emoji: "😐", label: "Średnio" },
  { score: 4, emoji: "🙂", label: "Dobrze" },
  { score: 5, emoji: "😄", label: "Świetnie" },
] as const;

interface MoodScorePickerProps {
  value: number | null;
  onChange: (score: number) => void;
  error?: string;
  disabled?: boolean;
}

export function MoodScorePicker({ value, onChange, error, disabled }: MoodScorePickerProps) {
  return (
    <div className="space-y-3" data-test-id="mood-score-picker">
      <Label htmlFor="mood-score" className="text-base font-semibold">
        Jak się dzisiaj czujesz? <span className="text-destructive">*</span>
      </Label>

      <div
        role="radiogroup"
        aria-label="Wybierz poziom nastroju"
        aria-required="true"
        aria-invalid={!!error}
        aria-describedby={error ? "mood-score-error" : undefined}
        className="grid grid-cols-5 gap-3"
        data-test-id="mood-score-options"
      >
        {MOOD_LEVELS.map((mood) => {
          const isSelected = value === mood.score;

          return (
            <button
              key={mood.score}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${mood.score} - ${mood.label}`}
              disabled={disabled}
              onClick={() => onChange(mood.score)}
              className={`
                group flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all
                hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100
                ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-border/60 bg-background hover:border-primary/50 hover:bg-muted/30"
                }
              `}
              data-test-id={`mood-score-${mood.score}`}
            >
              <span className="text-4xl transition-transform group-hover:scale-110" aria-hidden="true">
                {mood.emoji}
              </span>
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                {mood.label}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p id="mood-score-error" className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
