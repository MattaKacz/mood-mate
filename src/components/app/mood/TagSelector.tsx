import { Label } from "@/components/ui/label";
import { getMoodTagOptions, MAX_TAGS_PER_ENTRY } from "@/lib/constants/tag-catalog";
import type { MoodTag } from "@/types";

interface TagSelectorProps {
  value: MoodTag[];
  onChange: (tags: MoodTag[]) => void;
  error?: string;
  disabled?: boolean;
}

export function TagSelector({ value, onChange, error, disabled }: TagSelectorProps) {
  const tagOptions = getMoodTagOptions();
  const isMaxReached = value.length >= MAX_TAGS_PER_ENTRY;

  const handleToggle = (tagId: MoodTag) => {
    if (value.includes(tagId)) {
      onChange(value.filter((t) => t !== tagId));
    } else {
      if (value.length < MAX_TAGS_PER_ENTRY) {
        onChange([...value, tagId]);
      }
    }
  };

  return (
    <div className="space-y-3" data-test-id="mood-tag-selector">
      <div className="flex items-baseline justify-between">
        <Label htmlFor="mood-tags" className="text-base font-semibold">
          Tagi
        </Label>
        <span className="text-sm text-muted-foreground">
          {value.length} / {MAX_TAGS_PER_ENTRY}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">
        Wybierz maksymalnie {MAX_TAGS_PER_ENTRY} tagi opisujące Twój dzień
      </p>

      <div
        role="group"
        aria-label="Wybierz tagi nastroju"
        aria-describedby={error ? "mood-tags-error" : "mood-tags-hint"}
        className="flex flex-wrap gap-2"
        data-test-id="mood-tag-options"
      >
        {tagOptions.map((tag) => {
          const isSelected = value.includes(tag.id);
          const isDisabled = disabled || (!isSelected && isMaxReached);

          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleToggle(tag.id)}
              disabled={isDisabled}
              aria-pressed={isSelected}
              className={`
                rounded-full border px-4 py-2 text-sm font-medium transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                disabled:cursor-not-allowed disabled:opacity-40
                ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    : "border-border/60 bg-background text-foreground hover:border-primary/50 hover:bg-muted/50"
                }
              `}
              data-test-id={`mood-tag-${tag.id}`}
            >
              {tag.label}
            </button>
          );
        })}
      </div>

      {isMaxReached && (
        <p id="mood-tags-hint" className="text-sm text-muted-foreground">
          Osiągnięto limit {MAX_TAGS_PER_ENTRY} tagów
        </p>
      )}

      {error && (
        <p id="mood-tags-error" className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
