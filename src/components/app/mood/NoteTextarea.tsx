import { Label } from "@/components/ui/label";
import { useState } from "react";

const MAX_NOTE_LENGTH = 280;

interface NoteTextareaProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function NoteTextarea({ value, onChange, error, disabled }: NoteTextareaProps) {
  const [isFocused, setIsFocused] = useState(false);
  const charCount = value.length;
  const isNearLimit = charCount > MAX_NOTE_LENGTH * 0.9;
  const isOverLimit = charCount > MAX_NOTE_LENGTH;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <Label htmlFor="mood-note" className="text-base font-semibold">
          Notatka
        </Label>
        <span
          className={`text-sm transition-colors ${
            isOverLimit ? "font-semibold text-destructive" : isNearLimit ? "text-warning" : "text-muted-foreground"
          }`}
          aria-live="polite"
          aria-atomic="true"
        >
          {charCount} / {MAX_NOTE_LENGTH}
        </span>
      </div>

      <div className="relative">
        <textarea
          id="mood-note"
          name="note"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder="Opisz krótko, co się działo dzisiaj... (opcjonalne)"
          aria-describedby={error ? "mood-note-error" : "mood-note-hint"}
          aria-invalid={!!error || isOverLimit}
          maxLength={MAX_NOTE_LENGTH + 50} // Soft limit, walidacja po stronie klienta
          rows={4}
          className={`
            w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm transition-colors
            placeholder:text-muted-foreground/60
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-50
            ${error || isOverLimit ? "border-destructive" : isFocused ? "border-primary" : "border-border/60"}
          `}
        />
      </div>

      {!error && (
        <p id="mood-note-hint" className="text-sm text-muted-foreground">
          Krótka notatka pomoże Ci lepiej zrozumieć swój nastrój
        </p>
      )}

      {error && (
        <p id="mood-note-error" className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
